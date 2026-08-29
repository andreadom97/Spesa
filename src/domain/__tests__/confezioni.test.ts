import { describe, expect, it } from 'vitest';
import { confezioniNecessarie } from '../confezioni';

describe('confezioniNecessarie', () => {
  it('arrotonda per eccesso al formato confezione', () => {
    const r = confezioniNecessarie({ fabbisogno: 80, residuo: 0, classeResiduo: 'porzionabile', formatoConfezione: 1000 });
    expect(r).toEqual({ daComprare: 80, confezioni: 1, quantitaTotale: 1000 });
  });

  it('il residuo copre tutto: zero confezioni', () => {
    const r = confezioniNecessarie({ fabbisogno: 80, residuo: 920, classeResiduo: 'porzionabile', formatoConfezione: 1000 });
    expect(r).toEqual({ daComprare: 0, confezioni: 0, quantitaTotale: 0 });
  });

  it('classe intero: il formato è 1, si compra a pezzi', () => {
    const r = confezioniNecessarie({ fabbisogno: 3, residuo: 1, classeResiduo: 'intero', formatoConfezione: 6 });
    expect(r).toEqual({ daComprare: 2, confezioni: 2, quantitaTotale: 2 });
  });

  it('residuo maggiore del fabbisogno non produce numeri negativi', () => {
    const r = confezioniNecessarie({ fabbisogno: 50, residuo: 200, classeResiduo: 'porzionabile', formatoConfezione: 500 });
    expect(r).toEqual({ daComprare: 0, confezioni: 0, quantitaTotale: 0 });
  });
});
