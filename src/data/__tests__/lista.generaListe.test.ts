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
import {
  INGREDIENTI, PIATTI, IMPOSTAZIONI, dispensaVuota, cinqueColazioni,
} from '@/domain/__tests__/fixtures';

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
    expect(scritture['risparmio_settimana']).toBeUndefined();
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
      settimaneCiclo: 1,
      cicloOrigine: null,
    });

    await generaListe('week-1');

    expect(leggiSlotSettimana).toHaveBeenCalledWith('week-1');
  });
});

describe('generaListe — risparmio_settimana (il non ricomprato fissato alla generazione)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiSlotSettimana).mockReset();
    vi.mocked(leggiRepertorio).mockReset();
    vi.mocked(leggiIngredienti).mockReset();
    vi.mocked(leggiDispensa).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  /**
   * Settimana confermata con le cinque colazioni delle fixture di dominio:
   * yogurt 750 g (residuo zero → niente evitato) e avena 250 g con 900 g in
   * dispensa (non deperibile: il residuo vale qualunque sia "oggi") → una
   * confezione da 500 g non ricomprata. L'avena ha un prezzo, lo yogurt no.
   */
  function preparaSettimana(
    slots = cinqueColazioni(),
    risolviAltro: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown } =
      () => ({ data: null, error: null }),
  ) {
    const { sb, scritture } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'shopping_list') return { data: { id: 'lista-1' }, error: null };
      return risolviAltro(tabella, chiamate);
    });
    vi.mocked(client).mockReturnValue(sb as never);
    vi.mocked(leggiSlotSettimana).mockResolvedValue(slots);
    vi.mocked(leggiRepertorio).mockResolvedValue(PIATTI);
    vi.mocked(leggiIngredienti).mockResolvedValue(INGREDIENTI.map((i) =>
      i.id === 'avena' ? { ...i, prezzoConfezione: 2.5 } : i));
    vi.mocked(leggiDispensa).mockResolvedValue(dispensaVuota().map((p) =>
      p.ingredientId === 'avena' ? { ...p, residuo: 900 } : p));
    vi.mocked(leggiImpostazioni).mockResolvedValue(IMPOSTAZIONI);
    return scritture;
  }

  it('scrive una riga per ogni voce di evitato, con le colonne della migrazione 0011', async () => {
    const scritture = preparaSettimana();

    await generaListe('week-1');

    const righe = (scritture['risparmio_settimana'] ?? [])
      .flat()
      .find((c) => c.metodo === 'insert')?.args[0];
    // Stesso ordine di costruisciLista (per nome), prezzo copiato come
    // istantanea, e anche lo yogurt con zero evitate: è il denominatore.
    expect(righe).toEqual([
      {
        user_id: 'user-1', week_id: 'week-1', ingredient_id: 'avena',
        fabbisogno: 250, confezioni_ingenue: 1, confezioni_reali: 0, confezioni_evitate: 1,
        quantita_evitata: 500, unita: 'g', prezzo_confezione: 2.5,
      },
      {
        user_id: 'user-1', week_id: 'week-1', ingredient_id: 'yogurt',
        fabbisogno: 750, confezioni_ingenue: 2, confezioni_reali: 2, confezioni_evitate: 0,
        quantita_evitata: 0, unita: 'g', prezzo_confezione: null,
      },
    ]);
  });

  it('cancella le righe della settimana (dell\'utente) prima di inserire le nuove', async () => {
    const scritture = preparaSettimana();

    await generaListe('week-1');

    const catene = scritture['risparmio_settimana'] ?? [];
    expect(catene).toHaveLength(2);
    expect(catene[0].some((c) => c.metodo === 'delete')).toBe(true);
    expect(catene[0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week_id', 'week-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
    expect(catene[1].some((c) => c.metodo === 'insert')).toBe(true);
  });

  it('con evitato vuoto cancella le righe vecchie ma non inserisce niente', async () => {
    // Nessuno slot: nessun fabbisogno, nessuna voce nel denominatore. Le
    // righe di una generazione precedente vanno comunque via: la settimana
    // ora non ha piano e non deve raccontare un risparmio che non c'è più.
    const scritture = preparaSettimana([]);

    await generaListe('week-1');

    const catene = scritture['risparmio_settimana'] ?? [];
    expect(catene).toHaveLength(1);
    expect(catene[0].some((c) => c.metodo === 'delete')).toBe(true);
    expect(catene.flat().some((c) => c.metodo === 'insert')).toBe(false);
  });

  it('un errore Supabase sull\'insert viene propagato', async () => {
    preparaSettimana(cinqueColazioni(), (tabella, chiamate) =>
      tabella === 'risparmio_settimana' && chiamate.some((c) => c.metodo === 'insert')
        ? { data: null, error: { message: 'boom' } }
        : { data: null, error: null });

    await expect(generaListe('week-1')).rejects.toEqual({ message: 'boom' });
  });
});
