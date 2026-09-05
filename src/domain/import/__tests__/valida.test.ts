import { describe, it, expect } from 'vitest';
import { validaEsito, validaPianoParziale, validaStatoRevisione, PianoNonValidoError } from '../valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_GIORNATA_UNICA, FIXTURE_RIFIUTO_MACRO, PIANO_MENU_SETTIMANALE } from '../fixtures';
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

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('validaPianoParziale', () => {
  /** Il piano di una pagina in formato legacy (senza titolo/quantitaInferita/nota), settimana a scelta. */
  function paginaLegacy(numeroSettimana: number): Record<string, unknown> {
    return {
      archetipo: 'menu_settimanale',
      fonte: 'test',
      noteEstrazione: [],
      settimane: [{
        numero: numeroSettimana,
        giorni: [{
          giorno: 3,
          pasti: [{
            nomeOriginale: 'pranzo',
            piatti: [{
              nome: 'Riso', descrizione: null, componenti: [],
              righeFisse: [{ alimento: 'riso', quantita: 80, unita: 'g', testoOriginale: 'riso 80g' }],
            }],
          }],
        }],
      }],
    };
  }

  it('una pagina con la sola settimana 2 passa validaPianoParziale e fallisce validaEsito', () => {
    const pagina = paginaLegacy(2);
    expect(validaPianoParziale(structuredClone(pagina)).settimane[0].numero).toBe(2);
    expect(() => validaEsito({ tipo: 'piano', piano: structuredClone(pagina) })).toThrow(PianoNonValidoError);
  });

  it('una riga senza testoOriginale fallisce entrambe', () => {
    const pagina = paginaLegacy(1);
    delete (pagina as any).settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[0].testoOriginale;
    expect(() => validaPianoParziale(structuredClone(pagina))).toThrow(PianoNonValidoError);
    expect(() => validaEsito({ tipo: 'piano', piano: structuredClone(pagina) })).toThrow(PianoNonValidoError);
  });

  it('normalizza i legacy come validaPiano: quantitaInferita → false, titolo → null, nota → null', () => {
    const pagina = paginaLegacy(2);
    (pagina as any).settimane[0].giorni[0].pasti[0].piatti[0].componenti = [{
      nome: 'pane',
      opzioni: [
        [{ alimento: 'pane integrale', quantita: 60, unita: 'g', testoOriginale: 'pane 60g' }],
        [{ alimento: 'pane di segale', quantita: 60, unita: 'g', testoOriginale: 'o segale 60g' }],
      ],
    }];
    const piano = validaPianoParziale(pagina);
    const piatto = piano.settimane[0].giorni[0].pasti[0].piatti[0];
    expect(piatto.righeFisse[0].quantitaInferita).toBe(false);
    expect(piatto.componenti[0].nota).toBeNull();
    expect(piano.settimane[0].giorni[0].titolo).toBeNull();
  });

  it('un piano completo valido passa entrambe con lo stesso risultato', () => {
    const parziale = validaPianoParziale(structuredClone(PIANO_MENU_SETTIMANALE));
    const esito = validaEsito(structuredClone(FIXTURE_MENU_SETTIMANALE));
    if (esito.tipo !== 'piano') throw new Error('atteso piano');
    expect(parziale).toEqual(esito.piano);
    expect(parziale).toEqual(PIANO_MENU_SETTIMANALE);
  });

  it('tiene le regole di forma della singola riga/pasto/giorno: giorno fuori 0..6, pasto senza piatti, archetipo ignoto', () => {
    const giorno7 = paginaLegacy(1);
    (giorno7 as any).settimane[0].giorni[0].giorno = 7;
    expect(() => validaPianoParziale(giorno7)).toThrow(PianoNonValidoError);
    const senzaPiatti = paginaLegacy(1);
    (senzaPiatti as any).settimane[0].giorni[0].pasti[0].piatti = [];
    expect(() => validaPianoParziale(senzaPiatti)).toThrow(PianoNonValidoError);
    const ignoto = paginaLegacy(1);
    (ignoto as any).archetipo = 'boh';
    expect(() => validaPianoParziale(ignoto)).toThrow(PianoNonValidoError);
  });

  it('archetipo settimanale con titolo valorizzato resta invalido anche per una pagina', () => {
    const pagina = paginaLegacy(1);
    (pagina as any).settimane[0].giorni[0].titolo = 'Piano 1';
    expect(() => validaPianoParziale(pagina)).toThrow(PianoNonValidoError);
  });

  it("giorni_tipo: la pagina che continua un giorno può non avere il titolo (lo esige l'insieme), ma non un giorno negativo", () => {
    const pagina = paginaLegacy(1);
    (pagina as any).archetipo = 'giorni_tipo';
    expect(validaPianoParziale(structuredClone(pagina)).settimane[0].giorni[0].titolo).toBeNull();
    expect(() => validaEsito({ tipo: 'piano', piano: structuredClone(pagina) })).toThrow(PianoNonValidoError);
    (pagina as any).settimane[0].giorni[0].giorno = -1;
    expect(() => validaPianoParziale(pagina)).toThrow(PianoNonValidoError);
  });

  it('le settimane di una pagina non devono essere contigue, ma non possono ripetersi', () => {
    const pagina = paginaLegacy(1);
    const s1 = (pagina as any).settimane[0];
    (pagina as any).settimane = [s1, { ...structuredClone(s1), numero: 3 }];
    expect(validaPianoParziale(structuredClone(pagina)).settimane.map((s) => s.numero)).toEqual([1, 3]);
    (pagina as any).settimane[1].numero = 1;
    expect(() => validaPianoParziale(pagina)).toThrow(PianoNonValidoError);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('validaStatoRevisione — prezzo per confezione degli ingredienti nuovi', () => {
  const proposta = {
    alimento: 'riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
    classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
  };
  function stato(ingrediente: Record<string, unknown>): unknown {
    return { passo: 'formati', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [ingrediente] };
  }

  it('una bozza legacy senza prezzoConfezione viene normalizzata a null', () => {
    const s = validaStatoRevisione(stato(proposta));
    expect(s.ingredientiNuovi[0].prezzoConfezione).toBeNull();
    expect(s.ingredientiNuovi[0]).toMatchObject({ alimento: 'riso', formatoConfezione: 1000 });
  });

  it('accetta null esplicito e un numero positivo', () => {
    expect(validaStatoRevisione(stato({ ...proposta, prezzoConfezione: null })).ingredientiNuovi[0].prezzoConfezione).toBeNull();
    expect(validaStatoRevisione(stato({ ...proposta, prezzoConfezione: 2.5 })).ingredientiNuovi[0].prezzoConfezione).toBe(2.5);
  });

  it('rifiuta un prezzo zero, negativo, non finito o non numerico', () => {
    for (const prezzo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, '2.5']) {
      expect(() => validaStatoRevisione(stato({ ...proposta, prezzoConfezione: prezzo }))).toThrow(PianoNonValidoError);
    }
  });

  it('rifiuta un ingrediente nuovo che non è un oggetto', () => {
    expect(() => validaStatoRevisione(stato('riso' as unknown as Record<string, unknown>))).toThrow(PianoNonValidoError);
  });
});
