import { describe, it, expect } from 'vitest';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from '../types';
import { PIANO_MENU_SETTIMANALE, PIANO_GIORNATA_UNICA } from '../fixtures';
import { traduciBozza } from '../commit';
import { ingredientiDaAbbinare, normalizza } from '../mapping';
import { proponi } from '../formati-tipici';
import {
  anteprimaTogli, cambiaRiga, chiaveGruppo, confermaTutti, conteggi, etichettaGiorno, gruppiRighe, pastiDelGruppo,
  gruppoDiRiga, pronto, provenienza, riassuntoGiorni, righeDelPasto, rispondiGruppo, togliGruppo, togliRiga,
  unitaDelGruppo, unitaNota, vociPasti, type GruppoRighe,
} from '../dubbi';
import * as v8b from './dubbi-8b';
import * as prima12b from './dubbi-8c-prima';

const slot = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: Array(7).fill(false) });
const SLOTS = [slot('s-col', 'Colazione', 0), slot('s-pranzo', 'Pranzo', 3), slot('s-cena', 'Cena', 5)];

const STATO: StatoRevisione = {
  passo: 'revisione',
  mappaturaPasti: { colazione: 's-col', cena: 's-cena' },
  pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
};

const OLIVE = { alimento: 'olive taggiasche', quantita: null, unita: null, quantitaInferita: false, testoOriginale: '2-3 olive taggiasche' };

/** La cena del martedì (1-1-1) con le olive risolte a 3 pz. */
function cenaConOlive(quantita: number, unita: 'g' | 'ml' | 'pz'): PastoEstratto {
  const cena = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  cena.piatti[0].righeFisse[1] = { ...OLIVE, quantita, unita };
  return cena;
}

/** 2 settimane × 7 giorni: ogni giorno un pranzo con «olio 10ml» e i condimenti con «olio a filo». */
function pianoConOlio(): PianoEstratto {
  const giorno = (g: number) => ({
    giorno: g,
    titolo: null,
    pasti: [
      { nomeOriginale: 'pranzo', piatti: [{ nome: 'Insalata', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: 10, unita: 'ml' as const, quantitaInferita: false, testoOriginale: 'olio 10ml' }] }] },
      { nomeOriginale: 'condimenti', piatti: [{ nome: 'Condimenti', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olio a filo' }] }] },
    ],
  });
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [1, 2].map((numero) => ({ numero, giorni: [0, 1, 2, 3, 4, 5, 6].map(giorno) })),
  };
}

describe('righeDelPasto', () => {
  it('visita per piatto le righe fisse e poi quelle delle opzioni, con la posizione', () => {
    const cenaLunedi = PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[1];
    const righe = righeDelPasto(cenaLunedi);
    expect(righe.map((r) => r.riga.alimento)).toEqual(['fesa di tacchino', 'pane integrale', 'pane di segale']);
    expect(righe[2].posizione).toEqual({ piatto: 0, componente: 0, opzione: 1, riga: 0 });
    expect(righe[0].posizione).toEqual({ piatto: 0, componente: null, opzione: null, riga: 0 });
    expect(righe[0].nomePiatto).toBe('Tacchino con pane');
  });
});

describe('etichettaGiorno', () => {
  it('il giorno della settimana, il titolo dello scenario, o «Ogni giorno»', () => {
    expect(etichettaGiorno(PIANO_MENU_SETTIMANALE, 1, null)).toBe('Martedì');
    expect(etichettaGiorno({ ...PIANO_MENU_SETTIMANALE, archetipo: 'giorni_tipo' }, 0, 'Piano 1')).toBe('Piano 1');
    expect(etichettaGiorno(PIANO_GIORNATA_UNICA, 0, null)).toBe('Ogni giorno');
  });
});

describe('vociPasti', () => {
  it('un nome per pasto, nei giorni in cui compare; i condimenti sono da sistemare', () => {
    const voci = vociPasti(PIANO_MENU_SETTIMANALE, STATO, SLOTS);
    expect(voci.map((v) => [v.chiave, v.giorni, v.daSistemare, v.slotDefId])).toEqual([
      ['colazione', 3, false, 's-col'],
      ['cena', 2, false, 's-cena'],
      ['condimenti', 1, true, null],
    ]);
  });

  it('i condimenti abbinati restano fra quelli da sistemare, con lo slot', () => {
    const voci = vociPasti(PIANO_MENU_SETTIMANALE, { ...STATO, mappaturaPasti: { ...STATO.mappaturaPasti, condimenti: 's-cena' } }, SLOTS);
    expect(voci.find((v) => v.chiave === 'condimenti')).toMatchObject({ daSistemare: true, slotDefId: 's-cena' });
  });

  it('una mappatura verso uno slot che non esiste più non conta', () => {
    const voci = vociPasti(PIANO_MENU_SETTIMANALE, { ...STATO, mappaturaPasti: { colazione: 's-sparito', cena: 's-cena' } }, SLOTS);
    expect(voci.find((v) => v.chiave === 'colazione')).toMatchObject({ daSistemare: true, slotDefId: null });
  });

  it('un pasto svuotato non conta', () => {
    const stato = { ...STATO, correzioni: { '1-0-2': { nomeOriginale: 'condimenti', piatti: [] } } };
    expect(vociPasti(PIANO_MENU_SETTIMANALE, stato, SLOTS).map((v) => v.chiave)).toEqual(['colazione', 'cena']);
  });
});

