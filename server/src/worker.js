// Metro Alert server (Cloudflare Worker + D1)
//
//   GET  /                 the web app (static files from ../www)
//   POST /api/hello        app opened            {id, platform, version, native}
//   POST /api/event        trip started / alarm  {id, platform, name}
//   POST /api/samples      measured stop-to-stop times {id, samples:[{k, b, run, dwell}]}
//   GET  /api/timings?b=   learned times for a time-of-day bucket
//   GET  /api/version      latest release (for in-app updates)
//   GET  /stats?key=...    usage dashboard (STATS_KEY secret)
//   GET  /api/stats?key=   the same as JSON

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const PLATFORMS = new Set(['web', 'android', 'ios']);
const EVENTS = new Set(['trip-metro', 'trip-bus', 'trip-stop', 'trip-pin', 'alarm', 'install', 'update']);
const BUCKET_RE = /^(wd|we)-(n|e|am|md|pm|ev)$/;
const ID_RE = /^[0-9a-f-]{16,40}$/i;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });
const dubaiDay = (offsetDays = 0) => new Date(Date.now() + 4 * 3600e3 - offsetDays * 86400e3).toISOString().slice(0, 10);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (p === '/api/hello' && req.method === 'POST') return await hello(await req.json(), env, ctx);
      if (p === '/api/event' && req.method === 'POST') return await event(await req.json(), env);
      if (p === '/api/samples' && req.method === 'POST') return await samples(await req.json(), env);
      if (p === '/api/timings') return await timings(url, env);
      if (p === '/api/version') return await version(env, ctx);
      if (p === '/api/stats') return authorised(url, env) ? json(await stats(env)) : json({ error: 'key required' }, 401);
      if (p === '/stats') return authorised(url, env) ? html(dashboard(await stats(env))) : html(loginPage(), 401);
      if (p.startsWith('/api/')) return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 400);
    }
    return env.ASSETS.fetch(req);   // the web app
  },
};

function authorised(url, env) {
  return !!env.STATS_KEY && url.searchParams.get('key') === env.STATS_KEY;
}

