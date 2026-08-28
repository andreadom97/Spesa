import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { correggiResiduo } from '../dispensa';

interface Chiamata { metodo: string; args: unknown[] }

function creaClientMock(risultato: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const chiamate: Chiamata[] = [];
  function from() {
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      upsert: registra('upsert'),
      select: registra('select'),
      eq: registra('eq'),
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        return Promise.resolve(risultato).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    chiamate,
  };
}

describe('correggiResiduo', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('scrive il residuo corretto sull ingrediente', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiResiduo('ing-1', 250);

    const upsert = chiamate.find((c) => c.metodo === 'upsert');
    expect(upsert).toBeDefined();
    expect(upsert!.args[0]).toEqual({ ingredient_id: 'ing-1', user_id: 'user-1', residuo: 250 });
  });

  it('fa upsert e non update: un ingrediente mai comprato non ha ancora la riga', async () => {
    // È il primo caso d'uso di chi apre l'app avendo già la dispensa piena.
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiResiduo('ing-mai-comprato', 3);

    expect(chiamate.find((c) => c.metodo === 'upsert')!.args[1]).toEqual({ onConflict: 'ingredient_id' });
  });

  it('accetta lo zero: finire una cosa e una correzione legittima', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiResiduo('ing-1', 0);

    expect((chiamate.find((c) => c.metodo === 'upsert')!.args[0] as { residuo: number }).residuo).toBe(0);
  });

  it('rifiuta un residuo negativo prima di toccare il database', async () => {
    // Lo schema ha `check (residuo >= 0)`: senza questo controllo l'errore
    // arriverebbe dal database come messaggio incomprensibile.
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', -5)).rejects.toThrow(/Residuo non valido/);
    expect(chiamate).toHaveLength(0);
  });

  it('rifiuta un valore non numerico', async () => {
    const { sb } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', Number.NaN)).rejects.toThrow(/Residuo non valido/);
  });

  it('propaga l errore del database invece di ingoiarlo', async () => {
    // Una correzione persa in silenzio e peggio del residuo sbagliato che si
    // stava correggendo: l'utente crede di aver rimesso le cose a posto.
    const { sb } = creaClientMock({ data: null, error: { message: 'rete' } });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', 10)).rejects.toEqual({ message: 'rete' });
  });
});
