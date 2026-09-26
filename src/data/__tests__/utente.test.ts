import { describe, it, expect, vi } from 'vitest';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getUser } }) }));

import { inizialeDi, leggiUtente } from '../utente';

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
