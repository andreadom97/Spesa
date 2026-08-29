import { describe, it, expect } from 'vitest';
import { validaEsito, PianoNonValidoError } from '../valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_GIORNATA_UNICA, FIXTURE_RIFIUTO_MACRO } from '../fixtures';
import type { EsitoEstrazione } from '../types';

type PianoEsito = Extract<EsitoEstrazione, { tipo: 'piano' }>;

describe('validaEsito', () => {
  it('accetta i fixture sintetici così come sono', () => {
    expect(validaEsito(structuredClone(FIXTURE_MENU_SETTIMANALE))).toEqual(FIXTURE_MENU_SETTIMANALE);
    expect(validaEsito(structuredClone(FIXTURE_GIORNATA_UNICA))).toEqual(FIXTURE_GIORNATA_UNICA);
    expect(validaEsito(structuredClone(FIXTURE_RIFIUTO_MACRO))).toEqual(FIXTURE_RIFIUTO_MACRO);
  });

  it('rifiuta ciò che non è un esito', () => {
    expect(() => validaEsito(null)).toThrow(PianoNonValidoError);
    expect(() => validaEsito({ tipo: 'boh' })).toThrow(PianoNonValidoError);
    expect(() => validaEsito({ tipo: 'piano', piano: {} })).toThrow(PianoNonValidoError);
  });

  it('rifiuta un giorno fuori 0..6 e una settimana fuori 1..4', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    rotto.piano.settimane[0].giorni[0].giorno = 7;
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
    const rotto2 = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    rotto2.piano.settimane[0].numero = 5;
    expect(() => validaEsito(rotto2)).toThrow(PianoNonValidoError);
  });

  it('rifiuta una riga con quantita numerica ma unita null (o viceversa quantita null con unita)', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    rotto.piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[0] = {
      alimento: 'riso', quantita: 80, unita: null, testoOriginale: 'riso 80g',
    };
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });

  it("rifiuta un'opzione vuota e un componente con meno di due opzioni", () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    // Nel fixture il primo piatto della cena di lunedì ha un componente con 2 opzioni.
    rotto.piano.settimane[0].giorni[0].pasti[1].piatti[0].componenti[0].opzioni = [[]];
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });

  it('rifiuta un piano con zero settimane o un pasto con zero piatti (salvo condimenti, che ha piatti)', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    rotto.piano.settimane = [];
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });
});
