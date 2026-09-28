import { describe, it, expect } from 'vitest';
import type { Ingredient } from '@/domain/types';
import type { IngredienteProposto, PastoEstratto, StatoRevisione } from '../types';
import { PIANO_MENU_SETTIMANALE } from '../fixtures';
import { proponi } from '../formati-tipici';
import {
  calcolaProposte, diRipiego, legataA, motiviBlocco, nomiDoppi, passoBloccato, sceltiIniziali, sezioniIniziali, valoreRipiego,
} from '../ingredienti';
import { nomeAreaFrase } from '@/domain/aree';

const ing = (id: string, nome: string, unitaBase: Ingredient['unitaBase']): Ingredient => ({
  id, nome, unitaBase, area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
});
const AVENA = ing('i-avena', "Fiocchi d'avena", 'g');
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };
const proposta = (alimento: string, nome: string, unitaBase: Ingredient['unitaBase'] = 'g'): IngredienteProposto => ({ ...proponi(alimento, unitaBase), nome });

describe('calcolaProposte', () => {
  it('propone i soli non abbinati, coi nomi della dieta', () => {
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, STATO, [AVENA]);
    const nomi = proposte.map((p) => p.nome);
    expect(nomi).not.toContain("Fiocchi d'avena");
    expect(nomi).toContain('Pane integrale');
    expect(nomi).toContain('Pane di segale');
    expect(proposte).toHaveLength(9);
  });

  it('conserva le proposte già corrette, toglie quelle che non servono più e propone i nuovi alimenti', () => {
    const colazione: PastoEstratto = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    colazione.piatti[0].righeFisse.push({ alimento: 'farina di mandorle', quantita: 20, unita: 'g', quantitaInferita: false, testoOriginale: '20g farina di mandorle' });
    const stato: StatoRevisione = {
      ...STATO,
      correzioni: { '1-0-0': colazione },
      ingredientiNuovi: [
        { ...proponi('latte parzialmente scremato', 'ml'), nome: 'Latte scremato bio', formatoConfezione: 750 },
        { ...proponi('alimento fantasma', 'g'), nome: 'Fantasma' },
      ],
    };
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, stato, [AVENA]);
    expect(proposte.find((p) => p.alimento === 'latte parzialmente scremato')).toMatchObject({ nome: 'Latte scremato bio', formatoConfezione: 750 });
    expect(proposte.some((p) => p.alimento === 'farina di mandorle')).toBe(true);
    expect(proposte.some((p) => p.alimento === 'alimento fantasma')).toBe(false);
  });

  it("una proposta conservata con un'unità diversa da quella delle righe si ripropone da capo", () => {
    // Bozza vecchia: Formati lasciava cambiare l'unità, e il latte (in ml nelle righe) era stato messo in g.
    const stato: StatoRevisione = {
      ...STATO,
      ingredientiNuovi: [
        { ...proponi('latte parzialmente scremato', 'ml'), nome: 'Latte in polvere', unitaBase: 'g', formatoConfezione: 250 },
        { ...proponi('pane integrale', 'g'), nome: 'Pane integrale bio', prezzoConfezione: 1.2 },
      ],
    };
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, stato, [AVENA]);
    expect(proposte.find((p) => p.alimento === 'latte parzialmente scremato')).toEqual(proponi('latte parzialmente scremato', 'ml'));
    expect(proposte.find((p) => p.alimento === 'pane integrale')).toMatchObject({ nome: 'Pane integrale bio', prezzoConfezione: 1.2 });
  });

  it("un'unità nulla nelle righe non scarta la proposta conservata", () => {
    // Le olive del fixture non hanno unità: la proposta salvata, in pz, resta.
    const olive = { ...proponi('olive taggiasche', 'pz'), nome: 'Olive nere' };
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, { ...STATO, ingredientiNuovi: [olive] }, [AVENA]);
    expect(proposte.find((p) => p.alimento === 'olive taggiasche')).toEqual(olive);
  });
});

describe('legataA', () => {
  it('stesso nome normalizzato e stessa unità di un esistente', () => {
    const verdi = ing('i-verdi', 'Olive Verdi', 'pz');
    expect(legataA(proposta('olive taggiasche', 'olive verdi', 'pz'), [verdi])).toBe(verdi);
    expect(legataA(proposta('olive taggiasche', 'olive verdi', 'g'), [verdi])).toBeNull();
  });

  it('lega anche per inclusione, come traduciBozza: "Pasta di semola" g aggancia "Semola" g', () => {
    const semola = ing('i-semola', 'Semola', 'g');
    expect(legataA(proponi('pasta', 'g'), [semola])).toBe(semola);
  });

  it('un nome vuoto non è legato a niente (per inclusione starebbe in ogni nome)', () => {
    expect(legataA(proposta('riso', ''), [AVENA])).toBeNull();
    expect(legataA(proposta('riso', '   '), [AVENA])).toBeNull();
  });
});

describe('sceltiIniziali', () => {
  it('solo le proposte col nome esatto di un esistente della stessa unità: le scelte di una bozza ripresa', () => {
    const semola = ing('i-semola', 'Semola', 'g');
    const verdi = ing('i-verdi', 'Olive verdi', 'pz');
    const proposte = [
      proposta('olive taggiasche', 'olive  VERDI', 'pz'), // esatto dopo la normalizzazione
      proponi('pasta', 'g'), // «Pasta di semola»: legata a Semola solo per inclusione
      proposta('olive nere', 'Olive verdi', 'g'), // stessa parola, unità diversa
    ];
    expect(sceltiIniziali(proposte, [semola, verdi])).toEqual({ 'olive taggiasche': 'i-verdi' });
  });
});

