// Service Worker MusiChris - Versión Forzada 2.0
const CACHE_NAME = 'musichris-v32';
const urlsToCache = [
  './',
  './index.html?v=32',
  './css/styles.css?v=32',
  './assets/icon-512.png',
  './js/config.js?v=32',
  './js/app.js?v=32',
  './js/player.js?v=32',
  './js/ui-renderer.js?v=32',
  './js/data-manager.js?v=32',
  './js/modals.js?v=32',
  './js/pwa-manager.js?v=32'
];

// Forzar activación inmediata
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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

// Estrategia: Network First para archivos base, Cache First para el resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypasear audios y peticiones de rango (muy importante para reproductores)
  if (event.request.headers.get('range') || url.pathname.match(/\.(mp3|wav|ogg|m4a)$/) || url.origin.includes('cloudinary')) {
    return; // Dejar que el navegador lo maneje directamente
  }

  // Si es el archivo principal o scripts, intentamos red primero
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
    // Para imágenes y otros, caché primero
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});