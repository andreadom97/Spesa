import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { leggiUltimaChiusura } from '../dispensa';

/** Una catena finta che registra i metodi e si risolve con `risultato`. */
function catena(risultato: { data: unknown; error: unknown }) {
  const chiamate: { metodo: string; args: unknown[] }[] = [];
  const proxy: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'limit', 'maybeSingle']) {
    proxy[m] = (...args: unknown[]) => { chiamate.push({ metodo: m, args }); return proxy; };
  }
  proxy.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(risultato).then(ok, ko);
  return { from: vi.fn(() => proxy), chiamate };
}

describe('leggiUltimaChiusura (spec §E)', () => {
  it('la data più recente di purchase', async () => {
    const c = catena({ data: { data: '2026-08-28' }, error: null });
    vi.mocked(client).mockReturnValue(c as never);
    await expect(leggiUltimaChiusura()).resolves.toBe('2026-08-28');
    expect(c.from).toHaveBeenCalledWith('purchase');
    expect(c.chiamate.map((x) => x.metodo)).toEqual(['select', 'order', 'limit', 'maybeSingle']);
    expect(c.chiamate[1].args).toEqual(['data', { ascending: false }]);
  });
  it('nessuna spesa chiusa: null', async () => {
    vi.mocked(client).mockReturnValue(catena({ data: null, error: null }) as never);
    await expect(leggiUltimaChiusura()).resolves.toBeNull();
  });
  it('un errore si propaga', async () => {
    vi.mocked(client).mockReturnValue(catena({ data: null, error: new Error('rete') }) as never);
    await expect(leggiUltimaChiusura()).rejects.toThrow('rete');
  });
});
