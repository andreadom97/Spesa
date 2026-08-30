import { createClient } from '@supabase/supabase-js';
import type { ContestoDispensa } from '@/domain/dispensa-ai';
import { validaProposte, EsitoNonValidoError } from '@/domain/dispensa-ai';
import { mockCorrezione } from '@/domain/dispensa-ai-mock';
import { interpretaNota, modelloConfigurato } from '@/server/dispensa-ai';

/**
 * POST /api/dispensa/correggi — { nota, contesto } → EsitoCorrezione.
 *
 * Il contesto lo manda il client (la Dispensa ha già i dati): la route non
 * tocca il database, verifica solo che chi chiama abbia una sessione vera —
 * la chiamata costa denaro (spec §2, §7). Tre rami in ordine: chiave →
 * modello vero; DISPENSA_AI_MOCK=1 (solo sviluppo, mai su Vercel) →
 * interprete a regole; altrimenti 503, lo stato di produzione finché la
 * chiave non c'è. Ogni esito passa da validaProposte: o è integralmente
 * valido o non arriva alla UI.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!token) return Response.json({ errore: 'non autorizzato' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ errore: 'non autorizzato' }, { status: 401 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
  }
  if (typeof corpo !== 'object' || corpo === null) {
    return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
  }
  const nota = (corpo as Record<string, unknown>).nota;
  const contesto = (corpo as Record<string, unknown>).contesto;
  if (
    typeof nota !== 'string' || nota.trim().length === 0 || nota.trim().length > 2000 ||
    !Array.isArray(contesto) || contesto.length > 500 ||
    !contesto.every((v) => typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).id === 'string')
  ) {
    return Response.json({ errore: 'richiesta non valida' }, { status: 400 });
  }
  const contestoTipato = contesto as ContestoDispensa;

  let grezzo: unknown;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      grezzo = await interpretaNota(nota, contestoTipato, modelloConfigurato());
    } catch {
      return Response.json({ errore: 'correzione non riuscita, riprova' }, { status: 502 });
    }
  } else if (process.env.DISPENSA_AI_MOCK === '1') {
    grezzo = mockCorrezione(nota, contestoTipato);
  } else {
    return Response.json({ errore: 'correzione non disponibile' }, { status: 503 });
  }

  try {
    return Response.json(validaProposte(grezzo, contestoTipato), { status: 200 });
  } catch (err) {
    if (err instanceof EsitoNonValidoError) {
      return Response.json({ errore: 'non ho capito la nota, riprova' }, { status: 422 });
    }
    const messaggio = err instanceof Error ? err.message : String(err);
    return Response.json({ errore: messaggio }, { status: 500 });
  }
}
