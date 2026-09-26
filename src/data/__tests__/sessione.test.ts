import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ dimenticaIdCasa: vi.fn() }));
vi.mock('../utente', () => ({ dimenticaIniziale: vi.fn() }));
vi.mock('@/offline/lista-cache', () => ({ cancellaIstantaneaLista: vi.fn() }));
vi.mock('@/offline/coda', () => ({ svuotaCoda: vi.fn() }));

import { client } from '../supabase';
import { dimenticaIdCasa } from '../casa';
import { dimenticaIniziale } from '../utente';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';
import { esci } from '../sessione';

const locationOriginale = window.location;
let ordine: string[];
let signOut: Mock;
let getSession: Mock;

beforeEach(() => {
  ordine = [];
  signOut = vi.fn(async () => { ordine.push('signOut'); return { error: null }; });
  getSession = vi.fn(async () => ({ data: { session: null }, error: null }));
  vi.mocked(client).mockReset().mockReturnValue({ auth: { signOut, getSession } } as never);
  vi.mocked(cancellaIstantaneaLista).mockReset().mockImplementation(() => { ordine.push('istantanea'); });
  vi.mocked(svuotaCoda).mockReset().mockImplementation(() => { ordine.push('coda'); });
  vi.mocked(dimenticaIdCasa).mockReset().mockImplementation(() => { ordine.push('idCasa'); });
  vi.mocked(dimenticaIniziale).mockReset().mockImplementation(() => { ordine.push('iniziale'); });
  const replace = vi.fn((url: string) => { ordine.push(`replace ${url}`); });
  Object.defineProperty(window, 'location', {
    value: { ...locationOriginale, replace },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: locationOriginale, writable: true, configurable: true });
});

describe('esci (spec fase 5 §E.4)', () => {
  it('nell\'ordine: signOut, poi la pulizia, poi /entra con una navigazione piena', async () => {
    await esci();
    expect(ordine).toEqual(['signOut', 'istantanea', 'coda', 'idCasa', 'iniziale', 'replace /entra']);
  });

  it('esce da questo telefono, non da tutti i dispositivi (D3)', async () => {
    await esci();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('se signOut fallisce e la sessione è ancora qui: lancia, niente pulizia, niente navigazione', async () => {
    const errore = { message: 'rete', status: 500 };
    signOut.mockImplementation(async () => { ordine.push('signOut'); return { error: errore }; });
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    await expect(esci()).rejects.toBe(errore);
    expect(ordine).toEqual(['signOut']);
  });

  it('se signOut rigetta (eccezione) e la sessione è ancora qui: lancia uguale', async () => {
    const errore = new Error('offline');
    signOut.mockImplementation(async () => { ordine.push('signOut'); throw errore; });
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    await expect(esci()).rejects.toBe(errore);
    expect(ordine).toEqual(['signOut']);
  });

  it('se il server non risponde ma la sessione locale è già chiusa (auth-js la toglie lo stesso): pulisce ed esce', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    signOut.mockImplementation(async () => { ordine.push('signOut'); return { error: { message: 'rete', status: 500 } }; });
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await esci();
    expect(ordine).toEqual(['signOut', 'istantanea', 'coda', 'idCasa', 'iniziale', 'replace /entra']);
  });
});
