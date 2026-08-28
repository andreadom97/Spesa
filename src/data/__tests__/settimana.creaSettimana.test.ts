import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn() }));

import { client } from '../supabase';
import { leggiSlotDefs } from '../impostazioni';
import { leggiRepertorio } from '../repertorio';
import { creaSettimana } from '../settimana';

interface Chiamata { metodo: string; args: unknown[] }

function creaClientMock() {
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
      insert: registra('insert'),
      single: () => proxy,
      then(onFulfilled: (v: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve({ data: { id: 'week-1' }, error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }

  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

describe('creaSettimana — guard su pasti non configurati (C3)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotDefs).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
  });

  it('senza meal_slot_def non crea la settimana e lancia un errore chiaro', async () => {
    const { sb, scritture } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([]);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);

    await expect(creaSettimana('2026-08-31')).rejects.toThrow(/pasti/i);

    // Nessun insert su week: una settimana vuota che non si rigenera (l'unique
    // su data_inizio blocca un secondo tentativo) è peggio di nessuna settimana.
    expect(scritture['week']).toBeUndefined();
  });
});
