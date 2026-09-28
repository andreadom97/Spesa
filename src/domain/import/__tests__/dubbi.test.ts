import { describe, it, expect } from 'vitest';
import type { MealSlotDef } from '@/domain/types';
import type { IngredienteProposto, PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from '../types';
import { PIANO_MENU_SETTIMANALE, PIANO_GIORNATA_UNICA } from '../fixtures';
import { traduciBozza } from '../commit';
import { ingredientiDaAbbinare } from '../mapping';
import { proponi } from '../formati-tipici';
import {
  cambiaRiga, chiaveGruppo, confermaTutti, conteggi, etichettaGiorno, gruppiRighe, pastiDelGruppo,
  pronto, provenienza, riassuntoGiorni, righeDelPasto, rispondiGruppo, togliGruppo, togliRiga,
  unitaNota, vociPasti,
} from '../dubbi';

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

/** 2 settimane × 7 giorni: ogni giorno un pranzo con «olio 10ml» e i condimenti con «olio q.b.». */
function pianoConOlio(): PianoEstratto {
  const giorno = (g: number) => ({
    giorno: g,
    titolo: null,
    pasti: [
      { nomeOriginale: 'pranzo', piatti: [{ nome: 'Insalata', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: 10, unita: 'ml' as const, quantitaInferita: false, testoOriginale: 'olio 10ml' }] }] },
      { nomeOriginale: 'condimenti', piatti: [{ nome: 'Condimenti', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olio q.b.' }] }] },
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
    expect(gruppi[0]).toMatchObject({ chiave: 'olio|olio q.b.', tipo: 'irrisolta', stato: 'aperto', unitaFissa: 'ml' });
    expect(gruppi[0].occorrenze).toHaveLength(14);
    expect(pastiDelGruppo(gruppi[0])).toBe(14);
    expect(provenienza(piano, gruppi[0])).toBe('In 14 pasti');
  });

  it('una quantità proposta dall\'AI è un gruppo «inferita», già fatto', () => {
    const piano = structuredClone(PIANO_GIORNATA_UNICA);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse.push({ alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: true, testoOriginale: 'sale q.b.' });
    const gruppi = gruppiRighe(piano, { ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } });
    expect(gruppi).toEqual([expect.objectContaining({ chiave: 'sale|sale q.b.', tipo: 'inferita', stato: 'fatto', quantita: 2, unita: 'g' })]);
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
    expect(gruppiRighe(piano, { ...STATO, correzioni })[0]).toMatchObject({ stato: 'fatto', quantita: null, unita: null });
  });
});

describe('unitaNota', () => {
  it("l'unità di un'altra riga dello stesso alimento, esclusa la chiave data", () => {
    const piano = pianoConOlio();
    expect(unitaNota(piano, STATO, 'olio')).toBe('ml');
    expect(unitaNota(piano, STATO, 'olio', 'olio|olio 10ml')).toBeNull();
    expect(unitaNota(PIANO_MENU_SETTIMANALE, STATO, 'olive taggiasche', chiaveGruppo(OLIVE))).toBeNull();
  });
});

/** Due dubbi diversi dello stesso alimento (testi diversi), senza nessun'altra riga con l'unità. */
function pianoConDueSale(): PianoEstratto {
  return {
    archetipo: 'giornata_unica', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [{
        giorno: 0,
        titolo: null,
        pasti: [
          { nomeOriginale: 'pranzo', piatti: [{ nome: 'Pasta', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'sale q.b.' }] }] },
          { nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'un pizzico di sale' }] }] },
        ],
      }],
    }],
  };
}

describe('unitaFissa fra due gruppi irrisolti dello stesso alimento', () => {
  it('nessuno dei due fissa l\'unità dell\'altro, anche dopo aver risolto uno dei due', () => {
    const piano = pianoConDueSale();
    const gruppi = gruppiRighe(piano, STATO);
    expect(gruppi).toHaveLength(2);
    expect(gruppi.every((g) => g.unitaFissa === null)).toBe(true);

    const cenaRisolta = structuredClone(piano.settimane[0].giorni[0].pasti[1]);
    cenaRisolta.piatti[0].righeFisse[0] = { ...cenaRisolta.piatti[0].righeFisse[0], quantita: 1, unita: 'pz' };
    const stato = { ...STATO, correzioni: { '1-0-1': cenaRisolta } };
    const gruppiDopo = gruppiRighe(piano, stato);
    expect(gruppiDopo.find((g) => g.chiave === 'sale|un pizzico di sale')).toMatchObject({ stato: 'fatto', quantita: 1, unita: 'pz' });
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
    const chiave = 'olio|olio q.b.';
    const stato = rispondiGruppo(piano, STATO, chiave, 5, 'ml');
    expect(Object.keys(stato.correzioni)).toHaveLength(14);
    expect(Object.keys(stato.correzioni).every((k) => k.endsWith('-1'))).toBe(true);
    for (const pasto of Object.values(stato.correzioni)) {
      expect(pasto.piatti[0].righeFisse[0]).toEqual({ alimento: 'olio', quantita: 5, unita: 'ml', quantitaInferita: false, testoOriginale: 'olio q.b.' });
    }
    expect(gruppiRighe(piano, stato)[0]).toMatchObject({ stato: 'fatto', quantita: 5, unita: 'ml' });
  });

  it('togliere il gruppo svuota a cascata i 14 pasti dei condimenti', () => {
    const piano = pianoConOlio();
    const stato = togliGruppo(piano, STATO, 'olio|olio q.b.');
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
