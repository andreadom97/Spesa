import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../settimana', () => ({ leggiSlotSettimana: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { client } from '../supabase';
import { leggiImpostazioni } from '../impostazioni';
import { leggiListe } from '../lista';
import { IMPOSTAZIONI } from '@/domain/__tests__/fixtures';

/** `from → select → eq → returns`, poi `await`: risponde con le liste date. */
function clientConListe(liste: unknown[]) {
  const proxy: Record<string, unknown> = {
    select: () => proxy,
    eq: () => proxy,
    returns: () => proxy,
    then(ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) {
      return Promise.resolve({ data: liste, error: null }).then(ok, ko);
    },
  };
  return { from: () => proxy };
}

const LISTE = [
  { id: 'l-base', tipo: 'base', shopping_list_item: [] },
  { id: 'l-topup', tipo: 'topup', shopping_list_item: [] },
];

describe('leggiListe — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('porta la cadenza delle impostazioni che legge già per l\'ordine delle aree', async () => {
    vi.mocked(client).mockReturnValue(clientConListe(LISTE) as never);
    vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI, giorniControllo: 30 });

    const lista = await leggiListe('week-1');

    expect(lista?.giorniControllo).toBe(30);
    expect(lista?.ordineAree).toEqual(IMPOSTAZIONI.ordineAree);
    // Nessuna lettura in più: la stessa chiamata dà ordine e cadenza.
    expect(leggiImpostazioni).toHaveBeenCalledTimes(1);
  });

  it('senza liste torna null e non legge le impostazioni', async () => {
    vi.mocked(client).mockReturnValue(clientConListe([]) as never);
    expect(await leggiListe('week-1')).toBeNull();
    expect(leggiImpostazioni).not.toHaveBeenCalled();
  });
});
