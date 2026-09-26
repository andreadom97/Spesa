import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '../dispensa';

/** Un client finto con la sola `rpc`, come in casa.test.ts. */
function creaClientMock() {
  const rpc = vi.fn();
  vi.mocked(client).mockReturnValue({ rpc } as never);
  return rpc;
}

describe('cancellaDispensa (spec fase 5 §E.2)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(idCasa).mockReset();
  });

  it('chiama la funzione SQL, senza argomenti', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });

    await cancellaDispensa();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('cancella_dispensa');
  });

  it('non passa dalla memoria di idCasa: la casa la trova casa_id() nel database', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });
    await cancellaDispensa();
    expect(idCasa).not.toHaveBeenCalled();
  });

  it('lancia l\'errore della RPC, così il dialogo resta aperto con il suo errore', async () => {
    const rpc = creaClientMock();
    const errore = { message: 'non autenticato', code: 'P0001', details: null, hint: null };
    rpc.mockResolvedValue({ data: null, error: errore });
    await expect(cancellaDispensa()).rejects.toBe(errore);
  });

  it('non pubblica l\'evento da sé: lo fa chi chiama, se riesce', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });
    const ascolta = vi.fn();
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    await cancellaDispensa();
    window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    expect(ascolta).not.toHaveBeenCalled();
  });

  it('il nome dell\'evento è quello della spec', () => {
    expect(EVENTO_DISPENSA_CAMBIATA).toBe('spesa:dispensa-cambiata');
  });
});
