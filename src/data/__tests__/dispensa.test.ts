import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { rispondiControllo, impostaCongelato, impostaScadenza, aggiungiConfezione } from '../dispensa';

// L'id che finisce in `user_id` non viene più da `auth.getUser` sul client
// finto ma da `idCasa()` (l'account della casa): lo stesso valore di prima,
// così i payload attesi non cambiano.
beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

interface Chiamata { metodo: string; args: unknown[] }

/**
 * Stessa controfigura minimale del query builder di supabase-js usata in
 * lista.chiudiSpesa.test.ts: ogni `.from(table)` apre una catena che
 * registra i metodi invocati e si risolve solo quando viene messa in
 * `await`, con il risultato deciso da `risolvi(table, chiamate)`.
 */
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
      update: registra('update'),
      upsert: registra('upsert'),
      delete: registra('delete'),
      // Registrati anche loro: con zero righe supabase-js risponde in modo
      // diverso (`.single()` errore PGRST116, `.maybeSingle()` data null).
      single: registra('single'),
      maybeSingle: registra('maybeSingle'),
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return {
    sb: { from },
    scritture,
  };
}

const RISOLVI_OK = () => ({ data: null, error: null });

describe('rispondiControllo', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('"sì" scrive ultimo_check su pantry_state *e* cancella la riga di controllo da shopping_list_item, non solo la nasconde in locale', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await rispondiControllo('ing-olio', 'lista-base-1', true);

    // pantry_state: ultimo_check scritto per il giusto ingrediente e utente.
    const scrittePantry = scritture['pantry_state'] ?? [];
    expect(scrittePantry).toHaveLength(1);
    const patchPantry = scrittePantry[0].find((c) => c.metodo === 'update')?.args[0];
    expect(patchPantry).toHaveProperty('ultimo_check');
    expect(scrittePantry[0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['ingredient_id', 'ing-olio'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));

    // shopping_list_item: la riga del controllo viene DAVVERO cancellata dal
    // server — senza questa delete resterebbe con origine='controllo' e
    // confezioni=0, cioè "controllo in sospeso" per sempre (vedi C2).
    const scritteItem = scritture['shopping_list_item'] ?? [];
    expect(scritteItem).toHaveLength(1);
    expect(scritteItem[0].some((c) => c.metodo === 'delete')).toBe(true);
    expect(scritteItem[0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['shopping_list_id', 'lista-base-1'] },
      { metodo: 'eq', args: ['ingredient_id', 'ing-olio'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
  });

  it('se la cancellazione della riga di controllo fallisce, propaga l\'errore invece di far finta che sia andato tutto bene', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'shopping_list_item') return { data: null, error: { message: 'boom' } };
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rispondiControllo('ing-olio', 'lista-base-1', true)).rejects.toEqual({ message: 'boom' });
  });

  it('se la scrittura di ultimo_check fallisce, propaga l\'errore', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'pantry_state') return { data: null, error: { message: 'boom-pantry' } };
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rispondiControllo('ing-olio', 'lista-base-1', true)).rejects.toEqual({ message: 'boom-pantry' });
  });

  it('"no" continua a fare upsert su shopping_list_item, senza toccare la delete', async () => {
    const { sb, scritture } = creaClientMock((tabella) => {
      if (tabella === 'ingredient') {
        return { data: { area: 'dispensa', unita_base: 'ml', formato_confezione: 1000 }, error: null };
      }
      if (tabella === 'pantry_state') {
        return { data: { residuo: 50 }, error: null };
      }
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await rispondiControllo('ing-olio', 'lista-base-1', false);

    const scritteItem = scritture['shopping_list_item'] ?? [];
    expect(scritteItem).toHaveLength(1);
    expect(scritteItem[0].some((c) => c.metodo === 'upsert')).toBe(true);
    expect(scritteItem[0].some((c) => c.metodo === 'delete')).toBe(false);
  });

  it('"no" riesce anche senza la riga di dispensa (dopo Cancella la dispensa): il residuo vale 0', async () => {
    // Come risponde PostgREST a zero righe: `.single()` è un errore, `.maybeSingle()` no.
    const { sb, scritture } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'ingredient') {
        return { data: { area: 'dispensa', unita_base: 'ml', formato_confezione: 1000 }, error: null };
      }
      if (tabella === 'pantry_state') {
        return chiamate.some((c) => c.metodo === 'single')
          ? { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
          : { data: null, error: null };
      }
      return RISOLVI_OK();
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await rispondiControllo('ing-olio', 'lista-base-1', false);

    // Nessuna scrittura su pantry_state: il «no» scrive solo la voce in lista.
    expect((scritture['pantry_state'] ?? []).flat().some((c) => ['update', 'upsert', 'delete'].includes(c.metodo))).toBe(false);
    const upsert = scritture['shopping_list_item']?.[0]?.find((c) => c.metodo === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      ingredient_id: 'ing-olio', shopping_list_id: 'lista-base-1', residuo: 0,
      confezioni: 1, quantita_totale: 1000, origine: 'controllo',
    });
  });
});

