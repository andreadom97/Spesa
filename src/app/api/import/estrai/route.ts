import { readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { validaEsito, PianoNonValidoError } from '@/domain/import/valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import {
  estraiPianoAPagine,
  modelloImportConfigurato,
  concorrenzaImportConfigurata,
  type FileEstrazione,
} from '@/server/import-ai';
import { dividiPdf, PdfIllegibileError } from '@/server/pdf-pagine';
import { limiteImport30ggConfigurato, contaImportRecenti, registraImport } from '@/data/import-uso';

// Un piano intero è un output lungo: il default Vercel troncherebbe la chiamata.
export const maxDuration = 300;

const MIME_IMMAGINI = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMMAGINI = 12;
const MAX_BYTE_TOTALI = 4 * 1024 * 1024;
const FINESTRA_LIMITE_MS = 30 * 24 * 60 * 60 * 1000;

const ERRORE_TROPPE_PAGINE = 'troppe pagine: la v1 accetta fino a 12 foto';

/** gg/mm/aaaa nel fuso italiano: la data che l'utente legge è quella del suo calendario, non quella del server. */
function formattaDataItaliana(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Rome' });
}

/**
 * POST /api/import/estrai — FormData (immagini: File[] oppure documento: File PDF)
 * → EsitoEstrazione validato. Auth JWT e cap prima di tutto (la chiamata costa
 * denaro e minuti), poi tre rami in ordine: chiave → pipeline a pagine;
 * IMPORT_MOCK (solo sviluppo, mai su Vercel) → mock; altrimenti 503.
 *
 * Nel ramo chiave, nell'ordine: tetto per utente (spec 2026-09-05 §3, 429 con la
 * data del prossimo import), divisione del PDF in pagine (400 se non si apre; 413
 * oltre le 12 pagine, stesso cap delle foto), registrazione del tentativo su
 * `import_uso` col client che porta il JWT dell'utente (così vale la RLS), e solo
 * dopo le chiamate al modello. Mock e 503 non contano né registrano nulla.
 * Ogni esito passa da validaEsito: o è integralmente valido o non esce.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) return Response.json({ errore: 'non autorizzato' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ errore: 'non autorizzato' }, { status: 401 });
  const userId = data.user.id;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
  }
  const immagini = form.getAll('immagini').filter((f): f is File => f instanceof File);
  const documento = form.get('documento');
  const pdf = documento instanceof File ? documento : null;
  if (immagini.length === 0 && !pdf) return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
  if (immagini.length > 0 && pdf) return Response.json({ errore: 'richiesta non valida' }, { status: 400 });

  if (pdf) {
    if (pdf.type !== 'application/pdf') return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
    if (pdf.size > MAX_BYTE_TOTALI) return Response.json({ errore: 'file troppo grandi, riprova con foto più leggere' }, { status: 413 });
  } else {
    if (immagini.some((f) => !MIME_IMMAGINI.has(f.type))) return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
    if (immagini.length > MAX_IMMAGINI) return Response.json({ errore: ERRORE_TROPPE_PAGINE }, { status: 413 });
    const byteTotali = immagini.reduce((s, f) => s + f.size, 0);
    if (byteTotali > MAX_BYTE_TOTALI) return Response.json({ errore: 'file troppo grandi, riprova con foto più leggere' }, { status: 413 });
  }

  let contenutoGrezzo: unknown;
  if (process.env.ANTHROPIC_API_KEY) {
    const modello = modelloImportConfigurato();
    // Il tetto vale solo qui: mock e 503 non spendono nulla. Con limite 0 (solo
    // sviluppo) non si conta né si registra. Il client con il JWT dell'utente negli
    // header è quello che fa valere la RLS di import_uso: nessuna service key.
    const limite = limiteImport30ggConfigurato();
    const sbUtente = limite > 0 ? createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } }) : null;
    try {
      if (sbUtente) {
        const adesso = new Date();
        const { conteggio, piuVecchio } = await contaImportRecenti(sbUtente, userId, adesso);
        if (conteggio >= limite) {
          const prossimo = new Date((piuVecchio ?? adesso).getTime() + FINESTRA_LIMITE_MS);
          return Response.json(
            { errore: `hai già fatto ${limite} import negli ultimi 30 giorni: il prossimo dal ${formattaDataItaliana(prossimo)}` },
            { status: 429 },
          );
        }
      }

      // Il PDF si divide PRIMA di registrare: `pagine` dev'essere il numero vero
      // (check SQL 1..12) e un PDF illeggibile non deve consumare uno slot.
      let files: FileEstrazione[];
      if (pdf) {
        const pagine = await dividiPdf(Buffer.from(await pdf.arrayBuffer()).toString('base64'));
        if (pagine.length > MAX_IMMAGINI) return Response.json({ errore: ERRORE_TROPPE_PAGINE }, { status: 413 });
        files = pagine.map((base64) => ({ tipo: 'pdf' as const, mime: 'application/pdf', base64 }));
      } else {
        files = await Promise.all(
          immagini.map(async (f) => ({
            tipo: 'immagine' as const,
            mime: f.type,
            base64: Buffer.from(await f.arrayBuffer()).toString('base64'),
          })),
        );
      }

      if (sbUtente) await registraImport(sbUtente, userId, files.length, modello);

      const { grezzo } = await estraiPianoAPagine(files, modello, { concorrenza: concorrenzaImportConfigurata() });
      contenutoGrezzo = grezzo;
    } catch (err) {
      if (err instanceof PdfIllegibileError) {
        console.error('import/estrai: PDF illeggibile.');
        return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
      }
      // Indice o pagina non validi dalla pipeline: è la dieta che non si è capita,
      // non un guasto — stesso 422 dell'esito che non passa validaEsito.
      if (err instanceof PianoNonValidoError) {
        console.error('import/estrai: pagina o indice non validi.', err.message);
        return Response.json({ errore: 'non ho capito la dieta, riprova' }, { status: 422 });
      }
      // Tutto il resto (modello, rete, Supabase su conteggio o registrazione): 502.
      // Un import non registrato non passa: il tetto dev'essere sempre vero.
      console.error('import/estrai: estrazione fallita.', err instanceof Error ? err.name : 'errore');
      return Response.json({ errore: 'estrazione non riuscita, riprova' }, { status: 502 });
    }
  } else if (process.env.IMPORT_MOCK) {
    const mock = process.env.IMPORT_MOCK;
    if (mock === 'sintetico') {
      contenutoGrezzo = FIXTURE_MENU_SETTIMANALE;
    } else if (mock === 'rifiuto') {
      contenutoGrezzo = FIXTURE_RIFIUTO_MACRO;
    } else {
      try {
        contenutoGrezzo = JSON.parse(await readFile(join(process.cwd(), 'diete/estrazioni/piani', `${mock}.json`), 'utf-8'));
      } catch {
        return Response.json({ errore: 'estrazione non disponibile' }, { status: 503 });
      }
    }
  } else {
    return Response.json({ errore: 'estrazione non disponibile' }, { status: 503 });
  }

  try {
    return Response.json(validaEsito(contenutoGrezzo), { status: 200 });
  } catch (err) {
    if (err instanceof PianoNonValidoError) {
      console.error('import/estrai: esito non valido.', err.message);
      return Response.json({ errore: 'non ho capito la dieta, riprova' }, { status: 422 });
    }
    console.error('import/estrai: validazione fallita.', err);
    return Response.json({ errore: 'estrazione non riuscita, riprova' }, { status: 502 });
  }
}
