import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
// L'istantanea offline della lista e la coda delle spunte sono di una casa:
// entra/esci le cancellano entrambe.
vi.mock('@/offline/lista-cache', () => ({ cancellaIstantaneaLista: vi.fn() }));
vi.mock('@/offline/coda', () => ({ svuotaCoda: vi.fn() }));

import { client } from '../supabase';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';
import {
  creaInvito,
  dimenticaIdCasa,
  entraInCasa,
  esciDallaCasa,
  idCasa,
  rimuoviMembro,
  statoCasa,
} from '../casa';

/** Un client finto con la sola `rpc`: casa.ts non passa da altro. */
function creaClientMock() {
  const rpc = vi.fn();
  vi.mocked(client).mockReturnValue({ rpc } as never);
  return rpc;
}

/** La forma dell'errore che supabase-js restituisce da una funzione SQL che fa `raise exception`. */
function erroreRpc(message: string) {
  return { message, code: 'P0001', details: null, hint: null };
}

describe('idCasa — memoria per sessione', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    // La memoria è a livello di modulo: senza questo, l'id del test precedente
    // resterebbe in giro.
    dimenticaIdCasa();
  });

  it('una RPC sola per due chiamate consecutive, e restituisce l\'id', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: 'casa-1', error: null });

    expect(await idCasa()).toBe('casa-1');
    expect(await idCasa()).toBe('casa-1');

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('casa_id');
  });

  it('due chiamate in parallelo condividono la stessa promessa: una RPC sola', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: 'casa-1', error: null });

    const [a, b] = await Promise.all([idCasa(), idCasa()]);

    expect(a).toBe('casa-1');
    expect(b).toBe('casa-1');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('dopo dimenticaIdCasa() richiama la RPC', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValueOnce({ data: 'casa-1', error: null });
    rpc.mockResolvedValueOnce({ data: 'casa-2', error: null });

    expect(await idCasa()).toBe('casa-1');
    dimenticaIdCasa();
    expect(await idCasa()).toBe('casa-2');

    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('con errore propaga e la chiamata successiva riprova', async () => {
    const rpc = creaClientMock();
    const errore = erroreRpc('rete assente');
    rpc.mockResolvedValueOnce({ data: null, error: errore });
    rpc.mockResolvedValueOnce({ data: 'casa-1', error: null });

    await expect(idCasa()).rejects.toBe(errore);
    // Una promessa fallita non va memorizzata: altrimenti un'assenza di rete
    // momentanea bloccherebbe l'app fino al reload.
    expect(await idCasa()).toBe('casa-1');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('con data null (nessun utente autenticato) lancia "non autenticato" e non memorizza', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValueOnce({ data: null, error: null });
    rpc.mockResolvedValueOnce({ data: 'casa-1', error: null });

    await expect(idCasa()).rejects.toThrow('non autenticato');
    expect(await idCasa()).toBe('casa-1');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('con data stringa vuota lancia "non autenticato"', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: '', error: null });

    await expect(idCasa()).rejects.toThrow('non autenticato');
  });
});

describe('statoCasa', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    dimenticaIdCasa();
  });

  it('mappa il jsonb della RPC', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: { ruolo: 'proprietario', email: ['a@b', 'c@d'], id: ['u1', 'u2'] }, error: null });

    expect(await statoCasa()).toEqual({ ruolo: 'proprietario', email: ['a@b', 'c@d'], id: ['u1', 'u2'] });
    expect(rpc).toHaveBeenCalledWith('stato_casa');
  });

  it('accetta i tre ruoli con email e id vuoti', async () => {
    for (const ruolo of ['solo', 'proprietario', 'membro']) {
      const rpc = creaClientMock();
      rpc.mockResolvedValue({ data: { ruolo, email: [], id: [] }, error: null });
      expect(await statoCasa()).toEqual({ ruolo, email: [], id: [] });
    }
  });

  it('restituisce copie, non gli array del jsonb', async () => {
    const rpc = creaClientMock();
    const data = { ruolo: 'membro', email: ['a@b'], id: ['u1'] };
    rpc.mockResolvedValue({ data, error: null });

    const stato = await statoCasa();

    expect(stato.email).not.toBe(data.email);
    expect(stato.id).not.toBe(data.id);
  });

  it.each([
    ['ruolo sconosciuto', { ruolo: 'ospite', email: [], id: [] }],
    ['email non array', { ruolo: 'solo', email: 'a@b', id: [] }],
    ['email con non-stringhe', { ruolo: 'membro', email: [1], id: ['u1'] }],
    ['senza id (stato_casa vecchio)', { ruolo: 'proprietario', email: ['a@b'] }],
    ['id non array', { ruolo: 'proprietario', email: ['a@b'], id: 'u1' }],
    ['id con non-stringhe', { ruolo: 'proprietario', email: ['a@b'], id: [1] }],
    // Accoppiati per indice: con lunghezze diverse TOGLI colpirebbe la persona sbagliata.
    ['id più corti delle email', { ruolo: 'proprietario', email: ['a@b', 'c@d'], id: ['u1'] }],
    ['id più lunghi delle email', { ruolo: 'proprietario', email: ['a@b'], id: ['u1', 'u2'] }],
    ['null', null],
    ['stringa', 'solo'],
  ])('forma non valida (%s) → errore', async (_, data) => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data, error: null });

    await expect(statoCasa()).rejects.toThrow('stato della casa non valido');
  });

  it('un errore della RPC propaga col suo messaggio', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('permesso negato') });

    await expect(statoCasa()).rejects.toMatchObject({ message: 'permesso negato' });
  });
});

