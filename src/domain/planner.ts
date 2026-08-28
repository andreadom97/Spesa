import type { Dish, MealSlot } from './types';

export interface AssegnaPiattiInput {
  slots: MealSlot[];
  dishes: Dish[];
}

/**
 * La rotazione della spec: deterministica, senza storico e senza preferenze.
 * Assegna solo agli slot a casa ancora vuoti — una scelta fatta a mano dalla
 * schermata "Scegli il piatto" non viene mai sovrascritta.
 *
 * Stabile rispetto all'ordine dell'array in ingresso: l'ordinale di rotazione
 * dipende dalla posizione della data nella sequenza ordinata, non dalla
 * posizione dello slot nell'array.
 */
export function assegnaPiatti(input: AssegnaPiattiInput): MealSlot[] {
  const perSlotDef = new Map<string, Dish[]>();
  for (const d of input.dishes) {
    if (!d.attivo) continue;
    const arr = perSlotDef.get(d.slotDefId) ?? [];
    arr.push(d);
    perSlotDef.set(d.slotDefId, arr);
  }

  // Calcola le sequenze di date ordinate per ogni slotDef (solo slot a casa).
  // Usato per determinare l'ordinale di rotazione indipendente dall'ordine dell'array.
  const datesPerSlotDef = new Map<string, string[]>();
  for (const slot of input.slots) {
    if (slot.stato !== 'casa') continue;
    const arr = datesPerSlotDef.get(slot.slotDefId) ?? [];
    if (!arr.includes(slot.data)) arr.push(slot.data);
    datesPerSlotDef.set(slot.slotDefId, arr);
  }
  // Ordina le date per ogni slotDef
  for (const [slotDefId, dates] of datesPerSlotDef) {
    datesPerSlotDef.set(slotDefId, dates.sort());
  }

  return input.slots.map((slot) => {
    if (slot.stato !== 'casa' || slot.dishId !== null) return slot;
    const candidati = perSlotDef.get(slot.slotDefId);
    if (!candidati || candidati.length === 0) return slot;

    // Trova la posizione della data di questo slot nella sequenza ordinata
    const datesSequence = datesPerSlotDef.get(slot.slotDefId) ?? [];
    const indice = datesSequence.indexOf(slot.data);
    const piatto = candidati[indice % candidati.length].id;

    return { ...slot, dishId: piatto };
  });
}
