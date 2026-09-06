import type { LottoPronto } from '@/domain/types';
import { client } from './supabase';
import { idCasa } from './casa';
import { aLottoPronto } from './mappers';

/** Tutti i lotti, dal più vecchio: il decadimento lo applica chi legge (porzioniUtilizzabili), qui non si filtra. */
export async function leggiPronti(): Promise<LottoPronto[]> {
  const { data, error } = await client()
    .from('porzione_pronta')
    .select('*')
    .order('preparata_il');
  if (error) throw error;
  return data.map(aLottoPronto);
}

/**
 * Correzione manuale dalla Dispensa: stessa filosofia di correggiResiduo —
 * il numero resta derivato dai gesti, questo rimette in pari quando la
 * realtà se n'è discostata. Zero o meno = il lotto non esiste più.
 */
export async function correggiLotto(id: string, porzioni: number): Promise<void> {
  if (!Number.isFinite(porzioni)) throw new Error(`Porzioni non valide: ${porzioni}.`);
  const sb = client();
  // L'id della casa (casa.ts), non dell'account: per un membro è il proprietario. Una chiamata per funzione: è memorizzata.
  const userId = await idCasa();
  if (porzioni <= 0) {
    const { error } = await sb.from('porzione_pronta').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from('porzione_pronta')
    .update({ porzioni })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Frigo ↔ freezer: cambia la soglia di decadimento del lotto, come il flag congelato del residuo. */
export async function impostaCongelatoLotto(id: string, congelato: boolean): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb
    .from('porzione_pronta')
    .update({ congelato })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function eliminaLotto(id: string): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb.from('porzione_pronta').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
