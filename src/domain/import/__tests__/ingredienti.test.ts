import { describe, it, expect } from 'vitest';
import type { Ingredient } from '@/domain/types';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from '../types';
import { SCELTA_NUOVO } from '../types';
import { PIANO_GIORNATA_UNICA, PIANO_MENU_SETTIMANALE } from '../fixtures';
import { proponi } from '../formati-tipici';
import {
  calcolaProposte, cambiDiretti, cambiUnita, diRipiego, esempioPiatto, esempioRiga, legataA, legataAlCommit, motiviBlocco, nomeProposto,
  nomiDoppi, passoBloccato, sceltiIniziali, sezioniIniziali, valoreRipiego,
} from '../ingredienti';
import { motiviBlocco8b, passoBloccato8b } from './ingredienti-8b';
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

  it('M1: il nome proposto tiene accenti e maiuscole della dieta, la chiave resta normalizzata', () => {
    const colazione: PastoEstratto = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    colazione.piatti[0].righeFisse.push(
      { alimento: 'caffè', quantita: 1, unita: 'pz', quantitaInferita: false, testoOriginale: '1 caffè' },
      { alimento: 'Tè verde', quantita: 200, unita: 'ml', quantitaInferita: false, testoOriginale: 'tè verde 200ml' },
      { alimento: 'purè di patate', quantita: 150, unita: 'g', quantitaInferita: false, testoOriginale: 'purè di patate 150g' },
    );
    const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, { ...STATO, correzioni: { '1-0-0': colazione } }, [AVENA]);
    expect(proposte.find((p) => p.alimento === 'caffe')).toMatchObject({ nome: 'Caffè' });
    expect(proposte.find((p) => p.alimento === 'te verde')).toMatchObject({ nome: 'Tè verde' });
    expect(proposte.find((p) => p.alimento === 'pure di patate')).toMatchObject({ nome: 'Purè di patate', area: 'ortofrutta' });
  });
});

