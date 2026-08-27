import type { Impostazioni, MealSlotDef } from '@/domain/types';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { client } from './supabase';
import { aSlotDef } from './mappers';

/** Deve coincidere con il default della colonna `moltiplicatore_porzioni`. */
const MOLTIPLICATORE_DEFAULT = 1;

/**
 * Se la riga `settings` non esiste ancora per l'utente (mai salvata),
 * restituisce i default: `costruisciLista` lancia se `ordineAree` non è una
 * permutazione esatta delle sei aree, quindi qui non si può restituire un
 * array vuoto o parziale.
 */
export async function leggiImpostazioni(): Promise<Impostazioni> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('settings')
    .select('moltiplicatore_porzioni, ordine_aree')
    .eq('user_id', utente.user!.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return { moltiplicatorePorzioni: MOLTIPLICATORE_DEFAULT, ordineAree: [...ORDINE_AREE_DEFAULT] };
  }
  return {
    moltiplicatorePorzioni: Number(data.moltiplicatore_porzioni),
    ordineAree: data.ordine_aree as Impostazioni['ordineAree'],
  };
}

export async function salvaImpostazioni(i: Impostazioni): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('settings').upsert({
    user_id: utente.user!.id,
    moltiplicatore_porzioni: i.moltiplicatorePorzioni,
    ordine_aree: i.ordineAree,
  });
  if (error) throw error;
}

/** Ordinati per posizione. Da 3 a 5 righe. */
export async function leggiSlotDefs(): Promise<MealSlotDef[]> {
  const { data, error } = await client()
    .from('meal_slot_def')
    .select('*')
    .order('posizione');
  if (error) throw error;
  return data.map(aSlotDef);
}

/**
 * Riscrive l'intero insieme; rifiuta meno di 3 o più di 5.
 *
 * Non è un delete-then-insert indiscriminato: `dish.slot_def_id` referenzia
 * `meal_slot_def` con `on delete cascade`, quindi cancellare e ricreare tutte
 * le righe (con id nuovi o anche uguali ma passando per un delete totale)
 * si porterebbe via in cascata anche i piatti del repertorio. Si elimina solo
 * l'insieme delle righe che non compaiono più nel nuovo elenco — la cascata
 * su quei soli pasti è voluta — e si fa upsert delle altre.
 */
export async function salvaSlotDefs(defs: MealSlotDef[]): Promise<void> {
  if (defs.length < 3 || defs.length > 5) {
    throw new Error(`I pasti configurabili devono essere da 3 a 5: ricevuti ${defs.length}.`);
  }
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  const idAttuali = new Set(defs.map((d) => d.id));
  const { data: esistenti, error: eSel } = await sb
    .from('meal_slot_def')
    .select('id')
    .eq('user_id', userId);
  if (eSel) throw eSel;

  const daRimuovere = (esistenti ?? [])
    .map((r) => String(r.id))
    .filter((id) => !idAttuali.has(id));
  if (daRimuovere.length > 0) {
    const { error: eDel } = await sb
      .from('meal_slot_def')
      .delete()
      .in('id', daRimuovere)
      .eq('user_id', userId);
    if (eDel) throw eDel;
  }

  const { error: eUps } = await sb.from('meal_slot_def').upsert(
    defs.map((d) => ({
      id: d.id,
      user_id: userId,
      nome: d.nome,
      posizione: d.posizione,
      assenze_abituali: d.assenzeAbituali,
    })),
  );
  if (eUps) throw eUps;
}
