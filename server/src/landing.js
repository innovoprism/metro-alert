// Landing page served at "/" (the web app itself lives at /app/).
// Download links come from /api/version (the latest GitHub release).
export const LANDING = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Metro Alert – never miss your stop in Dubai</title>
<meta name="description" content="GPS stop alarm for Dubai Metro, RTA buses and Etihad Rail. Sleep on the train; your phone wakes you before your station.">
<meta name="theme-color" content="#E4002B">
<link rel="icon" href="/icons/icon-192.png"><link rel="manifest" href="/app/manifest.webmanifest">
<meta property="og:title" content="Metro Alert"><meta property="og:description" content="Never miss your stop on Dubai Metro, buses and Etihad Rail.">
<meta property="og:image" content="/icons/icon-512.png">
<style>
:root{--red:#E4002B;--green:#00A651;--ink:#14161a;--muted:#5b6170;--bg:#f6f4f1;--card:#fff;--line:#e7e3dd}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 22px}
nav{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;text-decoration:none}
.brand img{width:34px;height:34px;border-radius:9px}
nav .links a{margin-left:18px;text-decoration:none;color:var(--muted);font-weight:600;font-size:14px}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:36px 0 56px}
.kicker{display:inline-flex;gap:8px;align-items:center;font-size:13px;font-weight:700;color:var(--red);background:#fde8ec;padding:5px 12px;border-radius:99px}
h1{font-size:clamp(36px,6vw,60px);line-height:1.03;letter-spacing:-.02em;margin:16px 0 14px}
h1 em{font-style:normal;color:var(--red)}
.lead{font-size:19px;color:var(--muted);max-width:30em}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 10px}
.btn{display:inline-flex;align-items:center;gap:10px;height:54px;padding:0 22px;border-radius:14px;font-weight:800;font-size:16px;text-decoration:none;border:0;cursor:pointer}
.btn.primary{background:var(--red);color:#fff;box-shadow:0 8px 22px rgba(228,0,43,.28)}
.btn.dark{background:var(--ink);color:#fff}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.btn small{display:block;font-weight:600;font-size:11px;opacity:.75;line-height:1.1}
.btn span{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15}
.fine{font-size:13px;color:var(--muted)}
.phone{justify-self:center;width:290px;height:590px;border-radius:44px;background:#111;padding:12px;box-shadow:0 30px 60px rgba(20,22,26,.25)}
.screen{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:
  linear-gradient(135deg,rgba(0,166,81,.0) 47%,rgba(0,166,81,.85) 47.5%,rgba(0,166,81,.85) 49.5%,transparent 50%),
  linear-gradient(60deg,transparent 48%,rgba(228,0,43,.9) 48.5%,rgba(228,0,43,.9) 50.5%,transparent 51%),
  repeating-linear-gradient(0deg,#eef0e9 0 38px,#e5e8df 38px 39px),#eef0e9}
.pin{position:absolute;left:58%;top:30%;width:22px;height:22px;border-radius:50%;background:var(--red);border:4px solid #fff;box-shadow:0 0 0 18px rgba(228,0,43,.15)}
.me{position:absolute;left:30%;top:62%;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 14px rgba(37,99,235,.15)}
.sheet{position:absolute;left:10px;right:10px;bottom:10px;background:#fff;border-radius:22px;padding:14px 16px;box-shadow:0 -4px 20px rgba(0,0,0,.08)}
.sheet .row{display:flex;justify-content:space-between;align-items:baseline}
.sheet b{font-size:26px}.sheet small{color:var(--muted);font-size:12px}
.pill{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;background:#e8f7ef;color:#0a7a45;padding:4px 10px;border-radius:99px}
.alarm{position:absolute;left:14px;right:14px;top:16px;background:var(--red);color:#fff;border-radius:18px;padding:12px 14px;font-weight:700;font-size:14px;animation:ring 2.4s ease-in-out infinite}
@keyframes ring{0%,100%{transform:translateY(0)}5%{transform:translateX(-3px)}10%{transform:translateX(3px)}15%{transform:translateX(-2px)}20%{transform:translateX(0)}}
section{padding:56px 0}
h2{font-size:clamp(26px,4vw,38px);letter-spacing:-.01em;margin:0 0 10px}
.sub{color:var(--muted);margin:0 0 28px;font-size:17px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px}
.card .ic{font-size:26px}.card h3{margin:8px 0 6px;font-size:17px}.card p{margin:0;color:var(--muted);font-size:14.5px}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.step{position:relative;padding:20px 20px 20px 64px;background:#fff;border-radius:18px;border:1px solid var(--line)}
.step:before{counter-increment:s;content:counter(s);position:absolute;left:18px;top:18px;width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;font-weight:800;display:grid;place-items:center}
.step h3{margin:0 0 4px;font-size:16px}.step p{margin:0;color:var(--muted);font-size:14px}
.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:22px}
.stats div b{display:block;font-size:28px}.stats div small{color:var(--muted)}
.dl{background:var(--ink);color:#fff;border-radius:26px;padding:34px;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center}
.dl h2{color:#fff}.dl p{color:#c9ccd3;margin:0}
.dl .cta{margin:0}
details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:10px}
summary{font-weight:700;cursor:pointer}details p{color:var(--muted);margin:8px 0 0}
footer{padding:30px 0 50px;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
@media (max-width:860px){.hero{grid-template-columns:1fr}.phone{display:none}.grid,.steps{grid-template-columns:1fr}.dl{grid-template-columns:1fr}nav .links{display:none}}
</style></head><body>
<div class="wrap">
<nav><a class="brand" href="/"><img src="/icons/icon-192.png" alt="">Metro Alert</a>
<div class="links"><a href="#features">Features</a><a href="#how">How it works</a><a href="#download">Download</a><a href="#faq">FAQ</a></div></nav>

<header class="hero">
  <div>
    <span class="kicker">🚇 Dubai Metro · 🚌 RTA buses · 🚆 Etihad Rail</span>
    <h1>Fall asleep on the train. <em>Wake up at your stop.</em></h1>
    <p class="lead">Pick your station and Metro Alert follows your GPS. Before you arrive, your phone rings and vibrates like an alarm clock, even when it's locked.</p>
    <div class="cta">
      <a class="btn primary" href="/app/">Open the web app</a>
      <a class="btn dark" id="apk" href="#download"><span>Get it for Android<small id="apkv">APK download</small></span></a>
    </div>
    <p class="fine">Free. No sign-up needed. Works offline once opened.</p>
    <div class="stats" id="stats"></div>
  </div>
  <div class="phone" aria-hidden="true"><div class="screen">
    <div class="alarm">⏰ Your stop is next: Burj Khalifa/Dubai Mall</div>
    <div class="pin"></div><div class="me"></div>
    <div class="sheet"><div class="row"><div><small>ETA</small><br><b>08:42</b></div><div style="text-align:right"><small>Next stop</small><br><strong>Business Bay</strong></div></div>
    <span class="pill">🟢 Arrived at Business Bay · 1 stop to go</span></div>
  </div></div>
</header>

<section id="features">
  <h2>Everything for the ride</h2>
  <p class="sub">Made for Dubai's Metro, buses and Etihad Rail.</p>
  <div class="grid">
    <div class="card"><div class="ic">⏰</div><h3>A real alarm</h3><p>Loops your tune on the alarm volume with continuous vibration and turns the screen on. It keeps going until you tap "I'm getting off".</p></div>
    <div class="card"><div class="ic">🕒</div><h3>Accurate arrival time</h3><p>Uses the timetable and how the train speeds up and brakes, and learns from real rides by other users.</p></div>
    <div class="card"><div class="ic">🛰️</div><h3>Steady GPS</h3><p>Snaps your position to the line, drops jumpy readings and keeps moving through tunnels like a navigation app.</p></div>
    <div class="card"><div class="ic">🧭</div><h3>Go anywhere</h3><p>Best routes by Metro, bus, Etihad Rail and walking, with live bus times. It wakes you at every change.</p></div>
    <div class="card"><div class="ic">🚏</div><h3>Bus and train times</h3><p>Tap any bus stop for the next arrivals, and see Etihad Rail departures from every station.</p></div>
    <div class="card"><div class="ic">🪙</div><h3>Earn coins</h3><p>Reach your stop on a tracked trip and earn coins. Climb the Top riders board.</p></div>
  </div>
</section>

<section id="how">
  <h2>How it works</h2>
  <p class="sub">Three taps before you nod off.</p>
  <div class="steps">
    <div class="step"><h3>Pick your stop</h3><p>Choose a Metro station, a bus route and stop, an Etihad Rail station, or drop a pin.</p></div>
    <div class="step"><h3>Tap Start</h3><p>See the next station, arrival times at every stop and your ETA as you ride.</p></div>
    <div class="step"><h3>Wake up in time</h3><p>Your phone rings 1–2 stops early or as you approach, as you choose.</p></div>
  </div>
</section>

<section id="download">
  <div class="dl">
    <div><h2>Get Metro Alert</h2><p id="dlnote">Android app, iPhone (iOS 26 rings like a Clock alarm) and a web app for any phone.</p></div>
    <div class="cta">
      <a class="btn primary" id="apk2" href="#"><span>Android<small id="apkv2">APK</small></span></a>
      <a class="btn ghost" href="/app/"><span>Web app<small>any phone or PC</small></span></a>
    </div>
  </div>
  <p class="fine" style="margin-top:10px">Android: after downloading, open the file and allow "Install unknown apps" for your browser. iPhone: open the web app in Safari and tap Share → Add to Home Screen.</p>
</section>

<section id="faq">
  <h2>Questions</h2>
  <details><summary>Does it work underground?</summary><p>Yes. Between stations without GPS, Metro Alert keeps estimating your position along the line from the timetable. A backup alarm is also scheduled from the timetable.</p></details>
  <details><summary>Will it drain my battery?</summary><p>GPS runs only while a trip is active and stops as soon as the trip ends.</p></details>
  <details><summary>Does it ring when my phone is on silent?</summary><p>On Android, yes: it uses the alarm volume. On iPhone with iOS 26, yes: it uses the system alarm. On older iPhones it shows repeating notifications.</p></details>
  <details><summary>Is my location shared?</summary><p>No. Your location stays on your phone. Only anonymous trip times are shared to improve arrival times, plus the start and end of a trip to check coins.</p></details>
</section>

<footer><span>© Metro Alert · Not affiliated with RTA or Etihad Rail. Timetables can change.</span><span id="ver"></span></footer>
</div>
<script>
fetch('/api/version').then(r=>r.json()).then(v=>{
  if(!v||!v.version)return;
  if(v.apk){['apk','apk2'].forEach(id=>document.getElementById(id).href=v.apk);}
  ['apkv','apkv2'].forEach(id=>document.getElementById(id).textContent='v'+v.version+' · APK');
  document.getElementById('ver').textContent='Latest version '+v.version;
}).catch(()=>{});
fetch('/api/public').then(r=>r.json()).then(s=>{
  if(!s||s.users<50)return;   // show the numbers once there are some
  const f=n=>n>=1000?(n/1000).toFixed(1)+'k':n;
  document.getElementById('stats').innerHTML='<div><b>'+f(s.users)+'</b><small>riders</small></div><div><b>'+f(s.trips)+'</b><small>stops reached</small></div><div><b>'+f(s.segments)+'</b><small>timings learned</small></div>';
}).catch(()=>{});
</script>
</body></html>`;
