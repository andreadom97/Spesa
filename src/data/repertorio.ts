import type { Dish, Ingredient } from '@/domain/types';
import { client } from './supabase';
import { aComponenti, aDishIngredient, aIngrediente } from './mappers';

export async function leggiIngredienti(): Promise<Ingredient[]> {
  const { data, error } = await client().from('ingredient').select('*').order('nome');
  if (error) throw error;
  return data.map(aIngrediente);
}

/** Solo i piatti attivi: un piatto eliminato (soft delete, `attivo = false`) non deve ricomparire qui. */
export async function leggiRepertorio(): Promise<Dish[]> {
  const { data, error } = await client()
    .from('dish')
    .select('id, nome, slot_def_id, fonte, attivo, descrizione, settimana_ciclo, giorno_ciclo, dish_ingredient(ingredient_id, quantita, unita, option_id), dish_option(id, componente_id, componente_nome, posizione)')
    .eq('attivo', true)
    .order('created_at');
  if (error) throw error;
  return data.map((r) => ({
    id: String(r.id),
    nome: String(r.nome),
    slotDefId: String(r.slot_def_id),
    fonte: r.fonte as Dish['fonte'],
    attivo: Boolean(r.attivo),
    descrizione: r.descrizione === null || r.descrizione === undefined ? null : String(r.descrizione),
    settimanaCiclo: r.settimana_ciclo === null || r.settimana_ciclo === undefined ? null : Number(r.settimana_ciclo),
    giornoCiclo: r.giorno_ciclo === null || r.giorno_ciclo === undefined ? null : Number(r.giorno_ciclo),
    ingredienti: (r.dish_ingredient ?? [])
      .filter((ri: Record<string, unknown>) => ri.option_id == null)
      .map(aDishIngredient),
    componenti: aComponenti(r.dish_option ?? [], r.dish_ingredient ?? []),
  }));
}

export async function salvaPiatto(
  piatto: Omit<Dish, 'id'> & { id?: string },
): Promise<string> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  const { data: riga, error } = await sb
    .from('dish')
    .upsert({
      id: piatto.id,
      user_id: userId,
      nome: piatto.nome,
      slot_def_id: piatto.slotDefId,
      fonte: piatto.fonte,
      attivo: piatto.attivo,
      descrizione: piatto.descrizione,
      settimana_ciclo: piatto.settimanaCiclo,
      giorno_ciclo: piatto.giornoCiclo,
    })
    .select('id')
    .single();
  if (error) throw error;

  const dishId = String(riga.id);
  // Le righe ingrediente (fisse) e le opzioni si riscrivono in blocco: sono
  // poche e la diff non vale il codice. Ordine obbligato dalla FK
  // dish_ingredient.option_id -> dish_option.id: prima le fisse (che non
  // dipendono da nessuna opzione), poi dish_option, poi le righe di opzione.
  const { error: eDel } = await sb.from('dish_ingredient').delete().eq('dish_id', dishId);
  if (eDel) throw eDel;
  if (piatto.ingredienti.length > 0) {
    const { error: eIns } = await sb.from('dish_ingredient').insert(
      piatto.ingredienti.map((i) => ({
        user_id: userId,
        dish_id: dishId,
        ingredient_id: i.ingredientId,
        quantita: i.quantita,
        unita: i.unita,
      })),
    );
    if (eIns) throw eIns;
  }

  // Cancellare dish_option del piatto porta via in cascata (on delete
  // cascade) sia le righe di opzione rimaste in dish_ingredient sia le
  // meal_slot_choice che vi puntavano: un piatto modificato invalida le
  // scelte registrate per quel componente, righeEffettive ripiega sul
  // default. Voluto: vedi nota nella migrazione 0006.
  const { error: eDelOpz } = await sb.from('dish_option').delete().eq('dish_id', dishId);
  if (eDelOpz) throw eDelOpz;
  for (const componente of piatto.componenti) {
    // componente_id arriva dall'editor: se il componente è nuovo non è un
    // uuid valido per la colonna, se esisteva già è l'uuid da riusare.
    const componenteId = isUuid(componente.id) ? componente.id : crypto.randomUUID();
    const { data: opzioniInserite, error: eOpz } = await sb
      .from('dish_option')
      .insert(
        componente.opzioni.map((o, posizione) => ({
          user_id: userId,
          dish_id: dishId,
          componente_id: componenteId,
          componente_nome: componente.nome,
          posizione,
        })),
      )
      .select('id, componente_id, posizione');
    if (eOpz) throw eOpz;

    // Non ci si fida dell'ordine di RETURNING: Postgres/PostgREST non
    // garantisce che coincida con l'ordine delle VALUES inserite. Si abbina
    // per valore — componente_id + posizione identificano univocamente
    // l'opzione dentro il piatto, c'è l'unique (dish_id, componente_id,
    // posizione) in migrazione 0006.
    const idPerPosizione = new Map<number, string>();
    for (const o of opzioniInserite) {
      if (String(o.componente_id) === componenteId) {
        idPerPosizione.set(Number(o.posizione), String(o.id));
      }
    }

    const righeOpzione = componente.opzioni.flatMap((o, posizione) => {
      const optionId = idPerPosizione.get(posizione);
      if (optionId === undefined) {
        throw new Error(
          `salvaPiatto: dish_option non trovata per componente ${componenteId} posizione ${posizione} (dish ${dishId})`,
        );
      }
      return o.righe.map((r) => ({
        user_id: userId,
        dish_id: dishId,
        ingredient_id: r.ingredientId,
        quantita: r.quantita,
        unita: r.unita,
        option_id: optionId,
      }));
    });
    if (righeOpzione.length > 0) {
      const { error: eRighe } = await sb.from('dish_ingredient').insert(righeOpzione);
      if (eRighe) throw eRighe;
    }
  }
  return dishId;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/**
 * Soft delete: imposta solo `attivo = false`, non cancella la riga. Le
 * settimane passate vanno conservate per lo storico acquisti, e un
 * `meal_slot` che punta a un piatto davvero cancellato perderebbe
 * l'informazione di cosa era stato mangiato. `assegnaPiatti` già ignora i
 * piatti non attivi, e `leggiRepertorio` ora li esclude dal repertorio.
 */
