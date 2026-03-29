// Service Worker MusiChris - Versión Forzada v66.6
const CACHE_NAME = 'musichris-v66-6';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './assets/icon-512.png',
  './js/config.js',
  './js/app.js',
  './js/player.js',
  './js/ui-renderer.js',
  './js/data-manager.js',
  './js/modals.js',
  './js/pwa-manager.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Cacheando recursos principales v66.6');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Borrando caché vieja:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 🚫 Bloquear archivos .map de chart.js
  if (url.pathname.endsWith('.map') && url.pathname.includes('chart')) {
    event.respondWith(new Response('', { status: 200, statusText: 'OK' }));
    return;
  }

  // 🎯 Cloudinary: Cache First
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('res.cloudinary.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // APIs externas (JSONBin, Google Sheets) Bypass
  if (!url.origin.includes(location.origin)) {
    return;
  }

  // Scripts/Estilos/HTML: Network First con cache update
  if (url.origin === location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});