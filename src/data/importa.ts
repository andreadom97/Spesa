import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { validaEsito } from '@/domain/import/valida';
import { client } from './supabase';

export interface BozzaImport {
  piano: PianoEstratto;
  statoRevisione: StatoRevisione;
}

export async function leggiBozzaImport(): Promise<BozzaImport | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('import_draft')
    .select('piano, stato_revisione')
    .eq('user_id', utente.user!.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Il jsonb torna dal database senza garanzie di forma: si rivalida come al
  // bordo API. Una bozza corrotta si tratta come assente, non come un crash.
  try {
    const esito = validaEsito({ tipo: 'piano', piano: data.piano });
    if (esito.tipo !== 'piano') return null;
    return { piano: esito.piano, statoRevisione: data.stato_revisione as StatoRevisione };
  } catch {
    return null;
  }
}

export async function salvaBozzaImport(b: BozzaImport): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').upsert({
    user_id: utente.user!.id,
    piano: b.piano,
    stato_revisione: b.statoRevisione,
  });
  if (error) throw error;
}

export async function cancellaBozzaImport(): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').delete().eq('user_id', utente.user!.id);
  if (error) throw error;
}
