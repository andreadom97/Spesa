import { describe, it, expect } from 'vitest';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { PianoEstratto, RigaEstratta } from '../types';
import {
  normalizza, abbina, proponiSlot, ingredientiDaAbbinare, quantoBasta, unitaPrevalente, statoRevisioneIniziale,
  stessaParola, stessoNome, mappaturaPastiIniziale, posizioniMedieNelGiorno, ordinaPastiPerSlot,
} from '../mapping';
import { proponi } from '../formati-tipici';
import { PIANO_MENU_SETTIMANALE } from '../fixtures';

const ing = (nome: string, unitaBase: Ingredient['unitaBase'] = 'g'): Ingredient => ({
  id: `i-${normalizza(nome)}`, nome, unitaBase, area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
});

describe('normalizza', () => {
  it('minuscole, senza accenti, spazi collassati', () => {
    expect(normalizza('  Caffè   d\'Orzo ')).toBe("caffe d'orzo");
  });
});

describe('abbina', () => {
  it('match esatto sul nome normalizzato', () => {
    const riso = ing('Riso');
    expect(abbina('riso', 'g', [riso, ing('Riso venere')])).toBe(riso);
  });
  it('match per inclusione, preferendo il nome più corto', () => {
    const avena = ing("Fiocchi d'avena");
    expect(abbina("fiocchi d'avena", 'g', [ing("Fiocchi d'avena integrali bio"), avena])).toBe(avena);
  });
  it('unità incompatibile rompe il match: mai una conversione inventata', () => {
    expect(abbina('latte', 'ml', [ing('Latte', 'g')])).toBeNull();
  });
  it('unita null (quantità irrisolta) abbina solo per nome', () => {
    const olive = ing('Olive taggiasche', 'pz');
    expect(abbina('olive taggiasche', null, [olive])).toBe(olive);
  });
  it('nessun fuzzy: "pollo" non abbina "petto di tacchino"', () => {
    expect(abbina('pollo', 'g', [ing('Petto di tacchino')])).toBeNull();
  });
});

describe('proponi', () => {
  it('un alimento in tabella eredita i suoi default', () => {
    const p = proponi('pasta di semola', 'g');
    expect(p.formatoConfezione).toBe(500);
    expect(p.area).toBe('cereali');
    expect(p.alimento).toBe('pasta di semola');
  });
  it('fuori tabella: fallback prudente dispensa/stima/500', () => {
    const p = proponi('alchermes', 'ml');
    expect(p).toMatchObject({ area: 'dispensa', classeResiduo: 'stima', formatoConfezione: 500, unitaBase: 'ml' });
  });
  it('senza unità estratta il fallback è in grammi', () => {
    expect(proponi('cosa ignota', null).unitaBase).toBe('g');
  });
});

describe('proponiSlot', () => {
  const slot = (id: string, nome: string): MealSlotDef => ({ id, nome, posizione: 0, assenzeAbituali: Array(7).fill(false) });
  const defs = [slot('s1', 'Colazione'), slot('s2', 'Spuntino mattina'), slot('s3', 'Pranzo'), slot('s4', 'Cena')];
  it('match diretto e sinonimi', () => {
    expect(proponiSlot('colazione', defs)).toBe('s1');
    expect(proponiSlot('spuntino_mattina', defs)).toBe('s2');
    expect(proponiSlot('merenda', defs)).toBe('s2'); // sinonimo di spuntino
  });
  it('condimenti e nomi ignoti non hanno proposta', () => {
    expect(proponiSlot('condimenti', defs)).toBeNull();
    expect(proponiSlot('pasto libero', defs)).toBeNull();
  });
});

