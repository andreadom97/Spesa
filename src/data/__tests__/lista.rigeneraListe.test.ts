import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../settimana', () => ({ leggiSlotSettimana: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { leggiSlotSettimana } from '../settimana';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { leggiDispensa } from '../dispensa';
import { leggiImpostazioni } from '../impostazioni';
import { rigeneraListe } from '../lista';

beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

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
    sb: { from },
    scritture,
  };
}

const LISTE = [{ id: 'l-base', tipo: 'base' }, { id: 'l-topup', tipo: 'topup' }];

/** Una riga manuale com'è in shopping_list_item, spuntata: la spunta deve azzerarsi al reinserimento. */
const MANUALE_BASE = {
  id: 'item-manuale', user_id: 'user-1', shopping_list_id: 'l-base', ingredient_id: 'ing-caffe',
  fabbisogno: 0, residuo: 0, confezioni: 1, quantita_totale: 250, unita: 'g', area: 'dispensa',
  spuntato: true, spuntato_il: '2026-09-14T10:00:00Z', origine: 'manuale',
};

/** Le dipendenze di generaListe: piano vuoto, così scrive solo le liste e nessuna voce. */
function preparaGenerazione() {
  vi.mocked(leggiSlotSettimana).mockResolvedValue([]);
  vi.mocked(leggiRepertorio).mockResolvedValue([]);
  vi.mocked(leggiIngredienti).mockResolvedValue([]);
  vi.mocked(leggiDispensa).mockResolvedValue([]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

/**
 * Il client finto per una settimana nello `stato` dato: `shopping_list` risponde
 * con le due liste alle letture e con l'id alla upsert di generaListe;
 * `shopping_list_item` risponde con `manuali` alla lettura delle righe manuali.
 */
function preparaClient(stato: string, manuali: Array<Record<string, unknown>> = []) {
  const { sb, scritture } = creaClientMock((tabella, chiamate) => {
    if (tabella === 'week') return { data: { stato }, error: null };
    if (tabella === 'shopping_list') {
      if (chiamate.some((c) => c.metodo === 'upsert')) {
        const tipo = (chiamate.find((c) => c.metodo === 'upsert')!.args[0] as { tipo: string }).tipo;
        return { data: { id: tipo === 'base' ? 'l-base' : 'l-topup' }, error: null };
      }
      return { data: LISTE, error: null };
    }
    if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
      return { data: manuali, error: null };
    }
    return { data: null, error: null };
  });
  vi.mocked(client).mockReturnValue(sb as never);
  return scritture;
}

describe('rigeneraListe', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotSettimana).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('senza settimana lancia "settimana non trovata" e non tocca niente', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rigeneraListe('week-1')).rejects.toThrow('settimana non trovata');

    expect(leggiSlotSettimana).not.toHaveBeenCalled();
    expect(scritture['shopping_list']).toBeUndefined();
    expect(scritture['shopping_list_item']).toBeUndefined();
  });

  it('in bozza lancia "lista non ancora creata": qui si lancia, non si esce a vuoto', async () => {
    const scritture = preparaClient('bozza');

    await expect(rigeneraListe('week-1')).rejects.toThrow('lista non ancora creata');

    expect(leggiSlotSettimana).not.toHaveBeenCalled();
    expect(scritture['shopping_list']).toBeUndefined();
    expect(scritture['shopping_list_item']).toBeUndefined();
  });

  it('a spesa chiusa lancia "spesa già chiusa" senza rigenerare', async () => {
    const scritture = preparaClient('chiusa');

    await expect(rigeneraListe('week-1')).rejects.toThrow('spesa già chiusa');

    expect(leggiSlotSettimana).not.toHaveBeenCalled();
    expect(scritture['shopping_list']).toBeUndefined();
    expect(scritture['shopping_list_item']).toBeUndefined();
  });

  it('a settimana confermata chiama generaListe una volta', async () => {
    preparaGenerazione();
    const scritture = preparaClient('confermata');

    await rigeneraListe('week-1');

    expect(leggiSlotSettimana).toHaveBeenCalledTimes(1);
    expect(leggiSlotSettimana).toHaveBeenCalledWith('week-1');
    // La upsert di shopping_list per tipo è la firma di generaListe: una per lista.
    const upsert = (scritture['shopping_list'] ?? []).filter((c) => c.some((x) => x.metodo === 'upsert'));
    expect(upsert).toHaveLength(2);
  });

  it('le righe manuali si leggono prima della generazione e si reinseriscono dopo, con spuntato false e nella stessa lista', async () => {
    preparaGenerazione();
    const scritture = preparaClient('confermata', [MANUALE_BASE]);

    await rigeneraListe('week-1');

    const catene = scritture['shopping_list_item'] ?? [];
    const iLettura = catene.findIndex((c) => c.some((x) => x.metodo === 'select'));
    const iDelete = catene.findIndex((c) => c.some((x) => x.metodo === 'delete'));
    const iReinserimento = catene.findIndex((c) => c.some((x) => x.metodo === 'upsert'));
    expect(iLettura).toBeGreaterThanOrEqual(0);
    expect(iDelete).toBeGreaterThan(iLettura);
    expect(iReinserimento).toBeGreaterThan(iDelete);

    // Solo le manuali: le righe di piano e i controlli le riscrive generaListe.
    expect(catene[iLettura]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['origine', 'manuale'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));

    const reinserimento = catene[iReinserimento].find((x) => x.metodo === 'upsert')!;
    // ignoreDuplicates: se il piano di adesso chiede lo stesso ingrediente,
    // la riga di piano appena scritta resta e la manuale non fa fallire tutto
    // contro l'unique (shopping_list_id, ingredient_id).
    expect(reinserimento.args[1]).toEqual({ onConflict: 'shopping_list_id,ingredient_id', ignoreDuplicates: true });
    expect(reinserimento.args[0]).toEqual([{
      user_id: 'user-1', shopping_list_id: 'l-base', ingredient_id: 'ing-caffe',
      fabbisogno: 0, residuo: 0, confezioni: 1, quantita_totale: 250, unita: 'g', area: 'dispensa',
      spuntato: false, spuntato_il: null, origine: 'manuale',
    }]);
  });

  it('senza righe manuali non scrive nessuna riga oltre a quelle di generaListe', async () => {
    preparaGenerazione();
    const scritture = preparaClient('confermata', []);

    await rigeneraListe('week-1');

    const catene = (scritture['shopping_list_item'] ?? []).flat();
    expect(catene.some((c) => c.metodo === 'upsert' || c.metodo === 'insert')).toBe(false);
  });

  it('un errore nella lettura delle righe manuali si propaga prima di generare', async () => {
    preparaGenerazione();
    const { sb } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'shopping_list') return { data: LISTE, error: null };
      if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
        return { data: null, error: { message: 'boom' } };
      }
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(rigeneraListe('week-1')).rejects.toEqual({ message: 'boom' });
    expect(leggiSlotSettimana).not.toHaveBeenCalled();
  });
});
