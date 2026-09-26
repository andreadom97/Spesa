import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { leggiTutteLeSettimane } from '../settimana';

beforeEach(() => {
  vi.mocked(client).mockReset();
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura del query builder degli altri test data, con `range`. */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const letture: Record<string, Chiamata[][]> = {};
  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'), eq: registra('eq'), order: registra('order'), range: registra('range'),
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (letture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return { sb: { from }, letture };
}

function rigaSlot(i: number, weekId: string) {
  return {
    id: `s-${String(i).padStart(5, '0')}`, week_id: weekId, data: '2026-09-21', slot_def_id: 'sd-1',
    stato: 'casa', dish_id: null, fonte_stato: 'default', porzioni_preparate: 0, da_pronti: false,
    meal_slot_choice: [],
  };
}

/**
 * Un database finto: le settimane, e le righe di meal_slot servite a pagine
 * secondo il `range` chiesto, con al più `tetto` righe per risposta (il
 * max-rows di PostgREST).
 */
function database(settimane: unknown[], slot: unknown[], tetto = 1000) {
  return (tabella: string, chiamate: Chiamata[]) => {
    if (tabella === 'week') return { data: settimane, error: null };
    if (tabella === 'meal_slot') {
      const range = chiamate.find((c) => c.metodo === 'range');
      const [da, a] = (range?.args ?? [0, slot.length - 1]) as [number, number];
      return { data: slot.slice(da, Math.min(a + 1, da + tetto)), error: null };
    }
    return { data: null, error: null };
  };
}

const SETTIMANE = [
  { id: 'w-1', data_inizio: '2026-09-14', stato: 'chiusa' },
  { id: 'w-2', data_inizio: '2026-09-21', stato: 'confermata' },
  { id: 'w-3', data_inizio: '2026-09-28', stato: 'bozza' },
];

describe('leggiTutteLeSettimane (spec fase 5 §E.3)', () => {
  it('legge settimane e pasti della casa, e raggruppa i pasti per settimana', async () => {
    const slot = [
      { ...rigaSlot(1, 'w-1'), meal_slot_choice: [{ componente_id: 'c-1', option_id: 'o-2', fonte: 'manuale' }] },
      rigaSlot(2, 'w-2'),
      rigaSlot(3, 'w-2'),
    ];
    const { sb, letture } = creaClientMock(database(SETTIMANE, slot));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano.map((s) => [s.lunedi, s.stato, s.pasti.length])).toEqual([
      ['2026-09-14', 'chiusa', 1],
      ['2026-09-21', 'confermata', 2],
      ['2026-09-28', 'bozza', 0],
    ]);
    expect(piano[0].pasti[0].scelte).toEqual({ 'c-1': { opzioneId: 'o-2', fonte: 'manuale' } });
    // Tutte e due le tabelle filtrate sull'id della casa, come leggiSettimana.
    expect(letture.week[0]).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
    // Le settimane in ordine di lunedì; i pasti in un ordine stabile, che serve alle pagine.
    expect(letture.week[0]).toContainEqual({ metodo: 'order', args: ['data_inizio'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'order', args: ['data'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'order', args: ['id'] });
  });

  it('oltre le mille righe legge a pagine, e il file non si tronca', async () => {
    const slot = Array.from({ length: 2345 }, (_, i) => rigaSlot(i, i < 1200 ? 'w-1' : 'w-2'));
    const { sb, letture } = creaClientMock(database(SETTIMANE, slot));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano.reduce((n, s) => n + s.pasti.length, 0)).toBe(2345);
    expect(piano[0].pasti).toHaveLength(1200);
    expect(piano[1].pasti).toHaveLength(1145);
    // Tre pagine piene o parziali, più quella vuota che chiude.
    expect(letture.meal_slot).toHaveLength(4);
  });

  it('regge un tetto del server più basso della pagina: va avanti di quanto riceve', async () => {
    const slot = Array.from({ length: 1300 }, (_, i) => rigaSlot(i, 'w-1'));
    const { sb } = creaClientMock(database(SETTIMANE, slot, 500));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano[0].pasti).toHaveLength(1300);
    expect(new Set(piano[0].pasti.map((p) => p.id)).size).toBe(1300); // nessun doppione
  });

  it('senza settimane torna un piano vuoto', async () => {
    const { sb } = creaClientMock(database([], []));
    vi.mocked(client).mockReturnValue(sb as never);
    expect(await leggiTutteLeSettimane()).toEqual([]);
  });

  it('un errore su una delle due tabelle passa a chi chiama', async () => {
    const errore = { message: 'rete' };
    const { sb } = creaClientMock((tabella) =>
      tabella === 'meal_slot' ? { data: null, error: errore } : { data: SETTIMANE, error: null });
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(leggiTutteLeSettimane()).rejects.toBe(errore);
  });
});
