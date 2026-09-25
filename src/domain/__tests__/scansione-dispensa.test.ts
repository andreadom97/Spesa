import { describe, it, expect } from 'vitest';
import type { Ingredient } from '../types';
import {
  MSG_CATALOGO, MSG_NON_TROVATO, esitoDaCatalogo, esitoLocale, esitoNuovoDaCatalogo, esitoNuovoLocale, proprietario,
} from '../scansione-dispensa';

const EAN = '8001234567890';
function ing(p: Partial<Ingredient>): Ingredient {
  return { id: 'x', nome: 'X', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null, ...p };
}
const pollo = ing({ id: 'pollo', nome: 'Petto di pollo', area: 'macelleria', deperibile: true, formatoConfezione: 300 });
const tonnoA = ing({ id: 'ta', nome: 'Tonno', ean: EAN });
const tonnoB = ing({ id: 'tb', nome: 'Acciughe', ean: EAN });

describe('esitoLocale (dal dettaglio)', () => {
  it('il codice è di questo ingrediente: confezione col suo formato, senza rete', () => {
    const aperto = { ...pollo, ean: EAN };
    expect(esitoLocale(EAN, aperto, [aperto])).toEqual({ tipo: 'confezione', ean: EAN, formato: 300 });
  });
  it('il codice è di un altro: il primo per nome A–Z', () => {
    expect(esitoLocale(EAN, pollo, [pollo, tonnoA, tonnoB])).toEqual({ tipo: 'altroIngrediente', ean: EAN, ingrediente: tonnoB });
    expect(proprietario(EAN, [tonnoA, tonnoB], 'tb')).toEqual(tonnoA);
  });
  it('nessuno lo ha: serve il catalogo', () => {
    expect(esitoLocale(EAN, pollo, [pollo])).toBeNull();
  });
});

describe('esitoDaCatalogo (dal dettaglio)', () => {
  it('formato nella stessa unità: confezione', () => {
    expect(esitoDaCatalogo(EAN, pollo, { trovato: true, nome: 'Pollo', marca: 'M', quantita: { valore: 450, unita: 'g' } }))
      .toEqual({ tipo: 'confezione', ean: EAN, formato: 450 });
  });
  it('non trovato o senza quantità: a mano', () => {
    expect(esitoDaCatalogo(EAN, pollo, { trovato: false })).toEqual({ tipo: 'aMano', ean: EAN, messaggio: MSG_NON_TROVATO });
    expect(esitoDaCatalogo(EAN, pollo, { trovato: true, nome: '', marca: '', quantita: null })).toEqual({ tipo: 'aMano', ean: EAN, messaggio: MSG_NON_TROVATO });
  });
  it('unità diversa: a mano, e il messaggio dice le due unità', () => {
    expect(esitoDaCatalogo(EAN, pollo, { trovato: true, nome: '', marca: '', quantita: { valore: 1000, unita: 'ml' } }))
      .toEqual({ tipo: 'aMano', ean: EAN, messaggio: 'Unità diversa (ml contro g): scrivi il formato a mano.' });
  });
  it('rete o catalogo falliti: a mano', () => {
    expect(esitoDaCatalogo(EAN, pollo, 'errore')).toEqual({ tipo: 'aMano', ean: EAN, messaggio: MSG_CATALOGO });
  });
});

describe('Nuovo ingrediente', () => {
  it('un codice già di un ingrediente: apri quello', () => {
    expect(esitoNuovoLocale(EAN, [tonnoA])).toEqual({ tipo: 'altroIngrediente', ean: EAN, ingrediente: tonnoA });
    expect(esitoNuovoLocale(EAN, [pollo])).toBeNull();
  });
  it('dal catalogo: la quantità così com’è, o il messaggio', () => {
    expect(esitoNuovoDaCatalogo(EAN, { trovato: true, nome: '', marca: '', quantita: { valore: 80, unita: 'g' } }))
      .toEqual({ tipo: 'letto', ean: EAN, quantita: { valore: 80, unita: 'g' }, messaggio: null });
    expect(esitoNuovoDaCatalogo(EAN, { trovato: false })).toEqual({ tipo: 'letto', ean: EAN, quantita: null, messaggio: MSG_NON_TROVATO });
    expect(esitoNuovoDaCatalogo(EAN, 'errore')).toEqual({ tipo: 'letto', ean: EAN, quantita: null, messaggio: MSG_CATALOGO });
  });
});
