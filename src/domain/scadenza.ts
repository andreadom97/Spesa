import type { Dish, Ingredient, MealSlot, PantryState } from './types';
import { giorniTra, lunediDi, sommaGiorni } from './date';
import { GIORNI_CONGELATO, GIORNI_FRESCO, residuoUtilizzabile, type ResiduoUtilizzabileInput } from './pantry';
import { OpzioneMancanteError, righeEffettive } from './opzioni';
import { fattoreConsumo } from './pronti';

/**
 * L'ultimo giorno in cui residuoUtilizzabile conta ancora questo residuo:
 * `ultimoAcquisto + soglia`, con la stessa soglia (congelatore o area) che
 * residuoUtilizzabile applica. Non è la data sulla confezione: dice quando
 * l'app smetterà di contare il residuo, che è l'informazione che serve per
 * capire la lista. Contratto (spec §1.1): residuoUtilizzabile(oggi) > 0 ⇔
 * oggi ≤ scadenza. null quando non c'è niente che decada — non deperibile,
 * mai comprato, surgelati, residuo a zero — e quindi niente da mostrare.
 */
export function scadenzaResiduo(i: Omit<ResiduoUtilizzabileInput, 'oggi'>): string | null {
  if (i.residuo <= 0) return null;
  if (!i.deperibile) return null;
  if (!i.ultimoAcquisto) return null;
  const soglia = i.congelato ? GIORNI_CONGELATO : GIORNI_FRESCO[i.area];
  if (soglia === null) return null;
  return sommaGiorni(i.ultimoAcquisto, soglia);
}

export interface AvvisoScadenza {
  ingredientId: string;
  nome: string;
  /** ISO yyyy-mm-dd */
  scadenza: string;
  /** I pasti con data > scadenza: il giorno del pasto il residuo, per il modello, non ci sarà più. */
  pastiDopo: { data: string; slotDefId: string }[];
  /** Esiste un pasto con oggi ≤ data ≤ scadenza. Falso = nessuno lo usa prima che scada. */
  usatoInTempo: boolean;
}

export interface AvvisiScadenzaInput {
  slots: MealSlot[];
  dishes: Dish[];
  ingredients: Ingredient[];
  pantry: PantryState[];
  /** ISO yyyy-mm-dd */
  oggi: string;
}

/**
 * Un avviso per ogni residuo che oggi conta e che ha un giorno in cui
 * smetterà di contare (classe ≠ stima, residuoUtilizzabile(oggi) > 0,
 * scadenza non nulla), confrontato coi pasti della settimana non ancora
 * passati. "Pasto che lo usa" è lo stesso filtro di costruisciLista —
 * fattoreConsumo > 0 e righeEffettive con le scelte dello slot — ristretto
 * a data ≥ oggi: quello che è già successo il piano non può più dirlo.
 *
 * L'avviso esiste anche senza nessun pasto che usi l'ingrediente: è la riga
 * anti-dimenticanza della Dispensa. Chi chiama filtra su pastiDopo o
 * usatoInTempo. Uno slot con una scelta verso un'opzione rimossa si salta,
 * come in descriviScelte: un avviso non è il posto dove esplodere — ci
 * pensa righeEffettive dalla lista.
 */
export function avvisiScadenza(i: AvvisiScadenzaInput): AvvisoScadenza[] {
  const dishPerId = new Map(i.dishes.map((d) => [d.id, d]));
  const pantryPerId = new Map(i.pantry.map((p) => [p.ingredientId, p]));

  // Le righe di ogni slot si calcolano una volta sola, non una per ingrediente.
  const usi: { data: string; slotDefId: string; ingredienti: Set<string> }[] = [];
  for (const slot of i.slots) {
    if (slot.data < i.oggi || fattoreConsumo(slot) === 0 || !slot.dishId) continue;
    const dish = dishPerId.get(slot.dishId);
    if (!dish) continue;
    let righe;
    try {
      righe = righeEffettive(dish, slot.scelte);
    } catch (e) {
      if (e instanceof OpzioneMancanteError) continue;
      throw e;
    }
    usi.push({ data: slot.data, slotDefId: slot.slotDefId, ingredienti: new Set(righe.map((r) => r.ingredientId)) });
  }

  const out: AvvisoScadenza[] = [];
  for (const ing of i.ingredients) {
    if (ing.classeResiduo === 'stima') continue;
    const riga = pantryPerId.get(ing.id);
    if (!riga) continue; // mai in dispensa = residuo zero
    const base = {
      residuo: riga.residuo, deperibile: ing.deperibile, area: ing.area,
      ultimoAcquisto: riga.ultimoAcquisto, congelato: riga.congelato,
    };
    if (residuoUtilizzabile({ ...base, oggi: i.oggi }) <= 0) continue;
    const scadenza = scadenzaResiduo(base);
    if (scadenza === null) continue;

    const pastiDopo: AvvisoScadenza['pastiDopo'] = [];
    let usatoInTempo = false;
    for (const uso of usi) {
      if (!uso.ingredienti.has(ing.id)) continue;
      if (uso.data > scadenza) pastiDopo.push({ data: uso.data, slotDefId: uso.slotDefId });
      else usatoInTempo = true;
    }
    pastiDopo.sort((a, b) => a.data.localeCompare(b.data) || a.slotDefId.localeCompare(b.slotDefId));
    out.push({ ingredientId: ing.id, nome: ing.nome, scadenza, pastiDopo, usatoInTempo });
  }

  out.sort((a, b) => a.scadenza.localeCompare(b.scadenza) || a.nome.localeCompare(b.nome, 'it'));
  return out;
}

const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
/** Le stesse abbreviazioni di dataBreve della Dispensa. */
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/**
 * "oggi", "domani", il nome del giorno entro sei giorni; dal settimo in poi
 * "il 9 set", perché il settimo giorno ha lo stesso nome di oggi e il nome
 * da solo direbbe il giorno sbagliato. Mai un giorno passato: chi chiama
 * garantisce scadenza ≥ oggi; se arriva lo stesso, la data e non un errore.
 */
export function etichettaScadenza(scadenza: string, oggi: string): string {
  const giorni = giorniTra(oggi, scadenza);
  if (giorni === 0) return 'oggi';
  if (giorni === 1) return 'domani';
  if (giorni >= 2 && giorni <= 6) {
    const nome = GIORNI[giorniTra(lunediDi(scadenza), scadenza)];
    if (nome) return nome;
  }
  const giorno = Number(scadenza.slice(8, 10));
  const mese = MESI[Number(scadenza.slice(5, 7)) - 1] ?? '';
  return `il ${giorno} ${mese}`;
}
