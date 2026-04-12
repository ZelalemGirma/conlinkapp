const CACHE_NAME = 'conlink-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

const DEV_PATH_PREFIXES = ['/src/', '/node_modules/', '/@vite/'];
const CACHEABLE_DESTINATIONS = new Set(['style', 'script', 'worker', 'font', 'image', 'manifest']);

const putInCache = async (request, response) => {
  if (!response || !response.ok) return response;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (DEV_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
            await cache.put('/index.html', response.clone());
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || caches.match('/index.html');
        })
    );
    return;
  }

  if (!CACHEABLE_DESTINATIONS.has(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => caches.match('/index.html'));
    })
  );
});