describe('ingredientiDaAbbinare', () => {
  it('unisce righe fisse e di opzione, deduplicate per alimento normalizzato', () => {
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, {});
    const alimenti = voci.map((v) => v.alimento);
    expect(alimenti).toContain("fiocchi d'avena");
    expect(alimenti).toContain('pane integrale');   // riga di opzione
    expect(alimenti).toContain('pane di segale');   // altra opzione
    // "fiocchi d'avena" compare in 3 pasti del fixture ma una volta sola qui.
    expect(alimenti.filter((a) => a === "fiocchi d'avena")).toHaveLength(1);
  });
  it('le correzioni sostituiscono il pasto originale', () => {
    const correzione = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    correzione.piatti[0].righeFisse = [{ alimento: 'muesli', quantita: 40, unita: 'g', quantitaInferita: false, testoOriginale: '40g muesli' }];
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, { '1-0-0': correzione });
    expect(voci.map((v) => v.alimento)).toContain('muesli');
  });
  it('i cucchiai valgono come senza unità: non fissano il tipo dell\'ingrediente (spec 8c §C)', () => {
    const piano = structuredClone(PIANO_MENU_SETTIMANALE);
    const pasto = piano.settimane[0].giorni[0].pasti[0];
    pasto.piatti[0].righeFisse = [
      { alimento: 'miele', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di miele' },
    ];
    pasto.piatti[0].componenti = [];
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'miele')?.unita).toBeNull();
    // Se un'altra riga dello stesso alimento ha l'unità, vince quella.
    pasto.piatti[0].righeFisse.push({ alimento: 'miele', quantita: 10, unita: 'g', quantitaInferita: false, testoOriginale: 'miele 10g' });
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'miele')?.unita).toBe('g');
  });
  it('le unità di tutte le righe, e fra g e pz prevale la più frequente, a pari merito la prima (ruling 8c, Task 8)', () => {
    const piano = structuredClone(PIANO_MENU_SETTIMANALE);
    const pasto = piano.settimane[0].giorni[0].pasti[0];
    const riga = (quantita: number | null, unita: 'g' | 'pz' | 'ml' | null, testo: string) => ({ alimento: 'zucchine', quantita, unita, quantitaInferita: false, testoOriginale: testo });
    pasto.piatti[0].componenti = [];
    pasto.piatti[0].righeFisse = [riga(150, 'g', 'zucchine 150 g'), riga(1, 'pz', 'zucchine 1 pz'), riga(null, null, 'zucchine q.b.')];
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'zucchine')).toMatchObject({ unita: 'g', unitaViste: ['g', 'pz'] });
    pasto.piatti[0].righeFisse.push(riga(2, 'pz', 'zucchine 2 pz'));
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'zucchine')?.unita).toBe('pz');
  });
  it('l\'unità si vota con le sole righe trascritte; senza, prevale fra le inferite (correzione 8c-bis C)', () => {
    const piano = structuredClone(PIANO_MENU_SETTIMANALE);
    const pasto = piano.settimane[0].giorni[0].pasti[0];
    const riga = (quantita: number, unita: 'g' | 'pz', quantitaInferita: boolean) => ({ alimento: 'sedano', quantita, unita, quantitaInferita, testoOriginale: 'sedano' });
    pasto.piatti[0].componenti = [];
    // Due stime in pz e una scritta in g: conta quella scritta, le stime restano fra le unità viste.
    pasto.piatti[0].righeFisse = [riga(1, 'pz', true), riga(1, 'pz', true), riga(80, 'g', false)];
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'sedano'))
      .toMatchObject({ unita: 'g', unitaViste: ['pz', 'pz', 'g'], unitaTrascritte: ['g'] });
    // Solo stime: prevale la più frequente fra le stime, come prima.
    pasto.piatti[0].righeFisse = [riga(1, 'pz', true), riga(100, 'g', true), riga(2, 'pz', true)];
    expect(ingredientiDaAbbinare(piano, {}).find((v) => v.alimento === 'sedano'))
      .toMatchObject({ unita: 'pz', unitaTrascritte: [] });
  });
  it('un alimento con sole stime in pz trova l\'ingrediente che hai in g con lo stesso nome (correzione 8c-bis C)', () => {
    expect(abbina('sedano', 'pz', [ing('Sedano', 'g')])?.nome).toBe('Sedano');
  });
  it('unitaPrevalente: con ml vince la prima, come prima dell\'8c', () => {
    expect(unitaPrevalente([])).toBeNull();
    expect(unitaPrevalente(['g', 'ml', 'ml'])).toBe('g');
    expect(unitaPrevalente(['pz', 'g'])).toBe('pz');
    expect(unitaPrevalente(['pz', 'g', 'g'])).toBe('g');
  });
});

