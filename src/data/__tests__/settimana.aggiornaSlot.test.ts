import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import type { Dish, Ingredient } from '@/domain/types';
import { client } from '../supabase';
import { leggiImpostazioni } from '../impostazioni';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { aggiornaSlot } from '../settimana';

interface Chiamata { metodo: string; args: unknown[] }

function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const scritture: Record<string, Chiamata[][]> = {};
  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'), eq: registra('eq'), in: registra('in'),
      update: registra('update'), insert: registra('insert'), upsert: registra('upsert'),
      delete: registra('delete'), order: registra('order'),
      returns: () => proxy, single: () => proxy, maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

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

const DISH_POLLO: Dish = {
  id: 'd-1', nome: 'Pollo', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-pollo', quantita: 200, unita: 'g' },
    { ingredientId: 'i-olio', quantita: 10, unita: 'ml' },
  ],
  componenti: [],
};
const DISH_RISO: Dish = {
  id: 'd-2', nome: 'Riso', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-riso', quantita: 100, unita: 'g' }],
  componenti: [],
};

function rigaSlot(stato: string, dishId: string | null = 'd-1') {
  return {
    id: 's-1', user_id: 'user-1', week_id: 'w-1', data: '2026-08-26',
    slot_def_id: 'sd-1', stato, dish_id: dishId, fonte_stato: 'default',
    meal_slot_choice: [],
  };
}

/** Come rigaSlot, ma con righe di meal_slot_choice embedded (piatto a componenti). */
function rigaSlotConScelta(
  stato: string,
  dishId: string,
  scelte: Array<{ componente_id: string; option_id: string; fonte: string }>,
) {
  return { ...rigaSlot(stato, dishId), meal_slot_choice: scelte };
}

/**
 * Un piatto a un componente con due opzioni su ingredienti diversi.
 * L'opzione di default (indice 0, `opt-riso`) è DIVERSA da quella che i test
 * registrano in `meal_slot_choice` (`opt-pollo`, indice 1): se la
 * ricostruzione di `attuale.scelte` dalle righe embedded si rompe (torna
 * `{}` invece della scelta vera), `righeEffettive` cade sul default e il
 * test lo scopre — i delta calcolati sarebbero su `i-riso`, non su `i-pollo`.
 */
const DISH_COMPONENTI: Dish = {
  id: 'd-3', nome: 'A scelta', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [
    {
      id: 'comp1', nome: 'Proteina',
      opzioni: [
        { id: 'opt-riso', righe: [{ ingredientId: 'i-riso', quantita: 80, unita: 'g' }] },
        { id: 'opt-pollo', righe: [{ ingredientId: 'i-pollo', quantita: 150, unita: 'g' }] },
      ],
    },
  ],
};

/**
 * Risolutore standard: slot come da `riga`, week con lo stato dato, ledger
 * esistente come da `ledger`, pantry_state con le righe date. Le scritture
 * (upsert/delete/update/insert) rispondono sempre { error: null }.
 */
function risolutore(opts: {
  riga: Record<string, unknown>;
  statoWeek: string;
  ledger?: Array<{ ingredient_id: string; delta: number }>;
  pantry?: Array<{ ingredient_id: string; residuo: number }>;
}) {
  return (tabella: string, chiamate: Chiamata[]) => {
    const legge = chiamate.some((c) => c.metodo === 'select');
    if (tabella === 'meal_slot' && legge) return { data: opts.riga, error: null };
    if (tabella === 'week' && legge) return { data: { stato: opts.statoWeek }, error: null };
    if (tabella === 'meal_slot_storno' && legge) return { data: opts.ledger ?? [], error: null };
    if (tabella === 'pantry_state' && legge) return { data: opts.pantry ?? [], error: null };
    return { data: null, error: null };
  };
}

function scrittureDi(scritture: Record<string, Chiamata[][]>, tabella: string, metodo: string) {
  return (scritture[tabella] ?? []).flat().filter((c) => c.metodo === metodo);
}

