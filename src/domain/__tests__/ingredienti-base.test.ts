import { describe, it, expect } from 'vitest';
import { INGREDIENTI_BASE, predefinitiIngrediente } from '../ingredienti-base';
import { ORDINE_AREE_DEFAULT } from '../aree';
import type { AreaId, UnitaBase } from '../types';

/** Stessa normalizzazione della ricerca: senza accenti, minuscolo, senza spazi ai bordi. */
function normalizza(nome: string): string {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function perNome(nome: string) {
  const voce = INGREDIENTI_BASE.find((i) => i.nome === nome);
  if (!voce) throw new Error(`Manca "${nome}" in INGREDIENTI_BASE`);
  return voce;
}

describe('INGREDIENTI_BASE', () => {
  it('sono i 71 del file SQL', () => {
    expect(INGREDIENTI_BASE).toHaveLength(71);
  });

  it('i nomi sono unici anche dopo la normalizzazione', () => {
    const normalizzati = INGREDIENTI_BASE.map((i) => normalizza(i.nome));
    expect(new Set(normalizzati).size).toBe(INGREDIENTI_BASE.length);
  });

  it('nessun nome vuoto o con spazi ai bordi', () => {
    for (const i of INGREDIENTI_BASE) {
      expect(i.nome.trim()).toBe(i.nome);
      expect(i.nome.length).toBeGreaterThan(0);
    }
  });

  it('ogni voce ha area, unità e classe valide e un formato positivo', () => {
    for (const i of INGREDIENTI_BASE) {
      expect(ORDINE_AREE_DEFAULT).toContain(i.area);
      expect(['g', 'ml', 'pz']).toContain(i.unitaBase);
      expect(['porzionabile', 'intero', 'stima']).toContain(i.classeResiduo);
      expect(typeof i.deperibile).toBe('boolean');
      expect(i.formatoConfezione).toBeGreaterThan(0);
    }
  });

  it("ogni 'intero' si compra a pezzo con formato 1, come impone list-builder", () => {
    const interi = INGREDIENTI_BASE.filter((i) => i.classeResiduo === 'intero');
    expect(interi.length).toBeGreaterThan(0);
    for (const i of interi) {
      expect(i.unitaBase).toBe('pz');
      expect(i.formatoConfezione).toBe(1);
    }
  });

  it('rispecchia il file SQL su alcune voci prese a campione', () => {
    expect(perNome('Riso')).toEqual({
      nome: 'Riso', unitaBase: 'g', area: 'cereali',
      classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
    });
    expect(perNome('Uova')).toEqual({
      nome: 'Uova', unitaBase: 'pz', area: 'latticini',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 6,
    });
    expect(perNome('Banane')).toEqual({
      nome: 'Banane', unitaBase: 'pz', area: 'ortofrutta',
      classeResiduo: 'intero', deperibile: true, formatoConfezione: 1,
    });
    expect(perNome('Sale')).toMatchObject({ area: 'dispensa', classeResiduo: 'stima', deperibile: false });
    expect(perNome('Gamberi surgelati')).toMatchObject({
      area: 'surgelati', deperibile: false, formatoConfezione: 300,
    });
    expect(perNome('Latte')).toMatchObject({ unitaBase: 'ml', formatoConfezione: 1000 });
    expect(perNome('Caffè')).toMatchObject({ classeResiduo: 'stima', formatoConfezione: 250 });
  });

  it('mantiene l’ordine del file SQL: prima e ultima voce', () => {
    expect(INGREDIENTI_BASE[0].nome).toBe('Banane');
    expect(INGREDIENTI_BASE[INGREDIENTI_BASE.length - 1].nome).toBe('Gamberi surgelati');
  });

  it('ha lo stesso numero di voci per area del file SQL', () => {
    const conteggio: Record<AreaId, number> = {
      ortofrutta: 0, macelleria: 0, latticini: 0, cereali: 0, dispensa: 0, surgelati: 0,
    };
    for (const i of INGREDIENTI_BASE) conteggio[i.area] += 1;
    expect(conteggio).toEqual({
      ortofrutta: 20, macelleria: 5, latticini: 12, cereali: 10, dispensa: 19, surgelati: 5,
    });
  });
});

describe('predefinitiIngrediente', () => {
  const DEPERIBILE: Record<AreaId, boolean> = {
    ortofrutta: true, macelleria: true, latticini: true,
    cereali: false, dispensa: false, surgelati: false,
  };
  const PER_UNITA: Record<UnitaBase, { classeResiduo: string; formatoConfezione: number }> = {
    pz: { classeResiduo: 'intero', formatoConfezione: 1 },
    g: { classeResiduo: 'porzionabile', formatoConfezione: 500 },
    ml: { classeResiduo: 'porzionabile', formatoConfezione: 1000 },
  };

  it.each(ORDINE_AREE_DEFAULT)('area %s: classe e formato seguono l’unità, deperibile segue l’area', (area) => {
    for (const unita of ['pz', 'g', 'ml'] as const) {
      expect(predefinitiIngrediente(area, unita)).toEqual({
        ...PER_UNITA[unita],
        deperibile: DEPERIBILE[area],
      });
    }
  });

  it("'pz' è sempre intero da 1, qualunque area", () => {
    expect(predefinitiIngrediente('dispensa', 'pz')).toEqual({
      classeResiduo: 'intero', deperibile: false, formatoConfezione: 1,
    });
  });

  it('restituisce solo i tre campi dei difetti', () => {
    expect(Object.keys(predefinitiIngrediente('ortofrutta', 'g')).sort()).toEqual([
      'classeResiduo', 'deperibile', 'formatoConfezione',
    ]);
  });
});
