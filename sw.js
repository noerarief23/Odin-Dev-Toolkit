/* ================================================================
   Odin Dev Toolkit — Service Worker
   Cache-first strategy for offline PWA support
   ================================================================ */

const CACHE_NAME = 'odin-toolkit-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/valhalla.css',
  './js/odin.js',
  './vendor/alpine.min.js',
  './vendor/tailwindcss.js',
  './vendor/prism.js',
  './vendor/prism.css',
  './vendor/prism-json.min.js',
  './vendor/prism-csharp.min.js',
  './vendor/prism-go.min.js',
  './vendor/prism-python.min.js',
  './vendor/prism-php.min.js',
  './vendor/qrcode.min.js',
  './vendor/lucide.min.js',
  './icons/icon-odin.png'
];

// Install — cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — cache-first, falling back to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip Google Fonts — let those be network-first
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          const fetched = fetch(event.request)
            .then((response) => {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              return response;
            })
            .catch(() => cached);
          return cached || fetched;
        })
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          });
      })
      .catch(() => {
        // Offline fallback for pages
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
