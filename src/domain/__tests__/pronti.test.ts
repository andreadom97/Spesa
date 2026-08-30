import { describe, it, expect } from 'vitest';
import type { LottoPronto, MealSlot, StatoSlot } from '../types';
import { fattoreConsumo, porzioniUtilizzabili, GIORNI_PRONTO_FRESCO, GIORNI_PRONTO_CONGELATO } from '../pronti';

function slot(stato: StatoSlot, daPronti: boolean, porzioniPreparate: number): Pick<MealSlot, 'stato' | 'daPronti' | 'porzioniPreparate'> {
  return { stato, daPronti, porzioniPreparate };
}

function lotto(sovrascrivi: Partial<LottoPronto>): LottoPronto {
  return {
    id: 'l-1', dishId: 'd-1', porzioni: 2, congelato: false,
    preparataIl: '2026-08-28', mealSlotId: null, ...sovrascrivi,
  };
}

describe('fattoreConsumo — la matrice della spec §2', () => {
  it.each([
    ['pasto normale', slot('casa', false, 0), 1],
    ['ne preparo 2 in più', slot('casa', false, 2), 3],
    ['uso una porzione pronta', slot('casa', true, 0), 0],
    ['saltato', slot('saltato', false, 0), 0],
    ['cucinato ma non mangiato', slot('saltato', false, 1), 1],
    ['fuori ma ho cucinato per dopo', slot('fuori', false, 2), 2],
    ['sostituito', slot('sostituito', false, 0), 0],
    ['porzione pronta su slot saltato', slot('saltato', true, 0), 0],
  ])('%s → %i', (_nome, s, atteso) => {
    expect(fattoreConsumo(s)).toBe(atteso);
  });
});

describe('porzioniUtilizzabili', () => {
  it('lotto fresco entro i 3 giorni: tutte; oltre: zero', () => {
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-08-28' }), '2026-08-31')).toBe(2);
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-08-27' }), '2026-08-31')).toBe(0);
  });

  it('lotto congelato: 90 giorni', () => {
    expect(porzioniUtilizzabili(lotto({ congelato: true, preparataIl: '2026-06-05' }), '2026-08-31')).toBe(2);
    expect(porzioniUtilizzabili(lotto({ congelato: true, preparataIl: '2026-05-01' }), '2026-08-31')).toBe(0);
  });

  it('lotto pianificato (preparataIl futura) è utilizzabile', () => {
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-09-06' }), '2026-08-31')).toBe(2);
  });

  it('le costanti sono quelle della spec', () => {
    expect(GIORNI_PRONTO_FRESCO).toBe(3);
    expect(GIORNI_PRONTO_CONGELATO).toBe(90);
  });
});
