import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient, MealSlot, StatoSlot } from '../types';
import { consumoSlot, deltaStorno } from '../storno';
import { IngredienteMancanteError } from '../list-builder';

const ING_POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000,
};
const ING_RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
};
const ING_OLIO: Ingredient = {
  id: 'i-olio', nome: 'Olio', unitaBase: 'ml', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000,
};
const ING_UOVA: Ingredient = {
  id: 'i-uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 6,
};
const INGREDIENTI = [ING_POLLO, ING_RISO, ING_OLIO, ING_UOVA];

const POLLO_E_RISO: Dish = {
  id: 'd-1', nome: 'Pollo e riso', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-pollo', quantita: 200, unita: 'g' },
    { ingredientId: 'i-riso', quantita: 0.08, unita: 'kg' },
    { ingredientId: 'i-olio', quantita: 10, unita: 'ml' },
  ],
  componenti: [],
};

const CON_COMPONENTE: Dish = {
  id: 'd-2', nome: 'Piatto con contorno', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-pollo', quantita: 150, unita: 'g' }],
  componenti: [{
    id: 'c-contorno', nome: 'contorno',
    opzioni: [
      { id: 'o-riso', righe: [{ ingredientId: 'i-riso', quantita: 80, unita: 'g' }] },
      { id: 'o-uova', righe: [{ ingredientId: 'i-uova', quantita: 2, unita: 'pz' }] },
    ],
  }],
};

function slot(stato: StatoSlot, dishId: string | null, scelte: MealSlot['scelte'] = {}): MealSlot {
  return {
    id: 's-1', data: '2026-08-26', slotDefId: 'sd-cena', stato, dishId, fonteStato: 'checkin', scelte,
    porzioniPreparate: 0, daPronti: false,
  };
}

describe('consumoSlot', () => {
  it('somma le righe in unità base col moltiplicatore, escludendo la classe stima', () => {
    const c = consumoSlot({
      slot: slot('casa', 'd-1'), dish: POLLO_E_RISO,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 2,
    });
    expect(c.get('i-pollo')).toBe(400);
    expect(c.get('i-riso')).toBe(160); // 0.08 kg → 80 g, ×2
    expect(c.has('i-olio')).toBe(false); // stima: nessuna aritmetica (regola 7)
  });

  it('uno slot che non è a casa non consuma nulla, qualunque sia lo stato', () => {
    for (const stato of ['fuori', 'saltato', 'sostituito'] as const) {
      const c = consumoSlot({
        slot: slot(stato, 'd-1'), dish: POLLO_E_RISO,
        ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
      });
      expect(c.size).toBe(0);
    }
  });

  it('senza piatto non consuma nulla', () => {
    const c = consumoSlot({
      slot: slot('casa', null), dish: null,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(c.size).toBe(0);
  });

  it('rispetta la scelta del componente; scelta assente = prima opzione', () => {
    const conScelta = consumoSlot({
      slot: slot('casa', 'd-2', { 'c-contorno': { opzioneId: 'o-uova', fonte: 'manuale' } }),
      dish: CON_COMPONENTE, ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(conScelta.get('i-uova')).toBe(2);
    expect(conScelta.has('i-riso')).toBe(false);

    const senzaScelta = consumoSlot({
      slot: slot('casa', 'd-2'), dish: CON_COMPONENTE,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(senzaScelta.get('i-riso')).toBe(80);
    expect(senzaScelta.has('i-uova')).toBe(false);
  });

  it('un ingrediente citato dal piatto ma assente dal repertorio esplode', () => {
    expect(() => consumoSlot({
      slot: slot('casa', 'd-1'), dish: POLLO_E_RISO,
      ingredients: [ING_RISO, ING_OLIO], moltiplicatorePorzioni: 1,
    })).toThrow(IngredienteMancanteError);
  });

  it('le porzioni preparate moltiplicano il consumo; daPronti lo azzera', () => {
    const base = { dish: POLLO_E_RISO, ingredients: INGREDIENTI, moltiplicatorePorzioni: 1 };
    const doppio = consumoSlot({ slot: { ...slot('casa', 'd-1'), porzioniPreparate: 2 }, ...base });
    expect(doppio.get('i-pollo')).toBe(600); // (1 + 2) × 200

    const daPronti = consumoSlot({ slot: { ...slot('casa', 'd-1'), daPronti: true }, ...base });
    expect(daPronti.size).toBe(0);

    const cucinatoNonMangiato = consumoSlot({ slot: { ...slot('saltato', 'd-1'), porzioniPreparate: 1 }, ...base });
    expect(cucinatoNonMangiato.get('i-pollo')).toBe(200); // 0 mangiate + 1 preparata
  });
});

describe('deltaStorno', () => {
  it('prima − dopo per ingrediente; le voci a delta zero non compaiono', () => {
    const prima = new Map([['a', 100], ['b', 50]]);
    const dopo = new Map([['b', 50], ['c', 30]]);
    const deltas = deltaStorno(prima, dopo);
    expect(deltas).toHaveLength(2);
    expect(deltas.find((d) => d.ingredientId === 'a')).toEqual({ ingredientId: 'a', delta: 100 });
    expect(deltas.find((d) => d.ingredientId === 'c')).toEqual({ ingredientId: 'c', delta: -30 });
  });

  it('telescopio: una sequenza di mutazioni che torna al punto di partenza somma a zero', () => {
    const base = { ingredients: INGREDIENTI, moltiplicatorePorzioni: 1 };
    // casa d-1 → saltato → casa d-2 → casa d-1: il cammino torna all'origine.
    const stati = [
      consumoSlot({ slot: slot('casa', 'd-1'), dish: POLLO_E_RISO, ...base }),
      consumoSlot({ slot: slot('saltato', 'd-1'), dish: POLLO_E_RISO, ...base }),
      consumoSlot({ slot: slot('casa', 'd-2'), dish: CON_COMPONENTE, ...base }),
      consumoSlot({ slot: slot('casa', 'd-1'), dish: POLLO_E_RISO, ...base }),
    ];
    const somme = new Map<string, number>();
    for (let i = 1; i < stati.length; i++) {
      for (const d of deltaStorno(stati[i - 1], stati[i])) {
        somme.set(d.ingredientId, (somme.get(d.ingredientId) ?? 0) + d.delta);
      }
    }
    for (const v of somme.values()) expect(v).toBe(0);
  });
});