describe('impostaCongelato', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('scrive congelato e cancella anche la data manuale (spec fase 4 §E.3)', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await impostaCongelato('ing-1', true);

    const patch = scritture['pantry_state']?.[0]?.find((c) => c.metodo === 'upsert')?.args[0];
    expect(patch).toEqual({ ingredient_id: 'ing-1', user_id: 'user-1', congelato: true, scadenza_manuale: null });
    expect(scritture['pantry_state']?.[0]?.find((c) => c.metodo === 'upsert')?.args[1]).toEqual({ onConflict: 'ingredient_id' });
  });
});

describe('impostaScadenza', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('scrive la data a mano', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await impostaScadenza('ing-1', '2026-10-02');

    const patch = scritture['pantry_state']?.[0]?.find((c) => c.metodo === 'upsert')?.args[0];
    expect(patch).toEqual({ ingredient_id: 'ing-1', user_id: 'user-1', scadenza_manuale: '2026-10-02' });
  });

  it('null scrive null: torna a USA LA STIMA', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await impostaScadenza('ing-1', null);

    const patch = scritture['pantry_state']?.[0]?.find((c) => c.metodo === 'upsert')?.args[0];
    expect(patch).toEqual({ ingredient_id: 'ing-1', user_id: 'user-1', scadenza_manuale: null });
  });

  it('rifiuta una stringa che non è una data yyyy-mm-dd, senza scrivere', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(impostaScadenza('ing-1', 'domani')).rejects.toThrow(/Data non valida/);
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('rifiuta una stringa vuota, senza scrivere: il dominio usa `??`, quindi una vuota non deve mai arrivare al database', async () => {
    const { sb, scritture } = creaClientMock(RISOLVI_OK);
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(impostaScadenza('ing-1', '')).rejects.toThrow(/Data non valida/);
    expect(scritture['pantry_state']).toBeUndefined();
  });
});

describe('aggiungiConfezione', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  function risolviIngredienteTrovato(righe: Array<{ id: string }> = [{ id: 'ing-1' }]) {
    return (tabella: string) => (tabella === 'ingredient' ? { data: righe, error: null } : RISOLVI_OK());
  }

  it('scrive formato ed ean sull ingrediente, poi accredita il residuo con acquisto a oggi', async () => {
    const { sb, scritture } = creaClientMock(risolviIngredienteTrovato());
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '8001234567890', residuoPrima: 600 });

    const chiamateIngrediente = scritture['ingredient']?.[0] ?? [];
    expect(chiamateIngrediente.find((c) => c.metodo === 'update')?.args[0])
      .toEqual({ formato_confezione: 450, ean: '8001234567890' });
    expect(chiamateIngrediente).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['id', 'ing-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
      { metodo: 'select', args: ['id'] },
    ]));

    const chiamataPantry = scritture['pantry_state']?.[0]?.find((c) => c.metodo === 'upsert');
    expect(chiamataPantry?.args[0]).toEqual({
      ingredient_id: 'ing-1', user_id: 'user-1', residuo: 1050,
      ultimo_acquisto: '2026-09-25', scadenza_manuale: null,
    });
    expect(chiamataPantry?.args[1]).toEqual({ onConflict: 'ingredient_id' });
  });

  it('zero righe da ingredient: lancia "ingrediente non trovato" e non scrive la pantry', async () => {
    const { sb, scritture } = creaClientMock(risolviIngredienteTrovato([]));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '8001234567890', residuoPrima: 600 }),
    ).rejects.toThrow(/ingrediente non trovato/);
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it.each([0, 200000])('formato %s fuori dai limiti: lancia senza scrivere niente', async (formato) => {
    const { sb, scritture } = creaClientMock(risolviIngredienteTrovato());
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato, ean: '8001234567890', residuoPrima: 600 }),
    ).rejects.toThrow(/formato non valido/);
    expect(scritture['ingredient']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('un ean troppo corto: lancia senza scrivere niente', async () => {
    const { sb, scritture } = creaClientMock(risolviIngredienteTrovato());
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '12', residuoPrima: 600 }),
    ).rejects.toThrow(/codice non valido/);
    expect(scritture['ingredient']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('un residuoPrima non numerico (NaN): lancia senza scrivere niente (review round 1)', async () => {
    const { sb, scritture } = creaClientMock(risolviIngredienteTrovato());
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '8001234567890', residuoPrima: Number.NaN }),
    ).rejects.toThrow(/residuo non valido/);
    expect(scritture['ingredient']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('se la update su ingredient fallisce, propaga l\'errore e non scrive la pantry', async () => {
    const { sb, scritture } = creaClientMock((tabella) =>
      tabella === 'ingredient' ? { data: null, error: { message: 'boom-ingredient' } } : RISOLVI_OK(),
    );
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '8001234567890', residuoPrima: 600 }),
    ).rejects.toEqual({ message: 'boom-ingredient' });
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('se la scrittura su pantry_state fallisce, propaga l\'errore', async () => {
    const { sb } = creaClientMock((tabella) =>
      tabella === 'pantry_state' ? { data: null, error: { message: 'boom-pantry' } } : risolviIngredienteTrovato()(tabella),
    );
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiungiConfezione({ ingredientId: 'ing-1', formato: 450, ean: '8001234567890', residuoPrima: 600 }),
    ).rejects.toEqual({ message: 'boom-pantry' });
  });
});