describe('gruppiRighe', () => {
  it('sul fixture: un solo dubbio, le olive, aperto e senza unità fissa', () => {
    const gruppi = gruppiRighe(PIANO_MENU_SETTIMANALE, STATO);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0]).toMatchObject({
      chiave: 'olive taggiasche|2-3 olive taggiasche', alimento: 'olive taggiasche', tipo: 'irrisolta',
      stato: 'aperto', quantita: null, unita: null, unitaFissa: null,
    });
    expect(gruppi[0].occorrenze).toEqual([
      { pasto: '1-1-1', settimana: 1, giorno: 1, titolo: null, nomePasto: 'cena', nomePiatto: 'Merluzzo' },
    ]);
    expect(provenienza(PIANO_MENU_SETTIMANALE, gruppi[0])).toBe('Sett. 1 · Martedì · cena · Merluzzo');
  });

  it('risolto nelle correzioni, il dubbio resta al suo posto come fatto', () => {
    const stato = { ...STATO, correzioni: { '1-1-1': cenaConOlive(3, 'pz') } };
    expect(gruppiRighe(PIANO_MENU_SETTIMANALE, stato)[0]).toMatchObject({ stato: 'fatto', quantita: 3, unita: 'pz' });
  });

  it('tolte tutte le sue righe, il gruppo è tolto', () => {
    const cena = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
    cena.piatti[0].righeFisse.splice(1, 1);
    expect(gruppiRighe(PIANO_MENU_SETTIMANALE, { ...STATO, correzioni: { '1-1-1': cena } })[0].stato).toBe('tolto');
  });

  it('la stessa riga su 14 pasti è un gruppo solo, con l\'unità fissa presa fuori dal gruppo', () => {
    const piano = pianoConOlio();
    const gruppi = gruppiRighe(piano, STATO);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0]).toMatchObject({ chiave: 'olio|olio a filo', tipo: 'proposta', stato: 'aperto', unitaFissa: 'ml' });
    expect(gruppi[0].occorrenze).toHaveLength(14);
    expect(pastiDelGruppo(gruppi[0])).toBe(14);
    expect(provenienza(piano, gruppi[0])).toBe('In 14 pasti');
  });

  it('una quantità proposta dall\'AI è un gruppo «inferita», già fatto', () => {
    const piano = structuredClone(PIANO_GIORNATA_UNICA);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse.push({ alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: true, testoOriginale: 'sale fino' });
    const gruppi = gruppiRighe(piano, { ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } });
    expect(gruppi).toEqual([expect.objectContaining({ chiave: 'sale|sale fino', tipo: 'inferita', stato: 'fatto', quantita: 2, unita: 'g' })]);
    expect(provenienza(piano, gruppi[0])).toBe('Ogni giorno · pranzo · Pasta al pomodoro');
  });

  it('una riga irrisolta portata dalle correzioni di una bozza vecchia è comunque un dubbio', () => {
    const colazione = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    colazione.piatti[0].righeFisse[0] = { ...colazione.piatti[0].righeFisse[0], quantita: null, unita: null };
    const gruppi = gruppiRighe(PIANO_MENU_SETTIMANALE, { ...STATO, correzioni: { '1-0-0': colazione } });
    expect(gruppi.find((g) => g.alimento === "fiocchi d'avena")).toMatchObject({ tipo: 'irrisolta', stato: 'aperto' });
  });

  it('valori diversi nel gruppo: niente quantità comune', () => {
    const piano = pianoConOlio();
    const correzioni: Record<string, PastoEstratto> = {};
    for (const s of piano.settimane) for (const g of s.giorni) {
      const pasto = structuredClone(g.pasti[1]);
      pasto.piatti[0].righeFisse[0] = { ...pasto.piatti[0].righeFisse[0], quantita: g.giorno === 0 ? 5 : 10, unita: 'ml' };
      correzioni[`${s.numero}-${g.giorno}-1`] = pasto;
    }
    expect(gruppiRighe(piano, { ...STATO, correzioni })[0]).toMatchObject({ stato: 'fatto', quantita: null, unita: 'ml' });
  });

  // --- Correzioni della review finale ---

  it('I1: un gruppo inferito con quantità diverse ma la stessa unità ha l\'unità comune', () => {
    const piano = pianoConSale();
    const lunedi = structuredClone(piano.settimane[0].giorni[0].pasti[0]);
    lunedi.piatti[0].righeFisse[0] = { ...lunedi.piatti[0].righeFisse[0], quantita: 3, quantitaInferita: false };
    const gruppi = gruppiRighe(piano, { ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': lunedi } });
    expect(gruppi).toEqual([expect.objectContaining({ chiave: 'sale|sale fino', tipo: 'inferita', stato: 'fatto', quantita: null, unita: 'g', unitaFissa: null })]);
  });

  it('I2: lo stesso gruppo risolto in pz e in g è un dubbio aperto, ha la proposta dell\'unità più frequente, e pronto è vero', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    const stato = { ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': cenaOlive(piano, 0, 3, 'pz'), '1-1-0': cenaOlive(piano, 1, 20, 'g') } };
    // A pari merito (1 pz e 1 g) vince l'unità della prima riga, con la sua quantità.
    expect(gruppiRighe(piano, stato)).toEqual([expect.objectContaining({
      tipo: 'irrisolta', stato: 'aperto', quantita: null, unita: null, unitaDiverse: true,
      proposta: { quantita: 3, unita: 'pz', origine: 'unitaFrequente', testo: null },
    })]);
    expect(pronto(piano, stato, SLOTS)).toBe(true);

    const risposto = rispondiGruppo(piano, stato, chiaveGruppo(OLIVE), 3, 'pz');
    expect(gruppiRighe(piano, risposto)).toEqual([expect.objectContaining({ tipo: 'irrisolta', stato: 'fatto', quantita: 3, unita: 'pz', unitaDiverse: false })]);
    expect(pronto(piano, risposto, SLOTS)).toBe(true);
  });

  it('I2: unità diverse lette dall\'AI nello stesso gruppo sono un dubbio, che resta al suo posto dopo la risposta', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[1] = { ...OLIVE, quantita: 3, unita: 'pz' };
    piano.settimane[0].giorni[1].pasti[0].piatti[0].righeFisse[1] = { ...OLIVE, quantita: 15, unita: 'g' };
    const stato = { ...STATO, mappaturaPasti: { cena: 's-cena' } };
    expect(gruppiRighe(piano, stato)).toEqual([expect.objectContaining({ tipo: 'proposta', stato: 'aperto', unitaDiverse: true })]);
    const risposto = rispondiGruppo(piano, stato, chiaveGruppo(OLIVE), 15, 'g');
    expect(gruppiRighe(piano, risposto)).toEqual([expect.objectContaining({ tipo: 'proposta', stato: 'fatto', quantita: 15, unita: 'g' })]);
  });

  it('I2: con una riga ancora irrisolta le unità diverse non cambiano l\'avviso', () => {
    const piano = pianoConOlive([['cena'], ['cena'], ['cena']]);
    const stato = { ...STATO, correzioni: { '1-0-0': cenaOlive(piano, 0, 3, 'pz'), '1-1-0': cenaOlive(piano, 1, 20, 'g') } };
    expect(gruppiRighe(piano, stato)).toEqual([expect.objectContaining({ stato: 'aperto', unita: null, unitaDiverse: false })]);
  });
});

describe('provenienza', () => {
  it('M3: il nome del pasto senza underscore, minuscolo come nel foglio', () => {
    const piano = pianoConOlive([['spuntino_mattina']]);
    expect(provenienza(piano, gruppiRighe(piano, STATO)[0])).toBe('Lunedì · spuntino mattina · Merluzzo');
  });
});

describe('anteprimaTogli (I3)', () => {
  it('senza cascata: i pasti effettivi e nessun piatto sparito', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    const anteprima = anteprimaTogli(piano, STATO, chiaveGruppo(OLIVE));
    expect(anteprima).toMatchObject({ pasti: 2, piattiSpariti: 0 });
    expect(anteprima.stato).toEqual(togliGruppo(piano, STATO, chiaveGruppo(OLIVE)));
  });

  it("l'unica riga di un piatto: il piatto sparisce, e con lui il pasto", () => {
    const piano = pianoConOlive([['cena']]);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse.splice(0, 1);
    const anteprima = anteprimaTogli(piano, STATO, chiaveGruppo(OLIVE));
    expect(anteprima).toMatchObject({ pasti: 1, piattiSpariti: 1 });
    expect(anteprima.stato.correzioni['1-0-0']).toEqual({ nomeOriginale: 'cena', piatti: [] });
  });

  it('i pasti si contano sulle occorrenze effettive, non su quelle originali (M2)', () => {
    const piano = pianoConOlive([['cena'], ['cena'], ['cena']]);
    const posizione = { piatto: 0, componente: null, opzione: null, riga: 1 };
    const stato = { ...STATO, correzioni: { '1-0-0': togliRiga(piano.settimane[0].giorni[0].pasti[0], posizione) } };
    expect(anteprimaTogli(piano, stato, chiaveGruppo(OLIVE)).pasti).toBe(2);
  });
});

describe('unitaDelGruppo', () => {
  it("l'unità di un'altra riga già risolta dello stesso gruppo, o null", () => {
    const piano = pianoConOlive([['pranzo', 'cena'], ['cena']]);
    const chiave = chiaveGruppo(OLIVE);
    const posizione = { piatto: 0, componente: null, opzione: null, riga: 1 };
    expect(unitaDelGruppo(piano, STATO, chiave, { pasto: '1-1-0', posizione })).toBeNull();
    const stato = { ...STATO, correzioni: { '1-0-1': cenaOlive(piano, 0, 3, 'pz', 1) } };
    expect(unitaDelGruppo(piano, stato, chiave, { pasto: '1-1-0', posizione })).toBe('pz');
    // La riga risolta non si fissa da sola.
    expect(unitaDelGruppo(piano, stato, chiave, { pasto: '1-0-1', posizione })).toBeNull();
  });
});

/** Una settimana: per ogni giorno i pasti indicati, ognuno col Merluzzo («filetto di merluzzo» e le olive senza quantità). */
function pianoConOlive(pasti: string[][]): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: pasti.map((nomi, g) => ({
        giorno: g,
        titolo: null,
        pasti: nomi.map((nomeOriginale) => ({
          nomeOriginale,
          piatti: [{ nome: 'Merluzzo', descrizione: null, componenti: [], righeFisse: [
            { alimento: 'filetto di merluzzo', quantita: 120, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'Filetto di merluzzo (120g)' },
            { ...OLIVE },
          ] }],
        })),
      })),
    }],
  };
}

/** Il pasto `indice` del giorno `giorno` di `pianoConOlive`, con le olive risolte. */
function cenaOlive(piano: PianoEstratto, giorno: number, quantita: number, unita: 'g' | 'ml' | 'pz', indice = 0): PastoEstratto {
  const pasto = structuredClone(piano.settimane[0].giorni[giorno].pasti[indice]);
  pasto.piatti[0].righeFisse[1] = { ...OLIVE, quantita, unita };
  return pasto;
}

/** Una settimana di `giorni` giorni: ogni giorno una cena con la Zuppa e «sale fino», 2 g proposti dall'AI. */
function pianoConSale(giorni = 2): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: Array.from({ length: giorni }, (_, g) => ({
        giorno: g,
        titolo: null,
        pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: 2, unita: 'g' as const, quantitaInferita: true, testoOriginale: 'sale fino' }] }] }],
      })),
    }],
  };
}

