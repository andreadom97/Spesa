import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ pastiDiDefault: vi.fn(), salvaSlotDefs: vi.fn() }));

import { client } from '../supabase';
import { pastiDiDefault, salvaSlotDefs } from '../impostazioni';
import { assicuraDatiIniziali } from '../primo-avvio';
import { INGREDIENTI_BASE } from '@/domain/ingredienti-base';

interface Chiamata { metodo: string; args: unknown[] }

interface Opzioni {
  /** Chi è autenticato; `null` = nessun utente. */
  utente?: { id: string } | null;
  /** Risposta dei conteggi `select('id', { count: 'exact', head: true })`, tabella per tabella. */
  conteggi?: Record<string, { count: number | null; error?: unknown }>;
  /** Risposta di tutto il resto (scritture), data la tabella e la catena di chiamate. */
  risolvi?: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown };
}

function eConteggio(chiamate: Chiamata[]): boolean {
  return chiamate.some(
    (c) => c.metodo === 'select'
      && (c.args[1] as { count?: string; head?: boolean } | undefined)?.count === 'exact'
      && (c.args[1] as { head?: boolean }).head === true,
  );
}

/**
 * La controfigura di lista.generaListe.test.ts, estesa ai conteggi: la
 * catena `select(..., { count, head }).eq(...)` risolve `{ count, error }`
 * invece di `{ data, error }`, e `auth.getUser` è configurabile.
 */
function creaClientMock(opzioni: Opzioni = {}) {
  const { utente = { id: 'user-1' }, conteggi = {}, risolvi = () => ({ data: null, error: null }) } = opzioni;
  const scritture: Record<string, Chiamata[][]> = {};
  const from = vi.fn((tabella: string) => {
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
        if (eConteggio(chiamate)) {
          const c = conteggi[tabella] ?? { count: 0 };
          return Promise.resolve({ count: c.count, error: c.error ?? null }).then(onFulfilled, onRejected);
        }
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  });
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: utente } }) }, from },
    scritture,
  };
}

/** Gli id che il DB restituirebbe all'insert in blocco degli ingredienti. */
function idFinti(n: number): { id: string }[] {
  return Array.from({ length: n }, (_, i) => ({ id: `ing-${i}` }));
}