describe('nomiDoppi', () => {
  it('due proposte con lo stesso nome sono entrambe doppie', () => {
    const a = proposta('pane integrale', 'Pane');
    const b = proposta('pane di segale', 'pane');
    expect([...nomiDoppi([a, b, proposta('riso', 'Riso')], [])].sort()).toEqual(['pane di segale', 'pane integrale']);
  });

  it('un esistente con lo stesso nome e un\'unità diversa rende doppia la proposta', () => {
    expect([...nomiDoppi([proposta('olive', 'Olive', 'g')], [ing('i-olive', 'Olive', 'pz')])]).toEqual(['olive']);
  });

  it('due proposte legate allo stesso esistente non sono doppie', () => {
    const verdi = ing('i-verdi', 'Olive verdi', 'pz');
    expect(nomiDoppi([proposta('olive taggiasche', 'Olive verdi', 'pz'), proposta('olive nere', 'Olive verdi', 'pz')], [verdi]).size).toBe(0);
  });

  it('una proposta legata per inclusione ("Pasta di semola" g a "Semola" g) non conta fra i doppi', () => {
    const semola = ing('i-semola', 'Semola', 'g');
    expect(nomiDoppi([proponi('pasta', 'g')], [semola]).size).toBe(0);
  });

  it('due proposte col nome vuoto non sono doppie fra loro', () => {
    expect(nomiDoppi([proposta('riso', '   '), proposta('pasta', '')], []).size).toBe(0);
  });
});

describe('passoBloccato', () => {
  it('blocca coi nomi doppi, un nome vuoto o una confezione non positiva', () => {
    expect(passoBloccato([proposta('riso', 'Riso')], [])).toBe(false);
    expect(passoBloccato([proposta('pane integrale', 'Pane'), proposta('pane di segale', 'Pane')], [])).toBe(true);
    expect(passoBloccato([proposta('riso', '   ')], [])).toBe(true);
    expect(passoBloccato([{ ...proposta('riso', 'Riso'), formatoConfezione: 0 }], [])).toBe(true);
    expect(passoBloccato([{ ...proposta('riso', 'Riso'), formatoConfezione: Number.NaN }], [])).toBe(true);
  });

  it('un prezzo non valido non blocca: il prezzo non è fra i controlli del passo', () => {
    expect(passoBloccato([{ ...proposta('riso', 'Riso'), prezzoConfezione: 0 }], [])).toBe(false);
  });

  it('la confezione di una proposta legata per scelta non conta: traduciBozza usa l\'esistente', () => {
    const latte = ing('i-latte', 'Latte intero', 'ml');
    const scelta = { ...proposta('latte parzialmente scremato', 'Latte intero', 'ml'), formatoConfezione: Number.NaN };
    expect(passoBloccato([scelta], [latte])).toBe(true);
    expect(passoBloccato([scelta], [latte], { 'latte parzialmente scremato': 'i-latte' })).toBe(false);
  });
});

describe('motiviBlocco', () => {
  it('per ogni proposta che blocca, i suoi motivi; le altre non ci sono', () => {
    const proposte = [
      proposta('riso', 'Riso'),
      proposta('pane integrale', 'Pane'),
      proposta('pane di segale', 'Pane'),
      { ...proposta('farro', ''), formatoConfezione: 0 },
      { ...proposta('orzo', 'Orzo'), formatoConfezione: Number.NaN },
    ];
    expect(motiviBlocco(proposte, [])).toEqual(new Map([
      ['pane integrale', ['doppio']],
      ['pane di segale', ['doppio']],
      ['farro', ['nomeVuoto', 'confezione']],
      ['orzo', ['confezione']],
    ]));
  });

  it('una legata per scelta salta il controllo della confezione, non quello del nome', () => {
    const latte = ing('i-latte', 'Latte intero', 'ml');
    const scelta = { ...proposta('latte parzialmente scremato', 'Latte intero', 'ml'), formatoConfezione: 0 };
    expect(motiviBlocco([scelta], [latte], { 'latte parzialmente scremato': 'i-latte' }).size).toBe(0);
  });
});

describe('ripiego e sezioni', () => {
  it('diRipiego e valoreRipiego', () => {
    expect(diRipiego(proponi('olive taggiasche', 'pz'))).toBe(true);
    expect(valoreRipiego(proponi('olive taggiasche', 'pz'))).toBe('1 pz');
    expect(valoreRipiego(proponi('olive taggiasche', null))).toBe('500 g');
    expect(diRipiego(proponi('latte', 'ml'))).toBe(false);
  });

  it('sul fixture: le olive da controllare, niente da sistemare', () => {
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, STATO, [AVENA]);
    expect(sezioniIniziali(proposte, [AVENA])).toEqual({ daSistemare: [], daControllare: ['olive taggiasche'] });
  });

  it('un ripiego col nome doppio sta fra quelli da sistemare', () => {
    const proposte = [proposta('olive taggiasche', 'Olive'), proposta('olive nere', 'Olive')];
    expect(sezioniIniziali(proposte, [])).toEqual({ daSistemare: ['olive taggiasche', 'olive nere'], daControllare: [] });
  });

  it('da sistemare all\'ingresso anche il nome vuoto e la confezione non valida (una bozza ripresa)', () => {
    const proposte = [proposta('riso', ''), { ...proposta('olive taggiasche', 'Olive'), formatoConfezione: 0 }, proposta('latte', 'Latte', 'ml')];
    expect(sezioniIniziali(proposte, [])).toEqual({ daSistemare: ['riso', 'olive taggiasche'], daControllare: [] });
  });
});

describe('nomeAreaFrase', () => {
  it('il nome dell\'area in frase', () => {
    expect(nomeAreaFrase('cereali')).toBe('Pasta, riso e cereali');
    expect(nomeAreaFrase('latticini')).toBe('Latticini, uova e salumi');
  });
});
