import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getUser } }) }));

import { dimenticaIniziale, inizialeDi, leggiUtente, useUtente } from '../utente';

describe('leggiUtente (spec fase 5 §A.2)', () => {
  it('il nome del profilo se c\'è, ripulito', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.it', user_metadata: { nome: ' andrea ' } } } });
    expect(await leggiUtente()).toEqual({ nome: 'andrea', email: 'x@y.it' });
  });

  it('altrimenti la parte dell\'email prima della @', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'dom@y.it', user_metadata: {} } } });
    expect(await leggiUtente()).toEqual({ nome: 'dom', email: 'dom@y.it' });
  });

  it('senza utente o con errore, nome ed email vuoti: non lancia', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await leggiUtente()).toEqual({ nome: '', email: '' });
    getUser.mockRejectedValue(new Error('rete'));
    expect(await leggiUtente()).toEqual({ nome: '', email: '' });
  });
});

// Review del Task 6 (minor c): una lettura fallita non resta in cache per tutta la sessione.
describe('useUtente', () => {
  beforeEach(() => {
    dimenticaIniziale();
    getUser.mockReset();
  });

  it('una lettura riuscita si tiene: il secondo montaggio non richiama getUser', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'dom@y.it', user_metadata: {} } } });
    const primo = renderHook(() => useUtente());
    await waitFor(() => expect(primo.result.current).toEqual({ nome: 'dom', email: 'dom@y.it' }));
    const secondo = renderHook(() => useUtente());
    await waitFor(() => expect(secondo.result.current).toEqual({ nome: 'dom', email: 'dom@y.it' }));
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('una lettura fallita o senza utente non si tiene: il montaggio dopo rilegge', async () => {
    getUser.mockRejectedValueOnce(new Error('rete'));
    const primo = renderHook(() => useUtente());
    await waitFor(() => expect(primo.result.current).toEqual({ nome: '', email: '' }));

    getUser.mockResolvedValueOnce({ data: { user: null } });
    const secondo = renderHook(() => useUtente());
    await waitFor(() => expect(secondo.result.current).toEqual({ nome: '', email: '' }));

    getUser.mockResolvedValueOnce({ data: { user: { email: 'dom@y.it', user_metadata: { nome: 'Andrea' } } } });
    const terzo = renderHook(() => useUtente());
    await waitFor(() => expect(terzo.result.current).toEqual({ nome: 'Andrea', email: 'dom@y.it' }));
    expect(getUser).toHaveBeenCalledTimes(3);
  });
});

// Erano i test di leggiIniziale (spec §D del 19/09): l'iniziale ora viene dal nome.
describe('inizialeDi', () => {
  it('la prima lettera del nome, maiuscola', () => {
    expect(inizialeDi('andrea')).toBe('A');
    expect(inizialeDi('dom')).toBe('D');
  });
  it('senza nome il puntino', () => {
    expect(inizialeDi('')).toBe('·');
    expect(inizialeDi('   ')).toBe('·');
  });
});
