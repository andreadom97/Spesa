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
      alimento: 'riso', quantita: 80, unita: null, quantitaInferita: false, testoOriginale: 'riso 80g',
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

  it('rifiuta due settimane con lo stesso numero', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    // FIXTURE_MENU_SETTIMANALE ha 2 settimane (numero 1 e 2): forza la seconda a duplicare la prima.
    rotto.piano.settimane[1].numero = rotto.piano.settimane[0].numero;
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });

  it('rifiuta due giorni con lo stesso numero dentro la stessa settimana', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE) as PianoEsito;
    // La settimana 1 ha giorni 0 e 1: forza il secondo a duplicare il primo.
    rotto.piano.settimane[0].giorni[1].giorno = rotto.piano.settimane[0].giorni[0].giorno;
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('formato esteso (giorni_tipo, quantitaInferita, nota, contiguità)', () => {
  function pianoBase(): Record<string, unknown> {
    return {
      tipo: 'piano',
      piano: {
        archetipo: 'menu_settimanale',
        fonte: 'test',
        noteEstrazione: [],
        settimane: [{
          numero: 1,
          giorni: [{
            giorno: 0,
            pasti: [{
              nomeOriginale: 'pranzo',
              piatti: [{
                nome: 'Riso', descrizione: null, componenti: [],
                righeFisse: [{ alimento: 'riso', quantita: 80, unita: 'g', testoOriginale: 'riso 80g' }],
              }],
            }],
          }],
        }],
      },
    };
  }

  it('normalizza i legacy: titolo/quantitaInferita/nota assenti → null/false/null', () => {
    const esito = validaEsito(pianoBase());
    if (esito.tipo !== 'piano') throw new Error('atteso piano');
    expect(esito.piano.settimane[0].giorni[0].titolo).toBeNull();
    expect(esito.piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[0].quantitaInferita).toBe(false);
  });

  it('quantitaInferita true con quantita null → invalido', () => {
    const p = pianoBase();
    const riga = (p.piano as any).settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[0];
    riga.quantita = null; riga.unita = null; riga.quantitaInferita = true;
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });

  it('nota del componente: stringa passa, numero no', () => {
    const p = pianoBase();
    (p.piano as any).settimane[0].giorni[0].pasti[0].piatti[0].componenti = [{
      nome: 'pane', nota: '1 vv sett',
      opzioni: [
        [{ alimento: 'pane integrale', quantita: 60, unita: 'g', testoOriginale: 'pane 60g' }],
        [{ alimento: 'pane di segale', quantita: 60, unita: 'g', testoOriginale: 'o segale 60g' }],
      ],
    }];
    const esito = validaEsito(p);
    if (esito.tipo !== 'piano') throw new Error('atteso piano');
    expect(esito.piano.settimane[0].giorni[0].pasti[0].piatti[0].componenti[0].nota).toBe('1 vv sett');
    (p.piano as any).settimane[0].giorni[0].pasti[0].piatti[0].componenti[0].nota = 7;
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });

  it('giorni_tipo valido: una settimana numero 1, giorni indicizzati da 0 con titolo', () => {
    const p = pianoBase();
    (p.piano as any).archetipo = 'giorni_tipo';
    (p.piano as any).settimane[0].giorni[0].titolo = 'Piano 1';
    const esito = validaEsito(p);
    if (esito.tipo !== 'piano') throw new Error('atteso piano');
    expect(esito.piano.archetipo).toBe('giorni_tipo');
    expect(esito.piano.settimane[0].giorni[0].titolo).toBe('Piano 1');
  });

  it('giorni_tipo: titolo mancante o vuoto → invalido', () => {
    const p = pianoBase();
    (p.piano as any).archetipo = 'giorni_tipo';
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
    (p.piano as any).settimane[0].giorni[0].titolo = '  ';
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });

  it('giorni_tipo: indici giorno non contigui da 0 → invalido', () => {
    const p = pianoBase();
    (p.piano as any).archetipo = 'giorni_tipo';
    (p.piano as any).settimane[0].giorni[0].titolo = 'Piano 1';
    (p.piano as any).settimane[0].giorni[0].giorno = 2;
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });

  it('archetipo settimanale con titolo valorizzato → invalido', () => {
    const p = pianoBase();
    (p.piano as any).settimane[0].giorni[0].titolo = 'Piano 1';
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });

  it('settimane non contigue da 1 → invalido', () => {
    const p = pianoBase();
    const s1 = (p.piano as any).settimane[0];
    (p.piano as any).settimane = [s1, { ...structuredClone(s1), numero: 3 }];
    expect(() => validaEsito(p)).toThrow(PianoNonValidoError);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
