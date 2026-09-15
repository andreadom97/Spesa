import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
// Le tre pulizie locali dopo il signOut: l'istantanea offline della lista, la
// coda delle spunte e la memoria dell'id della casa, tutte dell'account che esce.
vi.mock('@/offline/lista-cache', () => ({ cancellaIstantaneaLista: vi.fn() }));
vi.mock('@/offline/coda', () => ({ svuotaCoda: vi.fn() }));
vi.mock('../casa', () => ({ dimenticaIdCasa: vi.fn() }));

import { client } from '../supabase';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';
import { dimenticaIdCasa } from '../casa';
import { emailAccount, esciDallAccount } from '../sessione';

/** Un client finto con la sola `auth`: sessione.ts non passa da altro. */
function creaClientMock() {
  const signOut = vi.fn();
  const getUser = vi.fn();
  vi.mocked(client).mockReturnValue({ auth: { signOut, getUser } } as never);
  return { signOut, getUser };
}

beforeEach(() => {
  vi.mocked(client).mockReset();
  vi.mocked(cancellaIstantaneaLista).mockReset();
  vi.mocked(svuotaCoda).mockReset();
  vi.mocked(dimenticaIdCasa).mockReset();
});

describe('esciDallAccount', () => {
  it('chiude la sessione solo su questo dispositivo (scope local), poi pulisce istantanea, coda e id della casa', async () => {
    const { signOut } = creaClientMock();
    signOut.mockResolvedValue({ error: null });

    await esciDallAccount();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(cancellaIstantaneaLista).toHaveBeenCalledTimes(1);
    expect(svuotaCoda).toHaveBeenCalledTimes(1);
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);

    // Il signOut viene prima di ogni pulizia: se il server non chiude la
    // sessione, in locale non si deve toccare niente.
    const ordineSignOut = signOut.mock.invocationCallOrder[0];
    expect(vi.mocked(cancellaIstantaneaLista).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
    expect(vi.mocked(svuotaCoda).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
    expect(vi.mocked(dimenticaIdCasa).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
  });

  it('se signOut restituisce un errore lo rilancia e non pulisce nulla in locale', async () => {
    const { signOut } = creaClientMock();
    const errore = { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 };
    signOut.mockResolvedValue({ error: errore });

    await expect(esciDallAccount()).rejects.toBe(errore);

    expect(cancellaIstantaneaLista).not.toHaveBeenCalled();
    expect(svuotaCoda).not.toHaveBeenCalled();
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
  });

  it('se signOut rifiuta (eccezione) la propaga e non pulisce nulla in locale', async () => {
    const { signOut } = creaClientMock();
    signOut.mockRejectedValue(new Error('rete'));

    await expect(esciDallAccount()).rejects.toThrow('rete');

    expect(cancellaIstantaneaLista).not.toHaveBeenCalled();
    expect(svuotaCoda).not.toHaveBeenCalled();
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
  });
});

describe('emailAccount', () => {
  it('restituisce l\'email dell\'utente loggato', async () => {
    const { getUser } = creaClientMock();
    getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'andrea@esempio.it' } }, error: null });

    expect(await emailAccount()).toBe('andrea@esempio.it');
  });

  it('senza utente (sessione scaduta) restituisce null', async () => {
    const { getUser } = creaClientMock();
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await emailAccount()).toBeNull();
  });

  it('con un utente senza email restituisce null', async () => {
    const { getUser } = creaClientMock();
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    expect(await emailAccount()).toBeNull();
  });

  it('se getUser fallisce restituisce null senza lanciare: è una riga di cortesia', async () => {
    const { getUser } = creaClientMock();
    getUser.mockRejectedValue(new Error('rete'));

    expect(await emailAccount()).toBeNull();
  });
});
