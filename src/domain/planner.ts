import type { Dish, MealSlot } from './types';

export interface AssegnaPiattiInput {
  slots: MealSlot[];
  dishes: Dish[];
}

/**
 * La rotazione della spec: deterministica, senza storico e senza preferenze.
 * Assegna solo agli slot a casa ancora vuoti — una scelta fatta a mano dalla
 * schermata "Scegli il piatto" non viene mai sovrascritta.
 */
export function assegnaPiatti(input: AssegnaPiattiInput): MealSlot[] {
  const perSlotDef = new Map<string, Dish[]>();
  for (const d of input.dishes) {
    if (!d.attivo) continue;
    const arr = perSlotDef.get(d.slotDefId) ?? [];
    arr.push(d);
    perSlotDef.set(d.slotDefId, arr);
  }

  // Traccia il contatore di rotazione per ogni slotDef
  const contatoreRotazione = new Map<string, number>();

  return input.slots.map((slot) => {
    if (slot.stato !== 'casa' || slot.dishId !== null) return slot;
    const candidati = perSlotDef.get(slot.slotDefId);
    if (!candidati || candidati.length === 0) return slot;

    const contatore = contatoreRotazione.get(slot.slotDefId) ?? 0;
    const piatto = candidati[contatore % candidati.length].id;
    contatoreRotazione.set(slot.slotDefId, contatore + 1);

    return { ...slot, dishId: piatto };
  });
}