describe('unitaNota', () => {
  it("l'unità di un'altra riga dello stesso alimento, esclusa la chiave data", () => {
    const piano = pianoConOlio();
    expect(unitaNota(piano, STATO, 'olio')).toBe('ml');
    expect(unitaNota(piano, STATO, 'olio', 'olio|olio 10ml')).toBeNull();
    expect(unitaNota(PIANO_MENU_SETTIMANALE, STATO, 'olive taggiasche', chiaveGruppo(OLIVE))).toBeNull();
  });
});

/**
 * Due dubbi dello stesso alimento con testi diversi, senza nessun'altra riga con l'unità: a pranzo
 * senza quantità, a cena `cena` (di default anche lei senza quantità).
 */
function pianoConDueSale(cena: RigaEstratta = { alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'un pizzico di sale' }): PianoEstratto {
  return {
    archetipo: 'giornata_unica', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [{
        giorno: 0,
        titolo: null,
        pasti: [
          { nomeOriginale: 'pranzo', piatti: [{ nome: 'Pasta', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'sale fino' }] }] },
          { nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [cena] }] },
        ],
      }],
    }],
  };
}

describe('unitaFissa fra due gruppi irrisolti dello stesso alimento', () => {
  // Dal Task 12b due righe senza quantità dello stesso alimento sono un gruppo solo: i due gruppi
  // irrisolti dello stesso alimento sono una riga senza quantità e una a cucchiaini.
  it('nessuno dei due fissa l\'unità dell\'altro, anche dopo aver risolto uno dei due', () => {
    const piano = pianoConDueSale({ alimento: 'sale', quantita: 1, unita: 'cucchiaino', quantitaInferita: false, testoOriginale: '1 cucchiaino di sale' });
    const gruppi = gruppiRighe(piano, STATO);
    expect(gruppi).toHaveLength(2);
    expect(gruppi.every((g) => g.unitaFissa === null)).toBe(true);

    const cenaRisolta = structuredClone(piano.settimane[0].giorni[0].pasti[1]);
    cenaRisolta.piatti[0].righeFisse[0] = { ...cenaRisolta.piatti[0].righeFisse[0], quantita: 1, unita: 'pz' };
    const stato = { ...STATO, correzioni: { '1-0-1': cenaRisolta } };
    const gruppiDopo = gruppiRighe(piano, stato);
    expect(gruppiDopo.find((g) => g.chiave === 'sale|1 cucchiaino di sale')).toMatchObject({ stato: 'fatto', quantita: 1, unita: 'pz' });
    expect(gruppiDopo.every((g) => g.unitaFissa === null)).toBe(true);
  });
});

describe('pronto', () => {
  it('no finché ci sono i condimenti da abbinare e le olive da risolvere', () => {
    expect(pronto(PIANO_MENU_SETTIMANALE, STATO, SLOTS)).toBe(false);
    expect(pronto(PIANO_MENU_SETTIMANALE, { ...STATO, mappaturaPasti: { ...STATO.mappaturaPasti, condimenti: 's-cena' } }, SLOTS)).toBe(false);
  });

  it('sì con i condimenti abbinati e le olive risolte (o tolte)', () => {
    const mappaturaPasti = { ...STATO.mappaturaPasti, condimenti: 's-cena' };
    expect(pronto(PIANO_MENU_SETTIMANALE, { ...STATO, mappaturaPasti, correzioni: { '1-1-1': cenaConOlive(3, 'pz') } }, SLOTS)).toBe(true);
    const cena = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
    cena.piatti[0].righeFisse.splice(1, 1);
    expect(pronto(PIANO_MENU_SETTIMANALE, { ...STATO, mappaturaPasti, correzioni: { '1-1-1': cena } }, SLOTS)).toBe(true);
  });

  it('no se una mappatura punta a uno slot sparito, anche con tutto il resto risolto e abbinato', () => {
    const mappaturaPasti = { colazione: 's-sparito', cena: 's-cena', condimenti: 's-cena' };
    const stato = { ...STATO, mappaturaPasti, correzioni: { '1-1-1': cenaConOlive(3, 'pz') } };
    expect(pronto(PIANO_MENU_SETTIMANALE, stato, SLOTS)).toBe(false);
  });
});

describe('riassuntoGiorni e conteggi', () => {
  it('un riassunto per giorno, coi piatti sorella uniti da «o»', () => {
    expect(riassuntoGiorni(PIANO_MENU_SETTIMANALE, STATO)).toEqual([
      { settimana: 1, giorno: 0, titolo: null, etichetta: 'Lunedì', piatti: 'Porridge · Tacchino con pane · Condimenti', pasti: 3 },
      { settimana: 1, giorno: 1, titolo: null, etichetta: 'Martedì', piatti: 'Porridge · Merluzzo o Tonno in insalata', pasti: 2 },
      { settimana: 2, giorno: 0, titolo: null, etichetta: 'Lunedì', piatti: 'Yogurt e frutta', pasti: 1 },
    ]);
  });

  it('un pasto svuotato esce dal riassunto e dai pasti da confermare', () => {
    const stato = { ...STATO, correzioni: { '1-0-2': { nomeOriginale: 'condimenti', piatti: [] } } };
    expect(riassuntoGiorni(PIANO_MENU_SETTIMANALE, stato)[0]).toMatchObject({ piatti: 'Porridge · Tacchino con pane', pasti: 2 });
    expect(conteggi(PIANO_MENU_SETTIMANALE, stato)).toEqual({ settimane: 2, giorni: 3, pastiLetti: 6, pastiConfermabili: 5 });
  });
});

describe('togliRiga — la cascata (decisione 9)', () => {
  const cenaMartedi = () => structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  const cenaLunedi = () => structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[1]);

  it('togliere una riga lascia le altre', () => {
    const pasto = togliRiga(cenaMartedi(), { piatto: 0, componente: null, opzione: null, riga: 1 });
    expect(pasto.piatti[0].righeFisse.map((r) => r.alimento)).toEqual(['filetto di merluzzo']);
    expect(pasto.piatti).toHaveLength(2);
  });

  it("togliere l'unica riga di un piatto toglie il piatto", () => {
    const pasto = togliRiga(cenaMartedi(), { piatto: 1, componente: null, opzione: null, riga: 0 });
    expect(pasto.piatti.map((p) => p.nome)).toEqual(['Merluzzo']);
  });

  it("togliere l'ultimo piatto svuota il pasto", () => {
    let pasto = togliRiga(cenaMartedi(), { piatto: 1, componente: null, opzione: null, riga: 0 });
    pasto = togliRiga(pasto, { piatto: 0, componente: null, opzione: null, riga: 1 });
    pasto = togliRiga(pasto, { piatto: 0, componente: null, opzione: null, riga: 0 });
    expect(pasto).toEqual({ nomeOriginale: 'cena', piatti: [] });
  });

  it("un'opzione vuota sparisce, e un componente senza opzioni pure", () => {
    let pasto = togliRiga(cenaLunedi(), { piatto: 0, componente: 0, opzione: 1, riga: 0 });
    expect(pasto.piatti[0].componenti[0].opzioni).toHaveLength(1);
    pasto = togliRiga(pasto, { piatto: 0, componente: 0, opzione: 0, riga: 0 });
    expect(pasto.piatti[0].componenti).toEqual([]);
    expect(pasto.piatti[0].righeFisse.map((r) => r.alimento)).toEqual(['fesa di tacchino']);
  });
});

describe('cambiaRiga', () => {
  it('cambia solo la riga indicata', () => {
    const pasto = cambiaRiga(structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[1]), { piatto: 0, componente: null, opzione: null, riga: 0 }, { quantita: 150 });
    expect(pasto.piatti[0].righeFisse[0].quantita).toBe(150);
    expect(pasto.piatti[0].componenti[0].opzioni[0][0].quantita).toBe(60);
  });
});

