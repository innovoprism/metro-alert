// Offline support: app shell is cached per version; map tiles are cached as you view them.
const VERSION = '1.4.0';
const SHELL = 'metro-alert-shell-' + VERSION;
const TILES = 'metro-alert-tiles-v1';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon.svg',
  'version.js', 'config.js', 'alarm.wav', 'vendor/leaflet/leaflet.js', 'vendor/leaflet-rotate.js', 'vendor/leaflet/leaflet.css', 'vendor/capacitor.js', 'data/transit.json'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![SHELL, TILES].includes(k)).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  } else if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { caches.open(SHELL).then(c => c.put(e.request, r.clone())); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
