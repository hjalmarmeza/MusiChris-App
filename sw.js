// Service Worker MusiChris - Versión Forzada 2.0
const CACHE_NAME = 'musichris-v42';
const urlsToCache = [
  './',
  './index.html?v=42',
  './css/styles.css?v=42',
  './assets/icon-512.png',
  './js/config.js?v=42',
  './js/app.js?v=42',
  './js/player.js?v=42',
  './js/ui-renderer.js?v=42',
  './js/data-manager.js?v=42',
  './js/modals.js?v=42',
  './js/pwa-manager.js?v=42'
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

// Estrategia: Network First para archivos base, Cache First AGRESIVO para Cloudinary
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 🎯 PROTECCIÓN DE CUOTA CLOUDINARY: Cache First AGRESIVO
  // Cloudinary tiene límites estrictos en cuenta gratuita:
  // - 25,000 transformaciones/mes
  // - 25 GB ancho de banda/mes
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('res.cloudinary.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            // ✅ Imagen en caché - NO consume cuota de Cloudinary
            return cachedResponse;
          }

          // ⚠️ Primera vez - Descargar y cachear permanentemente
          return fetch(event.request).then(response => {
            // Solo cachear respuestas exitosas
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(error => {
            console.warn('❌ Error cargando imagen de Cloudinary:', error);
            // Retornar imagen por defecto si falla
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // BYPASS: Dejar que el navegador maneje APIs externas (JSONBin, Google Apps Script)
  if (!url.origin.includes(location.origin)) {
    return;
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
    // Para otros recursos locales, caché primero
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});