import { describe, it, expect } from 'vitest';
import type { MealSlot, MealSlotDef } from '../types';
import { oggiLocale, fasceDi, prossimoPasto, pastoDopo, caselleGiornata } from '../oggi';

const A = [false, false, false, false, false, false, false];
const def = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: A });
// I sei pasti reali della casa di Andrea (produzione, 03/10).
const SEI = [
  def('col', 'Colazione', 0), def('spm', 'Spuntino mattina', 1), def('pra', 'Pranzo', 2),
  def('spp', 'Spuntino pomeriggio', 3), def('cen', 'Cena', 4), def('dop', 'Dopocena', 5),
];
const OGGI = '2026-10-03';
const DOMANI = '2026-10-04';
const min = (h: number, m = 0) => h * 60 + m;

function slot(data: string, slotDefId: string, extra: Partial<MealSlot> = {}): MealSlot {
  return {
    id: `${data}-${slotDefId}`, data, slotDefId, stato: 'casa', dishId: `d-${slotDefId}`,
    fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false, ...extra,
  };
}
const giornata = (data: string, extra: Record<string, Partial<MealSlot>> = {}) =>
  SEI.map((d) => slot(data, d.id, extra[d.id]));

describe('oggiLocale', () => {
  it('data e minuti dall\'orologio locale', () => {
    expect(oggiLocale(new Date(2026, 9, 3, 18, 10))).toEqual({ data: '2026-10-03', minuti: 1090 });
  });
  it('a mezzanotte e mezza è già il giorno dopo (non la data UTC)', () => {
    expect(oggiLocale(new Date(2026, 9, 4, 0, 30))).toEqual({ data: '2026-10-04', minuti: 30 });
  });
});

describe('fasceDi (spec §B.2)', () => {
  it('i sei nomi reali', () => {
    const f = fasceDi(SEI);
    expect(f.get('col')).toEqual({ inizio: 0, fine: min(10, 30) });
    expect(f.get('spm')).toEqual({ inizio: min(10, 30), fine: min(12) });
    expect(f.get('pra')).toEqual({ inizio: min(12), fine: min(15) });
    expect(f.get('spp')).toEqual({ inizio: min(15), fine: min(18) });
    expect(f.get('cen')).toEqual({ inizio: min(18), fine: min(21, 30) });
    expect(f.get('dop')).toEqual({ inizio: min(21, 30), fine: min(24) });
  });
  it('«Spuntino» da solo prima del pranzo è di mattina', () => {
    const f = fasceDi([def('a', 'Colazione', 0), def('b', 'Spuntino', 1), def('c', 'Pranzo', 2), def('d', 'Cena', 3)]);
    expect(f.get('b')).toEqual({ inizio: min(10, 30), fine: min(12) });
  });
  it('«Merenda» dopo il pranzo è di pomeriggio; senza pranzo è di mattina', () => {
    expect(fasceDi([def('p', 'Pranzo', 0), def('m', 'Merenda', 1)]).get('m')).toEqual({ inizio: min(15), fine: min(18) });
    expect(fasceDi([def('m', 'Merenda', 0), def('c', 'Cena', 1)]).get('m')).toEqual({ inizio: min(10, 30), fine: min(12) });
  });
  it('«Dopo cena» con lo spazio è il dopocena, non la cena', () => {
    expect(fasceDi([def('x', 'Dopo cena', 0)]).get('x')).toEqual({ inizio: min(21, 30), fine: min(24) });
  });
  it('un nome sconosciuto sta fra i vicini riconosciuti', () => {
    const f = fasceDi([def('a', 'Colazione', 0), def('b', 'Pranzo', 1), def('c', 'Allenamento', 2), def('d', 'Cena', 3)]);
    expect(f.get('c')).toEqual({ inizio: min(15), fine: min(18) });
  });
  it('un nome sconosciuto senza vicini copre il giorno', () => {
    expect(fasceDi([def('x', 'Pasto', 0)]).get('x')).toEqual({ inizio: 0, fine: min(24) });
  });
});