describe('rispondiGruppo e togliGruppo', () => {
  it('una risposta vale per tutte le 14 righe del gruppo, e tocca solo i loro pasti', () => {
    const piano = pianoConOlio();
    const chiave = 'olio|olio a filo';
    const stato = rispondiGruppo(piano, STATO, chiave, 5, 'ml');
    expect(Object.keys(stato.correzioni)).toHaveLength(14);
    expect(Object.keys(stato.correzioni).every((k) => k.endsWith('-1'))).toBe(true);
    for (const pasto of Object.values(stato.correzioni)) {
      expect(pasto.piatti[0].righeFisse[0]).toEqual({ alimento: 'olio', quantita: 5, unita: 'ml', quantitaInferita: false, testoOriginale: 'olio a filo' });
    }
    expect(gruppiRighe(piano, stato)[0]).toMatchObject({ stato: 'fatto', quantita: 5, unita: 'ml' });
  });

  it('togliere il gruppo svuota a cascata i 14 pasti dei condimenti', () => {
    const piano = pianoConOlio();
    const stato = togliGruppo(piano, STATO, 'olio|olio a filo');
    expect(Object.values(stato.correzioni).every((p) => p.nomeOriginale === 'condimenti' && p.piatti.length === 0)).toBe(true);
    expect(gruppiRighe(piano, stato)[0].stato).toBe('tolto');
    expect(vociPasti(piano, stato, SLOTS).map((v) => v.chiave)).toEqual(['pranzo']);
  });

  it('ritrova le righe per chiave anche dopo una rimozione che sposta gli indici', () => {
    const cena = togliRiga(structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]), { piatto: 0, componente: null, opzione: null, riga: 0 });
    const prima = { ...STATO, correzioni: { '1-1-1': cena } };
    const dopo = rispondiGruppo(PIANO_MENU_SETTIMANALE, prima, chiaveGruppo(OLIVE), 3, 'pz');
    expect(dopo.correzioni['1-1-1'].piatti[0].righeFisse).toEqual([{ ...OLIVE, quantita: 3, unita: 'pz' }]);
  });
});

describe('confermaTutti', () => {
  it('scrive tutte le chiavi e passa agli ingredienti in un solo stato', () => {
    const stato = confermaTutti(PIANO_MENU_SETTIMANALE, STATO);
    expect(stato.passo).toBe('formati');
    expect([...stato.pastiConfermati].sort()).toEqual(['1-0-0', '1-0-1', '1-0-2', '1-1-0', '1-1-1', '2-0-0']);
    expect(stato.correzioni).toBe(STATO.correzioni);
  });
});

/**
 * Il test differenziale (spec 8b §I): la Revisione di prima scriveva le correzioni con
 * `cambiaRigaFissa` e `rimuoviRigaFissa` (copiate qui com'erano in Revisione.tsx, che il Task 7
 * cancella). La stessa bozza risolta coi dubbi deve dare le stesse correzioni e le stesse
 * scritture da `traduciBozza`.
 */
describe('differenziale: la Revisione di prima contro i dubbi', () => {
  function vecchiaCambiaRigaFissa(pasto: PastoEstratto, ip: number, ir: number, cambio: Partial<RigaEstratta>): PastoEstratto {
    return {
      ...pasto,
      piatti: pasto.piatti.map((p, i) =>
        i !== ip ? p : { ...p, righeFisse: p.righeFisse.map((r, j) => (j !== ir ? r : { ...r, ...cambio })) },
      ),
    };
  }
  function vecchiaRimuoviRigaFissa(pasto: PastoEstratto, ip: number, ir: number): PastoEstratto {
    return {
      ...pasto,
      piatti: pasto.piatti.map((p, i) => (i !== ip ? p : { ...p, righeFisse: p.righeFisse.filter((_, j) => j !== ir) })),
    };
  }
  const MAPPATURA = { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' };
  const proposte = (correzioni: Record<string, PastoEstratto>): IngredienteProposto[] =>
    ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, correzioni).map(({ alimento, unita }) => proponi(alimento, unita));
  const scritture = (correzioni: Record<string, PastoEstratto>) =>
    traduciBozza(
      PIANO_MENU_SETTIMANALE,
      { ...STATO, passo: 'riepilogo', mappaturaPasti: MAPPATURA, correzioni, ingredientiNuovi: proposte(correzioni) },
      [], [], '2026-09-28',
    );

  it('rispondere alle olive con 3 pz', () => {
    // La Revisione di prima: il numero (con l'unità di ripiego «g»), poi l'unità.
    const originale = PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1];
    let vecchia = vecchiaCambiaRigaFissa(originale, 0, 1, { quantita: 3, unita: 'g', quantitaInferita: false });
    vecchia = vecchiaCambiaRigaFissa(vecchia, 0, 1, { unita: 'pz' });
    const vecchie = { '1-1-1': vecchia };

    const nuove = rispondiGruppo(PIANO_MENU_SETTIMANALE, STATO, chiaveGruppo(OLIVE), 3, 'pz').correzioni;
    expect(nuove).toEqual(vecchie);
    expect(scritture(nuove)).toEqual(scritture(vecchie));
  });

  it('togliere le olive', () => {
    const vecchie = { '1-1-1': vecchiaRimuoviRigaFissa(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1], 0, 1) };
    const nuove = togliGruppo(PIANO_MENU_SETTIMANALE, STATO, chiaveGruppo(OLIVE)).correzioni;
    expect(nuove).toEqual(vecchie);
    expect(scritture(nuove)).toEqual(scritture(vecchie));
  });
});

describe('una riga a cucchiai è un dubbio (spec 8c §C)', () => {
  it('irrisolta finché non si converte, e l\'unità a cucchiai non fissa l\'unità di nessuno', () => {
    const piano = structuredClone(PIANO_GIORNATA_UNICA);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = [
      { alimento: 'miele', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di miele' },
    ];
    const stato = { ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } };
    expect(gruppiRighe(piano, stato)).toEqual([expect.objectContaining({ chiave: 'miele|1 cucchiaio di miele', stato: 'aperto', unita: null, unitaFissa: null })]);
    expect(unitaNota(piano, stato, 'miele')).toBeNull();
  });
});

const STATO_PRANZO: StatoRevisione = { ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } };

/** Il pranzo di PIANO_GIORNATA_UNICA con queste righe fisse. */
function pianoUnPasto(righe: RigaEstratta[]): PianoEstratto {
  const piano = structuredClone(PIANO_GIORNATA_UNICA);
  piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = righe;
  return piano;
}
const senza = (testoOriginale: string, alimento: string): RigaEstratta => ({ alimento, quantita: null, unita: null, quantitaInferita: false, testoOriginale });

describe('8c: il quanto basta non è un dubbio (spec §B)', () => {
  it('una riga q.b. non fa un gruppo, e pronto non l\'aspetta', () => {
    const piano = pianoUnPasto([senza('sale q.b.', 'sale')]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual([]);
    expect(pronto(piano, STATO_PRANZO, SLOTS)).toBe(true);
  });

  it('senza quantità e senza q.b. resta un dubbio senza proposta', () => {
    const piano = pianoUnPasto([senza('un pizzico di sale', 'sale')]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual([expect.objectContaining({ tipo: 'irrisolta', stato: 'aperto', proposta: null })]);
    expect(pronto(piano, STATO_PRANZO, SLOTS)).toBe(false);
  });

  it('un q.b. con 2 g stimati dal lettore resta q.b.: niente gruppo «inferita» (correzione S1)', () => {
    const piano = pianoUnPasto([{ alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: true, testoOriginale: 'sale q.b.' }]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual([]);
    expect(pronto(piano, STATO_PRANZO, SLOTS)).toBe(true);
  });

  it('un q.b. corretto a 2 g in un giorno solo non fa «unità diverse» (correzione D2)', () => {
    const giorno = (g: number) => ({
      giorno: g, titolo: null,
      pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [senza('sale q.b.', 'sale')] }] }],
    });
    const piano: PianoEstratto = { archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [], settimane: [{ numero: 1, giorni: [giorno(0), giorno(1)] }] };
    const lunedi = structuredClone(piano.settimane[0].giorni[0].pasti[0]);
    lunedi.piatti[0].righeFisse[0] = { ...lunedi.piatti[0].righeFisse[0], quantita: 2, unita: 'g' };
    const stato: StatoRevisione = { ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': lunedi } };
    // Prima della correzione: g lunedì e null (q.b.) martedì contavano come due unità → un dubbio aperto.
    expect(gruppiRighe(piano, stato)).toEqual([]);
    expect(pronto(piano, stato, SLOTS)).toBe(true);
  });
});