describe('abbina a due livelli (spec 8c §A.2)', () => {
  const es = (id: string, nome: string, unitaBase: Ingredient['unitaBase']): Ingredient => ({
    id, nome, unitaBase, area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null,
  });

  it('se la stessa unità non trova niente, lo stesso nome esatto fra g e pz', () => {
    expect(abbina('zucchine', 'g', [es('i-z', 'Zucchine', 'pz')])?.id).toBe('i-z');
    expect(abbina('Uova', 'pz', [es('i-u', 'uova', 'g')])?.id).toBe('i-u');
  });

  it('mai fra ml e un\'altra unità, mai per inclusione', () => {
    expect(abbina('latte', 'ml', [es('i-l', 'Latte', 'g')])).toBeNull();
    expect(abbina('latte', 'g', [es('i-l', 'Latte', 'ml')])).toBeNull();
    expect(abbina('zucchine grigliate', 'g', [es('i-z', 'Zucchine', 'pz')])).toBeNull();
  });

  it('la stessa unità vince sul cambio, anche per inclusione', () => {
    expect(abbina('zucchine', 'g', [es('i-zp', 'Zucchine', 'pz'), es('i-zg', 'Zucchine', 'g')])?.id).toBe('i-zg');
    expect(abbina('zucchine', 'g', [es('i-zp', 'Zucchine', 'pz'), es('i-zb', 'Zucchine bio', 'g')])?.id).toBe('i-zb');
  });

  it('a parità di nome vince il primo per id', () => {
    expect(abbina('zucchine', 'g', [es('i-z2', 'Zucchine', 'pz'), es('i-z1', 'Zucchine', 'pz')])?.id).toBe('i-z1');
  });
});

describe('quantoBasta (spec 8c §B, correzione S1)', () => {
  /**
   * Una riga dello zucchero (non una spezia: per il sale vale `eSpezia`): senza quantità, o con 2 g
   * inferiti dal lettore (`inferita`) o trascritti dal foglio.
   */
  const riga = (testoOriginale: string, quantita: number | null = null, inferita = false): RigaEstratta => ({
    alimento: 'zucchero', quantita, unita: quantita === null ? null : 'g', quantitaInferita: inferita, testoOriginale,
  });

  it('q.b., qb, quanto basta, a piacere: per parole intere', () => {
    for (const t of ['sale q.b.', 'Sale Q.B.', 'pepe qb', 'olio quanto basta', 'prezzemolo a piacere', 'Spezie (q.b.)']) {
      expect(quantoBasta(riga(t))).toBe(true);
    }
  });

  it('non è q.b.: un pizzico, una parola che contiene «qb»', () => {
    expect(quantoBasta(riga('un pizzico di sale'))).toBe(false);
    expect(quantoBasta(riga('qbaccia'))).toBe(false);
  });

  it('una quantità INFERITA dal lettore col testo q.b. è q.b.: la stima si scarta', () => {
    expect(quantoBasta(riga('sale q.b.', 2, true))).toBe(true);
    expect(quantoBasta(riga('prezzemolo a piacere', 5, true))).toBe(true);
    // Inferita ma senza q.b. nel testo: resta una quantità proposta.
    expect(quantoBasta(riga('un pizzico di sale', 1, true))).toBe(false);
  });

  it('una quantità TRASCRITTA dal foglio vince sempre: resta la quantità', () => {
    expect(quantoBasta(riga('sale q.b.', 2, false))).toBe(false);
  });
});

