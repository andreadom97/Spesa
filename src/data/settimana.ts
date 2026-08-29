import type { FonteStato, MealSlot, Scelta, StatoSlot } from '@/domain/types';
import { generaSettimana, applicaStato } from '@/domain/week-shape';
import { assegnaPiatti } from '@/domain/planner';
import { settimanaDelCiclo, settimaneTrascorse } from '@/domain/ciclo';
import { lunediDi } from '@/domain/date';
import { client } from './supabase';
import { aMealSlot } from './mappers';
import { leggiImpostazioni, leggiSlotDefs } from './impostazioni';
import { leggiRepertorio, leggiIngredienti } from './repertorio';
import { leggiDispensa } from './dispensa';

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

  const [slotDefs, repertorio, impostazioni, ingredients, pantry] = await Promise.all([
    leggiSlotDefs(),
    leggiRepertorio(),
    leggiImpostazioni(),
    leggiIngredienti(),
    leggiDispensa(),
  ]);
  // Senza pasti configurati non c'è nulla da mettere negli slot: creare la
  // week comunque lascerebbe una settimana vuota che leggiSettimanaCorrente
  // trova già esistente, quindi non verrebbe mai più rigenerata (l'unique su
  // data_inizio impedisce un secondo tentativo per lo stesso lunedì) — resterebbe
  // vuota fino al lunedì dopo. Meglio nessuna settimana che una vuota bloccata.
  if (slotDefs.length === 0) {
    throw new Error('Configura prima i tuoi pasti in Impostazioni: senza, non c’è nulla da mettere in settimana.');
  }

  const { data: settimana, error } = await sb
    .from('week')
    .insert({ user_id: userId, data_inizio: lunedi, stato: 'bozza' })
    .select('id')
    .single();
  if (error) throw error;
  const weekId = String(settimana.id);

  const bozza = generaSettimana({ dataInizio: lunedi, slotDefs });
  // Le due coordinate del ciclo: *quale* settimana del giro è questa (filtra
  // i piatti) e *quante* ne sono passate dall'origine (fa avanzare la
  // rotazione da un lunedì all'altro, invece di ripartire da zero ogni volta).
  const assegnata = assegnaPiatti({
    slots: bozza,
    dishes: repertorio,
    // Con il ciclo spento si passa null, non 1: le etichette rimaste sui
    // piatti non devono continuare a filtrare dopo che la rotazione è stata
    // disattivata.
    settimanaCiclo: impostazioni.settimaneCiclo > 1
      ? settimanaDelCiclo({
        lunedi,
        origine: impostazioni.cicloOrigine,
        settimaneCiclo: impostazioni.settimaneCiclo,
      })
      : null,
    settimaneTrascorse: settimaneTrascorse(lunedi, impostazioni.cicloOrigine),
    ingredients,
    pantry,
    oggi: new Date().toISOString().slice(0, 10),
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });

  // `.select(...)` sull'insert: senza gli id tornati indietro non si saprebbe
  // a quale meal_slot agganciare le righe di meal_slot_choice qui sotto.
  const { data: slotInseriti, error: eIns } = await sb.from('meal_slot').insert(
    assegnata.map((s) => ({
      user_id: userId,
      week_id: weekId,
      data: s.data,
      slot_def_id: s.slotDefId,
      stato: s.stato,
      dish_id: s.dishId,
      fonte_stato: s.fonteStato,
    })),
  ).select('id, data, slot_def_id');
  if (eIns) throw eIns;

  // Si riabbina per (data, slot_def_id): l'insert non garantisce che
  // l'ordine di ritorno coincida con quello delle righe inviate.
  const idPerSlot = new Map(
    (slotInseriti ?? []).map((r) => [`${String(r.data).slice(0, 10)}|${String(r.slot_def_id)}`, String(r.id)]),
  );

  const righeScelte = assegnata.flatMap((s) => {
    if (Object.keys(s.scelte).length === 0) return [];
    const mealSlotId = idPerSlot.get(`${s.data}|${s.slotDefId}`);
    if (!mealSlotId) return [];
    return Object.entries(s.scelte).map(([componenteId, scelta]) => ({
      user_id: userId,
      meal_slot_id: mealSlotId,
      componente_id: componenteId,
      option_id: scelta.opzioneId,
      fonte: scelta.fonte,
    }));
  });
  if (righeScelte.length > 0) {
    const { error: eScelte } = await sb.from('meal_slot_choice').insert(righeScelte);
    if (eScelte) throw eScelte;
  }

  return weekId;
}

