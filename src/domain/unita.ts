import type { UnitaBase, UnitaMisura } from './types';

export class UnitaIncompatibileError extends Error {
  constructor(da: UnitaMisura, a: UnitaBase) {
    super(`Non converto ${da} in ${a}: servirebbe una densità e la spec vieta l'inferenza.`);
    this.name = 'UnitaIncompatibileError';
  }
}

const FATTORI: Record<UnitaMisura, { base: UnitaBase; fattore: number }> = {
  g: { base: 'g', fattore: 1 },
  kg: { base: 'g', fattore: 1000 },
  ml: { base: 'ml', fattore: 1 },
  l: { base: 'ml', fattore: 1000 },
  pz: { base: 'pz', fattore: 1 },
};

export function convertiInUnitaBase(quantita: number, da: UnitaMisura, base: UnitaBase): number {
  const f = FATTORI[da];
  if (!f || f.base !== base) throw new UnitaIncompatibileError(da, base);
  return quantita * f.fattore;
}

/**
 * Perché l'unità base di un ingrediente esistente non può passare da `da` ad
 * `a`, o null se può. Le righe `dish_ingredient` dei piatti attivi sono
 * scritte nella vecchia unità e nessuno le converte: con una base diversa
 * `convertiInUnitaBase` lancerebbe in list-builder, planner, storno e nella
 * scelta del pasto. `pantry_state.residuo` è un numero nell'unità base: con
 * una base nuova cambierebbe significato senza cambiare valore. Convertire
 * g↔ml vorrebbe dire inferire una densità, che la spec vieta: si blocca e si
 * spiega cosa fare.
 */
export function motivoBloccoUnita(i: {
  da: UnitaBase;
  a: UnitaBase;
  /** Nomi dei piatti attivi che lo usano, anche ripetuti (una riga per opzione). */
  piatti: string[];
  residuo: number;
}): string | null {
  if (i.da === i.a) return null;
  const motivi: string[] = [];
  const piatti = [...new Set(i.piatti)];
  if (piatti.length > 0) {
    const nomi = piatti.map((n) => `«${n}»`);
    const soggetto = nomi.length === 1
      ? `Il piatto ${nomi[0]} lo usa`
      : `I piatti ${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]} lo usano`;
    motivi.push(`${soggetto} con le quantità in ${i.da}: per passare a ${i.a} toglilo prima da lì, o crea un ingrediente nuovo in ${i.a}.`);
  }
  if (i.residuo > 0) {
    motivi.push(`In dispensa ne risultano ${String(i.residuo).replace('.', ',')} ${i.da}: azzeralo dalla Dispensa, poi cambia l'unità.`);
  }
  return motivi.length > 0 ? motivi.join(' ') : null;
}
