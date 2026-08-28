import type { FonteStato, MealSlot, MealSlotDef, StatoSlot } from './types';
import { giorniDellaSettimana } from './date';

/** correzione > check-in > calendario > default. In Fase 1 esistono solo gli estremi. */
export const PRIORITA_FONTE: Record<FonteStato, number> = {
  default: 0,
  calendario: 1,
  checkin: 2,
  correzione: 3,
};

export interface GeneraSettimanaInput {
  /** Lunedì della settimana, ISO yyyy-mm-dd. */
  dataInizio: string;
  /** Da 3 a 5, già ordinati per posizione. */
  slotDefs: MealSlotDef[];
}

/**
 * Il default della settimana: ogni pasto è a casa, tranne dove l'utente ha
 * dichiarato un'assenza abituale nelle Impostazioni. Nessun piatto assegnato.
 */
export function generaSettimana(input: GeneraSettimanaInput): MealSlot[] {
  const giorni = giorniDellaSettimana(input.dataInizio);
  const slots: MealSlot[] = [];
  for (const def of input.slotDefs) {
    giorni.forEach((data, indiceGiorno) => {
      const fuori = def.assenzeAbituali[indiceGiorno] === true;
      slots.push({
        id: `${data}:${def.id}`,
        data,
        slotDefId: def.id,
        stato: fuori ? 'fuori' : 'casa',
        dishId: null,
        fonteStato: 'default',
      });
    });
  }
  return slots;
}

/**
 * Scrive lo stato solo se la fonte è almeno forte quanto quella già registrata.
 * Serve dalla Fase 2 in poi, quando il calendario proporrà stati che il
 * check-in dell'utente non deve vedersi sovrascrivere.
 */
export function applicaStato(slot: MealSlot, stato: StatoSlot, fonte: FonteStato): MealSlot {
  if (PRIORITA_FONTE[fonte] < PRIORITA_FONTE[slot.fonteStato]) return slot;
  return { ...slot, stato, fonteStato: fonte };
}
