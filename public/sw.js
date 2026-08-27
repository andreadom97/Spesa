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
  // Si mette in cache solo la stessa origine dell'app: il guscio è tutto
  // same-origin, quindi non perdiamo niente. Le chiamate a servizi esterni
  // (Supabase e chiunque altro, oggi o in futuro) restano sempre fuori dalla
  // cache per costruzione — non per un elenco di path da tenere aggiornato —
  // perché mostrerebbero dati vecchi come se fossero freschi. Offline ci
  // pensa la coda delle spunte.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
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
