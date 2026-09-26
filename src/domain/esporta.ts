import type { Dish, Impostazioni, Ingredient, MealSlot, MealSlotDef, PantryState } from './types';

/**
 * Il file di «Esporta i tuoi dati» (spec fase 5 §E.3). JSON leggibile, senza
 * librerie, e rileggibile un domani: `formato` cresce se la forma cambia, e
 * un import futuro (fuori da questa fase) lo leggerà per primo.
 *
 * I dati sono nella forma del dominio, come li legge l'app: camelCase, date
 * ISO aaaa-mm-gg. `pronti` sono i lotti dei Pronti (`LottoPronto`, decaduti
 * compresi): `unknown[]` qui perché il file non promette la forma interna
 * di un lotto a chi lo rilegge.
 */
export interface Esportazione {
  formato: 1;
  app: 'dispesa';
  versione: string;
  esportatoIl: string;
  impostazioni: Impostazioni;
  pasti: MealSlotDef[];
  ingredienti: Ingredient[];
  piatti: Dish[];
  piano: { lunedi: string; stato: string; pasti: MealSlot[] }[];
  dispensa: { stato: PantryState[]; pronti: unknown[] };
}

/**
 * Pura: niente rete, niente orologio. Le chiavi nell'ordine della spec, una
 * per una e non con uno spread: `JSON.stringify` le scrive in quest'ordine, e
 * il file si legge dall'alto.
 */
export function componiEsportazione(i: Omit<Esportazione, 'formato' | 'app'>): Esportazione {
  return {
    formato: 1,
    app: 'dispesa',
    versione: i.versione,
    esportatoIl: i.esportatoIl,
    impostazioni: i.impostazioni,
    pasti: i.pasti,
    ingredienti: i.ingredienti,
    piatti: i.piatti,
    piano: i.piano,
    dispensa: i.dispensa,
  };
}

/** `dispesa-{gg-mm-aaaa}.json` (spec §C.8) da una data aaaa-mm-gg. */
export function nomeFileEsportazione(oggi: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(oggi);
  if (!m) throw new Error(`Data non valida: ${oggi}`);
  const [, anno, mese, giorno] = m;
  return `dispesa-${giorno}-${mese}-${anno}.json`;
}
