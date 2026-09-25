import { describe, it, expect } from 'vitest';
import { residuoUtilizzabile, GIORNI_CONGELATO, GIORNI_FRESCO } from '../pantry';
import { giorniTra, sommaGiorni } from '../date';
import type { AreaId } from '../types';

/**
 * Perché c'è: la fase 4 ha riscritto `residuoUtilizzabile` passando da
 * `scadenzaResiduo` (per far entrare la data a mano). Con `scadenzaManuale`
 * null la formula nuova deve dare gli stessi numeri di quella vecchia, che
 * decide la lista della spesa in produzione da mesi. Questa è la formula di
 * `dbfb1ea` (prima della fase 4), copiata qui come riferimento fisso: non
 * importarla da `pantry.ts`, altrimenti la prova confronta la formula con sé
 * stessa.
 */
function vecchia(i: { residuo: number; deperibile: boolean; area: AreaId; ultimoAcquisto: string | null; congelato: boolean; oggi: string }): number {
  if (i.residuo <= 0) return 0;
  if (!i.deperibile) return i.residuo;
  if (!i.ultimoAcquisto) return i.residuo;
  const soglia = i.congelato ? GIORNI_CONGELATO : GIORNI_FRESCO[i.area];
  if (soglia === null) return i.residuo;
  return giorniTra(i.ultimoAcquisto, i.oggi) > soglia ? 0 : i.residuo;
}

describe('residuoUtilizzabile: equivalenza con la formula di prima, con scadenzaManuale null', () => {
  it('stessi numeri su aree, deperibile, congelato, residui, acquisti a cavallo di mese e anno, e giorni attorno a ogni soglia', () => {
    const aree = Object.keys(GIORNI_FRESCO) as AreaId[];
    // Da 5 giorni prima dell'acquisto a 100 dopo: copre ogni soglia (la più
    // lunga è GIORNI_CONGELATO, 90) col giorno prima e quello dopo; 365 per i
    // residui molto vecchi.
    const giorni = [...Array.from({ length: 106 }, (_, k) => k - 5), 365];
    const diverse: string[] = [];
    let casi = 0;
    for (const area of aree) for (const deperibile of [true, false]) for (const congelato of [true, false])
      for (const residuo of [0, 1, 250]) for (const ultimoAcquisto of [null, '2026-02-27', '2026-09-20', '2026-12-31'])
        for (const g of giorni) {
          const oggi = sommaGiorni(ultimoAcquisto ?? '2026-06-01', g);
          const base = { residuo, deperibile, area, ultimoAcquisto, congelato, oggi };
          const nuova = residuoUtilizzabile({ ...base, scadenzaManuale: null });
          if (nuova !== vecchia(base)) diverse.push(JSON.stringify(base));
          casi++;
        }
    expect(casi).toBe(aree.length * 2 * 2 * 3 * 4 * giorni.length);
    expect(diverse).toEqual([]);
  });
});
