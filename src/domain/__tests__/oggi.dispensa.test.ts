import { describe, it, expect } from 'vitest';
import type { AreaId, Dish, Ingredient, MealSlot, PantryState, UnitaMisura } from '../types';
import {
  alternative, dispensaAggiornata, ingredientePrincipale, type AlternativeInput,
} from '../oggi';

const OGGI = '2026-10-03';

// Non deperibili apposta: residuoUtilizzabile restituisce il residuo così com'è, e i test
// parlano solo di fattibilità, non di decadimento.
const ing = (id: string, nome: string, unitaBase: 'g' | 'ml' | 'pz', area: AreaId, extra: Partial<Ingredient> = {}): Ingredient => ({
  id, nome, unitaBase, area, classeResiduo: 'porzionabile', deperibile: false,
  formatoConfezione: 100, prezzoConfezione: null, ean: null, ...extra,
});
const PATATA = ing('patata', 'Patata', 'g', 'ortofrutta');
const UOVO = ing('uovo', 'Uovo', 'pz', 'latticini');
const CIPOLLA = ing('cipolla', 'Cipolla', 'g', 'ortofrutta');
const PANE = ing('pane', 'Pane', 'g', 'cereali');
const POMODORO = ing('pomodoro', 'Pomodoro', 'g', 'ortofrutta');
const CECI = ing('ceci', 'Ceci', 'g', 'dispensa');
const MERLUZZO = ing('merluzzo', 'Merluzzo', 'g', 'macelleria');
const LIMONE = ing('limone', 'Limone', 'pz', 'ortofrutta');
const OLIO = ing('olio', 'Olio', 'ml', 'dispensa', { classeResiduo: 'stima' });
const BASILICO = ing('basilico', 'Basilico', 'g', 'ortofrutta');
const SENZA_ICONA = ing('xyz', 'Xyzzy', 'g', 'dispensa');
const TUTTI = [PATATA, UOVO, CIPOLLA, PANE, POMODORO, CECI, MERLUZZO, LIMONE, OLIO, BASILICO, SENZA_ICONA];

const piatto = (id: string, nome: string, righe: [Ingredient, number | null, UnitaMisura][], extra: Partial<Dish> = {}): Dish => ({
  id, nome, slotDefId: 'cen', fonte: 'proprio', attivo: true, descrizione: null,
  settimanaCiclo: null, giornoCiclo: null,
  ingredienti: righe.map(([i, quantita, unita]) => ({ ingredientId: i.id, quantita, unita })),
  componenti: [], ...extra,
});
const POLPETTE = piatto('d-polpette', 'Polpette di ceci', [[CECI, 150, 'g'], [PANE, 70, 'g'], [UOVO, 1, 'pz'], [OLIO, 10, 'ml']]);
const FRITTATA = piatto('d-frittata', 'Frittata di patate', [[PATATA, 200, 'g'], [UOVO, 2, 'pz'], [CIPOLLA, 50, 'g'], [OLIO, 10, 'ml']]);
const UOVA_POM = piatto('d-uova', 'Uova al pomodoro', [[UOVO, 2, 'pz'], [POMODORO, 200, 'g'], [PANE, 70, 'g']]);
const MERLUZZO_D = piatto('d-merluzzo', 'Merluzzo al limone', [[MERLUZZO, 200, 'g'], [LIMONE, 1, 'pz']]);
const INSALATA = piatto('d-insalata', 'Insalata di pomodori', [[POMODORO, 150, 'g'], [BASILICO, null, 'g']]);

const p = (i: Ingredient, residuo: number): PantryState => ({
  ingredientId: i.id, residuo, ultimoAcquisto: '2026-10-01', giorniStimati: 90,
  congelato: false, scadenzaManuale: null, ultimoCheck: null,
});
const PANTRY = [p(PATATA, 500), p(UOVO, 4), p(CIPOLLA, 100), p(POMODORO, 300)];

const SLOT_CENA: MealSlot = {
  id: 's-cen', data: OGGI, slotDefId: 'cen', stato: 'casa', dishId: 'd-polpette',
  fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false,
};

const base = (extra: Partial<AlternativeInput> = {}): AlternativeInput => ({
  slot: SLOT_CENA, statoSettimana: 'confermata', slotsSettimana: [SLOT_CENA],
  dishes: [POLPETTE, FRITTATA, UOVA_POM, MERLUZZO_D, INSALATA], ingredients: TUTTI,
  pantry: PANTRY, persone: 1, oggi: OGGI, inScadenza: new Set(), ...extra,
});
const nomi = (r: ReturnType<typeof alternative>) => r.map((a) => [a.dish.id, a.stato.tipo === 'tutto' ? 'tutto' : a.stato.ingrediente.id]);

describe('dispensaAggiornata (spec §E)', () => {
  it('senza nessuna chiusura no', () => expect(dispensaAggiornata(null, OGGI)).toBe(false));
  it('fino a 9 giorni sì, da 10 no', () => {
    expect(dispensaAggiornata('2026-10-03', OGGI)).toBe(true);
    expect(dispensaAggiornata('2026-09-24', OGGI)).toBe(true);
    expect(dispensaAggiornata('2026-09-23', OGGI)).toBe(false);
  });
});

