import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiSlotDefs: vi.fn(), leggiImpostazioni: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn() }));

import { client } from '../supabase';
import { leggiImpostazioni, leggiSlotDefs } from '../impostazioni';
import { leggiRepertorio } from '../repertorio';
import { creaSettimana } from '../settimana';
import type { Dish, Impostazioni, MealSlotDef } from '@/domain/types';

const ORDINE_AREE = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function impostazioni(settimaneCiclo: number, cicloOrigine: string | null): Impostazioni {
  return { moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE], settimaneCiclo, cicloOrigine };
}

const CENA: MealSlotDef = {
  id: 'cen', nome: 'Cena', posizione: 0, assenzeAbituali: [false, false, false, false, false, false, false],
};

function piatto(id: string, settimanaCiclo: number | null): Dish {
  return {
    id, nome: id, slotDefId: 'cen', fonte: 'proprio', attivo: true,
    descrizione: null, settimanaCiclo, giornoCiclo: null, ingredienti: [],
  };
}

interface Chiamata { metodo: string; args: unknown[] }

function creaClientMock() {
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
      insert: registra('insert'),
      single: () => proxy,
      then(onFulfilled: (v: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve({ data: { id: 'week-1' }, error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }

  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

describe('creaSettimana — guard su pasti non configurati (C3)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotDefs).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('senza meal_slot_def non crea la settimana e lancia un errore chiaro', async () => {
    const { sb, scritture } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([]);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(1, null));

    await expect(creaSettimana('2026-08-31')).rejects.toThrow(/pasti/i);

    // Nessun insert su week: una settimana vuota che non si rigenera (l'unique
    // su data_inizio blocca un secondo tentativo) è peggio di nessuna settimana.
    expect(scritture['week']).toBeUndefined();
  });
});

describe('creaSettimana — il ciclo sceglie i piatti', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotDefs).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  /** I dish_id scritti in meal_slot, che è l'unico posto dove il piano diventa un fatto. */
  async function piattiAssegnati(lunedi: string, settimaneCiclo: number, origine: string | null) {
    const { sb, scritture } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([CENA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 1), piatto('s2', 2)]);
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(settimaneCiclo, origine));

    await creaSettimana(lunedi);

    const insert = scritture['meal_slot'][0].find((c) => c.metodo === 'insert')!;
    const righe = insert.args[0] as Array<{ dish_id: string | null }>;
    return [...new Set(righe.map((r) => r.dish_id))];
  }

  it('la prima settimana del giro usa i piatti della settimana 1', async () => {
    expect(await piattiAssegnati('2026-08-31', 2, '2026-08-31')).toEqual(['s1']);
  });

  it('la settimana dopo passa ai piatti della settimana 2', async () => {
    expect(await piattiAssegnati('2026-09-07', 2, '2026-08-31')).toEqual(['s2']);
  });

  it('senza ciclo (una settimana sola) il filtro non esclude nessuno', async () => {
    // Comportamento di prima della migrazione 0004: i due piatti ruotano.
    const assegnati = await piattiAssegnati('2026-09-07', 1, null);
    expect(assegnati.sort()).toEqual(['s1', 's2']);
  });
});