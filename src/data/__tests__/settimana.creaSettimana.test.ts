import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiSlotDefs: vi.fn(), leggiImpostazioni: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { leggiImpostazioni, leggiSlotDefs } from '../impostazioni';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { leggiDispensa } from '../dispensa';
import { creaSettimana, aggiornaSlot } from '../settimana';
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
    componenti: [],
  };
}

/** Un piatto con un solo componente a una sola opzione: nessuna ambiguità nel planner su quale scelga. */
function piattoConComponente(id: string, componenteId: string, opzioneId: string): Dish {
  return {
    ...piatto(id, 1),
    componenti: [{ id: componenteId, nome: 'Farcitura', opzioni: [{ id: opzioneId, righe: [] }] }],
  };
}

interface Chiamata { metodo: string; args: unknown[] }

/**
 * `meal_slot` ora esce dall'insert con `.select('id, data, slot_def_id')`
 * (creaSettimana ne ha bisogno per agganciare `meal_slot_choice`): il mock
 * costruisce le righe finte a partire dagli argomenti dell'insert, così il
 * riabbinamento per (data, slot_def_id) nel codice di produzione trova
 * sempre un id. Le altre tabelle restano com'erano.
 */
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
        if (tabella === 'meal_slot') {
          const inserimento = chiamate.find((c) => c.metodo === 'insert');
          const righe = (inserimento?.args[0] ?? []) as Array<{ data: string; slot_def_id: string }>;
          const data = righe.map((r, i) => ({ id: `slot-${i}`, data: r.data, slot_def_id: r.slot_def_id }));
          return Promise.resolve({ data, error: null }).then(onFulfilled);
        }
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

describe('creaSettimana — persiste le scelte del planner (Task 8)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotDefs).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
  });

  it('un piatto con un componente scrive la sua scelta in meal_slot_choice con fonte planner', async () => {
    const { sb, scritture } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([CENA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piattoConComponente('s1', 'comp1', 'opt-scelta')]);
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(1, null));
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiDispensa).mockResolvedValue([]);

    await creaSettimana('2026-08-31');

    const insertScelte = scritture['meal_slot_choice'][0].find((c) => c.metodo === 'insert')!;
    const righe = insertScelte.args[0] as Array<{
      user_id: string; meal_slot_id: string; componente_id: string; option_id: string; fonte: string;
    }>;
    expect(righe.length).toBeGreaterThan(0);
    expect(righe[0]).toMatchObject({
      user_id: 'user-1', componente_id: 'comp1', option_id: 'opt-scelta', fonte: 'planner',
    });
    // Ogni riga è agganciata a un meal_slot_id vero, tornato dall'insert su meal_slot.
    expect(righe[0].meal_slot_id).toMatch(/^slot-\d+$/);
  });

  it('nessun componente a scelta: non parte nessun insert su meal_slot_choice', async () => {
    const { sb, scritture } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([CENA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto('s1', 1)]);
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(1, null));
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiDispensa).mockResolvedValue([]);

    await creaSettimana('2026-08-31');

    expect(scritture['meal_slot_choice']).toBeUndefined();
  });

  it('mismatch fra le righe inserite e gli slot assegnati: lancia un errore esplicito invece di scartare le scelte', async () => {
    // Simula un insert su meal_slot che non restituisce nessuna riga (es. un
    // problema di RLS/RETURNING): il riabbinamento per (data, slot_def_id) non
    // trova mai un id, e questo non deve degenerare in una settimana silenziosamente
    // senza scelte.
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
          if (tabella === 'meal_slot') {
            return Promise.resolve({ data: [], error: null }).then(onFulfilled);
          }
          return Promise.resolve({ data: { id: 'week-1' }, error: null }).then(onFulfilled);
        },
      };
      return proxy;
    }
    const sb = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from };
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotDefs).mockResolvedValue([CENA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piattoConComponente('s1', 'comp1', 'opt-scelta')]);
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(1, null));
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiDispensa).mockResolvedValue([]);

    await expect(creaSettimana('2026-08-31')).rejects.toThrow(/nessun meal_slot inserito trovato/i);
  });
});

