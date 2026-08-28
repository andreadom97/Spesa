import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Impostazioni, MealSlotDef } from '@/domain/types';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { salvaImpostazioni, salvaSlotDefs } from '../impostazioni';
import { MAX_PASTI, MIN_PASTI } from '@/domain/pasti';

function pasto(i: number): MealSlotDef {
  return { id: `p-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: Array(7).fill(false) };
}

function pasti(n: number): MealSlotDef[] {
  return Array.from({ length: n }, (_, i) => pasto(i));
}

/** Registra l'ultimo payload passato a upsert, tabella per tabella. */
function creaClientMock() {
  const upsert: Record<string, unknown[]> = {};
  function from(tabella: string) {
    const proxy: Record<string, unknown> = {
      select: () => proxy,
      eq: () => proxy,
      in: () => proxy,
      delete: () => proxy,
      upsert: (payload: unknown) => {
        (upsert[tabella] ??= []).push(payload);
        return proxy;
      },
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    upsert,
  };
}

const BASE: Impostazioni = {
  moltiplicatorePorzioni: 1,
  ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
  settimaneCiclo: 1,
  cicloOrigine: null,
};

describe('salvaSlotDefs — quanti pasti si possono avere', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('il massimo è sei: il piano di Andrea ha due spuntini distinti', () => {
    expect(MAX_PASTI).toBe(6);
    expect(MIN_PASTI).toBe(3);
  });

  it('accetta sei pasti', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaSlotDefs(pasti(6));
    expect(upsert['meal_slot_def']).toHaveLength(1);
  });

  it('rifiuta sette pasti senza scrivere niente', async () => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaSlotDefs(pasti(7))).rejects.toThrow(/da 3 a 6/);
    // Il controllo viene prima di qualunque scrittura: rifiutare a metà
    // lavoro lascerebbe i pasti peggio di come stavano.
    expect(upsert['meal_slot_def']).toBeUndefined();
  });

  it('rifiuta due pasti', async () => {
    const { sb } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaSlotDefs(pasti(2))).rejects.toThrow(/da 3 a 6/);
  });
});

describe('salvaImpostazioni — l\'origine del ciclo', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  async function scritto(i: Impostazioni) {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaImpostazioni(i);
    return upsert['settings'][0] as Record<string, unknown>;
  }

  it('accendere il ciclo senza origine lo àncora al lunedì di questa settimana', async () => {
    // Un ciclo di più settimane senza origine non saprebbe da dove contare.
    const riga = await scritto({ ...BASE, settimaneCiclo: 2, cicloOrigine: null });
    expect(riga.settimane_ciclo).toBe(2);
    expect(riga.ciclo_origine).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('un\'origine già scelta non viene riscritta', async () => {
    const riga = await scritto({ ...BASE, settimaneCiclo: 3, cicloOrigine: '2026-08-31' });
    expect(riga.ciclo_origine).toBe('2026-08-31');
  });

  it('spegnere il ciclo conserva l\'origine: riaccendendolo il giro riprende da dov\'era', async () => {
    const riga = await scritto({ ...BASE, settimaneCiclo: 1, cicloOrigine: '2026-08-31' });
    expect(riga.settimane_ciclo).toBe(1);
    expect(riga.ciclo_origine).toBe('2026-08-31');
  });
});