describe('inviti e membri', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(cancellaIstantaneaLista).mockReset();
    vi.mocked(svuotaCoda).mockReset();
    dimenticaIdCasa();
  });

  it('creaInvito restituisce il codice', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: 'K7P3QX', error: null });

    expect(await creaInvito()).toBe('K7P3QX');
    expect(rpc).toHaveBeenCalledWith('crea_invito');
  });

  it('creaInvito: un errore della RPC propaga col suo messaggio', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('sei già membro di una casa') });

    await expect(creaInvito()).rejects.toMatchObject({ message: 'sei già membro di una casa' });
  });

  it('entraInCasa normalizza il codice (spazi via, maiuscole) e poi idCasa rifà la RPC', async () => {
    const rpc = creaClientMock();
    rpc.mockImplementation(async (nome: string) => {
      if (nome === 'casa_id') return { data: 'casa-1', error: null };
      return { data: 'proprietario-1', error: null };
    });

    expect(await idCasa()).toBe('casa-1');
    await entraInCasa(' k7p3qx ');
    await idCasa();

    expect(rpc).toHaveBeenCalledWith('entra_in_casa', { codice: 'K7P3QX' });
    expect(rpc.mock.calls.filter(([nome]) => nome === 'casa_id')).toHaveLength(2);
  });

  it('entraInCasa con codice sbagliato propaga il messaggio della funzione SQL', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('codice non valido o scaduto') });

    await expect(entraInCasa('XXXXXX')).rejects.toMatchObject({ message: 'codice non valido o scaduto' });
  });

  it('entraInCasa cancella l\'istantanea offline della lista: è di un\'altra casa', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: 'proprietario-1', error: null });

    await entraInCasa('K7P3QX');

    expect(cancellaIstantaneaLista).toHaveBeenCalledTimes(1);
  });

  it('entraInCasa con errore della RPC non tocca l\'istantanea: la casa non è cambiata', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('codice non valido o scaduto') });

    await expect(entraInCasa('XXXXXX')).rejects.toBeDefined();

    expect(cancellaIstantaneaLista).not.toHaveBeenCalled();
  });

  // Gli itemId in coda sono righe della lista dell'altra casa: una spunta non
  // ancora sincronizzata al momento del cambio si perde (spec §7).
  it('entraInCasa svuota la coda delle spunte offline: è dell\'altra casa', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: 'proprietario-1', error: null });

    await entraInCasa('K7P3QX');

    expect(svuotaCoda).toHaveBeenCalledTimes(1);
  });

  it('entraInCasa con errore della RPC non tocca la coda', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('codice non valido o scaduto') });

    await expect(entraInCasa('XXXXXX')).rejects.toBeDefined();

    expect(svuotaCoda).not.toHaveBeenCalled();
  });

  it('esciDallaCasa chiama la RPC e poi idCasa rifà la RPC', async () => {
    const rpc = creaClientMock();
    rpc.mockImplementation(async (nome: string) => {
      if (nome === 'casa_id') return { data: 'casa-1', error: null };
      return { data: null, error: null };
    });

    await idCasa();
    await esciDallaCasa();
    await idCasa();

    expect(rpc).toHaveBeenCalledWith('esci_dalla_casa');
    expect(rpc.mock.calls.filter(([nome]) => nome === 'casa_id')).toHaveLength(2);
  });

  it('esciDallaCasa: un errore della RPC propaga', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('errore') });

    await expect(esciDallaCasa()).rejects.toMatchObject({ message: 'errore' });
  });

  it('esciDallaCasa cancella l\'istantanea offline della lista', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });

    await esciDallaCasa();

    expect(cancellaIstantaneaLista).toHaveBeenCalledTimes(1);
  });

  it('esciDallaCasa con errore della RPC non tocca l\'istantanea', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('errore') });

    await expect(esciDallaCasa()).rejects.toBeDefined();

    expect(cancellaIstantaneaLista).not.toHaveBeenCalled();
  });

  it('esciDallaCasa svuota la coda delle spunte offline', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });

    await esciDallaCasa();

    expect(svuotaCoda).toHaveBeenCalledTimes(1);
  });

  it('esciDallaCasa con errore della RPC non tocca la coda', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('errore') });

    await expect(esciDallaCasa()).rejects.toBeDefined();

    expect(svuotaCoda).not.toHaveBeenCalled();
  });

  it('rimuoviMembro passa p_membro', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });

    await rimuoviMembro('u2');

    expect(rpc).toHaveBeenCalledWith('rimuovi_membro', { p_membro: 'u2' });
  });

  it('rimuoviMembro: un errore della RPC propaga col suo messaggio', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: erroreRpc('non sei il proprietario') });

    await expect(rimuoviMembro('u2')).rejects.toMatchObject({ message: 'non sei il proprietario' });
  });
});
