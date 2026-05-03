const CACHE_NAME = 'cinepro-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/movie.html',
  '/style.css',
  '/main.js',
  '/movie.js',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