describe('prossimoPasto (spec §B.1)', () => {
  const base = { defs: SEI, slotsDomani: giornata(DOMANI) };
  it('alle 8 è la colazione di oggi', () => {
    const p = prossimoPasto({ ...base, slotsOggi: giornata(OGGI), minuti: min(8) });
    expect(p).toMatchObject({ tipo: 'pasto', giorno: 'oggi', slot: { slotDefId: 'col' } });
  });
  it('alle 10:45 lo spuntino senza piatto si salta: è il pranzo', () => {
    const p = prossimoPasto({ ...base, slotsOggi: giornata(OGGI, { spm: { dishId: null } }), minuti: min(10, 45) });
    expect(p).toMatchObject({ tipo: 'pasto', slot: { slotDefId: 'pra' } });
  });
  it('alle 12:30 col pranzo fuori è lo spuntino del pomeriggio', () => {
    const p = prossimoPasto({ ...base, slotsOggi: giornata(OGGI, { pra: { stato: 'fuori' } }), minuti: min(12, 30) });
    expect(p).toMatchObject({ tipo: 'pasto', slot: { slotDefId: 'spp' } });
  });
  it('alle 18:10 è la cena, alle 22 il dopocena', () => {
    expect(prossimoPasto({ ...base, slotsOggi: giornata(OGGI), minuti: min(18, 10) })).toMatchObject({ slot: { slotDefId: 'cen' } });
    expect(prossimoPasto({ ...base, slotsOggi: giornata(OGGI), minuti: min(22) })).toMatchObject({ slot: { slotDefId: 'dop' } });
  });
  it('alle 23:59 col dopocena saltato è la colazione di domani', () => {
    const p = prossimoPasto({ ...base, slotsOggi: giornata(OGGI, { dop: { stato: 'saltato' } }), minuti: min(23, 59) });
    expect(p).toMatchObject({ tipo: 'pasto', giorno: 'domani', slot: { data: DOMANI, slotDefId: 'col' } });
  });
  it('domani in una settimana non creata', () => {
    const p = prossimoPasto({ defs: SEI, slotsOggi: giornata(OGGI, { dop: { stato: 'fuori' } }), slotsDomani: null, minuti: min(23) });
    expect(p).toEqual({ tipo: 'domaniNonCreato' });
  });
  it('niente a casa con un piatto, oggi né domani', () => {
    const fuori = Object.fromEntries(SEI.map((d) => [d.id, { stato: 'fuori' as const }]));
    const p = prossimoPasto({ defs: SEI, slotsOggi: giornata(OGGI, fuori), slotsDomani: giornata(DOMANI, fuori), minuti: min(9) });
    expect(p).toEqual({ tipo: 'nessuno' });
  });
});

describe('pastoDopo (spec §D.4)', () => {
  const oggi = giornata(OGGI);
  const domani = giornata(DOMANI);
  const cena = oggi.find((s) => s.slotDefId === 'cen')!;
  const dop = oggi.find((s) => s.slotDefId === 'dop')!;
  it('dopo la cena viene il dopocena di oggi', () => {
    expect(pastoDopo({ dopo: { slot: cena, giorno: 'oggi' }, slotsOggi: oggi, slotsDomani: domani, defs: SEI }))
      .toMatchObject({ giorno: 'oggi', slot: { slotDefId: 'dop' } });
  });
  it('dopo il dopocena viene la colazione di domani', () => {
    expect(pastoDopo({ dopo: { slot: dop, giorno: 'oggi' }, slotsOggi: oggi, slotsDomani: domani, defs: SEI }))
      .toMatchObject({ giorno: 'domani', slot: { slotDefId: 'col' } });
  });
  it('dopo un pasto di domani resta dentro domani, e senza domani non c\'è niente', () => {
    const col = domani.find((s) => s.slotDefId === 'col')!;
    expect(pastoDopo({ dopo: { slot: col, giorno: 'domani' }, slotsOggi: oggi, slotsDomani: domani, defs: SEI }))
      .toMatchObject({ giorno: 'domani', slot: { slotDefId: 'spm' } });
    expect(pastoDopo({ dopo: { slot: dop, giorno: 'oggi' }, slotsOggi: oggi, slotsDomani: null, defs: SEI })).toBeNull();
  });
});

describe('caselleGiornata (spec §B.3)', () => {
  it('passate, poster, fuori e future, in ordine di posizione', () => {
    const oggi = giornata(OGGI, { pra: { stato: 'fuori' } });
    const poster = oggi.find((s) => s.slotDefId === 'cen')!;
    const c = caselleGiornata({ slots: oggi, defs: SEI, minuti: min(18, 10), slotPosterId: poster.id });
    expect(c.map((x) => x.stato)).toEqual(['passata', 'passata', 'fuori', 'passata', 'poster', 'futura']);
  });
  it('per domani nessuna casella è passata', () => {
    const domani = giornata(DOMANI);
    const c = caselleGiornata({ slots: domani, defs: SEI, minuti: null, slotPosterId: domani[0].id });
    expect(c.map((x) => x.stato)).toEqual(['poster', 'futura', 'futura', 'futura', 'futura', 'futura']);
  });
  it('un pasto senza slot nel giorno è futuro', () => {
    const c = caselleGiornata({ slots: [], defs: [def('a', 'Cena', 0)], minuti: min(8), slotPosterId: 'x' });
    expect(c).toEqual([{ slotDefId: 'a', stato: 'futura' }]);
  });
});
