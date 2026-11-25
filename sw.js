// Basit önbellek: uygulama kabuğu hızlı açılsın. Veriler her zaman Firebase'den canlı gelir.
const CACHE = 'hayrat-dua-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'aref_ruqaa.ttf',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/hayrat_logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;          // Firebase istekleri doğrudan gitsin
  // önce ağ (yeni sürüm hemen gelsin), olmazsa önbellek
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
