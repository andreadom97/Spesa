import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { leggiPronti, correggiLotto, impostaCongelatoLotto, eliminaLotto } from '../pronti';

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

function chiamateDi(scritture: Record<string, Chiamata[][]>, tabella: string, metodo: string) {
  return (scritture[tabella] ?? []).flat().filter((c) => c.metodo === metodo);
}

describe('data/pronti', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('leggiPronti mappa le righe in LottoPronto, ordinate per preparata_il', async () => {
    const { sb, scritture } = creaClientMock((t) => t === 'porzione_pronta'
      ? { data: [{ id: 'l-1', dish_id: 'd-1', porzioni: '2', congelato: false, preparata_il: '2026-08-28', meal_slot_id: null }], error: null }
      : { data: null, error: null });
    vi.mocked(client).mockReturnValue(sb as never);

    const lotti = await leggiPronti();

    expect(lotti).toEqual([{ id: 'l-1', dishId: 'd-1', porzioni: 2, congelato: false, preparataIl: '2026-08-28', mealSlotId: null }]);
    const ordini = chiamateDi(scritture, 'porzione_pronta', 'order');
    expect(ordini[0]!.args[0]).toBe('preparata_il');
  });

  it('correggiLotto aggiorna le porzioni; a zero o meno cancella la riga', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiLotto('l-1', 3);
    expect(chiamateDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ porzioni: 3 });

    await correggiLotto('l-1', 0);
    expect(chiamateDi(scritture, 'porzione_pronta', 'delete')).toHaveLength(1);
  });

  it('impostaCongelatoLotto ed eliminaLotto filtrano per id e user_id', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await impostaCongelatoLotto('l-1', true);
    await eliminaLotto('l-2');

    expect(chiamateDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ congelato: true });
    const filtri = (scritture['porzione_pronta'] ?? []).flat().filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
  });
});
