import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiSlotDefs: vi.fn(), leggiImpostazioni: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { leggiImpostazioni } from '../impostazioni';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { leggiDispensa } from '../dispensa';
import { completaAssegnazioni } from '../settimana';
import type { Dish, Impostazioni } from '@/domain/types';

const ORDINE_AREE = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

const IMPOSTAZIONI: Impostazioni = {
  moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE], settimaneCiclo: 1, cicloOrigine: null,
};

function piatto(id: string, slotDefId: string, componenti: Dish['componenti'] = []): Dish {
  return {
    id, nome: id, slotDefId, fonte: 'proprio', attivo: true,
    descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [],
    componenti,
  };
}

/** Una riga di `meal_slot` come la restituisce Supabase (join con meal_slot_choice vuoto). */
function rigaSlot(id: string, data: string, slotDefId: string, stato: string, dishId: string | null) {
  return {
    id, data, slot_def_id: slotDefId, stato, dish_id: dishId, fonte_stato: 'default',
    porzioni_preparate: 0, da_pronti: false, meal_slot_choice: [],
  };
}

interface Chiamata { metodo: string; args: unknown[] }

/**
 * Controfigura del query builder (pattern di settimana.creaSettimana.test.ts):
 * `week` risponde con la settimana passata, `meal_slot` con le righe passate
 * alla lettura e con `data: null` alle scritture; ogni catena di chiamate
 * viene registrata per tabella così i test guardano cosa è stato scritto.
 */
function creaClientMock(week: { data_inizio: string; stato: string } | null, slots: unknown[]) {
  const scritture: Record<string, Chiamata[][]> = {};

  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'),
      eq: registra('eq'),
      order: registra('order'),
      update: registra('update'),
      insert: registra('insert'),
      upsert: registra('upsert'),
      single: () => proxy,
      maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        if (tabella === 'week') return Promise.resolve({ data: week, error: null }).then(onFulfilled);
        if (tabella === 'meal_slot' && chiamate.some((c) => c.metodo === 'select')) {
          return Promise.resolve({ data: slots, error: null }).then(onFulfilled);
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }

  return { sb: { from }, scritture };
}

/** Le catene su `meal_slot` che contengono un update, con il payload e gli eq. */
function updateMealSlot(scritture: Record<string, Chiamata[][]>) {
  return (scritture['meal_slot'] ?? [])
    .filter((chiamate) => chiamate.some((c) => c.metodo === 'update'))
    .map((chiamate) => ({
      payload: chiamate.find((c) => c.metodo === 'update')!.args[0] as Record<string, unknown>,
      eq: chiamate.filter((c) => c.metodo === 'eq').map((c) => c.args),
    }));
}

describe('completaAssegnazioni (B1: la settimana nata vuota si compila quando arrivano i piatti)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(idCasa).mockReset();
    vi.mocked(idCasa).mockResolvedValue('user-1');
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
    vi.mocked(leggiImpostazioni).mockResolvedValue(IMPOSTAZIONI);
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiDispensa).mockResolvedValue([]);
  });

  it('settimana bozza con due slot vuoti e un piatto per quel pasto: due update di dish_id, restituisce 2', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'bozza' }, [
      rigaSlot('slot-1', '2026-08-31', 'cen', 'casa', null),
      rigaSlot('slot-2', '2026-09-01', 'cen', 'casa', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 'cen')]);

    expect(await completaAssegnazioni('week-1')).toBe(2);

    const updates = updateMealSlot(scritture);
    expect(updates).toHaveLength(2);
    expect(updates[0].payload).toEqual({ dish_id: 's1' });
    expect(updates[0].eq).toContainEqual(['id', 'slot-1']);
    expect(updates[0].eq).toContainEqual(['user_id', 'user-1']);
    expect(updates[1].payload).toEqual({ dish_id: 's1' });
    expect(updates[1].eq).toContainEqual(['id', 'slot-2']);
    // Nessun componente a scelta: niente scritture su meal_slot_choice.
    expect(scritture['meal_slot_choice']).toBeUndefined();
  });

  it('le scelte del planner sui componenti del piatto assegnato finiscono in meal_slot_choice', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'bozza' }, [
      rigaSlot('slot-1', '2026-08-31', 'cen', 'casa', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([
      piatto('s1', 'cen', [{ id: 'comp1', nome: 'Farcitura', opzioni: [{ id: 'opt-scelta', righe: [] }] }]),
    ]);

    expect(await completaAssegnazioni('week-1')).toBe(1);

    const ups = scritture['meal_slot_choice'][0].find((c) => c.metodo === 'upsert')!;
    expect(ups.args[0]).toEqual([
      { user_id: 'user-1', meal_slot_id: 'slot-1', componente_id: 'comp1', option_id: 'opt-scelta', fonte: 'planner' },
    ]);
    expect(ups.args[1]).toEqual({ onConflict: 'meal_slot_id,componente_id' });
  });

  it('settimana confermata: 0 e nessuna scrittura, senza leggere il repertorio', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'confermata' }, [
      rigaSlot('slot-1', '2026-08-31', 'cen', 'casa', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 'cen')]);

    expect(await completaAssegnazioni('week-1')).toBe(0);

    expect(updateMealSlot(scritture)).toHaveLength(0);
    expect(scritture['meal_slot_choice']).toBeUndefined();
    expect(leggiRepertorio).not.toHaveBeenCalled();
  });

  it('nessuno slot vuoto: 0 senza leggere il repertorio', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'bozza' }, [
      rigaSlot('slot-1', '2026-08-31', 'cen', 'casa', 's1'),
      // Fuori casa senza piatto: non è uno slot da compilare.
      rigaSlot('slot-2', '2026-09-01', 'cen', 'fuori', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 'cen')]);

    expect(await completaAssegnazioni('week-1')).toBe(0);

    expect(updateMealSlot(scritture)).toHaveLength(0);
    expect(leggiRepertorio).not.toHaveBeenCalled();
  });

  it('uno slot con dishId già assegnato non viene toccato; si compila solo quello vuoto', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'bozza' }, [
      rigaSlot('slot-1', '2026-08-31', 'cen', 'casa', 's2'),
      rigaSlot('slot-2', '2026-09-01', 'cen', 'casa', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 'cen'), piatto('s2', 'cen')]);

    expect(await completaAssegnazioni('week-1')).toBe(1);

    const updates = updateMealSlot(scritture);
    expect(updates).toHaveLength(1);
    expect(updates[0].eq).toContainEqual(['id', 'slot-2']);
    expect(updates[0].eq).not.toContainEqual(['id', 'slot-1']);
  });

  it('slot vuoto ma nessun piatto per quel pasto nel repertorio: 0 e nessuna scrittura', async () => {
    const { sb, scritture } = creaClientMock({ data_inizio: '2026-08-31', stato: 'bozza' }, [
      rigaSlot('slot-1', '2026-08-31', 'col', 'casa', null),
    ]);
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 'cen')]);

    expect(await completaAssegnazioni('week-1')).toBe(0);
    expect(updateMealSlot(scritture)).toHaveLength(0);
  });

  it('settimana inesistente: 0', async () => {
    const { sb } = creaClientMock(null, []);
    vi.mocked(client).mockReturnValue(sb as never);
    expect(await completaAssegnazioni('week-x')).toBe(0);
  });
});