describe('8c fix round 0: il q.b. non dice un\'unità e non riceve proposte (ruling del controller su S1)', () => {
  /** Una settimana di tre giorni, ogni giorno una cena con la Zuppa e «sale q.b.» senza numero. */
  function pianoSaleQb(): PianoEstratto {
    const giorno = (g: number) => ({
      giorno: g, titolo: null,
      pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [senza('sale q.b.', 'sale')] }] }],
    });
    return { archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [], settimane: [{ numero: 1, giorni: [giorno(0), giorno(1), giorno(2)] }] };
  }
  /** La cena del giorno `g` di `pianoSaleQb` col sale corretto a mano (quantità trascritta). */
  const saleCorretto = (piano: PianoEstratto, g: number, quantita: number, unita: 'g' | 'pz'): PastoEstratto => {
    const pasto = structuredClone(piano.settimane[0].giorni[g].pasti[0]);
    pasto.piatti[0].righeFisse[0] = { ...pasto.piatti[0].righeFisse[0], quantita, unita, quantitaInferita: false };
    return pasto;
  };

  it('unitaNota salta il q.b. stimato dal lettore: l\'unità viene dall\'altra riga', () => {
    const piano = pianoUnPasto([{ alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: true, testoOriginale: 'sale q.b.' }]);
    expect(unitaNota(piano, STATO_PRANZO, 'sale')).toBeNull();
    piano.settimane[0].giorni[0].pasti.push({ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [
      { alimento: 'sale', quantita: 1, unita: 'pz', quantitaInferita: false, testoOriginale: '1 bustina di sale' },
    ] }] });
    expect(unitaNota(piano, STATO_PRANZO, 'sale')).toBe('pz');
  });

  it('confermaTutti non scrive la proposta dell\'unità più frequente su una riga q.b.', () => {
    const piano = pianoSaleQb();
    const stato: StatoRevisione = { ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: {
      '1-0-0': saleCorretto(piano, 0, 2, 'g'), '1-1-0': saleCorretto(piano, 1, 1, 'pz'),
    } };
    expect(gruppiRighe(piano, stato)[0].proposta).toMatchObject({ unita: 'g', origine: 'unitaFrequente' });
    const confermato = confermaTutti(piano, stato);
    expect(confermato.correzioni['1-1-0'].piatti[0].righeFisse[0]).toMatchObject({ quantita: 2, unita: 'g', quantitaInferita: true });
    // Il mercoledì era q.b.: la riga resta com'era, quantità e unità comprese.
    const mercoledi = confermato.correzioni['1-2-0'] ?? piano.settimane[0].giorni[2].pasti[0];
    expect(mercoledi.piatti[0].righeFisse[0]).toEqual(senza('sale q.b.', 'sale'));
  });

  it('unitaDelGruppo salta le righe q.b. invece di fermarsi', () => {
    const piano = pianoSaleQb();
    const stato: StatoRevisione = { ...STATO, correzioni: { '1-1-0': saleCorretto(piano, 1, 2, 'g') } };
    const posizione = { piatto: 0, componente: null, opzione: null, riga: 0 };
    expect(unitaDelGruppo(piano, stato, 'sale|sale q.b.', { pasto: '1-2-0', posizione })).toBe('g');
  });
});