describe('quantoBasta: le spezie (correzione 8c-bis A, prove dal telefono del 03/10)', () => {
  const r = (alimento: string, testoOriginale: string, quantita: number | null = null, unita: RigaEstratta['unita'] = null, inferita = false): RigaEstratta => ({
    alimento, quantita, unita, quantitaInferita: inferita, testoOriginale,
  });

  it('una spezia senza quantità è q.b., anche se il testo non lo dice', () => {
    expect(quantoBasta(r('sale', 'Sale'))).toBe(true);
    expect(quantoBasta(r('cannella', 'Cannella se ti va'))).toBe(true);
    expect(quantoBasta(r('zenzero in polvere', 'Zenzero in polvere'))).toBe(true);
  });

  it('una spezia con la quantità stimata dal lettore è q.b.: la stima si scarta', () => {
    expect(quantoBasta(r('origano', 'Origano 1 cucchiaino', 1, 'cucchiaino', true))).toBe(true);
    expect(quantoBasta(r('basilico', 'Basilico', 1, 'g', true))).toBe(true);
  });

  it('una quantità trascritta dal foglio resta com\'è', () => {
    expect(quantoBasta(r('pepe', 'Pepe 2 g', 2, 'g', false))).toBe(false);
    expect(quantoBasta(r('origano', 'Origano 1 cucchiaino', 1, 'cucchiaino', false))).toBe(false);
  });

  it('non spezie: salmone, peperoni, zenzero fresco restano com\'erano', () => {
    expect(quantoBasta(r('salmone', 'Salmone'))).toBe(false);
    expect(quantoBasta(r('peperoni', 'Peperoni'))).toBe(false);
    expect(quantoBasta(r('zenzero', 'Zenzero 10 g', 10, 'g', true))).toBe(false);
  });

  it('il q.b. del testo vale come prima, per qualunque alimento', () => {
    expect(quantoBasta(r('olio', 'Olio q.b.'))).toBe(true);
  });
});

describe('stessaParola e stessoNome: singolare e plurale (correzione 8c-bis B)', () => {
  it('i plurali regolari', () => {
    const coppie: [string, string][] = [
      ['banana', 'banane'], ['mela', 'mele'], ['zucchina', 'zucchine'], ['pesca', 'pesche'], ['alga', 'alghe'],
      ['arancia', 'arance'], ['ciliegia', 'ciliegie'], ['fico', 'fichi'], ['fungo', 'funghi'], ['asparago', 'asparagi'],
      ['pomodoro', 'pomodori'], ['uovo', 'uova'], ['pesce', 'pesci'], ['noce', 'noci'], ['carota', 'carote'],
    ];
    for (const [s, p] of coppie) {
      expect(stessaParola(s, p), `${s}/${p}`).toBe(true);
      expect(stessaParola(p, s), `${p}/${s}`).toBe(true);
    }
  });

  it('parole diverse non combaciano', () => {
    expect(stessaParola('pesca', 'pesce')).toBe(false);
    expect(stessaParola('pesche', 'pesci')).toBe(false);
    expect(stessaParola('pasta', 'pasto')).toBe(false);
    expect(stessaParola('pane', 'pene')).toBe(false);
  });

  it('sotto le tre lettere solo l\'uguaglianza', () => {
    expect(stessaParola('te', 'ti')).toBe(false);
    expect(stessaParola('te', 'te')).toBe(true);
  });

  it('il nome intero: stesso numero di parole, ognuna al suo posto', () => {
    expect(stessoNome('zucchine trombetta', 'zucchina trombetta')).toBe(true);
    expect(stessoNome('zucchine', 'zucchine trombetta')).toBe(false);
    expect(stessoNome('petto di pollo', 'pollo di petto')).toBe(false);
  });
});

