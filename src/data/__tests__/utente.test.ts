import { describe, it, expect, vi } from 'vitest';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getUser } }) }));

import { leggiIniziale } from '../utente';

describe('leggiIniziale (spec §D)', () => {
  it('usa il nome se c\'è', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.it', user_metadata: { nome: 'andrea' } } } });
    expect(await leggiIniziale()).toBe('A');
  });
  it('altrimenti l\'email', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'dom@y.it', user_metadata: {} } } });
    expect(await leggiIniziale()).toBe('D');
  });
  it('senza utente o con errore torna il puntino', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await leggiIniziale()).toBe('·');
    getUser.mockRejectedValue(new Error('rete'));
    expect(await leggiIniziale()).toBe('·');
  });
});
