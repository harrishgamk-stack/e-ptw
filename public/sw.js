/* No permit, verification, session or API responses are cached. */
self.addEventListener('install', event => {
  event.waitUntil(caches.open('pcg-offline-v1').then(cache => cache.add('/offline.html')));
  self.skipWaiting();
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
