import { describe, it, expect } from 'vitest';
import type { ContestoDispensa } from '../dispensa-ai';
import { mockCorrezione } from '../dispensa-ai-mock';

const CONTESTO: ContestoDispensa = [
  { id: 'i-riso', nome: 'Riso', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false },
  { id: 'i-olio', nome: 'Olio extravergine', unitaBase: 'ml', formatoConfezione: 1000, residuo: 990, congelato: false },
  { id: 'i-pollo', nome: 'Pollo', unitaBase: 'g', formatoConfezione: 1000, residuo: 300, congelato: false },
];

describe('mockCorrezione — l\'interprete a regole', () => {
  it('"finito" porta il residuo a zero, match esatto = confidence 0.95', () => {
    const esito = mockCorrezione('ho finito il riso', CONTESTO);
    expect(esito.proposte).toHaveLength(1);
    expect(esito.proposte[0]).toMatchObject({
      ingredientId: 'i-riso', campo: 'residuo', valoreNuovo: 0, confidence: 0.95,
    });
  });

  it('"a metà" vale mezzo formatoConfezione; match per inclusione = 0.7', () => {
    const esito = mockCorrezione("l'olio è a metà", CONTESTO);
    expect(esito.proposte[0]).toMatchObject({
      ingredientId: 'i-olio', campo: 'residuo', valoreNuovo: 500, confidence: 0.7,
    });
  });

  it('"N confezioni" moltiplica il formato', () => {
    const esito = mockCorrezione('ho ancora 2 confezioni di riso', CONTESTO);
    expect(esito.proposte[0]).toMatchObject({ ingredientId: 'i-riso', valoreNuovo: 2000 });
  });

  it('"congelato" imposta il flag', () => {
    const esito = mockCorrezione('il pollo l\'ho congelato', CONTESTO);
    expect(esito.proposte[0]).toMatchObject({
      ingredientId: 'i-pollo', campo: 'congelato', valoreNuovo: true,
    });
  });

  it('più frasi separate da virgole diventano più proposte', () => {
    const esito = mockCorrezione('finito il riso, l\'olio è a metà', CONTESTO);
    expect(esito.proposte).toHaveLength(2);
  });

  it('una frase senza ingrediente o senza regola finisce nei non riconosciuti', () => {
    const esito = mockCorrezione('ho comprato la quinoa, il riso è bellissimo', CONTESTO);
    expect(esito.proposte).toHaveLength(0);
    expect(esito.nonRiconosciuti).toEqual(['ho comprato la quinoa', 'il riso è bellissimo']);
  });

  it('nota vuota o di soli separatori → esito vuoto', () => {
    expect(mockCorrezione('  ,, ', CONTESTO)).toEqual({ proposte: [], nonRiconosciuti: [] });
  });
});