describe('legataA', () => {
  it('stesso nome normalizzato e stessa unità di un esistente; fra g e pz col cambio di unità (spec 8c §A.2)', () => {
    const verdi = ing('i-verdi', 'Olive Verdi', 'pz');
    expect(legataA(proposta('olive taggiasche', 'olive verdi', 'pz'), [verdi])).toBe(verdi);
    // Fra g e pz lo stesso nome esatto è un abbinamento con cambio di unità: legata.
    expect(legataA(proposta('olive taggiasche', 'olive verdi', 'g'), [verdi])).toBe(verdi);
    // Fra ml e pz non c'è cambio: non legata.
    expect(legataA(proposta('olive taggiasche', 'olive verdi', 'ml'), [verdi])).toBeNull();
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

  it('un esistente con lo stesso nome e un\'unità diversa rende doppia la proposta, se fra le due unità non c\'è cambio (spec 8c §A.2)', () => {
    // Fra g e pz lo stesso nome esatto è un abbinamento con cambio di unità: legata, non doppia.
    expect(nomiDoppi([proposta('olive', 'Olive', 'g')], [ing('i-olive', 'Olive', 'pz')]).size).toBe(0);
    // Fra ml e pz non c'è cambio (servirebbe una densità): resta doppia.
    expect([...nomiDoppi([proposta('olive', 'Olive', 'ml')], [ing('i-olive', 'Olive', 'pz')])]).toEqual(['olive']);
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

  it('una legata per scelta con la confezione a 0 non blocca: il controllo della confezione si salta', () => {
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

/** Un piano di un solo pranzo con queste righe fisse (alimento, quantità, unità). */
function pianoCon(...righe: [string, number | null, 'g' | 'ml' | 'pz' | null][]): PianoEstratto {
  const piano = structuredClone(PIANO_GIORNATA_UNICA);
  piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = righe.map(([alimento, quantita, unita]): RigaEstratta => ({
    alimento, quantita, unita, quantitaInferita: false, testoOriginale: `${alimento} ${quantita ?? ''}${unita ?? ''}`.trim(),
  }));
  return piano;
}
const STATO_PRANZO: StatoRevisione = { ...STATO, mappaturaPasti: { pranzo: 's-1' } };

describe('cambiUnita (spec 8c §A.2, §A.3)', () => {
  const ZUCCHINE = ing('i-zucc', 'Zucchine', 'pz');
  const piano = pianoCon(['zucchine', 150, 'g']);

  it('le zucchine della dieta in g finiscono su quelle che hai a pezzi: già scelto, peso dalla tabella', () => {
    expect(calcolaProposte(piano, STATO_PRANZO, [ZUCCHINE])).toEqual([]);
    expect(cambiUnita(piano, STATO_PRANZO, [ZUCCHINE])).toEqual([{
      ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'g', alimenti: ['zucchine'], pesoPezzo: 200, pesoDaTabella: true, tieni: false,
    }]);
    expect(passoBloccato([], [ZUCCHINE], {}, cambiUnita(piano, STATO_PRANZO, [ZUCCHINE]))).toBe(false);
  });

  it('le decisioni salvate vincono: «Tienile a pezzi» e il peso scritto', () => {
    const stato = { ...STATO_PRANZO, cambiUnita: { 'i-zucc': { tieni: true, pesoPezzo: 180 } } };
    expect(cambiUnita(piano, stato, [ZUCCHINE])[0]).toMatchObject({ tieni: true, pesoPezzo: 180, pesoDaTabella: false });
  });

  it('peso fuori tabella: null, e il passo è bloccato finché non lo scrivi', () => {
    const cavolo = ing('i-cav', 'Cavolo nero', 'pz');
    const pianoCavolo = pianoCon(['cavolo nero', 200, 'g']);
    const cambi = cambiUnita(pianoCavolo, STATO_PRANZO, [cavolo]);
    expect(cambi[0]).toMatchObject({ pesoPezzo: null, pesoDaTabella: false });
    expect(passoBloccato([], [cavolo], {}, cambi)).toBe(true);
    expect(cambiDiretti(cambi, [])).toEqual(cambi);
    const scritto = cambiUnita(pianoCavolo, { ...STATO_PRANZO, cambiUnita: { 'i-cav': { tieni: false, pesoPezzo: 300 } } }, [cavolo]);
    expect(passoBloccato([], [cavolo], {}, scritto)).toBe(false);
  });

  it('una proposta legata per scelta a un ingrediente in un\'altra unità: il cambio è suo, e senza peso blocca con «peso»', () => {
    const cavolo = ing('i-cav', 'Cavolo nero', 'pz');
    const p = { ...proponi('cavolo riccio', 'g'), nome: 'Cavolo nero' };
    const stato: StatoRevisione = { ...STATO_PRANZO, ingredientiNuovi: [p], scelti: { 'cavolo riccio': 'i-cav' } };
    const cambi = cambiUnita(pianoCon(['cavolo riccio', 200, 'g']), stato, [cavolo]);
    expect(cambi).toEqual([expect.objectContaining({ ingredientId: 'i-cav', alimenti: ['cavolo riccio'], pesoPezzo: null })]);
    expect(cambiDiretti(cambi, [p])).toEqual([]);
    expect(motiviBlocco([p], [cavolo], stato.scelti, cambi).get('cavolo riccio')).toEqual(['peso']);
  });

  it('fra ml e altro non c\'è cambio', () => {
    expect(cambiUnita(pianoCon(['latte', 200, 'ml']), STATO_PRANZO, [ing('i-l', 'Latte', 'g')])).toEqual([]);
  });

  it('righe miste: l\'unità della dieta è la più frequente, e se è quella di oggi resta solo il peso (`da === a`, ruling 8c T8)', () => {
    const misto = pianoCon(['zucchine', 1, 'pz'], ['zucchine', 150, 'g'], ['zucchine', 2, 'pz']);
    expect(cambiUnita(misto, STATO_PRANZO, [ZUCCHINE])).toEqual([{
      ingredientId: 'i-zucc', nome: 'Zucchine', da: 'pz', a: 'pz', alimenti: ['zucchine'], pesoPezzo: 200, pesoDaTabella: true, tieni: false,
    }]);
    // La stessa dieta con le zucchine in g: la dieta le porta a pezzi, a prescindere dall'unità di oggi.
    expect(cambiUnita(misto, STATO_PRANZO, [ing('i-zucc', 'Zucchine', 'g')])[0]).toMatchObject({ da: 'g', a: 'pz' });
    // Una decisione «tieni» non vale dove l'unità non cambia.
    expect(cambiUnita(misto, { ...STATO_PRANZO, cambiUnita: { 'i-zucc': { tieni: true, pesoPezzo: null } } }, [ZUCCHINE])[0].tieni).toBe(false);
  });

  it('righe tutte nell\'unità di oggi: nessuna voce', () => {
    expect(cambiUnita(pianoCon(['zucchine', 1, 'pz'], ['zucchine', 2, 'pz']), STATO_PRANZO, [ZUCCHINE])).toEqual([]);
  });
});

describe('la scelta esplicita «nuovo» (spec 8c §G)', () => {
  const p = { ...proponi('fiocchi di avena', 'g'), nome: "Fiocchi d'avena" };

  it('legataA la rispetta: il nome non riporta indietro la scelta', () => {
    expect(legataA(p, [AVENA])).toBe(AVENA);
    expect(legataA(p, [AVENA], { 'fiocchi di avena': SCELTA_NUOVO })).toBeNull();
    expect(legataA(p, [AVENA, ing('i-x', 'Altro', 'g')], { 'fiocchi di avena': 'i-x' })?.id).toBe('i-x');
  });

  it('una «nuova» col nome di un ingrediente che hai è un doppio: va rinominata', () => {
    expect(motiviBlocco([p], [AVENA], { 'fiocchi di avena': SCELTA_NUOVO }).get('fiocchi di avena')).toEqual(['doppio']);
  });

  it('legataAlCommit: una «nuova» si aggancia solo al nome esatto con la stessa unità', () => {
    const z = { ...proponi('zucchine trifolate', 'g'), nome: 'Zucchine trifolate' };
    const scelti = { 'zucchine trifolate': SCELTA_NUOVO };
    expect(legataAlCommit(z, [ing('i-z', 'Zucchine', 'g')], scelti)).toBeNull();
    expect(legataAlCommit(z, [ing('i-zt', 'Zucchine trifolate', 'g')], scelti)?.id).toBe('i-zt');
    expect(legataAlCommit(z, [ing('i-z', 'Zucchine', 'g')])?.id).toBe('i-z');
  });
});

describe('i nomi e gli esempi della Scheda (spec 8c §G, §A.3)', () => {
  it('nomeProposto: il nome della dieta con gli accenti', () => {
    expect(nomeProposto(pianoCon(['caffè', 10, 'g']), STATO_PRANZO, 'caffe', 'g')).toBe('Caffè');
  });

  it('esempioRiga: la prima riga della dieta con una quantità', () => {
    expect(esempioRiga(pianoCon(['zucchine', null, null], ['zucchine', 150, 'g']), STATO_PRANZO, ['zucchine'])).toEqual({ quantita: 150, unita: 'g' });
    expect(esempioRiga(pianoCon(['zucchine', null, null]), STATO_PRANZO, ['zucchine'])).toBeNull();
  });

  it('esempioPiatto: il primo piatto attivo con una quantità nell\'unità di oggi', () => {
    const piatto = (id: string, attivo: boolean, quantita: number | null) => ({
      id, nome: `Piatto ${id}`, slotDefId: 's', fonte: 'proprio' as const, attivo, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-zucc', quantita, unita: 'pz' as const }], componenti: [],
    });
    expect(esempioPiatto('i-zucc', 'pz', [piatto('a', false, 2), piatto('b', true, null), piatto('c', true, 2)])).toEqual({ nome: 'Piatto c', quantita: 2 });
  });
});

describe('differenziale: motiviBlocco e passoBloccato dell\'8b contro l\'8c, senza unità diverse (spec 8c §J)', () => {
  const ESISTENTI: Ingredient[][] = [
    [],
    [AVENA],
    [AVENA, ing('i-pane', 'Pane integrale', 'g')],
    [ing('i-latte', 'Latte parzialmente scremato', 'ml'), ing('i-semola', 'Semola', 'g')],
    [ing('i-pasta', 'Pasta di semola', 'g'), ing('i-olio', 'Olio extravergine di oliva', 'ml'), ing('i-latte-g', 'Latte', 'g')],
  ];

  function varianti(proposte: IngredienteProposto[], esistenti: Ingredient[]): { proposte: IngredienteProposto[]; scelti: Record<string, string> }[] {
    const [prima, seconda] = proposte;
    const cambia = (bersaglio: IngredienteProposto, cambio: Partial<IngredienteProposto>) =>
      proposte.map((p) => (p === bersaglio ? { ...p, ...cambio } : p));
    const out: { proposte: IngredienteProposto[]; scelti: Record<string, string> }[] = [{ proposte, scelti: {} }];
    if (prima && seconda) out.push({ proposte: cambia(seconda, { nome: prima.nome }), scelti: {} });
    if (prima) out.push({ proposte: cambia(prima, { nome: '' }), scelti: {} });
    if (prima) out.push({ proposte: cambia(prima, { formatoConfezione: 0 }), scelti: {} });
    const compatibile = prima ? esistenti.find((e) => e.unitaBase === prima.unitaBase) : undefined;
    if (prima && compatibile) {
      out.push({ proposte: cambia(prima, { nome: compatibile.nome, formatoConfezione: Number.NaN }), scelti: { [prima.alimento]: compatibile.id } });
    }
    return out;
  }

  it('coincidono su ogni caso', () => {
    let casi = 0;
    for (const esistenti of ESISTENTI) {
      const proposte = calcolaProposte(PIANO_MENU_SETTIMANALE, STATO, esistenti);
      for (const v of varianti(proposte, esistenti)) {
        expect([...motiviBlocco(v.proposte, esistenti, v.scelti)].sort()).toEqual([...motiviBlocco8b(v.proposte, esistenti, v.scelti)].sort());
        expect(passoBloccato(v.proposte, esistenti, v.scelti)).toBe(passoBloccato8b(v.proposte, esistenti, v.scelti));
        casi += 1;
      }
    }
    expect(casi).toBeGreaterThanOrEqual(20);
  });
});
