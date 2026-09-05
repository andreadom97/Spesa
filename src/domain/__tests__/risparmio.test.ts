import { describe, expect, it } from 'vitest';
import { riassumiEvitato, formattaQuantita, formattaEuro } from '../risparmio';
import type { VoceEvitata } from '../list-builder';

function voce(over: Partial<VoceEvitata> & { ingredientId: string }): VoceEvitata {
  return {
    nome: over.ingredientId, unita: 'g', fabbisogno: 100,
    confezioniIngenue: 1, confezioniReali: 1, confezioniEvitate: 0,
    quantitaEvitata: 0, prezzoConfezione: null,
    ...over,
  };
}

describe('riassumiEvitato', () => {
  it('somma confezioni e quantità per unità, euro solo dove c\'è un prezzo', () => {
    const r = riassumiEvitato([
      voce({ ingredientId: 'riso', unita: 'g', confezioniEvitate: 2, quantitaEvitata: 2000, prezzoConfezione: 2.5 }),
      voce({ ingredientId: 'latte', unita: 'ml', confezioniEvitate: 1, quantitaEvitata: 1000 }),
      voce({ ingredientId: 'uova', unita: 'pz', confezioniEvitate: 3, quantitaEvitata: 3, prezzoConfezione: 0.4 }),
      voce({ ingredientId: 'avena', unita: 'g', confezioniEvitate: 0, quantitaEvitata: 0 }),
    ]);
    expect(r).toEqual({
      confezioni: 6,
      quantita: { g: 2000, ml: 1000, pz: 3 },
      euro: 2 * 2.5 + 3 * 0.4,
      ingredientiEvitati: 3,
      ingredientiConPrezzo: 2,
    });
  });

  it('euro è null se nessun ingrediente evitato ha un prezzo', () => {
    const r = riassumiEvitato([
      voce({ ingredientId: 'riso', confezioniEvitate: 1, quantitaEvitata: 1000 }),
    ]);
    expect(r.euro).toBeNull();
    expect(r.ingredientiEvitati).toBe(1);
    expect(r.ingredientiConPrezzo).toBe(0);
  });

  it('un prezzo su un ingrediente con zero evitate non conta: né in euro né fra quelli con prezzo', () => {
    const r = riassumiEvitato([
      voce({ ingredientId: 'riso', confezioniEvitate: 1, quantitaEvitata: 1000 }),
      voce({ ingredientId: 'olio', confezioniEvitate: 0, quantitaEvitata: 0, prezzoConfezione: 9 }),
    ]);
    expect(r.euro).toBeNull();
    expect(r.ingredientiEvitati).toBe(1);
    expect(r.ingredientiConPrezzo).toBe(0);
  });

  it('senza voci è tutto a zero e senza euro', () => {
    expect(riassumiEvitato([])).toEqual({
      confezioni: 0, quantita: { g: 0, ml: 0, pz: 0 }, euro: null,
      ingredientiEvitati: 0, ingredientiConPrezzo: 0,
    });
  });
});

describe('formattaQuantita', () => {
  it('grammi in chili da mille in su con una cifra decimale, poi i pezzi', () => {
    expect(formattaQuantita({ g: 1400, ml: 0, pz: 2 })).toBe('1,4 kg · 2 pz');
  });

  it('sotto i mille restano grammi interi', () => {
    expect(formattaQuantita({ g: 350, ml: 0, pz: 0 })).toBe('350 g');
  });

  it('millilitri in litri con la stessa soglia, anche a mille esatti', () => {
    expect(formattaQuantita({ ml: 1000, g: 0, pz: 0 })).toBe('1,0 l');
  });

  it('sotto il litro restano millilitri interi', () => {
    expect(formattaQuantita({ ml: 250, g: 0, pz: 0 })).toBe('250 ml');
  });

  it('nell\'ordine grammi, millilitri, pezzi', () => {
    expect(formattaQuantita({ pz: 1, ml: 500, g: 2000 })).toBe('2,0 kg · 500 ml · 1 pz');
  });

  it('tutto zero: stringa vuota', () => {
    expect(formattaQuantita({ g: 0, ml: 0, pz: 0 })).toBe('');
  });
});

describe('formattaEuro', () => {
  it('arrotonda all\'intero con "circa"', () => {
    expect(formattaEuro(11.4)).toBe('circa 11 €');
    expect(formattaEuro(11.5)).toBe('circa 12 €');
  });

  it('sotto l\'unità dice "meno di 1 €"', () => {
    expect(formattaEuro(0.6)).toBe('meno di 1 €');
    expect(formattaEuro(0.99)).toBe('meno di 1 €');
  });

  it('a un euro tondo dice "circa 1 €"', () => {
    expect(formattaEuro(1)).toBe('circa 1 €');
  });
});
