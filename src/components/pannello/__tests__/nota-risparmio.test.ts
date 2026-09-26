import { describe, it, expect } from 'vitest';
import { riassumiEvitato } from '@/domain/risparmio';
import { testoRisparmio } from '../NotaRisparmio';
import { voce } from './aiuti';

describe('testoRisparmio', () => {
  it('con quantità ed euro dice le tre cose, separate da ·', () => {
    const r = riassumiEvitato([
      voce({ confezioniEvitate: 5, quantitaEvitata: 2500, prezzoConfezione: 2 }),
      voce({ ingredientId: 'i-2', confezioniEvitate: 4, quantitaEvitata: 1600, prezzoConfezione: 5.5 }),
    ]);
    expect(testoRisparmio(r)).toBe('Da quando usi Dispesa: 9 confezioni non ricomprate · 4,1 kg · circa 32 €');
  });

  it('a una confezione usa il singolare', () => {
    expect(testoRisparmio(riassumiEvitato([voce({ confezioniEvitate: 1, quantitaEvitata: 500 })])))
      .toBe('Da quando usi Dispesa: 1 confezione non ricomprata · 500 g');
  });

  it('senza prezzi non dice gli euro', () => {
    expect(testoRisparmio(riassumiEvitato([voce({ confezioniEvitate: 2, quantitaEvitata: 1000 })])))
      .toBe('Da quando usi Dispesa: 2 confezioni non ricomprate · 1,0 kg');
  });

  it('con zero confezioni, o senza riassunto, la nota non c’è', () => {
    expect(testoRisparmio(riassumiEvitato([]))).toBeNull();
    expect(testoRisparmio(null)).toBeNull();
  });
});