// ---------------------------------------------------------------- users
async function hello(b, env, ctx) {
  const id = str(b.id, 40), platform = str(b.platform, 10);
  if (!ID_RE.test(id) || !PLATFORMS.has(platform)) return json({ error: 'bad request' }, 400);
  const day = dubaiDay(), version = str(b.version, 16), native = str(b.native, 16);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO installs (id, platform, version, native, first_seen, last_seen, opens)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?5, 1)
                    ON CONFLICT(id) DO UPDATE SET platform = ?2, version = ?3, native = ?4, last_seen = ?5, opens = opens + 1`)
      .bind(id, platform, version, native, day),
    env.DB.prepare('INSERT OR IGNORE INTO active (day, id, platform) VALUES (?1, ?2, ?3)').bind(day, id, platform),
  ]);
  // keep the daily-active table small (> 400 days old is not needed)
  if (Math.random() < 0.01) ctx.waitUntil(env.DB.prepare('DELETE FROM active WHERE day < ?1').bind(dubaiDay(400)).run());
  return json({ ok: true });
}

async function event(b, env) {
  const platform = str(b.platform, 10), name = str(b.name, 20);
  if (!PLATFORMS.has(platform) || !EVENTS.has(name)) return json({ error: 'bad request' }, 400);
  await env.DB.prepare(`INSERT INTO events (day, platform, name, n) VALUES (?1, ?2, ?3, 1)
                        ON CONFLICT(day, platform, name) DO UPDATE SET n = n + 1`).bind(dubaiDay(), platform, name).run();
  return json({ ok: true });
}

// ---------------------------------------------------------------- learned train timings
// Each sample updates a running average for (segment, time bucket). Outliers (a broken-down train,
// a GPS glitch) are ignored once a segment has enough samples.
async function samples(b, env) {
  const list = Array.isArray(b.samples) ? b.samples.slice(0, 50) : [];
  const day = dubaiDay();
  const stmts = [];
  for (const s of list) {
    const key = str(s.k, 140), bucket = str(s.b, 8);
    const run = Number(s.run), dwell = s.dwell == null ? null : Number(s.dwell);
    if (!/^(M|B[\w-]{1,8})\|[^|]{1,60}\|[^|]{1,60}$/.test(key) || !BUCKET_RE.test(bucket)) continue;
    if (!(run >= 10 && run <= 1800)) continue;
    const dw = dwell != null && dwell >= 0 && dwell <= 600 ? dwell : null;
    stmts.push(env.DB.prepare(`
      INSERT INTO seg (key, bucket, n, run, dwell, updated) VALUES (?1, ?2, 1, ?3, ?4, ?5)
      ON CONFLICT(key, bucket) DO UPDATE SET
        run   = run + MAX(1.0 / (n + 1), 0.08) * (excluded.run - run),
        dwell = CASE WHEN excluded.dwell IS NULL THEN dwell
                     WHEN dwell IS NULL THEN excluded.dwell
                     ELSE dwell + MAX(1.0 / (n + 1), 0.08) * (excluded.dwell - dwell) END,
        n = n + 1, updated = excluded.updated
      WHERE n < 3 OR (excluded.run >= 0.5 * run AND excluded.run <= 2.0 * run)`).bind(key, bucket, run, dw, day));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, accepted: stmts.length });
}

async function timings(url, env) {
  const bucket = url.searchParams.get('b') || '';
  if (!BUCKET_RE.test(bucket)) return json({ error: 'bad bucket' }, 400);
  const { results } = await env.DB.prepare('SELECT key, run, dwell, n FROM seg WHERE bucket = ?1 AND n >= 3').bind(bucket).all();
  const out = {};
  for (const r of results) out[r.key] = [Math.round(r.run), r.dwell == null ? null : Math.round(r.dwell), r.n];
  return json({ bucket, segments: out }, 200, { 'Cache-Control': 'public, max-age=600' });
}

// ---------------------------------------------------------------- latest version
async function version(env, ctx) {
  const cache = caches.default, key = new Request('https://cache.local/api/version');
  const hit = await cache.match(key);
  if (hit) return hit;
  const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/releases/latest`,
    { headers: { 'User-Agent': 'metro-alert-server', Accept: 'application/vnd.github+json' } });
  if (!r.ok) return json({ error: 'github ' + r.status }, 502);
  const rel = await r.json();
  const res = json(releaseInfo(rel), 200, { 'Cache-Control': 'public, max-age=600' });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export function releaseInfo(rel) {
  const v = String(rel.tag_name || '').replace(/^v/, '');
  const asset = re => (rel.assets || []).find(a => re.test(a.name));
  const url = a => a && a.browser_download_url;
  const m = /native-min:\s*([\d.]+)/.exec(rel.body || '');
  const notes = String(rel.body || '').replace(/<!--[\s\S]*?-->/g, '').split(/\n## /)[1] || '';
  return {
    version: v, nativeMin: m ? m[1] : v,
    web: url(asset(/-web\.zip$/)), apk: url(asset(/\.apk$/)), ipa: url(asset(/\.ipa$/)),
    notes: notes.split('\n').slice(1).join('\n').trim().slice(0, 1500), page: rel.html_url,
  };
}

// ---------------------------------------------------------------- stats
async function stats(env) {
  const d0 = dubaiDay(), d7 = dubaiDay(6), d30 = dubaiDay(29);
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).all().then(r => r.results);
  const [total, act1, act7, act30, newDays, actDays, versions, ev, learned] = await Promise.all([
    q('SELECT platform, COUNT(*) n FROM installs GROUP BY platform'),
    q('SELECT platform, COUNT(*) n FROM active WHERE day = ?1 GROUP BY platform', d0),
    q('SELECT platform, COUNT(DISTINCT id) n FROM active WHERE day >= ?1 GROUP BY platform', d7),
    q('SELECT platform, COUNT(DISTINCT id) n FROM active WHERE day >= ?1 GROUP BY platform', d30),
    q('SELECT first_seen day, platform, COUNT(*) n FROM installs WHERE first_seen >= ?1 GROUP BY first_seen, platform', d30),
    q('SELECT day, platform, COUNT(*) n FROM active WHERE day >= ?1 GROUP BY day, platform', d30),
    q('SELECT platform, version, COUNT(*) n FROM installs WHERE last_seen >= ?1 GROUP BY platform, version ORDER BY n DESC', d30),
    q('SELECT name, platform, SUM(n) n FROM events WHERE day >= ?1 GROUP BY name, platform', d30),
    q('SELECT COUNT(*) segments, COALESCE(SUM(n), 0) samples FROM seg WHERE n >= 3'),
  ]);
  const byP = rows => Object.fromEntries(['web', 'android', 'ios'].map(p => [p, (rows.find(r => r.platform === p) || {}).n || 0]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = dubaiDay(i);
    days.push({ day: d,
      active: byP(actDays.filter(r => r.day === d)), new: byP(newDays.filter(r => r.day === d)) });
  }
  return { today: d0, users: byP(total), activeToday: byP(act1), active7: byP(act7), active30: byP(act30),
    days, versions, events: ev, learned: learned[0] };
}

const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = o => o.web + o.android + o.ios;

function page(title, inner) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f3f4f6;color:#14161a}
main{max-width:960px;margin:0 auto;padding:20px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px}
.muted{color:#6b7280;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px}
.card{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.card b{display:block;font-size:30px;font-variant-numeric:tabular-nums}.card small{color:#6b7280;font-size:12px}
.split{font-size:13px;color:#374151;margin-top:4px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 4px 0 8px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;font-size:14px}
td,th{padding:8px 12px;border-bottom:1px solid #eef0f3;text-align:left}th{font-size:12px;color:#6b7280;text-transform:uppercase}
.bars{display:flex;align-items:flex-end;gap:3px;height:140px;background:#fff;border-radius:14px;padding:14px}
.bar{flex:1;display:flex;flex-direction:column-reverse;min-width:4px}.bar i{display:block}
form{display:flex;gap:8px;margin-top:20px}input{flex:1;height:44px;border-radius:10px;border:1px solid #d1d5db;padding:0 12px;font-size:16px}
button{height:44px;border:0;border-radius:10px;background:#E4002B;color:#fff;font-weight:700;padding:0 18px;font-size:15px}
</style></head><body><main>${inner}</main></body></html>`;
}
const COL = { web: '#6366f1', android: '#16a34a', ios: '#111827' };
const split = o => ['web', 'android', 'ios'].map(p => `<span class="dot" style="background:${COL[p]}"></span>${p} ${o[p]}`).join('');

function dashboard(s) {
  const max = Math.max(1, ...s.days.map(d => sum(d.active)));
  const bars = s.days.map(d => `<div class="bar" title="${d.day}: ${sum(d.active)} active, ${sum(d.new)} new">${
    ['web', 'android', 'ios'].map(p => `<i style="height:${(d.active[p] / max) * 110}px;background:${COL[p]}"></i>`).join('')}</div>`).join('');
  const evRows = s.events.map(e => `<tr><td>${esc(e.name)}</td><td>${esc(e.platform)}</td><td>${e.n}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">No trips yet</td></tr>';
  const verRows = s.versions.map(v => `<tr><td>${esc(v.platform)}</td><td>v${esc(v.version || '?')}</td><td>${v.n}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">No users yet</td></tr>';
  const card = (label, o, note) => `<div class="card"><small>${label}</small><b>${sum(o)}</b><div class="split">${split(o)}</div>${note ? `<small>${note}</small>` : ''}</div>`;
  return page('Metro Alert – usage', `
<h1>Metro Alert – usage</h1><div class="muted">Counted on the server. Dubai date ${esc(s.today)}. Anonymous: one random id per app install.</div>
<div class="grid">${card('Total users (installs)', s.users)}${card('Active today', s.activeToday)}${card('Active last 7 days', s.active7)}${card('Active last 30 days', s.active30)}</div>
<h2>Daily active users, last 30 days</h2><div class="bars">${bars}</div>
<div class="muted" style="margin-top:6px">${['web', 'android', 'ios'].map(p => `<span class="dot" style="background:${COL[p]}"></span>${p}`).join('')}</div>
<h2>Trips and alarms, last 30 days</h2><table><tr><th>Event</th><th>Platform</th><th>Count</th></tr>${evRows}</table>
<h2>App versions in use (last 30 days)</h2><table><tr><th>Platform</th><th>Version</th><th>Users</th></tr>${verRows}</table>
<h2>Learned train/bus timings</h2><div class="card"><b>${s.learned.segments}</b><small>stop-to-stop segments learned from ${s.learned.samples} real rides</small></div>`);
}
function loginPage() {
  return page('Metro Alert – stats', `<h1>Metro Alert – usage stats</h1><div class="muted">Enter your stats key (the STATS_KEY secret).</div>
<form method="get" action="/stats"><input name="key" type="password" placeholder="Stats key" autofocus><button>Open</button></form>`);
}
