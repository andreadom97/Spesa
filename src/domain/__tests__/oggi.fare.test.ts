import { describe, it, expect } from 'vitest';
import type { AreaId, Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, PantryState } from '../types';
import type { AvvisoScadenza } from '../scadenza';
import { daFare, inScadenzaEntro } from '../oggi';

const OGGI = '2026-10-03';
const DOMANI = '2026-10-04';
const A = [false, false, false, false, false, false, false];
const DEFS: MealSlotDef[] = [
  { id: 'pra', nome: 'Pranzo', posizione: 0, assenzeAbituali: A },
  { id: 'cen', nome: 'Cena', posizione: 1, assenzeAbituali: A },
];
const ing = (id: string, nome: string, area: AreaId): Ingredient => ({
  id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: true,
  formatoConfezione: 200, prezzoConfezione: null, ean: null,
});
const FETA = ing('feta', 'Feta', 'latticini');
const RICOTTA = ing('ricotta', 'Ricotta', 'latticini');
const MOZZA = ing('mozza', 'Mozzarella', 'latticini');
const MERLUZZO = ing('merluzzo', 'Merluzzo', 'macelleria');
const piatto = (id: string, nome: string, righe: [Ingredient, number][]): Dish => ({
  id, nome, slotDefId: 'pra', fonte: 'proprio', attivo: true, descrizione: null,
  settimanaCiclo: null, giornoCiclo: null,
  ingredienti: righe.map(([i, q]) => ({ ingredientId: i.id, quantita: q, unita: 'g' as const })), componenti: [],
});
const FARRO = piatto('d-farro', 'Farro con feta', [[FETA, 50]]);
const PESCE = piatto('d-pesce', 'Merluzzo in padella', [[MERLUZZO, 200]]);
const ZUPPA = piatto('d-zuppa', 'Zuppa di lenticchie', []);
const PASTA = piatto('d-pasta', 'Pasta e ceci', []);
const slot = (id: string, data: string, slotDefId: string, extra: Partial<MealSlot> = {}): MealSlot => ({
  id, data, slotDefId, stato: 'casa', dishId: null, fonteStato: 'default', scelte: {},
  porzioniPreparate: 0, daPronti: false, ...extra,
});
const avviso = (i: Ingredient, scadenza: string): AvvisoScadenza => ({
  ingredientId: i.id, nome: i.nome, scadenza, pastiDopo: [], usatoInTempo: false,
});
const lotto = (id: string, dishId: string, preparataIl: string, porzioni: number, congelato = false): LottoPronto => ({
  id, dishId, porzioni, congelato, preparataIl, mealSlotId: null,
});
const pantry = (i: Ingredient, extra: Partial<PantryState> = {}): PantryState => ({
  ingredientId: i.id, residuo: 200, ultimoAcquisto: '2026-10-01', giorniStimati: 90,
  congelato: false, scadenzaManuale: null, ultimoCheck: null, ...extra,
});
const base = {
  avvisi: [] as AvvisoScadenza[], slots: [] as MealSlot[], defs: DEFS,
  dishes: [FARRO, PESCE, ZUPPA, PASTA], ingredients: [FETA, RICOTTA, MOZZA, MERLUZZO],
  pantry: [] as PantryState[], lotti: [] as LottoPronto[], oggi: OGGI, minuti: 18 * 60 + 10,
};

describe('inScadenzaEntro', () => {
  it('fino a oggi + 2', () => {
    const s = inScadenzaEntro([avviso(FETA, '2026-10-05'), avviso(RICOTTA, '2026-10-06')], OGGI);
    expect([...s]).toEqual(['feta']);
  });
});

describe('daFare: scade presto (spec §D.1)', () => {
  it('entro due giorni, al massimo 2, i più vicini, col primo pasto che lo usa in tempo', () => {
    const r = daFare({
      ...base,
      avvisi: [avviso(MOZZA, '2026-10-03'), avviso(FETA, '2026-10-05'), avviso(RICOTTA, '2026-10-04'), avviso(MERLUZZO, '2026-10-09')],
      slots: [
        // Il pranzo di oggi è già passato alle 18:10: non conta come uso.
        slot('s1', OGGI, 'pra', { dishId: 'd-farro' }),
        slot('s2', DOMANI, 'pra', { dishId: 'd-farro' }),
      ],
    });
    expect(r.scade.map((x) => [x.ingrediente.id, x.scadenza, x.uso])).toEqual([
      ['mozza', '2026-10-03', null],
      ['ricotta', '2026-10-04', null],
    ]);
    const conFeta = daFare({ ...base, avvisi: [avviso(FETA, '2026-10-05')], slots: [slot('s1', OGGI, 'pra', { dishId: 'd-farro' }), slot('s2', DOMANI, 'pra', { dishId: 'd-farro' })] });
    expect(conFeta.scade[0].uso).toEqual({ data: DOMANI, slotDefId: 'pra' });
  });
  it('un pasto dopo la scadenza non è un uso in tempo', () => {
    const r = daFare({ ...base, avvisi: [avviso(FETA, OGGI)], slots: [slot('s2', DOMANI, 'pra', { dishId: 'd-farro' })] });
    expect(r.scade[0].uso).toBeNull();
  });
});

