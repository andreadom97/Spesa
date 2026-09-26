import { describe, it, expect } from 'vitest';
import { contatoreReparto, ordinaRepartiPerSpesa, repartoCompleto } from '../lista-reparti';

const voce = (spuntato: boolean) => ({ spuntato });
const reparto = (area: string, voci: boolean[], controlli = 0) => ({
  area, voci: voci.map(voce), controlli: Array.from({ length: controlli }, () => ({})),
});

describe('contatoreReparto', () => {
  it('conta le voci prese sul totale delle voci', () => {
    expect(contatoreReparto(reparto('a', [true, false, false]))).toEqual({ presi: 1, totale: 3 });
  });

  it('i controlli non sono voci da prendere: restano fuori dal conto', () => {
    expect(contatoreReparto(reparto('a', [false], 2))).toEqual({ presi: 0, totale: 1 });
  });
});

describe('repartoCompleto', () => {
  it('completo quando tutte le voci sono prese e non restano controlli', () => {
    expect(repartoCompleto(reparto('a', [true, true]))).toBe(true);
  });

  it('non completo se manca una voce', () => {
    expect(repartoCompleto(reparto('a', [true, false]))).toBe(false);
  });

  it('non completo se resta un controllo da rispondere (come listaFinita)', () => {
    expect(repartoCompleto(reparto('a', [true], 1))).toBe(false);
  });

  it('un reparto di soli controlli non è completo finché ci sono controlli', () => {
    expect(repartoCompleto(reparto('a', [], 1))).toBe(false);
  });
});

describe('ordinaRepartiPerSpesa', () => {
  it('i reparti completi scendono in fondo, gli altri tengono il loro ordine', () => {
    const sezioni = [
      reparto('ortofrutta', [true, true]),
      reparto('macelleria', [false]),
      reparto('latticini', [true]),
      reparto('cereali', [false, true]),
    ];
    expect(ordinaRepartiPerSpesa(sezioni).map((s) => s.area))
      .toEqual(['macelleria', 'cereali', 'ortofrutta', 'latticini']);
  });

  it('nessun reparto completo: ordine invariato', () => {
    const sezioni = [reparto('a', [false]), reparto('b', [false])];
    expect(ordinaRepartiPerSpesa(sezioni).map((s) => s.area)).toEqual(['a', 'b']);
  });

  it('non tocca l\'array che riceve (arriva dallo stato di React)', () => {
    const sezioni = [reparto('a', [true]), reparto('b', [false])];
    ordinaRepartiPerSpesa(sezioni);
    expect(sezioni.map((s) => s.area)).toEqual(['a', 'b']);
  });
});
