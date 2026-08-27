import type { FonteStato, MealSlot, StatoSlot } from '@/domain/types';
import { generaSettimana, applicaStato } from '@/domain/week-shape';
import { assegnaPiatti } from '@/domain/planner';
import { lunediDi } from '@/domain/date';
import { client } from './supabase';
import { aMealSlot } from './mappers';
import { leggiSlotDefs } from './impostazioni';
import { leggiRepertorio } from './repertorio';

export interface SettimanaCorrente {
  id: string;
  dataInizio: string;
  stato: 'bozza' | 'confermata' | 'chiusa';
  slots: MealSlot[];
}

/**
 * La settimana corrente è quella che **contiene oggi**, non l'ultima creata:
 * se Andrea non apre l'app per due settimane, "l'ultima creata" sarebbe una
 * settimana passata, e `generaListe` costruirebbe la lista sugli slot sbagliati.
 * `data_inizio` è sempre un lunedì (vedi `creaSettimana`), quindi il filtro è
 * `data_inizio = lunediDi(oggi)`: l'unique `(user_id, data_inizio)` dello
 * schema garantisce al più una riga.
 */
export async function leggiSettimanaCorrente(): Promise<SettimanaCorrente | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const oggi = new Date().toISOString().slice(0, 10);
  const { data: settimana, error } = await sb
    .from('week')
    .select('id, data_inizio, stato')
    .eq('user_id', utente.user!.id)
    .eq('data_inizio', lunediDi(oggi))
    .maybeSingle();
  if (error) throw error;
  if (!settimana) return null;

  const weekId = String(settimana.id);
  const slots = await leggiSlotSettimana(weekId);
  return {
    id: weekId,
    dataInizio: String(settimana.data_inizio).slice(0, 10),
    stato: settimana.stato as SettimanaCorrente['stato'],
    slots,
  };
}

/** Genera i default con generaSettimana + assegnaPiatti e li scrive. Restituisce il week id. */
export async function creaSettimana(lunedi: string): Promise<string> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  const [slotDefs, repertorio] = await Promise.all([leggiSlotDefs(), leggiRepertorio()]);

  const { data: settimana, error } = await sb
    .from('week')
    .insert({ user_id: userId, data_inizio: lunedi, stato: 'bozza' })
    .select('id')
    .single();
  if (error) throw error;
  const weekId = String(settimana.id);

  const bozza = generaSettimana({ dataInizio: lunedi, slotDefs });
  const assegnata = assegnaPiatti({ slots: bozza, dishes: repertorio });

  const { error: eIns } = await sb.from('meal_slot').insert(
    assegnata.map((s) => ({
      user_id: userId,
      week_id: weekId,
      data: s.data,
      slot_def_id: s.slotDefId,
      stato: s.stato,
      dish_id: s.dishId,
      fonte_stato: s.fonteStato,
    })),
  );
  if (eIns) throw eIns;

  return weekId;
}

/** Passa sempre per applicaStato: una fonte debole non sovrascrive una forte. */
export async function aggiornaSlot(
  slotId: string,
  patch: { stato?: StatoSlot; dishId?: string | null },
  fonte: FonteStato,
): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  const { data: riga, error } = await sb
    .from('meal_slot')
    .select('*')
    .eq('id', slotId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const attuale = aMealSlot(riga);
  const risultato = applicaStato(attuale, patch.stato ?? attuale.stato, fonte);
  if (risultato.fonteStato !== fonte) {
    // La fonte non è abbastanza forte da scavalcare quella già registrata:
    // né lo stato né il piatto si aggiornano.
    return;
  }

  const { error: eUpd } = await sb
    .from('meal_slot')
    .update({
      stato: risultato.stato,
      dish_id: patch.dishId !== undefined ? patch.dishId : attuale.dishId,
      fonte_stato: risultato.fonteStato,
    })
    .eq('id', slotId)
    .eq('user_id', userId);
  if (eUpd) throw eUpd;
}

export async function confermaSettimana(weekId: string): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('week')
    .update({ stato: 'confermata' })
    .eq('id', weekId)
    .eq('user_id', utente.user!.id);
  if (error) throw error;
}

/** Usata da generaListe nel Task 14. */
export async function leggiSlotSettimana(weekId: string): Promise<MealSlot[]> {
  const { data, error } = await client()
    .from('meal_slot')
    .select('*')
    .eq('week_id', weekId)
    .order('data');
  if (error) throw error;
  return data.map(aMealSlot);
}
