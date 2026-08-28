import { giorniTra, lunediDi } from './date';
import type { Dish, MealSlot } from './types';

export interface AssegnaPiattiInput {
  slots: MealSlot[];
  dishes: Dish[];
  /**
   * A che punto del giro è la settimana che si sta pianificando (1..4).
   * `null` o assente = nessun ciclo: i piatti non vengono filtrati, comprese
   * le loro etichette di settimana. Spegnere la rotazione deve tornare al
   * comportamento di prima, non nascondere metà repertorio perché era
   * taggato.
   */
  settimanaCiclo?: number | null;
  /**
   * Quante settimane sono passate dall'origine della rotazione. È l'unica
   * cosa che rende la rotazione continua fra una settimana e l'altra: senza,
   * l'ordinale ripartirebbe da zero ogni lunedì e con quattordici pranzi in
   * repertorio ne userebbe per sempre gli stessi sette.
   */
  settimaneTrascorse?: number;
}

/** Giorni per settimana: il passo con cui l'ordinale avanza da un lunedì all'altro. */
const GIORNI_SETTIMANA = 7;

/** 0 = lunedì, come `giornoCiclo` e come `assenzeAbituali`. */
function giornoDellaSettimana(data: string): number {
  return giorniTra(lunediDi(data), data);
}

/**
 * La rotazione: deterministica, senza storico e senza preferenze.
 * Assegna solo agli slot a casa ancora vuoti — una scelta fatta a mano dalla
 * schermata "Scegli il piatto" non viene mai sovrascritta.
 *
 * Tre passaggi, in quest'ordine:
 *
 * 1. **Il ciclo filtra**, se c'è. Restano i piatti di questa settimana del
 *    giro più quelli senza settimana dichiarata. Se il filtro non lascia
 *    niente per un pasto, si ripiega su tutti i piatti di quel pasto: meglio
 *    un piatto fuori giro che una cena vuota, e chi ha taggato solo metà
 *    repertorio non deve vedersi mezza settimana in bianco.
 * 2. **Il giorno fisso vince.** Un piatto con `giornoCiclo` va in quel giorno
 *    e basta: è il piano dell'utente, non una proposta da ruotare.
 * 3. **Il resto ruota**, fra i soli piatti senza giorno fisso.
 *
 * Stabile rispetto all'ordine dell'array in ingresso: l'ordinale dipende
 * dalla posizione della data nella sequenza ordinata, non dalla posizione
 * dello slot nell'array.
 */
export function assegnaPiatti(input: AssegnaPiattiInput): MealSlot[] {
  const settimanaCiclo = input.settimanaCiclo ?? null;
  const settimaneTrascorse = input.settimaneTrascorse ?? 0;

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
  for (const [slotDefId, dates] of datesPerSlotDef) {
    datesPerSlotDef.set(slotDefId, dates.sort());
  }

  return input.slots.map((slot) => {
    if (slot.stato !== 'casa' || slot.dishId !== null) return slot;
    const tutti = perSlotDef.get(slot.slotDefId);
    if (!tutti || tutti.length === 0) return slot;

    const delCiclo = settimanaCiclo === null
      ? tutti
      : tutti.filter((d) => d.settimanaCiclo === null || d.settimanaCiclo === settimanaCiclo);
    const candidati = delCiclo.length > 0 ? delCiclo : tutti;

    const giorno = giornoDellaSettimana(slot.data);
    const fissato = candidati.find((d) => d.giornoCiclo === giorno);
    if (fissato) return { ...slot, dishId: fissato.id };

    const liberi = candidati.filter((d) => d.giornoCiclo === null);
    // Tutti i piatti rimasti hanno un giorno fisso, ma non questo: si ruota
    // comunque fra loro invece di lasciare il pasto vuoto.
    const pool = liberi.length > 0 ? liberi : candidati;

    const datesSequence = datesPerSlotDef.get(slot.slotDefId) ?? [];
    const indice = settimaneTrascorse * GIORNI_SETTIMANA + datesSequence.indexOf(slot.data);
    const posizione = ((indice % pool.length) + pool.length) % pool.length;

    return { ...slot, dishId: pool[posizione].id };
  });
}