describe('8c fix round 1: la proposta va nell\'unità già scelta nel gruppo (review I1)', () => {
  /** Tre giorni, ogni giorno un pranzo con questa riga; il lunedì corretto nel foglio con `lunedi`. */
  function treGiorni(riga: RigaEstratta, lunedi: Partial<RigaEstratta>): { piano: PianoEstratto; stato: StatoRevisione } {
    const giorno = (g: number) => ({
      giorno: g, titolo: null,
      pasti: [{ nomeOriginale: 'pranzo', piatti: [{ nome: 'Piatto', descrizione: null, componenti: [], righeFisse: [{ ...riga }] }] }],
    });
    const piano: PianoEstratto = { archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [], settimane: [{ numero: 1, giorni: [giorno(0), giorno(1), giorno(2)] }] };
    const pasto = structuredClone(piano.settimane[0].giorni[0].pasti[0]);
    pasto.piatti[0].righeFisse[0] = { ...pasto.piatti[0].righeFisse[0], ...lunedi, quantitaInferita: false };
    return { piano, stato: { ...STATO_PRANZO, correzioni: { '1-0-0': pasto } } };
  }
  const righeDopo = (piano: PianoEstratto, stato: StatoRevisione) =>
    [0, 1, 2].map((g) => (stato.correzioni[`1-${g}-0`] ?? piano.settimane[0].giorni[g].pasti[0]).piatti[0].righeFisse[0]);

  it('la porzione: patate a 1 pz il lunedì → 1 pz anche gli altri giorni, e il gruppo si chiude', () => {
    const { piano, stato } = treGiorni(senza('patate', 'patate'), { quantita: 1, unita: 'pz' });
    expect(gruppiRighe(piano, stato)[0].proposta).toEqual({ quantita: 1, unita: 'pz', origine: 'porzione', testo: null });
    const confermato = confermaTutti(piano, stato);
    expect(righeDopo(piano, confermato).map((r) => [r.quantita, r.unita])).toEqual([[1, 'pz'], [1, 'pz'], [1, 'pz']]);
    expect(gruppiRighe(piano, confermato)[0]).toMatchObject({ stato: 'fatto', unitaDiverse: false });
  });

  it('la porzione senza peso a pezzo: pane a 1 pz il lunedì → nessuna proposta, il dubbio blocca', () => {
    const { piano, stato } = treGiorni(senza('pane', 'pane'), { quantita: 1, unita: 'pz' });
    expect(gruppiRighe(piano, stato)[0].proposta).toBeNull();
    expect(pronto(piano, stato, SLOTS)).toBe(false);
  });

  it('i cucchiai: olio a 10 g il lunedì → 13 g gli altri giorni, non 15 ml', () => {
    const { piano, stato } = treGiorni(
      { alimento: 'olio extravergine di oliva', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di olio' },
      { quantita: 10, unita: 'g' },
    );
    expect(gruppiRighe(piano, stato)[0].proposta).toEqual({ quantita: 13, unita: 'g', origine: 'cucchiaio', testo: '1 cucchiaio, quindi 13 g' });
    const confermato = confermaTutti(piano, stato);
    expect(righeDopo(piano, confermato).map((r) => [r.quantita, r.unita])).toEqual([[10, 'g'], [13, 'g'], [13, 'g']]);
    expect(gruppiRighe(piano, confermato)[0]).toMatchObject({ stato: 'fatto', unitaDiverse: false, unita: 'g' });
  });
});

describe('8c: le proposte compilate (spec §D)', () => {
  it('la porzione tipica: tipo «proposta», non blocca, e CONFERMA la scrive come proposta da me', () => {
    const piano = pianoUnPasto([senza('pasta', 'pasta di semola')]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual([expect.objectContaining({
      tipo: 'proposta', stato: 'aperto', proposta: { quantita: 80, unita: 'g', origine: 'porzione', testo: null },
    })]);
    expect(pronto(piano, STATO_PRANZO, SLOTS)).toBe(true);
    const confermato = confermaTutti(piano, STATO_PRANZO);
    expect(confermato.correzioni['1-0-0'].piatti[0].righeFisse[0]).toEqual({
      alimento: 'pasta di semola', quantita: 80, unita: 'g', quantitaInferita: true, testoOriginale: 'pasta',
    });
    expect(gruppiRighe(piano, confermato)).toEqual([expect.objectContaining({ tipo: 'proposta', stato: 'fatto', proposta: null, daMe: true })]);
  });

  it('la porzione nell\'unità che il piano conosce: patate a pezzi col peso medio', () => {
    const piano = pianoUnPasto([
      { alimento: 'patate', quantita: 2, unita: 'pz', quantitaInferita: false, testoOriginale: '2 patate' },
      senza('patate lesse', 'patate'),
    ]);
    expect(gruppiRighe(piano, STATO_PRANZO)[0].proposta).toEqual({ quantita: 1, unita: 'pz', origine: 'porzione', testo: null });
  });

  it('i cucchiai nell\'unità dell\'ingrediente, coi due valori', () => {
    const cucchiaio = (alimento: string): RigaEstratta => ({ alimento, quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: `1 cucchiaio di ${alimento}` });
    // Un ingrediente che hai con lo stesso nome detta l'unità: in g, la tabella per alimento.
    const olioInG: Ingredient = { id: 'i-olio', nome: 'Olio', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null };
    expect(gruppiRighe(pianoUnPasto([cucchiaio('olio')]), STATO_PRANZO, [olioInG])[0].proposta)
      .toEqual({ quantita: 13, unita: 'g', origine: 'cucchiaio', testo: '1 cucchiaio, quindi 13 g' });
    // Senza: l'unità della tabella dei formati (olio extravergine in ml), i 15 ml generici.
    expect(gruppiRighe(pianoUnPasto([cucchiaio('olio extravergine di oliva')]), STATO_PRANZO)[0].proposta)
      .toEqual({ quantita: 15, unita: 'ml', origine: 'cucchiaio', testo: '1 cucchiaio, quindi 15 ml' });
    // In g e fuori dalla tabella dei cucchiai: 15 g, da controllare.
    expect(gruppiRighe(pianoUnPasto([cucchiaio('semi di chia')]), STATO_PRANZO)[0].proposta)
      .toEqual({ quantita: 15, unita: 'g', origine: 'cucchiaio', testo: '1 cucchiaio, quindi 15 g' });
  });

  it('a pezzi i cucchiai non si convertono: resta un dubbio che blocca', () => {
    const piano = pianoUnPasto([{ alimento: 'miele', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di miele' }]);
    const mieleAPezzi: Ingredient = { id: 'i-miele', nome: 'Miele', unitaBase: 'pz', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 1, prezzoConfezione: null, ean: null };
    expect(gruppiRighe(piano, STATO_PRANZO, [mieleAPezzi])).toEqual([expect.objectContaining({ tipo: 'irrisolta', proposta: null })]);
    expect(pronto(piano, STATO_PRANZO, SLOTS, [mieleAPezzi])).toBe(false);
  });

  it('unità diverse nel gruppo: la più frequente, a pari merito quella della prima riga', () => {
    const piano = pianoConOlive([['cena'], ['cena'], ['cena']]);
    const stato = { ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: {
      '1-0-0': cenaOlive(piano, 0, 3, 'pz'), '1-1-0': cenaOlive(piano, 1, 20, 'g'), '1-2-0': cenaOlive(piano, 2, 20, 'g'),
    } };
    expect(gruppiRighe(piano, stato)[0].proposta).toEqual({ quantita: 20, unita: 'g', origine: 'unitaFrequente', testo: null });
    // A pari merito su un piano di DUE giorni, entrambi risolti (correzione P3): sul piano a tre giorni
    // il terzo resterebbe irrisolto e la proposta sarebbe quella della porzione (nessuna, per le olive).
    const pianoPari = pianoConOlive([['cena'], ['cena']]);
    const pari = { ...stato, correzioni: { '1-0-0': cenaOlive(pianoPari, 0, 3, 'pz'), '1-1-0': cenaOlive(pianoPari, 1, 20, 'g') } };
    expect(gruppiRighe(pianoPari, pari)[0].proposta).toEqual({ quantita: 3, unita: 'pz', origine: 'unitaFrequente', testo: null });
    const confermato = confermaTutti(piano, stato);
    expect(gruppiRighe(piano, confermato)[0]).toMatchObject({ stato: 'fatto', quantita: 20, unita: 'g' });
  });
});

describe('differenziale: pronto, gruppiRighe e confermaTutti dell\'8b contro l\'8c, senza q.b. né proposte (spec 8c §J)', () => {
  const MAPPATO: StatoRevisione = { ...STATO, mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' } };
  const CASI: [PianoEstratto, StatoRevisione][] = [
    [PIANO_MENU_SETTIMANALE, STATO],
    [PIANO_MENU_SETTIMANALE, MAPPATO],
    [PIANO_MENU_SETTIMANALE, { ...MAPPATO, correzioni: { '1-1-1': cenaConOlive(3, 'pz') } }],
    [PIANO_MENU_SETTIMANALE, togliGruppo(PIANO_MENU_SETTIMANALE, MAPPATO, chiaveGruppo(OLIVE))],
    [PIANO_GIORNATA_UNICA, STATO_PRANZO],
    [pianoConSale(), { ...STATO, mappaturaPasti: { cena: 's-cena' } }],
  ];
  const senzaCampiNuovi = (g: GruppoRighe) => {
    const resto: Partial<GruppoRighe> = { ...g };
    delete resto.proposta;
    delete resto.daMe;
    return resto;
  };

  it('coincidono su ogni caso', () => {
    for (const [piano, stato] of CASI) {
      expect(pronto(piano, stato, SLOTS)).toBe(v8b.pronto(piano, stato, SLOTS));
      expect(gruppiRighe(piano, stato).map(senzaCampiNuovi)).toEqual(v8b.gruppiRighe(piano, stato));
      expect(confermaTutti(piano, stato)).toEqual(v8b.confermaTutti(piano, stato));
    }
  });
});

// --- Task 12b: porzioni per categoria e domande senza quantità per alimento ---

const ingrediente = (nome: string, unitaBase: 'g' | 'ml' | 'pz'): Ingredient => ({
  id: `i-${nome}`, nome, unitaBase, area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1, prezzoConfezione: null, ean: null,
});

/** Un pranzo al giorno col Piatto, con le righe di quel giorno. */
function pianoAPranzi(giorni: RigaEstratta[][]): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: giorni.map((righe, g) => ({
        giorno: g, titolo: null,
        pasti: [{ nomeOriginale: 'pranzo', piatti: [{ nome: 'Piatto', descrizione: null, componenti: [], righeFisse: righe.map((r) => ({ ...r })) }] }],
      })),
    }],
  };
}
/** La riga `r` del pranzo del giorno `g`, nello stato dato. */
const rigaDel = (piano: PianoEstratto, stato: StatoRevisione, g: number, r = 0) =>
  (stato.correzioni[`1-${g}-0`] ?? piano.settimane[0].giorni[g].pasti[0]).piatti[0].righeFisse[r];

describe('Task 12b: il ripiego per categoria nella proposta', () => {
  it('verdure senza quantità: 200 g, una proposta che non blocca, e CONFERMA la scrive come proposta da me', () => {
    const piano = pianoUnPasto([senza('zucchine grigliate', 'zucchine')]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual([expect.objectContaining({
      tipo: 'proposta', stato: 'aperto', proposta: { quantita: 200, unita: 'g', origine: 'categoria', testo: null },
    })]);
    expect(pronto(piano, STATO_PRANZO, SLOTS)).toBe(true);
    expect(confermaTutti(piano, STATO_PRANZO).correzioni['1-0-0'].piatti[0].righeFisse[0])
      .toEqual({ alimento: 'zucchine', quantita: 200, unita: 'g', quantitaInferita: true, testoOriginale: 'zucchine grigliate' });
  });

  it('frutta senza quantità: 150 g', () => {
    expect(gruppiRighe(pianoUnPasto([senza('una mela', 'mela')]), STATO_PRANZO)[0].proposta)
      .toEqual({ quantita: 150, unita: 'g', origine: 'categoria', testo: null });
  });

  it('a pezzi senza il peso di un pezzo: 1 pz per verdure e frutta, niente per il resto', () => {
    expect(gruppiRighe(pianoUnPasto([senza('broccoli', 'broccoli')]), STATO_PRANZO, [ingrediente('Broccoli', 'pz')])[0].proposta)
      .toEqual({ quantita: 1, unita: 'pz', origine: 'categoria', testo: null });
    expect(gruppiRighe(pianoUnPasto([senza('fragole', 'fragole')]), STATO_PRANZO, [ingrediente('Fragole', 'pz')])[0].proposta)
      .toEqual({ quantita: 1, unita: 'pz', origine: 'categoria', testo: null });
    // Una voce specifica di verdura (la tabella, non il ripiego) vale lo stesso.
    expect(gruppiRighe(pianoUnPasto([senza('verdure di stagione', 'verdure di stagione')]), STATO_PRANZO, [ingrediente('Verdure di stagione', 'pz')])[0].proposta)
      .toEqual({ quantita: 1, unita: 'pz', origine: 'porzione', testo: null });
    expect(gruppiRighe(pianoUnPasto([senza('pane', 'pane')]), STATO_PRANZO, [ingrediente('Pane', 'pz')])[0].proposta).toBeNull();
  });

  it('a pezzi col peso medio si converte come oggi', () => {
    expect(gruppiRighe(pianoUnPasto([senza('zucchine', 'zucchine')]), STATO_PRANZO, [ingrediente('Zucchine', 'pz')])[0].proposta)
      .toEqual({ quantita: 1, unita: 'pz', origine: 'categoria', testo: null });
    // 200 g / 250 g = 0,8 pz, al quarto.
    expect(gruppiRighe(pianoUnPasto([senza('finocchi', 'finocchi')]), STATO_PRANZO, [ingrediente('Finocchi', 'pz')])[0].proposta)
      .toEqual({ quantita: 0.75, unita: 'pz', origine: 'categoria', testo: null });
  });

  it('a pezzi col peso scritto: vince sulla tabella, come agli Ingredienti', () => {
    const piano = pianoUnPasto([senza('broccoli', 'broccoli')]);
    const broccoli = ingrediente('Broccoli', 'pz');
    const conPeso = (chiave: string, pesoPezzo: number): StatoRevisione => ({ ...STATO_PRANZO, cambiUnita: { [chiave]: { tieni: true, pesoPezzo } } });
    expect(gruppiRighe(piano, conPeso('i-Broccoli', 400), [broccoli])[0].proposta).toEqual({ quantita: 0.5, unita: 'pz', origine: 'categoria', testo: null });
    expect(gruppiRighe(piano, conPeso('broccoli', 100), [broccoli])[0].proposta).toEqual({ quantita: 2, unita: 'pz', origine: 'categoria', testo: null });
    // Un peso che non è un numero positivo non vale: si torna all'1 pz.
    expect(gruppiRighe(piano, conPeso('broccoli', 0), [broccoli])[0].proposta).toEqual({ quantita: 1, unita: 'pz', origine: 'categoria', testo: null });
  });

  it('in ml non si converte: resta un dubbio che blocca', () => {
    const piano = pianoUnPasto([senza('zucchine', 'zucchine')]);
    expect(gruppiRighe(piano, STATO_PRANZO, [ingrediente('Zucchine', 'ml')])).toEqual([expect.objectContaining({ tipo: 'irrisolta', proposta: null })]);
  });

  it('una riga a cucchiai resta come oggi', () => {
    const piano = pianoUnPasto([{ alimento: 'spinaci', quantita: 2, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '2 cucchiai di spinaci' }]);
    expect(gruppiRighe(piano, STATO_PRANZO)).toEqual(prima12b.gruppiRighe(piano, STATO_PRANZO));
    expect(gruppiRighe(piano, STATO_PRANZO)[0].proposta).toMatchObject({ origine: 'cucchiaio', quantita: 30, unita: 'g' });
  });
});

describe('Task 12b: le domande senza quantità si raggruppano per alimento', () => {
  const grigliate = senza('zucchine grigliate', 'zucchine');
  const vapore = senza('zucchine al vapore', 'zucchine');
  const trifolate = senza('Zucchine trifolate', 'Zucchine');
  const piano = () => pianoAPranzi([[grigliate], [grigliate], [vapore], [trifolate]]);

  it('un gruppo solo per alimento, qualunque sia il testo, con la chiave della prima riga', () => {
    const p = piano();
    const gruppi = gruppiRighe(p, STATO_PRANZO);
    expect(gruppi).toEqual([expect.objectContaining({
      chiave: 'zucchine|zucchine grigliate', alimento: 'zucchine', testoOriginale: 'zucchine grigliate', tipo: 'proposta', stato: 'aperto',
    })]);
    expect(gruppi[0].occorrenze.map((o) => o.pasto)).toEqual(['1-0-0', '1-1-0', '1-2-0', '1-3-0']);
    expect(provenienza(p, gruppi[0])).toBe('In 4 pasti');
    expect(prima12b.gruppiRighe(p, STATO_PRANZO)).toHaveLength(3);
  });

  it('una risposta risolve tutte le righe, e il gruppo resta lo stesso, fatto', () => {
    const p = piano();
    const risposto = rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine grigliate', 250, 'g');
    for (const g of [0, 1, 2, 3]) expect(rigaDel(p, risposto, g)).toMatchObject({ quantita: 250, unita: 'g', quantitaInferita: false });
    expect(gruppiRighe(p, risposto)).toEqual([expect.objectContaining({ chiave: 'zucchine|zucchine grigliate', stato: 'fatto', quantita: 250, unita: 'g' })]);
    // La chiave di un altro testo del gruppo trova lo stesso gruppo.
    expect(rispondiGruppo(p, STATO_PRANZO, chiaveGruppo(vapore), 250, 'g')).toEqual(risposto);
  });

  it('togliere il gruppo toglie tutte le righe, e l\'anteprima conta tutti i pasti', () => {
    const p = piano();
    const anteprima = anteprimaTogli(p, STATO_PRANZO, 'zucchine|zucchine grigliate');
    expect(anteprima).toMatchObject({ pasti: 4, piattiSpariti: 4 });
    expect(anteprima.stato).toEqual(togliGruppo(p, STATO_PRANZO, chiaveGruppo(trifolate)));
    expect(gruppiRighe(p, anteprima.stato)).toEqual([expect.objectContaining({ stato: 'tolto' })]);
  });

  it('CONFERMA scrive la proposta su tutte le righe del gruppo', () => {
    const p = piano();
    const confermato = confermaTutti(p, STATO_PRANZO);
    for (const g of [0, 1, 2, 3]) expect(rigaDel(p, confermato, g)).toMatchObject({ quantita: 200, unita: 'g', quantitaInferita: true });
    expect(pronto(p, confermato, SLOTS)).toBe(true);
  });

  it('le righe con una quantità, anche inferita, e quelle a cucchiai restano fuori, come oggi', () => {
    const p = pianoAPranzi([
      [grigliate],
      [vapore],
      [{ alimento: 'zucchine', quantita: 150, unita: 'g', quantitaInferita: true, testoOriginale: 'zucchine (circa 150 g)' }],
      [{ alimento: 'zucchine', quantita: 300, unita: 'g', quantitaInferita: false, testoOriginale: 'zucchine 300 g' }],
      [{ alimento: 'zucchine', quantita: 2, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '2 cucchiai di zucchine' }],
    ]);
    const gruppi = gruppiRighe(p, STATO_PRANZO);
    expect(gruppi.map((g) => [g.chiave, g.tipo, g.occorrenze.length])).toEqual([
      ['zucchine|zucchine grigliate', 'proposta', 2],
      ['zucchine|zucchine (circa 150 g)', 'inferita', 1],
      ['zucchine|2 cucchiai di zucchine', 'proposta', 1],
    ]);
    // Le righe con la quantità, fuori dai dubbi irrisolti, fissano l'unità del gruppo (decisione 8).
    expect(gruppi[0].unitaFissa).toBe('g');
  });

  it('fix M1: la risposta per alimento non scrive su una riga con la quantità inferita di un testo misto', () => {
    // Il caso della review: lo stesso testo ha una riga senza quantità e una coi 150 g stimati dal lettore.
    const p = pianoAPranzi([
      [vapore],
      [{ ...grigliate, quantita: 150, unita: 'g', quantitaInferita: true }],
      [grigliate],
    ]);
    const risposto = rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine al vapore', 250, 'g');
    expect(rigaDel(p, risposto, 0)).toMatchObject({ quantita: 250, unita: 'g' });
    expect(rigaDel(p, risposto, 1)).toEqual({ ...grigliate, quantita: 150, unita: 'g', quantitaInferita: true });
    expect(rigaDel(p, risposto, 2)).toEqual(grigliate);
    expect(risposto).toEqual(prima12b.rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine al vapore', 250, 'g'));
    // Il testo misto resta il suo gruppo, come prima: la sua risposta vale come prima.
    expect(gruppiRighe(p, STATO_PRANZO).map((g) => g.chiave)).toEqual(['zucchine|zucchine al vapore', 'zucchine|zucchine grigliate']);
    expect(rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine grigliate', 250, 'g'))
      .toEqual(prima12b.rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine grigliate', 250, 'g'));
  });

  it('fix M1: dopo una risposta, una seconda risposta corregge di nuovo tutte le righe del gruppo', () => {
    const p = piano();
    const due = rispondiGruppo(p, rispondiGruppo(p, STATO_PRANZO, 'zucchine|zucchine grigliate', 250, 'g'), chiaveGruppo(trifolate), 180, 'g');
    for (const g of [0, 1, 2, 3]) expect(rigaDel(p, due, g)).toMatchObject({ quantita: 180, unita: 'g', quantitaInferita: false });
  });

  it('il q.b. resta fuori e non riceve proposte', () => {
    const p = pianoAPranzi([[senza('sale q.b.', 'sale')], [senza('un pizzico di sale', 'sale')], [senza('sale fino', 'sale')]]);
    const gruppi = gruppiRighe(p, STATO_PRANZO);
    expect(gruppi).toEqual([expect.objectContaining({ chiave: 'sale|un pizzico di sale', tipo: 'irrisolta', proposta: null })]);
    expect(gruppi[0].occorrenze.map((o) => o.pasto)).toEqual(['1-1-0', '1-2-0']);
    const risposto = rispondiGruppo(p, STATO_PRANZO, gruppi[0].chiave, 1, 'g');
    expect(rigaDel(p, risposto, 0)).toEqual(senza('sale q.b.', 'sale'));
    expect([1, 2].map((g) => rigaDel(p, risposto, g).quantita)).toEqual([1, 1]);
    expect(pronto(p, risposto, SLOTS)).toBe(true);
  });

  it('gruppoDiRiga, unitaDelGruppo e unitaNota leggono il gruppo intero (il foglio del giorno)', () => {
    const p = piano();
    const gruppoDi = gruppoDiRiga(p, STATO_PRANZO);
    expect(gruppoDi(vapore)).toBe('zucchine|zucchine grigliate');
    expect(gruppoDi(trifolate)).toBe('zucchine|zucchine grigliate');
    const fissa = { alimento: 'zucchine', quantita: 300, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'zucchine 300 g' };
    expect(gruppoDi(fissa)).toBe('zucchine|zucchine 300 g');
    // Il lunedì risolto a 1 pz: il mercoledì, l'altro testo, prende l'unità dal gruppo.
    const lunedi = structuredClone(p.settimane[0].giorni[0].pasti[0]);
    lunedi.piatti[0].righeFisse[0] = { ...grigliate, quantita: 1, unita: 'pz' };
    const stato = { ...STATO_PRANZO, correzioni: { '1-0-0': lunedi } };
    const posizione = { piatto: 0, componente: null, opzione: null, riga: 0 };
    expect(unitaDelGruppo(p, stato, gruppoDi(vapore), { pasto: '1-2-0', posizione })).toBe('pz');
    expect(unitaDelGruppo(p, stato, chiaveGruppo(vapore), { pasto: '1-2-0', posizione })).toBe('pz');
    // Il gruppo, irrisolto sul piano letto, non fissa l'unità di nessuno, nemmeno di sé.
    expect(unitaNota(p, stato, 'zucchine')).toBeNull();
  });
});

/**
 * Il differenziale del Task 12b contro la copia congelata del dubbi.ts di prima (HEAD 14eec83):
 * senza righe senza quantità dello stesso alimento in testi diversi, e senza verdure o frutta da
 * proporre per categoria, tutto coincide; con lo stesso alimento in testi diversi, i gruppi
 * scendono e una risposta sola fa quello che prima ne chiedeva una per testo.
 */
describe('differenziale Task 12b: dubbi.ts contro dubbi-8c-prima', () => {
  const MAPPATO: StatoRevisione = { ...STATO, mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' } };
  const CENA: StatoRevisione = { ...STATO, mappaturaPasti: { cena: 's-cena' } };
  const olive3 = pianoConOlive([['cena'], ['cena'], ['cena']]);
  const mieleAPezzi: Ingredient = { id: 'i-miele', nome: 'Miele', unitaBase: 'pz', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 1, prezzoConfezione: null, ean: null };
  const CASI: [PianoEstratto, StatoRevisione, Ingredient[]][] = [
    [PIANO_MENU_SETTIMANALE, STATO, []],
    [PIANO_MENU_SETTIMANALE, MAPPATO, []],
    [PIANO_MENU_SETTIMANALE, { ...MAPPATO, correzioni: { '1-1-1': cenaConOlive(3, 'pz') } }, []],
    [PIANO_MENU_SETTIMANALE, togliGruppo(PIANO_MENU_SETTIMANALE, MAPPATO, chiaveGruppo(OLIVE)), []],
    [PIANO_GIORNATA_UNICA, STATO_PRANZO, []],
    [pianoConOlio(), STATO, []],
    [pianoConOlio(), rispondiGruppo(pianoConOlio(), STATO, 'olio|olio a filo', 5, 'ml'), []],
    [olive3, CENA, []],
    [olive3, { ...CENA, correzioni: { '1-0-0': cenaOlive(olive3, 0, 3, 'pz'), '1-1-0': cenaOlive(olive3, 1, 20, 'g') } }, []],
    [pianoConSale(), CENA, []],
    [pianoUnPasto([
      senza('pasta', 'pasta di semola'), senza('sale q.b.', 'sale'),
      { alimento: 'olio extravergine di oliva', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di olio' },
    ]), STATO_PRANZO, []],
    [pianoUnPasto([{ alimento: 'patate', quantita: 2, unita: 'pz', quantitaInferita: false, testoOriginale: '2 patate' }, senza('patate lesse', 'patate')]), STATO_PRANZO, []],
    [pianoUnPasto([{ alimento: 'miele', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di miele' }]), STATO_PRANZO, [mieleAPezzi]],
    [pianoConDueSale({ alimento: 'sale', quantita: 1, unita: 'cucchiaino', quantitaInferita: false, testoOriginale: '1 cucchiaino di sale' }), STATO, []],
  ];

  it('pronto, i gruppi, CONFERMA e le risposte coincidono su ogni caso', () => {
    for (const [piano, stato, esistenti] of CASI) {
      expect(pronto(piano, stato, SLOTS, esistenti)).toBe(prima12b.pronto(piano, stato, SLOTS, esistenti));
      const gruppi = gruppiRighe(piano, stato, esistenti);
      expect(gruppi).toEqual(prima12b.gruppiRighe(piano, stato, esistenti));
      expect(confermaTutti(piano, stato, esistenti)).toEqual(prima12b.confermaTutti(piano, stato, esistenti));
      for (const g of gruppi) {
        expect(rispondiGruppo(piano, stato, g.chiave, 7, 'g')).toEqual(prima12b.rispondiGruppo(piano, stato, g.chiave, 7, 'g'));
        expect(anteprimaTogli(piano, stato, g.chiave)).toEqual(prima12b.anteprimaTogli(piano, stato, g.chiave));
        expect(unitaNota(piano, stato, normalizza(g.alimento), g.chiave)).toBe(prima12b.unitaNota(piano, stato, normalizza(g.alimento), g.chiave));
      }
    }
  });

  it('lo stesso alimento in testi diversi: un gruppo invece di due, e una risposta sola fa le due di prima', () => {
    const piano = pianoConDueSale();
    expect(prima12b.gruppiRighe(piano, STATO)).toHaveLength(2);
    const gruppi = gruppiRighe(piano, STATO);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].occorrenze).toHaveLength(2);
    const risposto = rispondiGruppo(piano, STATO, gruppi[0].chiave, 1, 'pz');
    expect(gruppiRighe(piano, risposto)).toEqual([expect.objectContaining({ stato: 'fatto', quantita: 1, unita: 'pz' })]);
    expect(pronto(piano, { ...risposto, mappaturaPasti: { pranzo: 's-pranzo', cena: 's-cena' } }, SLOTS)).toBe(true);
    // Prima una risposta lasciava aperto l'altro testo; servivano due risposte per lo stesso stato.
    const unaPrima = prima12b.rispondiGruppo(piano, STATO, gruppi[0].chiave, 1, 'pz');
    expect(prima12b.gruppiRighe(piano, unaPrima).filter((g) => g.stato === 'aperto')).toHaveLength(1);
    expect(risposto).toEqual(prima12b.rispondiGruppo(piano, unaPrima, 'sale|un pizzico di sale', 1, 'pz'));
  });

  it('con le zucchine in tre testi: un gruppo invece di tre, e CONFERMA scrive le stesse righe dopo una risposta', () => {
    const piano = pianoAPranzi([[senza('zucchine grigliate', 'zucchine')], [senza('zucchine al vapore', 'zucchine')], [senza('zucchine trifolate', 'zucchine')]]);
    expect(prima12b.gruppiRighe(piano, STATO_PRANZO)).toHaveLength(3);
    expect(gruppiRighe(piano, STATO_PRANZO)).toHaveLength(1);
    let prima = STATO_PRANZO;
    for (const testo of ['zucchine grigliate', 'zucchine al vapore', 'zucchine trifolate']) prima = prima12b.rispondiGruppo(piano, prima, `zucchine|${testo}`, 200, 'g');
    expect(rispondiGruppo(piano, STATO_PRANZO, 'zucchine|zucchine grigliate', 200, 'g')).toEqual(prima);
    // Togliere da una chiave che non è la prima del gruppo = le tre rimozioni di prima.
    let tolto = STATO_PRANZO;
    for (const testo of ['zucchine grigliate', 'zucchine al vapore', 'zucchine trifolate']) tolto = prima12b.togliGruppo(piano, tolto, `zucchine|${testo}`);
    expect(togliGruppo(piano, STATO_PRANZO, 'zucchine|zucchine trifolate')).toEqual(tolto);
  });
});
