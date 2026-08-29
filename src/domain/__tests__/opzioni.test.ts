import { describe, expect, it } from 'vitest';
import { righeEffettive, descriviScelte, OpzioneMancanteError } from '../opzioni';
import { colazione, wrap } from './fixtures';

describe('righeEffettive', () => {
  it('piatto senza componenti: solo le righe fisse, identiche', () => {
    expect(righeEffettive(colazione, {})).toEqual(colazione.ingredienti);
  });

  it('espande l’opzione scelta insieme alle righe fisse', () => {
    const righe = righeEffettive(wrap, { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' } });
    expect(righe).toEqual([
      { ingredientId: 'avena', quantita: 80, unita: 'g' },
      { ingredientId: 'uova', quantita: 2, unita: 'pz' },
      { ingredientId: 'passata', quantita: 50, unita: 'g' },
    ]);
  });

  it('scelta assente: vale la prima opzione, la lista non si rompe mai', () => {
    const righe = righeEffettive(wrap, {});
    expect(righe).toEqual([
      { ingredientId: 'avena', quantita: 80, unita: 'g' },
      { ingredientId: 'yogurt', quantita: 100, unita: 'g' },
    ]);
  });

  it('scelta che punta a un’opzione inesistente: errore esplicito, mai un salto silenzioso', () => {
    expect(() => righeEffettive(wrap, { farcitura: { opzioneId: 'fantasma', fonte: 'manuale' } }))
      .toThrow(OpzioneMancanteError);
  });
});

describe('descriviScelte', () => {
  const nomi = new Map([['yogurt', 'Yogurt greco'], ['uova', 'Uova'], ['passata', 'Passata di pomodoro']]);

  it('piatto senza componenti: niente sottotitolo', () => {
    expect(descriviScelte(colazione, {}, nomi)).toBeNull();
  });

  it('descrive l’opzione scelta coi nomi degli ingredienti', () => {
    expect(descriviScelte(wrap, { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' } }, nomi))
      .toBe('Uova + Passata di pomodoro');
  });

  it('scelta assente: descrive il default', () => {
    expect(descriviScelte(wrap, {}, nomi)).toBe('Yogurt greco');
  });
});
