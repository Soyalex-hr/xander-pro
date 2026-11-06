// Service Worker for Xander Pro PWA (Network-First for HTML, Cache-First for Assets)
const CACHE_NAME = 'xander-pro-v28';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-192.svg',
  './icon-512.svg',
  './icon-192.png',
  './icon-512.png',
  './app.ico',
  './img/cabana-1.svg',
  './img/cabana-2.svg',
  './img/cabana-3.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Solo gestionar archivos de la propia app. Las imágenes y librerías externas
  // (Unsplash, CDN) las carga el navegador directamente: la CSP de Vercel no
  // permite que el Service Worker las descargue y las fotos quedaban en blanco.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    // Strategy: NETWORK FIRST for HTML navigation.
    // Always load the freshest version instantly when online without needing manual refresh!
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, fallback gracefully to cached HTML
          return caches.match('./index.html').then(cached => cached || caches.match('./'));
        })
    );
    return;
  }

  // Strategy: CACHE FIRST for static assets (images, icons, manifest)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
