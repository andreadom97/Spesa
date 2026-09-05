import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { salvaIngrediente } from '../repertorio';

/** Registra l'ultimo payload passato a upsert, tabella per tabella. */
function creaClientMock() {
  const upsert: Record<string, unknown[]> = {};
  function from(tabella: string) {
    const proxy: Record<string, unknown> = {
      select: () => proxy,
      single: () => Promise.resolve({ data: { id: 'i-salvato' }, error: null }),
      upsert: (payload: unknown) => {
        (upsert[tabella] ??= []).push(payload);
        return proxy;
      },
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve({ data: null, error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    upsert,
  };
}

const BASE = {
  nome: 'Riso',
  unitaBase: 'g' as const,
  area: 'cereali' as const,
  classeResiduo: 'porzionabile' as const,
  deperibile: false,
  formatoConfezione: 1000,
};

describe('salvaIngrediente', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('scrive prezzo_confezione accanto al formato', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    const id = await salvaIngrediente({ ...BASE, prezzoConfezione: 2.5 });

    expect(id).toBe('i-salvato');
    expect(upsert.ingredient[0]).toMatchObject({
      user_id: 'user-1',
      nome: 'Riso',
      formato_confezione: 1000,
      prezzo_confezione: 2.5,
    });
  });

  it('un ingrediente senza prezzo scrive prezzo_confezione null, non lo omette', async () => {
    // Omettere la colonna lascerebbe in piedi, su un upsert, il prezzo
    // vecchio: "nessun prezzo" dev'essere una scrittura esplicita.
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null });

    const riga = upsert.ingredient[0] as Record<string, unknown>;
    expect('prezzo_confezione' in riga).toBe(true);
    expect(riga.prezzo_confezione).toBeNull();
  });

  it('crea la riga di dispensa a residuo zero, come prima', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await salvaIngrediente({ ...BASE, prezzoConfezione: null });

    expect(upsert.pantry_state[0]).toEqual({ ingredient_id: 'i-salvato', user_id: 'user-1', residuo: 0 });
  });
});
