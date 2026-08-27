const CACHE = 'spesa-v1';
const GUSCIO = ['/lista', '/settimana', '/piatti', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Le chiamate a Supabase non si mettono mai in cache: mostrerebbero dati
  // vecchi come se fossero freschi. Offline ci pensa la coda delle spunte.
  if (e.request.method !== 'GET' || url.pathname.startsWith('/rest/')) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r ?? caches.match('/lista'))),
  );
});