describe('abbina: singolare e plurale (correzione 8c-bis B)', () => {
  it('banana trova Banane, e viceversa', () => {
    const banane = ing('Banane');
    expect(abbina('banana', 'g', [banane])).toBe(banane);
    const banana = ing('Banana');
    expect(abbina('banane', 'g', [banana])).toBe(banana);
  });

  it('il nome identico vince sul plurale', () => {
    const banana = ing('Banana');
    expect(abbina('banana', 'g', [ing('Banane'), banana])).toBe(banana);
  });

  it('banana in g con Banane in pz: il secondo livello, cambio d\'unità', () => {
    const banane = ing('Banane', 'pz');
    expect(abbina('banana', 'g', [banane])).toBe(banane);
  });

  it('arancia trova Arance', () => {
    const arance = ing('Arance');
    expect(abbina('arancia', 'g', [arance])).toBe(arance);
  });

  it('per inclusione, per parole intere: fungo trova «Funghi champignon»', () => {
    const funghi = ing('Funghi champignon');
    expect(abbina('fungo', 'g', [funghi])).toBe(funghi);
    expect(abbina('funghi champignon', 'g', [ing('Fungo')])?.nome).toBe('Fungo');
  });

  it('pesca non trova Pesce, pasta non trova Pasto', () => {
    expect(abbina('pesca', 'g', [ing('Pesce')])).toBeNull();
    expect(abbina('pesca', 'g', [ing('Pesce spada')])).toBeNull();
    expect(abbina('pasta', 'g', [ing('Pasto')])).toBeNull();
  });

  it('«Pasta di farro» non cambia l\'unità di «Pasta» (come prima)', () => {
    expect(abbina('pasta di farro', 'g', [ing('Pasta', 'pz')])).toBeNull();
    expect(abbina('paste di farro', 'g', [ing('Pasta', 'pz')])).toBeNull();
  });
});

describe('proponiSlot: dopocena, spuntino per orario e per posizione (correzione 8c-bis D)', () => {
  const slot = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: Array(7).fill(false) });
  const casa = [
    slot('colazione', 'Colazione', 0), slot('sp-mat', 'Spuntino mattina', 1), slot('pranzo', 'Pranzo', 2),
    slot('sp-pom', 'Spuntino pomeriggio', 3), slot('cena', 'Cena', 4), slot('dopocena', 'Dopocena', 5),
  ];

  it('«Dopo cena» è lo slot «Dopocena», non «Cena»', () => {
    expect(proponiSlot('Dopo cena', casa)).toBe('dopocena');
    expect(proponiSlot('dopo_cena', casa)).toBe('dopocena');
    expect(proponiSlot('Cena', casa)).toBe('cena');
  });

  it('il caso inverso: uno slot «Dopo cena» e un pasto «Dopocena»', () => {
    const defs = [slot('cena', 'Cena', 4), slot('dopo', 'Dopo cena', 5)];
    expect(proponiSlot('Dopocena', defs)).toBe('dopo');
  });

  it('«Spuntino 17:30» è il pomeriggio, «Spuntino 10.30» la mattina, «ore 17» e «h 10» pure', () => {
    expect(proponiSlot('Spuntino 17:30', casa)).toBe('sp-pom');
    expect(proponiSlot('Spuntino 17.30', casa)).toBe('sp-pom');
    expect(proponiSlot('Spuntino 10.30', casa)).toBe('sp-mat');
    expect(proponiSlot('Spuntino ore 17', casa)).toBe('sp-pom');
    expect(proponiSlot('Spuntino h 10', casa)).toBe('sp-mat');
  });

  it('merenda, mattutino e pomeridiano', () => {
    expect(proponiSlot('Merenda', casa)).toBe('sp-pom');
    expect(proponiSlot('Spuntino pomeridiano', casa)).toBe('sp-pom');
    expect(proponiSlot('Spuntino mattutino', casa)).toBe('sp-mat');
  });

  it('senza orario né parola chiave, la posizione nel giorno; a pari merito la regola di prima', () => {
    expect(proponiSlot('Spuntino', casa, 'dopo')).toBe('sp-pom');
    expect(proponiSlot('Spuntino', casa, 'prima')).toBe('sp-mat');
    expect(proponiSlot('Spuntino', casa, null)).toBe('sp-mat');
    expect(proponiSlot('Spuntino', casa)).toBe('sp-mat');
  });

  it('con un solo slot di spuntino, quello (come prima)', () => {
    const defs = [slot('s', 'Spuntino', 1), slot('p', 'Pranzo', 2)];
    expect(proponiSlot('Spuntino 17:30', defs)).toBe('s');
  });
});