describe('aggiornaSlot e il ledger degli storni', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
      settimaneCiclo: 1, cicloOrigine: null,
    });
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_POLLO, DISH_RISO]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_POLLO, ING_RISO, ING_OLIO]);
  });

  it('a settimana bozza non tocca né ledger né pantry', async () => {
    const { sb, scritture } = creaClientMock(risolutore({ riga: rigaSlot('casa'), statoWeek: 'bozza' }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'checkin');

    expect(scritture['meal_slot_storno']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('casa→saltato a settimana confermata: riaccredito nel ledger e nel residuo, la classe stima esclusa', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa'), statoWeek: 'confermata',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'checkin');

    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    expect(ledger).toHaveLength(1); // solo il pollo: l'olio è classe stima
    expect(ledger[0]!.args[0]).toMatchObject({ meal_slot_id: 's-1', ingredient_id: 'i-pollo', delta: 200 });

    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    expect(pantry).toHaveLength(1);
    expect(pantry[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 240 });
  });

  it('saltato→casa inverte: cumulo a zero cancella la riga di ledger, il residuo scende clampato', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('saltato'), statoWeek: 'chiusa',
      ledger: [{ ingredient_id: 'i-pollo', delta: 200 }],
      pantry: [{ ingredient_id: 'i-pollo', residuo: 150 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'casa' }, 'checkin');

    expect(scrittureDi(scritture, 'meal_slot_storno', 'delete')).toHaveLength(1);
    expect(scrittureDi(scritture, 'meal_slot_storno', 'upsert')).toHaveLength(0);
    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    // 150 − 200 clampato a 0: il ledger registra il calcolato, l'applicazione clampa.
    expect(pantry[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 0 });
  });

  it('cambio piatto: storna il vecchio e addebita il nuovo', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa', 'd-1'), statoWeek: 'chiusa',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { dishId: 'd-2' }, 'checkin');

    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    const perIngrediente = new Map(ledger.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.delta];
    }));
    expect(perIngrediente.get('i-pollo')).toBe(200); // storno del piatto vecchio
    expect(perIngrediente.get('i-riso')).toBe(-100); // addebito del nuovo

    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    const residui = new Map(pantry.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.residuo];
    }));
    expect(residui.get('i-pollo')).toBe(240);
    expect(residui.get('i-riso')).toBe(0); // nessuna riga pantry: 0 − 100 clampato
  });

  it('piatto a componenti: la scelta registrata in meal_slot_choice viene stornata, quella nuova del patch viene addebitata', async () => {
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COMPONENTI]);
    const riga = rigaSlotConScelta('casa', 'd-3', [
      { componente_id: 'comp1', option_id: 'opt-pollo', fonte: 'manuale' },
    ]);
    const { sb, scritture } = creaClientMock(risolutore({
      riga, statoWeek: 'confermata',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { scelte: { comp1: { opzioneId: 'opt-riso', fonte: 'manuale' } } }, 'checkin');

    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    const perIngrediente = new Map(ledger.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.delta];
    }));
    // Se attuale.scelte non fosse ricostruita dalle righe embedded, il "prima"
    // cadrebbe già sul default (opt-riso) e questi due delta sparirebbero.
    expect(perIngrediente.get('i-pollo')).toBe(150); // storno dell'opzione registrata (opt-pollo)
    expect(perIngrediente.get('i-riso')).toBe(-80); // addebito della nuova opzione dal patch (opt-riso)

    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    const residui = new Map(pantry.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.residuo];
    }));
    expect(residui.get('i-pollo')).toBe(190); // 40 + 150
    expect(residui.get('i-riso')).toBe(0); // nessuna riga pantry: 0 − 80 clampato
  });

  it('una fonte troppo debole non cambia lo stato, quindi niente storno', async () => {
    const riga = { ...rigaSlot('casa'), fonte_stato: 'checkin' };
    const { sb, scritture } = creaClientMock(risolutore({ riga, statoWeek: 'confermata' }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'default');

    expect(scritture['meal_slot_storno']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });
});
