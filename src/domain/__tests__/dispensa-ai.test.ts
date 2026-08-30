import { describe, it, expect } from 'vitest';
import type { ContestoDispensa } from '../dispensa-ai';
import { validaProposte, EsitoNonValidoError, CONFIDENCE_SOGLIA } from '../dispensa-ai';

const CONTESTO: ContestoDispensa = [
  { id: 'i-riso', nome: 'Riso', unitaBase: 'g', formatoConfezione: 1000, residuo: 400, congelato: false },
  { id: 'i-olio', nome: 'Olio extravergine', unitaBase: 'ml', formatoConfezione: 1000, residuo: 990, congelato: false },
];

function proposta(sovrascrivi: Record<string, unknown> = {}) {
  return {
    ingredientId: 'i-riso', campo: 'residuo', valoreNuovo: 0,
    valoreAttuale: 400, confidence: 0.95, motivazione: '«finito il riso» → 0 g',
    ...sovrascrivi,
  };
}

describe('validaProposte', () => {
  it('un esito valido passa, e valoreAttuale viene riscritto dal contesto', () => {
    const esito = validaProposte(
      { proposte: [proposta({ valoreAttuale: 999999 })], nonRiconosciuti: [] },
      CONTESTO,
    );
    expect(esito.proposte).toHaveLength(1);
    expect(esito.proposte[0]!.valoreAttuale).toBe(400); // dal contesto, non dal modello
  });

  it('un esito vuoto è valido', () => {
    expect(validaProposte({ proposte: [], nonRiconosciuti: [] }, CONTESTO))
      .toEqual({ proposte: [], nonRiconosciuti: [] });
  });

  it.each([
    ['forma non oggetto', 'stringa'],
    ['proposte mancanti', { nonRiconosciuti: [] }],
    ['ingredientId sconosciuto', { proposte: [proposta({ ingredientId: 'i-fantasma' })], nonRiconosciuti: [] }],
    ['campo non ammesso', { proposte: [proposta({ campo: 'nome' })], nonRiconosciuti: [] }],
    ['residuo non numerico', { proposte: [proposta({ valoreNuovo: 'zero' })], nonRiconosciuti: [] }],
    ['residuo negativo', { proposte: [proposta({ valoreNuovo: -5 })], nonRiconosciuti: [] }],
    ['residuo non finito', { proposte: [proposta({ valoreNuovo: Number.NaN })], nonRiconosciuti: [] }],
    ['congelato non booleano', { proposte: [proposta({ campo: 'congelato', valoreNuovo: 'sì' })], nonRiconosciuti: [] }],
    ['confidence fuori range', { proposte: [proposta({ confidence: 1.2 })], nonRiconosciuti: [] }],
    ['motivazione non stringa', { proposte: [proposta({ motivazione: 7 })], nonRiconosciuti: [] }],
    ['nonRiconosciuti non di stringhe', { proposte: [], nonRiconosciuti: [42] }],
  ])('rifiuta tutto: %s', (_nome, grezzo) => {
    expect(() => validaProposte(grezzo, CONTESTO)).toThrow(EsitoNonValidoError);
  });

  it('conflitto sullo stesso ingrediente+campo: vince l\'ultima', () => {
    const esito = validaProposte({
      proposte: [
        proposta({ valoreNuovo: 200, confidence: 0.95 }),
        proposta({ valoreNuovo: 0, confidence: 0.8 }),
      ],
      nonRiconosciuti: [],
    }, CONTESTO);
    expect(esito.proposte).toHaveLength(1);
    expect(esito.proposte[0]!.valoreNuovo).toBe(0);
  });

  it('campi diversi sullo stesso ingrediente convivono', () => {
    const esito = validaProposte({
      proposte: [
        proposta(),
        proposta({ campo: 'congelato', valoreNuovo: true, valoreAttuale: false }),
      ],
      nonRiconosciuti: [],
    }, CONTESTO);
    expect(esito.proposte).toHaveLength(2);
    expect(esito.proposte[1]!.valoreAttuale).toBe(false); // congelato dal contesto
  });

  it('la soglia è quella della spec', () => {
    expect(CONFIDENCE_SOGLIA).toBe(0.9);
  });
});