describe('mappaturaPastiIniziale: la posizione dello spuntino nel piano (correzione 8c-bis D)', () => {
  const slot = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: Array(7).fill(false) });
  const casa = [slot('pranzo', 'Pranzo', 2), slot('sp-mat', 'Spuntino mattina', 1), slot('sp-pom', 'Spuntino pomeriggio', 3)];
  const pasto = (nomeOriginale: string) => ({ nomeOriginale, piatti: [{ nome: 'x', descrizione: null, componenti: [], righeFisse: [] }] });
  const piano = (giorni: string[][]): PianoEstratto => ({
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{ numero: 1, giorni: giorni.map((nomi, giorno) => ({ giorno, titolo: null, pasti: nomi.map(pasto) })) }],
  });

  it('lo spuntino dopo il pranzo, senza orario, va al pomeriggio', () => {
    expect(mappaturaPastiIniziale(piano([['pranzo', 'spuntino'], ['pranzo', 'spuntino']]), casa)).toEqual({ pranzo: 'pranzo', spuntino: 'sp-pom' });
  });

  it('lo spuntino prima del pranzo va alla mattina', () => {
    expect(mappaturaPastiIniziale(piano([['spuntino', 'pranzo']]), casa)).toEqual({ pranzo: 'pranzo', spuntino: 'sp-mat' });
  });

  it('a maggioranza sui giorni in cui compaiono entrambi', () => {
    expect(mappaturaPastiIniziale(piano([['spuntino', 'pranzo'], ['pranzo', 'spuntino'], ['pranzo', 'spuntino'], ['spuntino']]), casa)).toMatchObject({ spuntino: 'sp-pom' });
  });

  it('con l\'orario nel nome vince l\'orario, qualunque sia la posizione', () => {
    expect(mappaturaPastiIniziale(piano([['spuntino 10:30', 'pranzo']]), casa)).toMatchObject({ 'spuntino 10:30': 'sp-mat' });
    expect(mappaturaPastiIniziale(piano([['spuntino 17:30', 'pranzo']]), casa)).toMatchObject({ 'spuntino 17:30': 'sp-pom' });
  });

  it('le posizioni medie nel giorno, per nome di pasto', () => {
    const medie = posizioniMedieNelGiorno(piano([['colazione', 'pranzo'], ['pranzo', 'cena']]));
    expect(medie.get('colazione')).toBe(0);
    expect(medie.get('pranzo')).toBe(0.5);
    expect(medie.get('cena')).toBe(1);
  });

  it('ordinaPastiPerSlot: per posizione dello slot, a pari slot per posizione media, senza slot in fondo', () => {
    const voci = [
      { chiave: 'a', slotDefId: 'cena' }, { chiave: 'b', slotDefId: null }, { chiave: 'c', slotDefId: 'colazione' },
      { chiave: 'd', slotDefId: 'cena' }, { chiave: 'e', slotDefId: null },
    ];
    const defs = [slot('colazione', 'Colazione', 0), slot('cena', 'Cena', 4)];
    const medie = new Map([['a', 3], ['d', 2]]);
    expect(ordinaPastiPerSlot(voci, defs, medie).map((v) => v.chiave)).toEqual(['c', 'd', 'a', 'b', 'e']);
  });
});

describe('statoRevisioneIniziale (spec 8c §E)', () => {
  const slot = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: Array(7).fill(false) });

  it('Controlla, con uno slot proposto per nome di pasto; condimenti e nomi ignoti restano fuori', () => {
    expect(statoRevisioneIniziale(PIANO_MENU_SETTIMANALE, [slot('s-col', 'Colazione', 0), slot('s-cena', 'Cena', 5)])).toEqual({
      passo: 'revisione', mappaturaPasti: { colazione: 's-col', cena: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
    });
  });
});
