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
  // Di default, dopo il signOut la sessione locale non c'è più: è quello
  // che `getSession` risponde quando la libreria l'ha rimossa.
  const getSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
  vi.mocked(client).mockReturnValue({ auth: { signOut, getUser, getSession } } as never);
  return { signOut, getUser, getSession };
}

/** Le tre pulizie locali che seguono l'uscita, in un colpo solo. */
function verificaPulizie(fatte: boolean) {
  const volte = fatte ? 1 : 0;
  expect(cancellaIstantaneaLista).toHaveBeenCalledTimes(volte);
  expect(svuotaCoda).toHaveBeenCalledTimes(volte);
  expect(dimenticaIdCasa).toHaveBeenCalledTimes(volte);
}

beforeEach(() => {
  vi.mocked(client).mockReset();
  vi.mocked(cancellaIstantaneaLista).mockReset();
  vi.mocked(svuotaCoda).mockReset();
  vi.mocked(dimenticaIdCasa).mockReset();
  sessionStorage.clear();
});

describe('esciDallAccount', () => {
  it('chiude la sessione solo su questo dispositivo (scope local), poi pulisce istantanea, coda e id della casa', async () => {
    const { signOut } = creaClientMock();
    signOut.mockResolvedValue({ error: null });

    await esciDallAccount();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    verificaPulizie(true);

    // Il signOut viene prima di ogni pulizia: se il server non chiude la
    // sessione, in locale non si deve toccare niente.
    const ordineSignOut = signOut.mock.invocationCallOrder[0];
    expect(vi.mocked(cancellaIstantaneaLista).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
    expect(vi.mocked(svuotaCoda).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
    expect(vi.mocked(dimenticaIdCasa).mock.invocationCallOrder[0]).toBeGreaterThan(ordineSignOut);
  });

  // Review del 15/09 (media), verificato in `@supabase/auth-js`
  // (`GoTrueClient._signOut`): senza rete la libreria rimuove COMUNQUE la
  // sessione locale e poi restituisce `{ error }`. Rilanciare e basta
  // lasciava istantanea, coda e memoria della casa a chi era già fuori, e la
  // pagina diceva "serve la rete per uscire" a una scheda senza sessione.
  it('se signOut restituisce un errore ma la sessione locale non c\'è più, pulisce e non lancia', async () => {
    const { signOut, getSession } = creaClientMock();
    signOut.mockResolvedValue({ error: { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 } });
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(esciDallAccount()).resolves.toBeUndefined();

    expect(getSession).toHaveBeenCalledTimes(1);
    verificaPulizie(true);
  });

  it('se signOut restituisce un errore e la sessione locale c\'è ancora, lo rilancia e non pulisce nulla', async () => {
    const { signOut, getSession } = creaClientMock();
    const errore = { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 };
    signOut.mockResolvedValue({ error: errore });
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });

    await expect(esciDallAccount()).rejects.toBe(errore);

    verificaPulizie(false);
  });

  // Access token scaduto e refresh fallito: `_signOut` esce senza rimuovere
  // nulla, e `getSession` risponde `session: null` MA con un errore (il
  // refresh, non una sessione assente). Il cookie è ancora lì: la sessione
  // non è "andata", e si rilancia.
  it('se getSession risponde senza sessione ma con un errore, la sessione non è andata: rilancia', async () => {
    const { signOut, getSession } = creaClientMock();
    const errore = { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 };
    signOut.mockResolvedValue({ error: errore });
    getSession.mockResolvedValue({ data: { session: null }, error: { message: 'refresh fallito', name: 'AuthRetryableFetchError', status: 0 } });

    await expect(esciDallAccount()).rejects.toBe(errore);

    verificaPulizie(false);
  });

  it('se getSession lancia dopo un errore di signOut, si rilancia l\'errore del signOut senza pulire', async () => {
    const { signOut, getSession } = creaClientMock();
    const errore = { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 };
    signOut.mockResolvedValue({ error: errore });
    getSession.mockRejectedValue(new Error('storage bloccato'));

    await expect(esciDallAccount()).rejects.toBe(errore);

    verificaPulizie(false);
  });

  it('se signOut rifiuta (eccezione) la propaga e non pulisce nulla in locale', async () => {
    const { signOut, getSession } = creaClientMock();
    signOut.mockRejectedValue(new Error('rete'));

    await expect(esciDallAccount()).rejects.toThrow('rete');

    expect(getSession).not.toHaveBeenCalled();
    verificaPulizie(false);
  });

  it('con signOut riuscito non interroga getSession', async () => {
    const { signOut, getSession } = creaClientMock();
    signOut.mockResolvedValue({ error: null });

    await esciDallAccount();

    expect(getSession).not.toHaveBeenCalled();
  });

  // Review del 15/09 (bassa): le bozze piatto di `bozza.ts` stanno in
  // sessionStorage con prefisso `spesa:`, e quella di /piatti/nuovo ha una
  // chiave fissa: un secondo account sullo stesso telefono si ritroverebbe
  // la bozza del primo.
  describe('le chiavi `spesa:*` di sessionStorage', () => {
    it('dopo il signOut riuscito se ne vanno, le altre restano', async () => {
      const { signOut } = creaClientMock();
      signOut.mockResolvedValue({ error: null });
      sessionStorage.setItem('spesa:bozza-piatto:nuovo', '{"nome":"Riso"}');
      sessionStorage.setItem('spesa:ingrediente-creato:d-1', 'ing-1');
      sessionStorage.setItem('altro:chiave', 'resta');

      await esciDallAccount();

      expect(sessionStorage.getItem('spesa:bozza-piatto:nuovo')).toBeNull();
      expect(sessionStorage.getItem('spesa:ingrediente-creato:d-1')).toBeNull();
      expect(sessionStorage.getItem('altro:chiave')).toBe('resta');
    });

    it('se ne vanno anche quando signOut dà errore ma la sessione locale è già andata', async () => {
      const { signOut } = creaClientMock();
      signOut.mockResolvedValue({ error: { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 } });
      sessionStorage.setItem('spesa:bozza-piatto:nuovo', '{"nome":"Riso"}');

      await esciDallAccount();

      expect(sessionStorage.getItem('spesa:bozza-piatto:nuovo')).toBeNull();
    });

    it('restano se il signOut fallisce con la sessione ancora lì', async () => {
      const { signOut, getSession } = creaClientMock();
      signOut.mockResolvedValue({ error: { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 } });
      getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
      sessionStorage.setItem('spesa:bozza-piatto:nuovo', '{"nome":"Riso"}');

      await expect(esciDallAccount()).rejects.toBeDefined();

      expect(sessionStorage.getItem('spesa:bozza-piatto:nuovo')).toBe('{"nome":"Riso"}');
    });

    it('se sessionStorage non è accessibile (dati di sito bloccati) l\'uscita riesce lo stesso', async () => {
      const { signOut } = creaClientMock();
      signOut.mockResolvedValue({ error: null });
      const spia = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => { throw new Error('SecurityError'); });

      await expect(esciDallAccount()).resolves.toBeUndefined();

      verificaPulizie(true);
      spia.mockRestore();
    });
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
