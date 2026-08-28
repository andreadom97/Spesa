import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../settimana', () => ({ leggiSlotSettimana: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { client } from '../supabase';
import { leggiSlotSettimana } from '../settimana';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { leggiDispensa } from '../dispensa';
import { leggiImpostazioni } from '../impostazioni';
import { generaListe } from '../lista';

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura minimale usata in lista.chiudiSpesa.test.ts e dispensa.test.ts. */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const scritture: Record<string, Chiamata[][]> = {};

  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'),
      eq: registra('eq'),
      upsert: registra('upsert'),
      insert: registra('insert'),
      delete: registra('delete'),
      single: () => proxy,
      maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

describe('generaListe — difesa in profondità (C4)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotSettimana).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('su una settimana chiusa esce subito, senza leggere né scrivere nulla', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: { stato: 'chiusa' }, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await generaListe('week-1');

    // Nessuna delle letture che precederebbero la rigenerazione è partita:
    // se fosse arrivata fin lì avrebbe cancellato e reinserito
    // shopping_list_item, perdendo ogni spunta e risposta ai controlli.
    expect(leggiSlotSettimana).not.toHaveBeenCalled();
    expect(leggiRepertorio).not.toHaveBeenCalled();
    expect(leggiIngredienti).not.toHaveBeenCalled();
    expect(leggiDispensa).not.toHaveBeenCalled();
    expect(leggiImpostazioni).not.toHaveBeenCalled();
    expect(scritture['shopping_list']).toBeUndefined();
    expect(scritture['shopping_list_item']).toBeUndefined();
  });

  it('su una settimana in bozza o confermata procede normalmente', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'week') return { data: { stato: 'bozza' }, error: null };
      if (tabella === 'shopping_list') return { data: { id: 'lista-1' }, error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotSettimana).mockResolvedValue([]);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiDispensa).mockResolvedValue([]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    });

    await generaListe('week-1');

    expect(leggiSlotSettimana).toHaveBeenCalledWith('week-1');
  });
});
