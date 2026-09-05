import { describe, it, expect } from 'vitest';
import { validaIndice } from '../indice';
import { PianoNonValidoError } from '../valida';

const buono = {
  tipo: 'indice',
  indice: {
    archetipo: 'menu_settimanale', fonte: '3 foto', noteEstrazione: [],
    pagine: [
      { pagina: 1, continuaDallaPrecedente: false, contenuto: [{ settimana: 1, giorno: 0, titolo: null, pasti: ['colazione', 'pranzo'] }] },
      { pagina: 2, continuaDallaPrecedente: true, contenuto: [{ settimana: 1, giorno: 0, titolo: null, pasti: ['pranzo', 'cena'] }] },
      { pagina: 3, continuaDallaPrecedente: false, contenuto: [] },
    ],
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function clone(): any {
  return structuredClone(buono);
}

describe('validaIndice', () => {
  it('accetta un indice ben formato, pagine vuote incluse', () => {
    expect(validaIndice(buono).tipo).toBe('indice');
  });
  it('restituisce l\'indice così com\'è quando è valido', () => {
    expect(validaIndice(structuredClone(buono))).toEqual(buono);
  });
  it('accetta il rifiuto onesto', () => {
    expect(validaIndice({ tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro', motivazione: 'solo macro' } }).tipo).toBe('rifiuto');
  });
  it('rifiuta pagine non contigue', () => {
    const v = clone(); v.indice.pagine[1].pagina = 5;
    expect(() => validaIndice(v)).toThrow(PianoNonValidoError);
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\): non contigue/);
  });
  it('rifiuta titolo non nullo fuori da giorni_tipo', () => {
    const v = clone(); v.indice.pagine[0].contenuto[0].titolo = 'Piano 1';
    expect(() => validaIndice(v)).toThrow(/titolo/);
  });
  it('esige titolo in giorni_tipo', () => {
    const v = clone(); v.indice.archetipo = 'giorni_tipo';
    expect(() => validaIndice(v)).toThrow(/titolo/);
  });
  it('rifiuta giorno fuori da 0..6 negli archetipi settimanali', () => {
    const v = clone(); v.indice.pagine[0].contenuto[0].giorno = 7;
    expect(() => validaIndice(v)).toThrow(/giorno/);
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.giorno\): fuori intervallo/);
  });
});

describe('validaIndice: forma dell\'esito', () => {
  it('rifiuta ciò che non è un esito', () => {
    expect(() => validaIndice(null)).toThrow(PianoNonValidoError);
    expect(() => validaIndice({ tipo: 'boh' })).toThrow(/esito\.tipo/);
    expect(() => validaIndice({ tipo: 'indice', indice: {} })).toThrow(PianoNonValidoError);
    expect(() => validaIndice({ tipo: 'indice', indice: null })).toThrow(PianoNonValidoError);
  });
  it('il rifiuto segue le regole di validaEsito: archetipo solo_macro e motivazione stringa', () => {
    expect(() => validaIndice({ tipo: 'rifiuto', rifiuto: { archetipo: 'menu_settimanale', motivazione: 'x' } })).toThrow(PianoNonValidoError);
    expect(() => validaIndice({ tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro' } })).toThrow(/motivazione/);
    expect(() => validaIndice({ tipo: 'rifiuto' })).toThrow(PianoNonValidoError);
  });
  it('rifiuta un archetipo sconosciuto', () => {
    const v = clone(); v.indice.archetipo = 'solo_macro';
    expect(() => validaIndice(v)).toThrow(/indice\.archetipo/);
  });
  it('esige fonte stringa e noteEstrazione array di stringhe', () => {
    const v = clone(); v.indice.fonte = 3;
    expect(() => validaIndice(v)).toThrow(/indice\.fonte/);
    const v2 = clone(); v2.indice.noteEstrazione = 'nota';
    expect(() => validaIndice(v2)).toThrow(/indice\.noteEstrazione/);
    const v3 = clone(); v3.indice.noteEstrazione = ['ok', 4];
    expect(() => validaIndice(v3)).toThrow(/indice\.noteEstrazione\[1\]/);
  });
});

describe('validaIndice: pagine', () => {
  it('esige che pagine sia un array non vuoto', () => {
    const v = clone(); v.indice.pagine = {};
    expect(() => validaIndice(v)).toThrow(/indice\.pagine/);
    const v2 = clone(); v2.indice.pagine = [];
    expect(() => validaIndice(v2)).toThrow(/indice\.pagine\): vuoto/);
  });
  it('esige che le pagine partano da 1', () => {
    const v = clone();
    v.indice.pagine.forEach((p: { pagina: number }) => { p.pagina += 1; });
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\): non contigue/);
  });
  it('rifiuta pagine duplicate o in disordine', () => {
    const v = clone(); v.indice.pagine[2].pagina = 2;
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\): non contigue/);
    const v2 = clone(); v2.indice.pagine[0].pagina = 2; v2.indice.pagine[1].pagina = 1;
    expect(() => validaIndice(v2)).toThrow(/indice\.pagine\): non contigue/);
  });
  it('esige che pagina sia un intero positivo', () => {
    const v = clone(); v.indice.pagine[0].pagina = '1';
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[0\]\.pagina/);
    const v2 = clone(); v2.indice.pagine[0].pagina = 1.5;
    expect(() => validaIndice(v2)).toThrow(/indice\.pagine\[0\]\.pagina/);
  });
  it('esige continuaDallaPrecedente booleano', () => {
    const v = clone(); v.indice.pagine[1].continuaDallaPrecedente = 'sì';
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[1\]\.continuaDallaPrecedente/);
    const v2 = clone(); delete v2.indice.pagine[1].continuaDallaPrecedente;
    expect(() => validaIndice(v2)).toThrow(/indice\.pagine\[1\]\.continuaDallaPrecedente/);
  });
  it('esige contenuto array', () => {
    const v = clone(); v.indice.pagine[2].contenuto = null;
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[2\]\.contenuto/);
  });
});

