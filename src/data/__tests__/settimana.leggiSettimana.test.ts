import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { leggiSettimana, leggiSettimanaCorrente } from '../settimana';

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura del query builder usata negli altri test data (vedi lista.chiudiSpesa.test.ts). */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const letture: Record<string, Chiamata[][]> = {};
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
        (letture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    letture,
  };
}

function risolviCon(week: unknown) {
  return (tabella: string) => {
    if (tabella === 'week') return { data: week, error: null };
    if (tabella === 'meal_slot') return { data: [], error: null };
    return { data: null, error: null };
  };
}

describe('leggiSettimana', () => {
  beforeEach(() => vi.mocked(client).mockReset());
  afterEach(() => vi.useRealTimers());

  it('filtra la week sul lunedì passato, non su quello di oggi', async () => {
    const { sb, letture } = creaClientMock(
      risolviCon({ id: 'w-prec', data_inizio: '2026-08-17', stato: 'chiusa' }),
    );
    vi.mocked(client).mockReturnValue(sb as never);

    const s = await leggiSettimana('2026-08-17');

    expect(s).toEqual({ id: 'w-prec', dataInizio: '2026-08-17', stato: 'chiusa', slots: [] });
    const filtri = letture['week']![0]!.filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['data_inizio', '2026-08-17'] });
  });

  it('restituisce null se la settimana non esiste', async () => {
    const { sb } = creaClientMock(risolviCon(null));
    vi.mocked(client).mockReturnValue(sb as never);
    expect(await leggiSettimana('2026-08-17')).toBeNull();
  });

  it('leggiSettimanaCorrente delega col lunedì di oggi', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T10:00:00Z')); // mercoledì
    const { sb, letture } = creaClientMock(risolviCon(null));
    vi.mocked(client).mockReturnValue(sb as never);

    await leggiSettimanaCorrente();

    const filtri = letture['week']![0]!.filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['data_inizio', '2026-08-31'] });
  });
});
