import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { rispondiControllo } from '../dispensa';

interface Chiamata { metodo: string; args: unknown[] }

/**
 * Stessa controfigura minimale del query builder di supabase-js usata in
 * lista.chiudiSpesa.test.ts: ogni `.from(table)` apre una catena che
 * registra i metodi invocati e si risolve solo quando viene messa in
 * `await`, con il risultato deciso da `risolvi(table, chiamate)`.
 */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
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
      update: registra('update'),
      upsert: registra('upsert'),
      delete: registra('delete'),
      single: () => proxy,
      maybeSingle: () => proxy,
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

const RISOLVI_OK = () => ({ data: null, error: null });

describe('rispondiControllo', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('"sì" scrive ultimo_check su pantry_state *e* cancella la riga di controllo da shopping_list_item, non solo la nasconde in locale', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await rispondiControllo('ing-olio', 'lista-base-1', true);

    // pantry_state: ultimo_check scritto per il giusto ingrediente e utente.
    const scrittePantry = scritture['pantry_state'] ?? [];
    expect(scrittePantry).toHaveLength(1);
    const patchPantry = scrittePantry[0].find((c) => c.metodo === 'update')?.args[0];
    expect(patchPantry).toHaveProperty('ultimo_check');
    expect(scrittePantry[0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['ingredient_id', 'ing-olio'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));

    // shopping_list_item: la riga del controllo viene DAVVERO cancellata dal
    // server — senza questa delete resterebbe con origine='controllo' e
    // confezioni=0, cioè "controllo in sospeso" per sempre (vedi C2).
    const scritteItem = scritture['shopping_list_item'] ?? [];
    expect(scritteItem).toHaveLength(1);
    expect(scritteItem[0].some((c) => c.metodo === 'delete')).toBe(true);
    expect(scritteItem[0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['shopping_list_id', 'lista-base-1'] },
      { metodo: 'eq', args: ['ingredient_id', 'ing-olio'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
  });

  it('se la cancellazione della riga di controllo fallisce, propaga l\'errore invece di far finta che sia andato tutto bene', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list_item') return { data: null, error: { message: 'boom' } };
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rispondiControllo('ing-olio', 'lista-base-1', true)).rejects.toEqual({ message: 'boom' });
  });

  it('se la scrittura di ultimo_check fallisce, propaga l\'errore', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'pantry_state') return { data: null, error: { message: 'boom-pantry' } };
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rispondiControllo('ing-olio', 'lista-base-1', true)).rejects.toEqual({ message: 'boom-pantry' });
  });

  it('"no" continua a fare upsert su shopping_list_item, senza toccare la delete', async () => {
    const { sb, scritture } = creaClientMock((tabella) => {
      if (tabella === 'ingredient') {
        return { data: { area: 'dispensa', unita_base: 'ml', formato_confezione: 1000 }, error: null };
      }
      if (tabella === 'pantry_state') {
        return { data: { residuo: 50 }, error: null };
      }
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await rispondiControllo('ing-olio', 'lista-base-1', false);

    const scritteItem = scritture['shopping_list_item'] ?? [];
    expect(scritteItem).toHaveLength(1);
    expect(scritteItem[0].some((c) => c.metodo === 'upsert')).toBe(true);
    expect(scritteItem[0].some((c) => c.metodo === 'delete')).toBe(false);
  });
});
