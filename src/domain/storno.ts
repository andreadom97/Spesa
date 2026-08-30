import type { Dish, Ingredient, MealSlot } from './types';
import { righeEffettive } from './opzioni';
import { convertiInUnitaBase } from './unita';
import { IngredienteMancanteError } from './list-builder';
import { fattoreConsumo } from './pronti';

export interface ConsumoSlotInput {
  slot: MealSlot;
  /** Il piatto di slot.dishId, o null se nessuno. */
  dish: Dish | null;
  ingredients: Ingredient[];
  moltiplicatorePorzioni: number;
}

/**
 * Cosa consuma questo slot, in unità base per ingrediente. Vuota se lo slot
 * non consuma (fattoreConsumo zero, o nessun piatto). Stessa aritmetica di
 * costruisciLista — righeEffettive rispetta le scelte dei componenti, il
 * moltiplicatore si applica riga per riga — o lo storno non pareggerebbe mai
 * il fabbisogno che la lista ha consumato. La classe 'stima' resta fuori:
 * nessuna aritmetica sul residuo (regola 7 della spec di list-builder).
 */
export function consumoSlot(i: ConsumoSlotInput): Map<string, number> {
  const consumo = new Map<string, number>();
  const fattore = fattoreConsumo(i.slot);
  if (fattore === 0 || !i.dish) return consumo;
  const perId = new Map(i.ingredients.map((x) => [x.id, x]));
  for (const riga of righeEffettive(i.dish, i.slot.scelte)) {
    const ing = perId.get(riga.ingredientId);
    if (!ing) throw new IngredienteMancanteError(riga.ingredientId);
    if (ing.classeResiduo === 'stima') continue;
    const q = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase)
      * i.moltiplicatorePorzioni * fattore;
    consumo.set(ing.id, (consumo.get(ing.id) ?? 0) + q);
  }
  return consumo;
}

export interface DeltaStorno {
  ingredientId: string;
  /** Positivo = riaccredito al residuo, negativo = addebito. */
  delta: number;
}

/**
 * prima − dopo, per ingrediente. È la quantità da restituire alla dispensa
 * quando il consumo di uno slot cambia: le mutazioni telescopizzano, quindi
 * qualunque giro di ripensamenti lascia il totale pari a "congelato − consumo
 * attuale" (spec spunta-pasti §2). Chi applica i delta clampa sempre a zero:
 * il ledger registra il calcolato, non l'applicato (spec §3).
 */
export function deltaStorno(
  prima: Map<string, number>,
  dopo: Map<string, number>,
): DeltaStorno[] {
  const ids = new Set([...prima.keys(), ...dopo.keys()]);
  const out: DeltaStorno[] = [];
  for (const id of ids) {
    const delta = (prima.get(id) ?? 0) - (dopo.get(id) ?? 0);
    if (delta !== 0) out.push({ ingredientId: id, delta });
  }
  return out;
}