describe('daFare: da scongelare (spec §D.2)', () => {
  it('il lotto in congelatore di un pasto dai Pronti di domani', () => {
    const r = daFare({
      ...base,
      slots: [slot('s', DOMANI, 'cen', { dishId: 'd-zuppa', daPronti: true })],
      lotti: [lotto('l1', 'd-zuppa', '2026-09-20', 2, true)],
    });
    expect(r.scongela).toEqual([{ tipo: 'lotto', lotto: lotto('l1', 'd-zuppa', '2026-09-20', 2, true), dish: ZUPPA, slotDefId: 'cen' }]);
  });
  it('lo stesso lotto per due pasti di domani, una tessera sola', () => {
    const r = daFare({
      ...base,
      slots: [
        slot('a', DOMANI, 'pra', { dishId: 'd-zuppa', daPronti: true }),
        slot('b', DOMANI, 'cen', { dishId: 'd-zuppa', daPronti: true }),
      ],
      lotti: [lotto('l1', 'd-zuppa', '2026-09-20', 2, true)],
    });
    expect(r.scongela).toEqual([{ tipo: 'lotto', lotto: lotto('l1', 'd-zuppa', '2026-09-20', 2, true), dish: ZUPPA, slotDefId: 'pra' }]);
  });
  it('l\'ingrediente in congelatore che un pasto a casa di domani usa, una volta sola', () => {
    const r = daFare({
      ...base,
      pantry: [pantry(MERLUZZO, { congelato: true })],
      slots: [slot('a', DOMANI, 'pra', { dishId: 'd-pesce' }), slot('b', DOMANI, 'cen', { dishId: 'd-pesce' })],
    });
    expect(r.scongela).toEqual([{ tipo: 'ingrediente', ingrediente: MERLUZZO, slotDefId: 'pra' }]);
  });
  it('niente se non è in congelatore, o se il pasto è oggi', () => {
    expect(daFare({ ...base, pantry: [pantry(MERLUZZO)], slots: [slot('a', DOMANI, 'pra', { dishId: 'd-pesce' })] }).scongela).toEqual([]);
    expect(daFare({ ...base, pantry: [pantry(MERLUZZO, { congelato: true })], slots: [slot('a', OGGI, 'cen', { dishId: 'd-pesce' })] }).scongela).toEqual([]);
  });
});

describe('daFare: Pronti (spec §D.3)', () => {
  it('per piatto: utilizzabili meno impegni, prima il lotto vivo più vecchio', () => {
    const r = daFare({
      ...base,
      lotti: [
        lotto('a1', 'd-pasta', '2026-10-02', 2),
        lotto('a2', 'd-pasta', '2026-10-01', 1),
        lotto('scaduto', 'd-zuppa', '2026-09-27', 3),
        lotto('c1', 'd-farro', '2026-09-01', 1, true),
      ],
      slots: [slot('s', DOMANI, 'cen', { dishId: 'd-pasta', daPronti: true })],
    });
    expect(r.pronti.map((x) => [x.dish.id, x.libere, x.congelato, x.lottoDaAprire.id])).toEqual([
      ['d-farro', 1, true, 'c1'],
      ['d-pasta', 2, false, 'a2'],
    ]);
  });
  it('un piatto con tutte le porzioni promesse non compare', () => {
    const r = daFare({
      ...base,
      lotti: [lotto('a1', 'd-pasta', '2026-10-02', 1)],
      slots: [slot('s', DOMANI, 'cen', { dishId: 'd-pasta', daPronti: true })],
    });
    expect(r.pronti).toEqual([]);
  });
});

describe('daFare: un piatto che non si legge non lo rompe', () => {
  it('la scelta punta a un\'opzione rimossa: niente uso, niente scongela, il resto resta', () => {
    const rotto: Dish = {
      ...piatto('d-rotto', 'Piatto rotto', [[FETA, 50]]),
      componenti: [{ id: 'c1', nome: 'pane', opzioni: [{ id: 'o1', righe: [{ ingredientId: 'merluzzo', quantita: 70, unita: 'g' }] }] }],
    };
    const r = daFare({
      ...base,
      dishes: [...base.dishes, rotto],
      avvisi: [avviso(FETA, '2026-10-05')],
      pantry: [pantry(MERLUZZO, { congelato: true })],
      slots: [slot('s', DOMANI, 'pra', { dishId: 'd-rotto', scelte: { c1: { opzioneId: 'o-rimossa', fonte: 'manuale' } } })],
      lotti: [lotto('a1', 'd-pasta', '2026-10-02', 2)],
    });
    expect(r.scade.map((x) => [x.ingrediente.id, x.uso])).toEqual([['feta', null]]);
    expect(r.scongela).toEqual([]);
    expect(r.pronti.map((x) => x.dish.id)).toEqual(['d-pasta']);
  });
});
