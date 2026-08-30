import { readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { validaEsito, PianoNonValidoError } from '@/domain/import/valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import { estraiPiano, modelloImportConfigurato, type FileEstrazione } from '@/server/import-ai';

// Un piano intero è un output lungo: il default Vercel troncherebbe la chiamata.
export const maxDuration = 300;

const MIME_IMMAGINI = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMMAGINI = 12;
const MAX_BYTE_TOTALI = 4 * 1024 * 1024;

/**
 * POST /api/import/estrai — FormData (immagini: File[] oppure documento: File PDF)
 * → EsitoEstrazione validato. Auth JWT e cap prima di tutto (la chiamata costa
 * denaro e minuti), poi tre rami in ordine: chiave → estraiPiano;
 * IMPORT_MOCK (solo sviluppo, mai su Vercel) → mock; altrimenti 503.
 * Ogni esito passa da validaEsito: o è integralmente valido o non esce.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) return Response.json({ errore: 'non autorizzato' }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ errore: 'non autorizzato' }, { status: 401 });

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
    if (immagini.length > MAX_IMMAGINI) return Response.json({ errore: 'troppe pagine: la v1 accetta fino a 12 foto' }, { status: 413 });
    const byteTotali = immagini.reduce((s, f) => s + f.size, 0);
    if (byteTotali > MAX_BYTE_TOTALI) return Response.json({ errore: 'file troppo grandi, riprova con foto più leggere' }, { status: 413 });
  }

  let contenutoGrezzo: unknown;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const files: FileEstrazione[] = await Promise.all(
        (pdf ? [pdf] : immagini).map(async (f) => ({
          tipo: pdf ? ('pdf' as const) : ('immagine' as const),
          mime: f.type,
          base64: Buffer.from(await f.arrayBuffer()).toString('base64'),
        })),
      );
      contenutoGrezzo = await estraiPiano(files, modelloImportConfigurato());
    } catch (err) {
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
