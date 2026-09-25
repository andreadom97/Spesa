import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { correggiResiduo } from '../dispensa';

// L'id che finisce in `user_id` non viene più da `auth.getUser` sul client
// finto ma da `idCasa()` (l'account della casa): lo stesso valore di prima,
// così i payload attesi non cambiano.
beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

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
    sb: { from },
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

    // prima > 0: da più di 0 a più di 0, nessuna data in gioco.
    await correggiResiduo('ing-1', 250, 100);

    const upsert = chiamate.find((c) => c.metodo === 'upsert');
    expect(upsert).toBeDefined();
    expect(upsert!.args[0]).toEqual({ ingredient_id: 'ing-1', user_id: 'user-1', residuo: 250 });
  });

  it('fa upsert e non update: un ingrediente mai comprato non ha ancora la riga', async () => {
    // È il primo caso d'uso di chi apre l'app avendo già la dispensa piena.
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiResiduo('ing-mai-comprato', 3, 0);

    expect(chiamate.find((c) => c.metodo === 'upsert')!.args[1]).toEqual({ onConflict: 'ingredient_id' });
  });

  it('accetta lo zero: finire una cosa e una correzione legittima', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiResiduo('ing-1', 0, 500);

    expect((chiamate.find((c) => c.metodo === 'upsert')!.args[0] as { residuo: number }).residuo).toBe(0);
  });

  it('rifiuta un residuo negativo prima di toccare il database', async () => {
    // Lo schema ha `check (residuo >= 0)`: senza questo controllo l'errore
    // arriverebbe dal database come messaggio incomprensibile.
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', -5, 10)).rejects.toThrow(/Residuo non valido/);
    expect(chiamate).toHaveLength(0);
  });

  it('rifiuta un valore non numerico', async () => {
    const { sb } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', Number.NaN, 10)).rejects.toThrow(/Residuo non valido/);
  });

  it('propaga l errore del database invece di ingoiarlo', async () => {
    // Una correzione persa in silenzio e peggio del residuo sbagliato che si
    // stava correggendo: l'utente crede di aver rimesso le cose a posto.
    const { sb } = creaClientMock({ data: null, error: { message: 'rete' } });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(correggiResiduo('ing-1', 10, 10)).rejects.toEqual({ message: 'rete' });
  });
});

describe('correggiResiduo e le date (spec fase 4 §E.2, §E.3)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('da 0 a più di 0 scrive l’acquisto a oggi e cancella la data manuale', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await correggiResiduo('ing-1', 500, 0);
    expect(chiamate.find((c) => c.metodo === 'upsert')!.args[0]).toEqual({
      ingredient_id: 'ing-1', user_id: 'user-1', residuo: 500,
      ultimo_acquisto: '2026-09-25', scadenza_manuale: null,
    });
  });

  it('a 0 cancella la data manuale e non tocca l’acquisto', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await correggiResiduo('ing-1', 0, 500);
    expect(chiamate.find((c) => c.metodo === 'upsert')!.args[0]).toEqual({
      ingredient_id: 'ing-1', user_id: 'user-1', residuo: 0, scadenza_manuale: null,
    });
  });

  it('da più di 0 a più di 0 scrive solo il residuo', async () => {
    const { sb, chiamate } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await correggiResiduo('ing-1', 300, 500);
    expect(chiamate.find((c) => c.metodo === 'upsert')!.args[0]).toEqual({
      ingredient_id: 'ing-1', user_id: 'user-1', residuo: 300,
    });
  });
});
