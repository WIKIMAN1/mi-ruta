/* Mi Ruta - service worker en la raíz, alcance de raíz.
   HTML siempre primero a la red (actualizaciones en vivo);
   estáticos propios con stale-while-revalidate. */
const CACHE_VERSION = 'mi-ruta-v2';
const CACHE_NAME = 'mi-ruta-' + CACHE_VERSION;
const CORE = [
  './',
  'index.html',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(CORE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isNav = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (isNav) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put('index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html');
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const net = fetch(event.request).then(function (res) {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
