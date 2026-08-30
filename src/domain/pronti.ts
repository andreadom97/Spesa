import type { LottoPronto, MealSlot } from './types';
import { giorniTra } from './date';

/** Il cotto in frigo dura 2-3 giorni (linee guida di conservazione domestica, arrotondate come GIORNI_FRESCO). */
export const GIORNI_PRONTO_FRESCO = 3;
/** Come GIORNI_CONGELATO del residuo: il congelatore cambia l'ordine di grandezza. */
export const GIORNI_PRONTO_CONGELATO = 90;

/**
 * Quante porzioni di questo slot escono dalla dispensa cruda. È la formula
 * unica della spec meal-prepping §2: costruisciLista e consumoSlot la leggono
 * ENTRAMBE da qui — se divergessero, la lista comprerebbe una cosa e lo
 * storno ne pareggerebbe un'altra. porzioniPreparate conta qualunque sia lo
 * stato: cucinare per il futuro è indipendente dal dove si mangia oggi.
 */
export function fattoreConsumo(
  slot: Pick<MealSlot, 'stato' | 'daPronti' | 'porzioniPreparate'>,
): number {
  const mangiaCrudo = slot.stato === 'casa' && !slot.daPronti ? 1 : 0;
  return mangiaCrudo + slot.porzioniPreparate;
}

/**
 * Quante porzioni del lotto sono ancora davvero disponibili. Un lotto fresco
 * più vecchio di 3 giorni non esiste più (o l'hai mangiato o l'hai buttato):
 * stessa asimmetria dichiarata di residuoUtilizzabile — meglio una porzione
 * data per persa che una cena contata su una vaschetta che non c'è. Un lotto
 * con preparataIl futura è un batch pianificato: utilizzabile (le porzioni
 * esisteranno quando serviranno).
 */
export function porzioniUtilizzabili(lotto: LottoPronto, oggi: string): number {
  if (lotto.preparataIl > oggi) return lotto.porzioni;
  const soglia = lotto.congelato ? GIORNI_PRONTO_CONGELATO : GIORNI_PRONTO_FRESCO;
  return giorniTra(lotto.preparataIl, oggi) > soglia ? 0 : lotto.porzioni;
}
