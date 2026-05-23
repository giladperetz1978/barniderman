const CACHE_NAME = 'bar-fit-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './bar_avatar.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const coreFiles = ['index.html', 'app.js', 'style.css', 'manifest.json', 'sw.js'];
  const isCoreAsset = isSameOrigin && (
    event.request.mode === 'navigate' ||
    coreFiles.some(file => requestUrl.pathname.endsWith(`/${file}`))
  );

  if (isCoreAsset) {
    // Network-first avoids getting stuck on stale JS after deploy.
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
