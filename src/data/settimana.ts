import type { FonteStato, MealSlot, Scelta, StatoSlot } from '@/domain/types';
import { generaSettimana, applicaStato } from '@/domain/week-shape';
import { assegnaPiatti } from '@/domain/planner';
import { consumoSlot, deltaStorno } from '@/domain/storno';
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
 * La settimana che inizia al lunedì passato. `data_inizio` è sempre un lunedì
 * (vedi creaSettimana) e l'unique `(user_id, data_inizio)` garantisce al più
 * una riga. Parametrica dal 2026-08-29: la spunta pasti arriva anche alla
 * settimana precedente (spec spunta-pasti §6), e Scegli deve caricare la
 * settimana della SUA data, non quella di oggi.
 */
export async function leggiSettimana(lunedi: string): Promise<SettimanaCorrente | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data: settimana, error } = await sb
    .from('week')
    .select('id, data_inizio, stato')
    .eq('user_id', utente.user!.id)
    .eq('data_inizio', lunedi)
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

/**
 * La settimana corrente è quella che **contiene oggi**, non l'ultima creata:
 * se Andrea non apre l'app per due settimane, "l'ultima creata" sarebbe una
 * settimana passata, e `generaListe` costruirebbe la lista sugli slot sbagliati.
 */
export async function leggiSettimanaCorrente(): Promise<SettimanaCorrente | null> {
  const oggi = new Date().toISOString().slice(0, 10);
  return leggiSettimana(lunediDi(oggi));
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
    if (!mealSlotId) {
      // Un mismatch qui vuol dire che l'insert non ha restituito la riga
      // attesa per questa (data, slot_def_id): scartare le scelte in
      // silenzio produrrebbe una settimana con piatti assegnati ma senza
      // scelte, indistinguibile da un piatto senza componenti. Meglio far
      // rumore subito.
      throw new Error(
        `creaSettimana: nessun meal_slot inserito trovato per data=${s.data} slot_def_id=${s.slotDefId}, impossibile salvare le scelte.`,
      );
    }
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
 * *cambia* il piatto rispetto a quello già registrato (`patch.dishId !==
 * attuale.dishId` — Scegli lo ha sostituito), si cancellano prima TUTTE le
 * `meal_slot_choice` dello slot — le scelte sui componenti del piatto vecchio
 * non hanno significato su quello nuovo, e lasciarle lì rischia di agganciare
 * per errore un option_id del piatto sbagliato. Se `dishId` è presente nel
 * patch ma è lo stesso di prima (il Task 9 può mandarlo invariato insieme a
 * `scelte` per i soli componenti toccati), non si cancella nulla.
 *
 * Ordine delle scritture: delete delle scelte → update di `meal_slot` →
 * upsert delle nuove scelte. Se qualcosa fallisce a metà, questo ordine
 * degenera sempre nel caso benigno "piatto vecchio, scelte vuote" — mai in
 * "piatto nuovo con le scelte del piatto vecchio", che sarebbe il peggiore
 * dei due (un option_id che punta a un componente/opzione di un altro
 * piatto).
 *
 * In coda, dopo tutte le scritture su `meal_slot`/`meal_slot_choice`, il
 * ledger degli storni (spec spunta-pasti §5.1): scritture slot → ledger →
 * pantry, sempre in quest'ordine. Un fallimento a metà degenera in uno
 * storno visibile e correggibile dalla Dispensa, mai in uno stato slot
 * incoerente.
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
    .select('*, meal_slot_choice(componente_id, option_id, fonte)')
    .eq('id', slotId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const attuale: MealSlot = {
    ...aMealSlot(riga),
    scelte: Object.fromEntries(
      ((riga.meal_slot_choice ?? []) as Record<string, unknown>[]).map((c) => [
        String(c.componente_id),
        { opzioneId: String(c.option_id), fonte: c.fonte as Scelta['fonte'] },
      ]),
    ),
  };

  const cambioPiatto = patch.dishId !== undefined && patch.dishId !== attuale.dishId;
  if (cambioPiatto) {
    // Il piatto sta per cambiare: le scelte registrate sul piatto vecchio non
    // hanno più significato. Si ripulisce PRIMA dell'update di meal_slot, così
    // un fallimento a metà lascia "piatto vecchio, scelte vuote" — mai
    // "piatto nuovo con le scelte del piatto vecchio".
    const { error: eDel } = await sb
      .from('meal_slot_choice')
      .delete()
      .eq('meal_slot_id', slotId)
      .eq('user_id', userId);
    if (eDel) throw eDel;
  }

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

  // ── Il ledger degli storni (spec spunta-pasti §5.1) ─────────────────────
  // Da quando la lista è generata, ogni mutazione che cambia il consumo dello
  // slot scrive la differenza nel ledger e la applica al residuo. Prima
  // (settimana bozza) il toggle è pianificazione: ci pensa costruisciLista,
  // e accreditare qui sarebbe un doppio credito.
  const { data: week, error: eWeek } = await sb
    .from('week')
    .select('stato')
    .eq('id', String(riga.week_id))
    .eq('user_id', userId)
    .single();
  if (eWeek) throw eWeek;
  if (week.stato === 'bozza') return;

  // Lo slot come le scritture sopra lo hanno lasciato: stato passato dal
  // cancello delle fonti (se troppo debole, aggiornamento.stato è assente e
  // lo stato resta quello di prima), piatto dal patch, scelte con la stessa
  // regola della scrittura (cambio piatto = si riparte dal patch; altrimenti
  // merge sulle esistenti).
  const statoDopo = (aggiornamento.stato as StatoSlot | undefined) ?? attuale.stato;
  const dishIdDopo = patch.dishId !== undefined ? patch.dishId : attuale.dishId;
  const scelteDopo = cambioPiatto ? (patch.scelte ?? {}) : { ...attuale.scelte, ...(patch.scelte ?? {}) };

  const [repertorio, ingredienti, impostazioni] = await Promise.all([
    leggiRepertorio(), leggiIngredienti(), leggiImpostazioni(),
  ]);
  const piattoPerId = new Map(repertorio.map((d) => [d.id, d]));

  // consumoSlot può lanciare (ingrediente sparito, opzione rimossa): succede
  // QUI, prima di ogni scrittura di ledger/pantry — o il calcolo è completo
  // o non si applica nulla (spec §7).
  const prima = consumoSlot({
    slot: attuale,
    dish: attuale.dishId ? piattoPerId.get(attuale.dishId) ?? null : null,
    ingredients: ingredienti,
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });
  const dopo = consumoSlot({
    slot: { ...attuale, stato: statoDopo, dishId: dishIdDopo, scelte: scelteDopo },
    dish: dishIdDopo ? piattoPerId.get(dishIdDopo) ?? null : null,
    ingredients: ingredienti,
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });
  const deltas = deltaStorno(prima, dopo);
  if (deltas.length === 0) return;

  // Una riga CUMULATIVA per (slot, ingrediente): leggi-somma-scrivi, cumulo a
  // zero = riga cancellata. Non è atomico, ma l'app è mono-utente e il danno
  // peggiore (doppio tap ravvicinato) è uno storno doppio, visibile in
  // Dispensa e invertibile con "Torna al piano" (spec §7).
  const { data: righeLedger, error: eLedger } = await sb
    .from('meal_slot_storno')
    .select('ingredient_id, delta')
    .eq('meal_slot_id', slotId);
  if (eLedger) throw eLedger;
  const cumuloEsistente = new Map(
    (righeLedger ?? []).map((r) => [String(r.ingredient_id), Number(r.delta)]),
  );

  for (const d of deltas) {
    const cumulo = (cumuloEsistente.get(d.ingredientId) ?? 0) + d.delta;
    if (cumulo === 0) {
      const { error: eDel } = await sb
        .from('meal_slot_storno')
        .delete()
        .eq('meal_slot_id', slotId)
        .eq('ingredient_id', d.ingredientId);
      if (eDel) throw eDel;
    } else {
      const { error: eUps } = await sb.from('meal_slot_storno').upsert(
        {
          user_id: userId, meal_slot_id: slotId, ingredient_id: d.ingredientId,
          delta: cumulo, aggiornato_il: new Date().toISOString(),
        },
        { onConflict: 'meal_slot_id,ingredient_id' },
      );
      if (eUps) throw eUps;
    }
  }

  // L'applicazione al residuo: upsert per lo stesso motivo di chiudiSpesa
  // (I1: la riga può non esistere), clamp a zero come nuovoResiduo.
  const { data: righePantry, error: ePantry } = await sb
    .from('pantry_state')
    .select('ingredient_id, residuo')
    .in('ingredient_id', deltas.map((d) => d.ingredientId));
  if (ePantry) throw ePantry;
  const residuoPerId = new Map(
    (righePantry ?? []).map((r) => [String(r.ingredient_id), Number(r.residuo)]),
  );

  for (const d of deltas) {
    const residuo = Math.max(0, (residuoPerId.get(d.ingredientId) ?? 0) + d.delta);
    const { error: eUps } = await sb.from('pantry_state').upsert(
      { ingredient_id: d.ingredientId, user_id: userId, residuo },
      { onConflict: 'ingredient_id' },
    );
    if (eUps) throw eUps;
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