describe('aggiornaSlot — patch di scelte (Task 8)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  /**
   * Mock dedicato: `meal_slot` deve rispondere sia alla lettura della riga
   * attuale (select) sia all'update, con risposte diverse; `meal_slot_choice`
   * riceve delete e upsert come due chiamate separate a `from`. `week`
   * risponde sempre 'bozza': questi test riguardano solo il patch delle
   * scelte (Task 8), non il ledger degli storni (Task 4) — a settimana
   * bozza lo storno esce subito senza toccare altro (vedi
   * settimana.aggiornaSlot.test.ts per quel comportamento).
   */
  function creaMockAggiornaSlot(rigaAttuale: Record<string, unknown>) {
    const scritture: Record<string, Chiamata[][]> = {};
    const ordineOperazioni: string[] = [];

    function from(tabella: string) {
      const chiamate: Chiamata[] = [];
      const registra = (metodo: string) => (...args: unknown[]) => {
        chiamate.push({ metodo, args });
        return proxy;
      };
      const proxy: Record<string, unknown> = {
        select: registra('select'),
        eq: registra('eq'),
        update: registra('update'),
        delete: registra('delete'),
        upsert: registra('upsert'),
        single: () => proxy,
        then(onFulfilled: (v: unknown) => unknown) {
          (scritture[tabella] ??= []).push(chiamate);
          if (chiamate.some((c) => c.metodo === 'delete')) ordineOperazioni.push('delete');
          if (chiamate.some((c) => c.metodo === 'upsert')) ordineOperazioni.push('upsert');
          const isLetturaRigaAttuale = tabella === 'meal_slot' && chiamate.some((c) => c.metodo === 'select');
          const isLetturaWeek = tabella === 'week' && chiamate.some((c) => c.metodo === 'select');
          const risposta = isLetturaRigaAttuale
            ? { data: rigaAttuale, error: null }
            : isLetturaWeek
              ? { data: { stato: 'bozza' }, error: null }
              : { data: null, error: null };
          return Promise.resolve(risposta).then(onFulfilled);
        },
      };
      return proxy;
    }

    return {
      sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
      scritture,
      ordineOperazioni,
    };
  }

  it('con dishId e scelte insieme: cancella prima tutte le meal_slot_choice, poi fa upsert delle nuove', async () => {
    const rigaAttuale = {
      id: 'slot-1', data: '2026-08-31', slot_def_id: 'cen',
      stato: 'casa', dish_id: 'piatto-vecchio', fonte_stato: 'default',
    };
    const { sb, scritture, ordineOperazioni } = creaMockAggiornaSlot(rigaAttuale);
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot(
      'slot-1',
      { dishId: 'piatto-nuovo', scelte: { comp1: { opzioneId: 'opt-nuova', fonte: 'planner' } } },
      'correzione',
    );

    // L'ordine fra le due tabelle: prima si ripulisce tutto, poi si scrive il nuovo
    // (delete → update di meal_slot → upsert: un fallimento a metà degenera nel
    // caso benigno "piatto vecchio, scelte vuote").
    expect(ordineOperazioni).toEqual(['delete', 'upsert']);

    const [chiamateDelete, chiamateUpsert] = scritture['meal_slot_choice'];
    const del = chiamateDelete.find((c) => c.metodo === 'delete')!;
    expect(del).toBeDefined();
    expect(chiamateDelete.some((c) => c.metodo === 'eq' && c.args[0] === 'meal_slot_id' && c.args[1] === 'slot-1')).toBe(true);
    // Difesa in profondità come tutte le altre scritture del file.
    expect(chiamateDelete.some((c) => c.metodo === 'eq' && c.args[0] === 'user_id' && c.args[1] === 'user-1')).toBe(true);

    const ups = chiamateUpsert.find((c) => c.metodo === 'upsert')!;
    expect(ups.args[0]).toEqual([
      { user_id: 'user-1', meal_slot_id: 'slot-1', componente_id: 'comp1', option_id: 'opt-nuova', fonte: 'planner' },
    ]);
    expect(ups.args[1]).toEqual({ onConflict: 'meal_slot_id,componente_id' });

    // dish_id è comunque scritto su meal_slot, percorso indipendente.
    const updateMealSlot = scritture['meal_slot'][1].find((c) => c.metodo === 'update')!;
    expect(updateMealSlot.args[0]).toMatchObject({ dish_id: 'piatto-nuovo' });
  });

  it('solo scelte, senza cambio di piatto: nessuna delete, solo upsert', async () => {
    const rigaAttuale = {
      id: 'slot-1', data: '2026-08-31', slot_def_id: 'cen',
      stato: 'casa', dish_id: 'piatto-1', fonte_stato: 'default',
    };
    const { sb, scritture, ordineOperazioni } = creaMockAggiornaSlot(rigaAttuale);
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot(
      'slot-1',
      { scelte: { comp1: { opzioneId: 'opt-manuale', fonte: 'manuale' } } },
      'correzione',
    );

    expect(ordineOperazioni).toEqual(['upsert']);
    expect(scritture['meal_slot_choice']).toHaveLength(1);
    const ups = scritture['meal_slot_choice'][0].find((c) => c.metodo === 'upsert')!;
    expect(ups.args[0]).toEqual([
      { user_id: 'user-1', meal_slot_id: 'slot-1', componente_id: 'comp1', option_id: 'opt-manuale', fonte: 'manuale' },
    ]);
  });

  it('dishId invariato (stesso di quello già registrato) con nuove scelte: non cancella nulla, solo upsert del componente nominato', async () => {
    // Il caso del Task 9: il piatto non cambia, si corregge a mano un solo
    // componente. Cancellare tutte le meal_slot_choice qui perderebbe le
    // scelte degli altri componenti dello stesso piatto, non nominati nel patch.
    const rigaAttuale = {
      id: 'slot-1', data: '2026-08-31', slot_def_id: 'cen',
      stato: 'casa', dish_id: 'piatto-1', fonte_stato: 'default',
    };
    const { sb, scritture, ordineOperazioni } = creaMockAggiornaSlot(rigaAttuale);
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot(
      'slot-1',
      { dishId: 'piatto-1', scelte: { comp2: { opzioneId: 'opt-nuova', fonte: 'manuale' } } },
      'correzione',
    );

    expect(ordineOperazioni).toEqual(['upsert']);
    expect(scritture['meal_slot_choice']).toHaveLength(1);
    const ups = scritture['meal_slot_choice'][0].find((c) => c.metodo === 'upsert')!;
    expect(ups.args[0]).toEqual([
      { user_id: 'user-1', meal_slot_id: 'slot-1', componente_id: 'comp2', option_id: 'opt-nuova', fonte: 'manuale' },
    ]);
  });
});