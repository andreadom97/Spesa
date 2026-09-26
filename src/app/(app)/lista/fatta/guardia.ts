/**
 * `CHIUDI LA SPESA` compare nel Dock nello stesso punto dove un attimo prima c'era
 * `HAI PRESO TUTTO`: un doppio tocco non deve chiudere la spesa, che non si riapre
 * (spec fase 6 §A.4, DESIGN.md §9). Il tasto ignora i tocchi per questo tempo da quando
 * compare.
 */
export const GUARDIA_DOPPIO_TOCCO_MS = 400;

/** Il tempo della guardia, in un modulo suo perché i test lo possano fermare. */
export function adesso(): number {
  return performance.now();
}
