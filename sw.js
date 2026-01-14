// Service Worker básico para PWA
const CACHE_NAME = 'musichris-v5';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});


self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});


self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});