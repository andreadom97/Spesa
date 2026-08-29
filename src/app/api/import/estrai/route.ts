import { readFile } from 'fs/promises';
import { join } from 'path';
import { validaEsito } from '@/domain/import/valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';

/**
 * POST /api/import/estrai — riceve FormData (immagini: File[] oppure documento: File)
 * e restituisce l'EsitoEstrazione validato.
 *
 * Oggi ANTHROPIC_API_KEY è sempre assente: si serve sempre un mock, scelto da
 * IMPORT_MOCK ('sintetico' | 'rifiuto' | altro → file su disco, default 'dieta6').
 * Quando la chiave sarà configurata, questo blocco andrà sostituito dalla
 * chiamata a estrattoreClaude: stessa firma della route, altra implementazione.
 */
export async function POST(request: Request): Promise<Response> {
  // L'input reale si legge e si ignora nel mock: la firma resta quella vera.
  await request.formData();

  const mock = process.env.IMPORT_MOCK ?? 'dieta6';

  let contenutoGrezzo: unknown;
  if (mock === 'sintetico') {
    contenutoGrezzo = FIXTURE_MENU_SETTIMANALE;
  } else if (mock === 'rifiuto') {
    contenutoGrezzo = FIXTURE_RIFIUTO_MACRO;
  } else {
    const percorso = join(process.cwd(), 'diete/estrazioni/piani', `${mock}.json`);
    let testo: string;
    try {
      testo = await readFile(percorso, 'utf-8');
    } catch {
      return Response.json({ errore: 'estrazione non disponibile' }, { status: 503 });
    }
    try {
      contenutoGrezzo = JSON.parse(testo);
    } catch (err) {
      const messaggio = err instanceof Error ? err.message : String(err);
      return Response.json({ errore: messaggio }, { status: 500 });
    }
  }

  try {
    const esito = validaEsito(contenutoGrezzo);
    return Response.json(esito, { status: 200 });
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err);
    return Response.json({ errore: messaggio }, { status: 500 });
  }
}