describe('assicuraDatiIniziali', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(pastiDiDefault).mockReset();
    vi.mocked(salvaSlotDefs).mockReset();
  });

  it('senza utente autenticato non tocca nulla', async () => {
    const { sb } = creaClientMock({ utente: null });
    vi.mocked(client).mockReturnValue(sb as never);

    const esito = await assicuraDatiIniziali();

    expect(esito).toEqual({ pasti: false, ingredienti: false });
    expect(sb.from).not.toHaveBeenCalled();
    expect(salvaSlotDefs).not.toHaveBeenCalled();
  });

  it('con pasti e ingredienti già presenti scrive solo la riga settings', async () => {
    const { sb, scritture } = creaClientMock({
      conteggi: { meal_slot_def: { count: 3 }, ingredient: { count: 70 } },
    });
    vi.mocked(client).mockReturnValue(sb as never);

    const esito = await assicuraDatiIniziali();

    expect(esito).toEqual({ pasti: false, ingredienti: false });
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(scritture['ingredient']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
    expect(scritture['settings']).toHaveLength(1);
    const [upsert] = scritture['settings'][0];
    expect(upsert.metodo).toBe('upsert');
    expect(upsert.args[0]).toEqual({ user_id: 'user-1' });
    expect(upsert.args[1]).toEqual({ onConflict: 'user_id', ignoreDuplicates: true });
  });

  it('con tabelle vuote semina i pasti di default, i 71 ingredienti e 71 righe di dispensa', async () => {
    const pasti = [{ id: 'p-1' }, { id: 'p-2' }, { id: 'p-3' }, { id: 'p-4' }];
    vi.mocked(pastiDiDefault).mockReturnValue(pasti as never);
    vi.mocked(salvaSlotDefs).mockResolvedValue();
    const { sb, scritture } = creaClientMock({
      conteggi: { meal_slot_def: { count: 0 }, ingredient: { count: 0 } },
      risolvi: (tabella, chiamate) => {
        if (tabella === 'ingredient' && chiamate[0]?.metodo === 'insert') {
          const righe = chiamate[0].args[0] as unknown[];
          return { data: idFinti(righe.length), error: null };
        }
        return { data: null, error: null };
      },
    });
    vi.mocked(client).mockReturnValue(sb as never);

    const esito = await assicuraDatiIniziali();

    expect(esito).toEqual({ pasti: true, ingredienti: true });
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(salvaSlotDefs).toHaveBeenCalledWith(pasti);
    expect(scritture['settings']).toHaveLength(1);

    // Un solo insert in blocco, con le colonne dello schema e prezzo null.
    expect(scritture['ingredient']).toHaveLength(1);
    const [insert, select] = scritture['ingredient'][0];
    expect(insert.metodo).toBe('insert');
    expect(select.metodo).toBe('select');
    expect(select.args[0]).toBe('id');
    const righe = insert.args[0] as Record<string, unknown>[];
    expect(righe).toHaveLength(INGREDIENTI_BASE.length);
    expect(righe).toHaveLength(71);
    expect(righe[0]).toEqual({
      user_id: 'user-1',
      nome: 'Banane',
      unita_base: 'pz',
      area: 'ortofrutta',
      classe_residuo: 'intero',
      deperibile: true,
      formato_confezione: 1,
      prezzo_confezione: null,
    });
    expect(righe.every((r) => r.user_id === 'user-1' && r.prezzo_confezione === null)).toBe(true);
    expect(righe.map((r) => r.nome)).toEqual(INGREDIENTI_BASE.map((i) => i.nome));

    // Una riga di dispensa a residuo zero per ogni id restituito, senza
    // sovrascrivere quelle che esistessero già.
    expect(scritture['pantry_state']).toHaveLength(1);
    const [upsert] = scritture['pantry_state'][0];
    expect(upsert.metodo).toBe('upsert');
    const dispensa = upsert.args[0] as Record<string, unknown>[];
    expect(dispensa).toHaveLength(71);
    expect(dispensa[0]).toEqual({ ingredient_id: 'ing-0', user_id: 'user-1', residuo: 0 });
    expect(dispensa[70]).toEqual({ ingredient_id: 'ing-70', user_id: 'user-1', residuo: 0 });
    expect(upsert.args[1]).toEqual({ onConflict: 'ingredient_id', ignoreDuplicates: true });
  });

  it('semina solo ciò che manca: pasti presenti e ingredienti a zero', async () => {
    const { sb, scritture } = creaClientMock({
      conteggi: { meal_slot_def: { count: 4 }, ingredient: { count: 0 } },
      risolvi: (tabella, chiamate) => {
        if (tabella === 'ingredient' && chiamate[0]?.metodo === 'insert') {
          return { data: idFinti((chiamate[0].args[0] as unknown[]).length), error: null };
        }
        return { data: null, error: null };
      },
    });
    vi.mocked(client).mockReturnValue(sb as never);

    const esito = await assicuraDatiIniziali();

    expect(esito).toEqual({ pasti: false, ingredienti: true });
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(scritture['ingredient']).toHaveLength(1);
  });

  it('un errore sul conteggio propaga, prima di qualunque scrittura', async () => {
    const errore = new Error('conteggio fallito');
    const { sb, scritture } = creaClientMock({
      conteggi: { meal_slot_def: { count: null, error: errore }, ingredient: { count: 0 } },
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(assicuraDatiIniziali()).rejects.toBe(errore);
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(scritture['settings']).toBeUndefined();
    expect(scritture['ingredient']).toBeUndefined();
  });

  it("un errore sull'insert degli ingredienti propaga", async () => {
    const errore = new Error('insert fallito');
    const { sb, scritture } = creaClientMock({
      conteggi: { meal_slot_def: { count: 4 }, ingredient: { count: 0 } },
      risolvi: (tabella) => (tabella === 'ingredient' ? { data: null, error: errore } : { data: null, error: null }),
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(assicuraDatiIniziali()).rejects.toBe(errore);
    expect(scritture['pantry_state']).toBeUndefined();
  });
});
