import type {
  AreaId, ClasseResiduo, Componente, FonteStato, Ingredient, LottoPronto, MealSlot,
  MealSlotDef, PantryState, StatoSlot, UnitaBase, UnitaMisura,
} from '@/domain/types';

/** Postgres restituisce i numeric come stringa: convertire sempre, mai fidarsi. */
function num(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number);
  if (Number.isNaN(n)) throw new Error(`Numero non valido dal database: ${String(v)}`);
  return n;
}

function data(v: unknown): string {
  return String(v).slice(0, 10);
}

export function aIngrediente(r: Record<string, unknown>): Ingredient {
  return {
    id: String(r.id),
    nome: String(r.nome),
    unitaBase: r.unita_base as UnitaBase,
    area: r.area as AreaId,
    classeResiduo: r.classe_residuo as ClasseResiduo,
    deperibile: Boolean(r.deperibile),
    formatoConfezione: num(r.formato_confezione),
  };
}

export function aMealSlot(r: Record<string, unknown>): MealSlot {
  return {
    id: String(r.id),
    data: data(r.data),
    slotDefId: String(r.slot_def_id),
    stato: r.stato as StatoSlot,
    dishId: r.dish_id ? String(r.dish_id) : null,
    fonteStato: r.fonte_stato as FonteStato,
    scelte: {},
    // `?? 0` / Boolean: le righe di mock nei test non portano le colonne nuove,
    // e un undefined qui diventerebbe NaN/undefined nel dominio.
    porzioniPreparate: num(r.porzioni_preparate ?? 0),
    daPronti: Boolean(r.da_pronti),
  };
}

export function aPantryState(r: Record<string, unknown>): PantryState {
  return {
    ingredientId: String(r.ingredient_id),
    residuo: num(r.residuo),
    ultimoAcquisto: r.ultimo_acquisto ? data(r.ultimo_acquisto) : null,
    giorniStimati: num(r.giorni_stimati),
    ultimoCheck: r.ultimo_check ? data(r.ultimo_check) : null,
    congelato: Boolean(r.congelato),
  };
}

export function aLottoPronto(r: Record<string, unknown>): LottoPronto {
  return {
    id: String(r.id),
    dishId: String(r.dish_id),
    porzioni: num(r.porzioni),
    congelato: Boolean(r.congelato),
    preparataIl: data(r.preparata_il),
    mealSlotId: r.meal_slot_id ? String(r.meal_slot_id) : null,
  };
}

export function aSlotDef(r: Record<string, unknown>): MealSlotDef {
  return {
    id: String(r.id),
    nome: String(r.nome),
    posizione: num(r.posizione),
    assenzeAbituali: (r.assenze_abituali as boolean[]).map(Boolean),
  };
}

export function aDishIngredient(r: Record<string, unknown>) {
  return {
    ingredientId: String(r.ingredient_id),
    quantita: num(r.quantita),
    unita: r.unita as UnitaMisura,
  };
}

/**
 * Raggruppa le righe di dish_option per componente_id, ordinando le opzioni
 * per posizione (0 = default) e agganciando a ciascuna le sue righe
 * dish_ingredient (quelle con option_id valorizzato: le righe fisse hanno
 * option_id null e restano fuori, tornano in Dish.ingredienti).
 *
 * L'ordine FRA componenti nel risultato non può dipendere dall'insertion
 * order della Map, cioè dall'ordine con cui PostgREST restituisce le righe
 * embedded: non è garantito, e due letture della stessa select potrebbero
 * differire. Si ordina quindi per la posizione minima delle opzioni di
 * ciascun componente (conserva l'ordine d'autore dell'editor) e, a parità,
 * per componente_id — deterministico in ogni caso.
 */
export function aComponenti(
  opzioni: Record<string, unknown>[],
  righe: Record<string, unknown>[],
): Componente[] {
  const perComponente = new Map<string, Componente>();
  const posizioneMinima = new Map<string, number>();
  for (const o of [...opzioni].sort((a, b) => num(a.posizione) - num(b.posizione))) {
    const componenteId = String(o.componente_id);
    const componente = perComponente.get(componenteId)
      ?? { id: componenteId, nome: String(o.componente_nome), opzioni: [] };
    componente.opzioni.push({
      id: String(o.id),
      righe: righe.filter((r) => r.option_id === o.id).map(aDishIngredient),
    });
    perComponente.set(componenteId, componente);
    if (!posizioneMinima.has(componenteId)) posizioneMinima.set(componenteId, num(o.posizione));
  }
  return [...perComponente.values()].sort((a, b) => {
    const diff = posizioneMinima.get(a.id)! - posizioneMinima.get(b.id)!;
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}