describe('validaIndice: voci di contenuto', () => {
  it('esige settimana intera in 1..4', () => {
    for (const settimana of [0, 5, 1.5, '1']) {
      const v = clone(); v.indice.pagine[0].contenuto[0].settimana = settimana;
      expect(() => validaIndice(v)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.settimana/);
    }
    const ok = clone(); ok.indice.pagine[0].contenuto[0].settimana = 4;
    expect(validaIndice(ok).tipo).toBe('indice');
  });
  it('esige giorno intero negli archetipi settimanali', () => {
    for (const giorno of [-1, 0.5, '0']) {
      const v = clone(); v.indice.pagine[1].contenuto[0].giorno = giorno;
      expect(() => validaIndice(v)).toThrow(/indice\.pagine\[1\]\.contenuto\[0\]\.giorno/);
    }
  });
  it('vale per tutti gli archetipi settimanali', () => {
    for (const archetipo of ['giornata_unica', 'griglia_alternative']) {
      const v = clone(); v.indice.archetipo = archetipo; v.indice.pagine[0].contenuto[0].giorno = 7;
      expect(() => validaIndice(v)).toThrow(/giorno\): fuori intervallo/);
      const t = clone(); t.indice.archetipo = archetipo; t.indice.pagine[0].contenuto[0].titolo = 'Piano';
      expect(() => validaIndice(t)).toThrow(/titolo/);
    }
  });
  it('in giorni_tipo giorno è un intero >= 0 anche oltre 6, e titolo una stringa non vuota', () => {
    const v = clone(); v.indice.archetipo = 'giorni_tipo';
    for (const c of v.indice.pagine.flatMap((p: { contenuto: { titolo: unknown }[] }) => p.contenuto)) c.titolo = 'Piano 1';
    v.indice.pagine[0].contenuto[0].giorno = 9;
    expect(validaIndice(v).tipo).toBe('indice');
    const neg = structuredClone(v); neg.indice.pagine[0].contenuto[0].giorno = -1;
    expect(() => validaIndice(neg)).toThrow(/giorno\): fuori intervallo/);
    const vuoto = structuredClone(v); vuoto.indice.pagine[0].contenuto[0].titolo = '   ';
    expect(() => validaIndice(vuoto)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.titolo/);
    const numero = structuredClone(v); numero.indice.pagine[0].contenuto[0].titolo = 3;
    expect(() => validaIndice(numero)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.titolo/);
  });
  it('esige pasti array di stringhe non vuote', () => {
    const v = clone(); v.indice.pagine[0].contenuto[0].pasti = 'pranzo';
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.pasti/);
    const v2 = clone(); v2.indice.pagine[0].contenuto[0].pasti = ['pranzo', ''];
    expect(() => validaIndice(v2)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.pasti\[1\]/);
    const v3 = clone(); v3.indice.pagine[0].contenuto[0].pasti = ['pranzo', 2];
    expect(() => validaIndice(v3)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]\.pasti\[1\]/);
    const ok = clone(); ok.indice.pagine[0].contenuto[0].pasti = [];
    expect(validaIndice(ok).tipo).toBe('indice');
  });
  it('rifiuta una voce che non è un oggetto', () => {
    const v = clone(); v.indice.pagine[0].contenuto[0] = 'lunedì';
    expect(() => validaIndice(v)).toThrow(/indice\.pagine\[0\]\.contenuto\[0\]/);
  });
});