/**
 * Il cambio di `stato` passa sempre per `applicaStato`: una fonte debole non
 * sovrascrive una forte. Il cambio di `dishId` è un percorso indipendente e
 * si applica sempre, qualunque sia `fonte` — non c'è "annullato in silenzio".
 *
 * La distinzione è voluta, non un dettaglio da poter unificare: `FonteStato`
 * è la fonte dello stato casa/fuori (default/calendario/checkin/correzione),
 * non della scelta del piatto. Scegliere un piatto non è una transizione di
 * stato, quindi non passa per la gerarchia delle fonti e non tocca
 * `fonte_stato`. Se lo si facesse passare per lo stesso cancello, la
 * schermata "Scegli il piatto" (Task 13) fallirebbe in silenzio proprio sugli
 * slot che l'utente ha già toccato durante il check-in — cioè quelli su cui
 * è più probabile che voglia cambiare piatto.
 *
 * Anche `scelte` è un percorso indipendente dalla gerarchia delle fonti, come
 * `dishId`: un upsert su `meal_slot_choice` per componente nominato nel patch
 * (`onConflict: 'meal_slot_id,componente_id'`), le scelte non nominate restano
 * quelle che c'erano. Unica differenza da `dishId` da solo: quando il patch
 * cambia anche il piatto (Scegli lo ha sostituito), si cancellano prima TUTTE
 * le `meal_slot_choice` dello slot — le scelte sui componenti del piatto
 * vecchio non hanno significato su quello nuovo, e lasciarle lì rischia di
 * agganciare per errore un option_id del piatto sbagliato.
 */
export async function aggiornaSlot(
  slotId: string,
  patch: { stato?: StatoSlot; dishId?: string | null; scelte?: Record<string, Scelta> },
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

  const aggiornamento: Record<string, unknown> = {};

  if (patch.stato !== undefined) {
    const risultato = applicaStato(attuale, patch.stato, fonte);
    if (risultato.fonteStato === fonte) {
      // La fonte è abbastanza forte da scavalcare quella già registrata.
      aggiornamento.stato = risultato.stato;
      aggiornamento.fonte_stato = risultato.fonteStato;
    }
    // Altrimenti: fonte troppo debole, lo stato non si tocca.
  }

  if (patch.dishId !== undefined) {
    // Percorso indipendente dalla gerarchia delle fonti: non scrive fonte_stato.
    aggiornamento.dish_id = patch.dishId;
  }

  if (Object.keys(aggiornamento).length > 0) {
    const { error: eUpd } = await sb
      .from('meal_slot')
      .update(aggiornamento)
      .eq('id', slotId)
      .eq('user_id', userId);
    if (eUpd) throw eUpd;
  }

  if (patch.dishId !== undefined) {
    // Il piatto è cambiato: le scelte registrate sul piatto vecchio non
    // hanno più significato, si ripulisce prima di scrivere le nuove.
    const { error: eDel } = await sb
      .from('meal_slot_choice')
      .delete()
      .eq('meal_slot_id', slotId);
    if (eDel) throw eDel;
  }

  if (patch.scelte !== undefined) {
    const righe = Object.entries(patch.scelte).map(([componenteId, scelta]) => ({
      user_id: userId,
      meal_slot_id: slotId,
      componente_id: componenteId,
      option_id: scelta.opzioneId,
      fonte: scelta.fonte,
    }));
    if (righe.length > 0) {
      const { error: eUps } = await sb
        .from('meal_slot_choice')
        .upsert(righe, { onConflict: 'meal_slot_id,componente_id' });
      if (eUps) throw eUps;
    }
  }
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
    .select('*, meal_slot_choice(componente_id, option_id, fonte)')
    .eq('week_id', weekId)
    .order('data');
  if (error) throw error;
  return data.map((r) => ({
    ...aMealSlot(r),
    scelte: Object.fromEntries(
      ((r.meal_slot_choice ?? []) as Record<string, unknown>[]).map((c) => [
        String(c.componente_id),
        { opzioneId: String(c.option_id), fonte: c.fonte as Scelta['fonte'] },
      ]),
    ),
  }));
}
