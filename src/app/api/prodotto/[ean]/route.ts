import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { eanValido, analizzaQuantitaOFF } from '@/domain/ean';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product/';
const OFF_FIELDS = 'product_name,brands,quantity,product_quantity,product_quantity_unit';
/** OFF chiede un User-Agent che dica chi chiama: lo mette il server, il browser non può. */
const USER_AGENT = 'Spesa/1.0 (https://github.com/andreadom97/Spesa)';
const TIMEOUT_MS = 8000;
const MAX_CARATTERI = 80;

/** Testo per la UI: stringa, senza spazi ai bordi, al più 80 caratteri; '' se OFF non lo ha. */
function taglia(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, MAX_CARATTERI) : '';
}

/** Un giorno: la data cache di Next verso OFF e il `max-age` verso il browser. */
const REVALIDATE_S = 86_400;
/** Solo sui 200: un errore non si tiene. */
const CACHE_200 = { 'Cache-Control': `private, max-age=${REVALIDATE_S}` };

/**
 * GET /api/prodotto/[ean] — nome, marca e quantità della confezione da Open Food
 * Facts (spec scan-confezione §2).
 *
 * Passa dal server e non dal browser per tre ragioni: OFF vuole uno `User-Agent`
 * esplicito, che una fetch dal browser non può impostare; il browser non ha
 * nulla da verificare sul CORS; e il codice a barre resta fra il client e noi.
 * La route legge e basta: nessuna scrittura, e nel log non finisce mai il
 * codice — dice cosa mangi.
 *
 * Cache: la risposta di OFF dipende solo dall'URL, cioè dal codice a barre —
 * nessun dato dell'utente ci entra (la sessione serve solo a decidere SE
 * rispondere, non COSA). Quindi si può tenere: la fetch verso OFF passa dalla
 * data cache di Next con `next: { revalidate: 86400 }` (un giorno: il formato
 * di un prodotto non cambia di ora in ora, e una casa scansiona spesso gli
 * stessi pacchi), e il 200 porta `Cache-Control: private, max-age=86400` per
 * il browser — `private` perché la risposta è dietro sessione e non deve
 * finire in una cache condivisa. Per la data cache vedi
 * node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md.
 *
 * Sessione: il proxy già rimanda a /entra chi non ce l'ha; qui in più si
 * verifica `auth.getUser()` col client dei cookie della richiesta (GET dalla
 * stessa origine: il cookie basta, niente Bearer come in /api/import/estrai).
 *
 * Risposte: 400 codice non valido; 401 senza sessione; 200 `{ trovato: true,
 * nome, marca, quantita | null }`; 200 `{ trovato: false }` se OFF risponde
 * `status: 0`, senza `product` o 404; 502 su rete, timeout, 5xx e corpo
 * illeggibile. Il `GET` è dinamico di per sé (legge la richiesta): niente
 * `force-dynamic`.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ean: string }> }): Promise<Response> {
  const { ean } = await params;
  if (!eanValido(ean)) return Response.json({ errore: 'codice non valido' }, { status: 400 });
  const codice = ean.trim();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Solo lettura: la route non rinfresca la sessione, ci pensa il proxy.
        setAll() {},
      },
    },
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return Response.json({ errore: 'non autenticato' }, { status: 401 });

  let corpo: unknown;
  try {
    const res = await fetch(`${OFF_BASE}${codice}.json?fields=${OFF_FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_S },
    });
    if (res.status === 404) return Response.json({ trovato: false }, { status: 200, headers: CACHE_200 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    corpo = await res.json();
  } catch (err) {
    console.error('prodotto: Open Food Facts non raggiungibile.', err instanceof Error ? err.name : 'errore');
    return Response.json({ errore: 'servizio non raggiungibile' }, { status: 502 });
  }

  const risposta = typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  const product = risposta.product;
  if (risposta.status === 0 || typeof product !== 'object' || product === null) {
    return Response.json({ trovato: false }, { status: 200, headers: CACHE_200 });
  }
  const p = product as Record<string, unknown>;
  return Response.json(
    { trovato: true, nome: taglia(p.product_name), marca: taglia(p.brands), quantita: analizzaQuantitaOFF(p) },
    { status: 200, headers: CACHE_200 },
  );
}
