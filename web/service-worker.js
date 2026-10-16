/* eslint-env serviceworker */
/* global __PRECACHE_FILES__ */
// Replaced at build time. Only public app files are cached, never student data.
const VERSION = '__BUILD_VERSION__';
const FILES = __PRECACHE_FILES__;
const PREFIX = `permis-tn:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const appURL = path => new URL(path, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES.map(appURL))),
  );
  // Wait for existing windows to close; never reload an unsaved form.
});
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== CACHE) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (
    request.method !== 'GET' ||
    new URL(request.url).pathname.startsWith('/api/') ||
    !request.url.startsWith(self.registration.scope)
  ) {
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (request.mode === 'navigate') {
        return (
          (await cache.match(appURL('index.html'), { ignoreVary: true })) ||
          fetch(request)
        );
      }
      // These are immutable public build assets. Dev/static hosts can add
      // Vary: Origin, which differs between precache fetches and module loads.
      return (
        (await cache.match(request, { ignoreVary: true })) || fetch(request)
      );
    })(),
  );
});
