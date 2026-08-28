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
