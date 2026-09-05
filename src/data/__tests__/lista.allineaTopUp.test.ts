import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Dish, Ingredient, MealSlot } from '@/domain/types';

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
import { allineaTopUp } from '../lista';

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura minimale degli altri test di questo modulo. */
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
      in: registra('in'),
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

const BANANA: Ingredient = {
  id: 'ing-banana', nome: 'Banana', unitaBase: 'pz', area: 'ortofrutta',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 1, prezzoConfezione: null,
};
const RISO: Ingredient = {
  id: 'ing-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null,
};

const PIATTO: Dish = {
  id: 'd-1', nome: 'Spuntino', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'ing-banana', quantita: 1, unita: 'pz' }],
  componenti: [],
};

const SLOT: MealSlot[] = [
  {
    id: 's-1', data: '2026-08-28', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {},
    porzioniPreparate: 0, daPronti: false,
  },
];

const IMPOSTAZIONI = {
  moltiplicatorePorzioni: 1,
  ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const,
  settimaneCiclo: 1,
  cicloOrigine: null,
};

function preparaPiano() {
  vi.mocked(leggiSlotSettimana).mockResolvedValue(SLOT);
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([BANANA, RISO]);
  vi.mocked(leggiDispensa).mockResolvedValue([]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI, ordineAree: [...IMPOSTAZIONI.ordineAree] });
}

describe('allineaTopUp', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotSettimana).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('aggiunge al top-up quello che il piano chiede e la lista non ha', async () => {
    // Il caso reale: la spesa è fatta, poi si mette una banana nello spuntino.
    preparaPiano();
    const { sb, scritture } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list') {
        return { data: [{ id: 'l-base', tipo: 'base' }, { id: 'l-topup', tipo: 'topup' }], error: null };
      }
      if (tabella === 'shopping_list_item') return { data: [], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    const aggiunte = await allineaTopUp('week-1');

    expect(aggiunte).toBe(1);
    const insert = scritture['shopping_list_item']
      ?.flat()
      .find((c) => c.metodo === 'upsert');
    expect(insert).toBeDefined();
    // ignoreDuplicates: due caricamenti ravvicinati non devono far fallire il
    // secondo contro l'unique (shopping_list_id, ingredient_id).
    expect(insert!.args[1]).toEqual({
      onConflict: 'shopping_list_id,ingredient_id',
      ignoreDuplicates: true,
    });
    const righe = insert!.args[0] as Array<Record<string, unknown>>;
    expect(righe).toHaveLength(1);
    // Nel top-up, non nella base: la spesa grossa è già stata fatta.
    expect(righe[0].shopping_list_id).toBe('l-topup');
    expect(righe[0].ingredient_id).toBe('ing-banana');
    expect(righe[0].confezioni).toBe(1);
  });

  it('non tocca niente se quello che serve è già in lista', async () => {
    // Vale anche quando la voce sta nella base e non nel top-up: contano
    // entrambe, altrimenti si comprerebbe due volte la stessa cosa.
    preparaPiano();
    const { sb, scritture } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list') {
        return { data: [{ id: 'l-base', tipo: 'base' }, { id: 'l-topup', tipo: 'topup' }], error: null };
      }
      if (tabella === 'shopping_list_item') return { data: [{ ingredient_id: 'ing-banana' }], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    const aggiunte = await allineaTopUp('week-1');

    expect(aggiunte).toBe(0);
    const insert = scritture['shopping_list_item']?.flat().find((c) => c.metodo === 'upsert');
    expect(insert).toBeUndefined();
  });

  it('non fa nulla se la settimana non ha ancora liste', async () => {
    // Nessuna conferma ancora data: crearla qui scavalcherebbe l'utente.
    preparaPiano();
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list') return { data: [], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    expect(await allineaTopUp('week-1')).toBe(0);
    // Non ha nemmeno ricalcolato: niente liste, niente da allineare.
    expect(leggiSlotSettimana).not.toHaveBeenCalled();
  });

  it('non inserisce i controlli staple, che non nascono da un cambio di piano', async () => {
    // Riso 'porzionabile' non usato da nessun piatto: non è fabbisogno, e un
    // eventuale controllo dei 90 giorni non è roba di questa funzione.
    vi.mocked(leggiSlotSettimana).mockResolvedValue([]);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    vi.mocked(leggiIngredienti).mockResolvedValue([RISO]);
    vi.mocked(leggiDispensa).mockResolvedValue([
      { ingredientId: 'ing-riso', residuo: 0, ultimoAcquisto: '2020-01-01', giorniStimati: 90, ultimoCheck: null, congelato: false },
    ]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI, ordineAree: [...IMPOSTAZIONI.ordineAree] });

    const { sb, scritture } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list') {
        return { data: [{ id: 'l-base', tipo: 'base' }, { id: 'l-topup', tipo: 'topup' }], error: null };
      }
      if (tabella === 'shopping_list_item') return { data: [], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    expect(await allineaTopUp('week-1')).toBe(0);
    expect(scritture['shopping_list_item']?.flat().find((c) => c.metodo === 'upsert')).toBeUndefined();
  });
});
