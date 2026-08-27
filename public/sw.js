const CACHE = 'spesa-v1';
const GUSCIO = ['/lista', '/settimana', '/piatti', '/manifest.json'];

// Ultima rete di sicurezza: se offline e nemmeno '/lista' è in cache (mai
// visitata prima), una risposta che risolve `undefined` sarebbe trattata
// dalla Fetch API come un errore di rete — Chrome mostrerebbe il dinosauro
// al posto dell'app. 503 perché non è la pagina richiesta ma un'indisponibilità
// temporanea; Retry-After suggerisce di riprovare a breve.
function paginaOffline() {
  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spesa — offline</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #F1F0EE;
    color: #14163A;
    font-family: system-ui, sans-serif;
    text-align: center;
  }
</style>
</head>
<body>
  <p>Sei offline. Riapri l'app quando torna la rete: funziona di nuovo appena si riconnette.</p>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '5',
    },
  });
}

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
      .catch(() =>
        caches.match(e.request)
          .then((r) => r ?? caches.match('/lista'))
          .then((r) => r ?? paginaOffline()),
      ),
  );
});