describe('ingredientePrincipale (spec §C.4)', () => {
  it('la riga più grande in g o ml con un\'icona; i pezzi non concorrono', () => {
    expect(ingredientePrincipale(FRITTATA, TUTTI)).toMatchObject({ ingrediente: { id: 'patata' }, icona: 'patata' });
  });
  it('a pari quantità vince la prima in ordine', () => {
    const d = piatto('d', 'x', [[POMODORO, 100, 'g'], [PATATA, 100, 'g']]);
    expect(ingredientePrincipale(d, TUTTI)?.ingrediente.id).toBe('pomodoro');
  });
  it('solo pezzi: la prima con un\'icona', () => {
    const d = piatto('d', 'x', [[UOVO, 2, 'pz'], [LIMONE, 1, 'pz']]);
    expect(ingredientePrincipale(d, TUTTI)?.ingrediente.id).toBe('uovo');
  });
  it('classe stima e righe q.b. non concorrono', () => {
    const d = piatto('d', 'x', [[OLIO, 500, 'ml'], [BASILICO, null, 'g'], [CECI, 100, 'g']]);
    expect(ingredientePrincipale(d, TUTTI)?.ingrediente.id).toBe('ceci');
  });
  it('nessuna icona: null', () => {
    expect(ingredientePrincipale(piatto('d', 'x', [[SENZA_ICONA, 100, 'g']]), TUTTI)).toBeNull();
  });
});

describe('alternative (spec §C)', () => {
  it('tutto in casa prima, poi manca una cosa; mancano due → fuori; tetto a 2', () => {
    // Frittata: tutto. Insalata: basilico q.b. a residuo 0 → manca. Uova al pomodoro: manca il
    // pane. Merluzzo: mancano due cose → fuori. «Insalata» viene prima di «Uova» per nome.
    expect(nomi(alternative(base()))).toEqual([['d-frittata', 'tutto'], ['d-insalata', 'basilico']]);
  });
  it('una riga q.b. è coperta se il residuo è più di 0', () => {
    const r = alternative(base({ pantry: [...PANTRY, p(BASILICO, 10)] }));
    expect(nomi(r)).toEqual([['d-frittata', 'tutto'], ['d-insalata', 'tutto']]);
  });
  it('a settimana chiusa lo scambio libera gli ingredienti del piatto di stasera', () => {
    const pantry = [p(UOVO, 1), p(POMODORO, 300), p(PANE, 100)];
    const dishes = [POLPETTE, UOVA_POM];
    expect(nomi(alternative(base({ pantry, dishes, statoSettimana: 'confermata' })))).toEqual([['d-uova', 'uovo']]);
    expect(nomi(alternative(base({ pantry, dishes, statoSettimana: 'chiusa' })))).toEqual([['d-uova', 'tutto']]);
  });
  it('le persone e le porzioni da preparare moltiplicano il fabbisogno', () => {
    const pantry = [p(PATATA, 300), p(UOVO, 4), p(CIPOLLA, 100)];
    const dishes = [POLPETTE, FRITTATA];
    expect(nomi(alternative(base({ pantry, dishes, persone: 2 })))).toEqual([['d-frittata', 'patata']]);
    const slot = { ...SLOT_CENA, porzioniPreparate: 1 };
    expect(nomi(alternative(base({ pantry, dishes, slot, slotsSettimana: [slot] })))).toEqual([['d-frittata', 'patata']]);
  });
  it('fuori: piatto spento, altro tipo di pasto, il piatto di stasera, già in programma da oggi in poi', () => {
    const spento = { ...FRITTATA, id: 'd-spento', nome: 'Spento', attivo: false };
    const pranzo = { ...FRITTATA, id: 'd-pranzo', nome: 'Pranzo', slotDefId: 'pra' };
    const domani: MealSlot = { ...SLOT_CENA, id: 's-dom', data: '2026-10-04', dishId: 'd-frittata' };
    const ieri: MealSlot = { ...SLOT_CENA, id: 's-ieri', data: '2026-10-02', dishId: 'd-insalata' };
    const r = alternative(base({
      dishes: [POLPETTE, FRITTATA, INSALATA, spento, pranzo],
      slotsSettimana: [SLOT_CENA, domani, ieri],
      pantry: [...PANTRY, p(BASILICO, 10)],
    }));
    expect(nomi(r)).toEqual([['d-insalata', 'tutto']]);
  });
  it('un pasto in programma ma fuori casa non esclude il piatto', () => {
    const fuori: MealSlot = { ...SLOT_CENA, id: 's-f', data: '2026-10-04', dishId: 'd-frittata', stato: 'fuori' };
    const r = alternative(base({ dishes: [POLPETTE, FRITTATA], slotsSettimana: [SLOT_CENA, fuori] }));
    expect(nomi(r)).toEqual([['d-frittata', 'tutto']]);
  });
  it('fra due «tutto in casa» viene prima chi usa qualcosa che scade', () => {
    const r = alternative(base({
      dishes: [POLPETTE, FRITTATA, INSALATA], pantry: [...PANTRY, p(BASILICO, 10)],
      inScadenza: new Set(['pomodoro']),
    }));
    expect(nomi(r)).toEqual([['d-insalata', 'tutto'], ['d-frittata', 'tutto']]);
  });
});