export async function eliminaPiatto(id: string): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('dish')
    .update({ attivo: false })
    .eq('id', id)
    .eq('user_id', utente.user!.id);
  if (error) throw error;
}

export async function salvaIngrediente(
  ing: Omit<Ingredient, 'id'> & { id?: string },
): Promise<string> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('ingredient')
    .upsert({
      id: ing.id,
      user_id: utente.user!.id,
      nome: ing.nome,
      unita_base: ing.unitaBase,
      area: ing.area,
      classe_residuo: ing.classeResiduo,
      deperibile: ing.deperibile,
      formato_confezione: ing.formatoConfezione,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Ogni ingrediente ha una riga di dispensa dal primo giorno, a residuo zero:
  // "punto di partenza del residuo: zero" della spec.
  const { error: ePantry } = await sb.from('pantry_state').upsert(
    { ingredient_id: String(data.id), user_id: utente.user!.id, residuo: 0 },
    { onConflict: 'ingredient_id', ignoreDuplicates: true },
  );
  if (ePantry) throw ePantry;
  return String(data.id);
}

/**
 * L'ingrediente è ancora referenziato da `dish_ingredient` (un piatto lo usa)
 * o da `shopping_list_item` (una lista già generata lo contiene): entrambe le
 * colonne hanno `on delete restrict` nello schema, quindi il database rifiuta
 * la cancellazione con l'errore Postgres 23503 (foreign_key_violation) prima
 * che `eliminaIngrediente` possa fare danni. Questa classe esiste per portare
 * quel rifiuto fino alla UI come un messaggio comprensibile, non come un
 * errore Postgres grezzo.
 */
export class IngredienteInUsoError extends Error {}

/**
 * Hard delete, a differenza di `eliminaPiatto` (soft, `attivo = false`): qui
 * non serve una colonna `attivo` perché lo schema protegge già chi conta.
 * `pantry_state` ha `on delete cascade` sull'ingrediente — la riga di
 * dispensa sparisce con lui, giusto perché "niente ingrediente, niente
 * residuo". `dish_ingredient` e `shopping_list_item` hanno `on delete
 * restrict`: se l'ingrediente è ancora usato lì, Postgres rifiuta la
 * cancellazione (codice 23503) prima di lasciarla a metà.
 */
export async function eliminaIngrediente(id: string): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('ingredient')
    .delete()
    .eq('id', id)
    .eq('user_id', utente.user!.id);
  if (error) {
    if (error.code === '23503') {
      throw new IngredienteInUsoError(
        'Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.',
      );
    }
    throw error;
  }
}

/**
 * True se l'ingrediente ha almeno un acquisto registrato in `purchase`.
 * Serve solo alla conferma di eliminazione in
 * `piatti/[id]/ingredienti/[ingId]/page.tsx`: a differenza di
 * `dish_ingredient` e `shopping_list_item` (`on delete restrict`),
 * `purchase.ingredient_id` ha `on delete cascade` — eliminare l'ingrediente
 * porta via in silenzio anche il suo storico acquisti (utile alla Fase 4,
 * non letto dalla Fase 1). Se non c'è nessun acquisto da perdere, avvisarne
 * l'utente sarebbe rumore, non informazione.
 */
export async function haAcquistiRegistrati(ingredientId: string): Promise<boolean> {
  const { count, error } = await client()
    .from('purchase')
    .select('id', { count: 'exact', head: true })
    .eq('ingredient_id', ingredientId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
