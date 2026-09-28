import { describe, it, expect } from 'vitest';
import { proponi, origineProposta } from '../formati-tipici';

describe('proponi — le chiavi per parole intere', () => {
  it('«melanzane» non prende la voce «mela»', () => {
    expect(proponi('melanzane', 'g')).toMatchObject({ nome: 'Melanzane', area: 'dispensa', classeResiduo: 'stima', formatoConfezione: 500 });
    expect(origineProposta('melanzane', 'g')).toBe('ripiego');
  });

  it('«latte parzialmente scremato» prende la voce «latte», col nome della dieta', () => {
    expect(proponi('latte parzialmente scremato', 'ml')).toMatchObject({
      nome: 'Latte parzialmente scremato', unitaBase: 'ml', area: 'latticini', deperibile: true, formatoConfezione: 1000,
    });
    expect(origineProposta('latte parzialmente scremato', 'ml')).toBe('tabella');
  });

  it('fra più voci vince ancora la chiave più lunga', () => {
    expect(proponi('frutta secca mista', 'g')).toMatchObject({ nome: 'Frutta secca mista', area: 'dispensa', formatoConfezione: 200 });
  });
});

describe('proponi — il nome', () => {
  it('pane integrale e pane di segale restano due nomi diversi', () => {
    const integrale = proponi('pane integrale', 'g');
    const segale = proponi('pane di segale', 'g');
    expect(integrale.nome).toBe('Pane integrale');
    expect(segale.nome).toBe('Pane di segale');
    expect(integrale).toMatchObject({ area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 });
  });

  it('«pasta integrale» non diventa «Pasta di semola»', () => {
    expect(proponi('pasta integrale', 'g').nome).toBe('Pasta integrale');
  });

  it('un alimento uguale alla chiave prende il nome della tabella', () => {
    expect(proponi('pasta', 'g').nome).toBe('Pasta di semola');
    expect(proponi('Olio  Extravergine', 'ml').nome).toBe('Olio extravergine di oliva');
  });

  it("l'alimento della proposta resta il nome estratto normalizzato", () => {
    expect(proponi('Pane Integrale', 'g').alimento).toBe('pane integrale');
  });
});

describe('proponi — il ripiego', () => {
  it('a pezzi propone 1 pz a confezione', () => {
    expect(proponi('olive taggiasche', 'pz')).toMatchObject({ unitaBase: 'pz', formatoConfezione: 1, area: 'dispensa', classeResiduo: 'stima', deperibile: false, prezzoConfezione: null });
    expect(origineProposta('olive taggiasche', 'pz')).toBe('ripiego');
  });

  it('in g e in ml resta 500', () => {
    expect(proponi('olive taggiasche', 'g')).toMatchObject({ unitaBase: 'g', formatoConfezione: 500 });
    expect(proponi('alchermes', 'ml')).toMatchObject({ unitaBase: 'ml', formatoConfezione: 500 });
  });

  it('senza unità: 500 g', () => {
    expect(proponi('cosa ignota', null)).toMatchObject({ unitaBase: 'g', formatoConfezione: 500 });
  });

  it("un'unità che non torna con la voce è un ripiego", () => {
    expect(origineProposta('latte', 'g')).toBe('ripiego');
    expect(proponi('latte', 'g')).toMatchObject({ nome: 'Latte', unitaBase: 'g', formatoConfezione: 500, area: 'dispensa' });
  });

  it('il prezzo non si propone mai', () => {
    expect(proponi('pasta', 'g').prezzoConfezione).toBeNull();
  });
});
