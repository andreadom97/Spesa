import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { leggiRisparmioSettimana, leggiRisparmioTotale } from '../risparmio';

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura minimale di lista.generaListe.test.ts, solo lettura. */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const letture: Record<string, Chiamata[][]> = {};

  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'),
      eq: registra('eq'),
      returns: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (letture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return { sb: { from }, letture };
}

/** Le righe come tornano da Supabase: numeric come stringhe, int come numeri, join su ingredient. */
const RIGA_AVENA = {
  ingredient_id: 'avena', fabbisogno: '250', confezioni_ingenue: 1, confezioni_reali: 0,
  confezioni_evitate: 1, quantita_evitata: '500', unita: 'g', prezzo_confezione: '2.5',
  ingredient: { nome: "Fiocchi d'avena" },
};
const RIGA_YOGURT = {
  ingredient_id: 'yogurt', fabbisogno: '750', confezioni_ingenue: 2, confezioni_reali: 2,
  confezioni_evitate: 0, quantita_evitata: '0', unita: 'g', prezzo_confezione: null,
  ingredient: { nome: 'Yogurt greco' },
};

const VOCE_AVENA = {
  ingredientId: 'avena', nome: "Fiocchi d'avena", unita: 'g', fabbisogno: 250,
  confezioniIngenue: 1, confezioniReali: 0, confezioniEvitate: 1,
  quantitaEvitata: 500, prezzoConfezione: 2.5,
};
const VOCE_YOGURT = {
  ingredientId: 'yogurt', nome: 'Yogurt greco', unita: 'g', fabbisogno: 750,
  confezioniIngenue: 2, confezioniReali: 2, confezioniEvitate: 0,
  quantitaEvitata: 0, prezzoConfezione: null,
};

describe('leggiRisparmioSettimana', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('mappa le colonne di risparmio_settimana a VoceEvitata, numeri via Number e prezzo null → null', async () => {
    const { sb, letture } = creaClientMock(() => ({ data: [RIGA_YOGURT, RIGA_AVENA], error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    const voci = await leggiRisparmioSettimana('week-1');

    // Ordine per nome, come costruisciLista.
    expect(voci).toEqual([VOCE_AVENA, VOCE_YOGURT]);
    const catena = letture['risparmio_settimana'][0];
    expect(catena).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week_id', 'week-1'] },
    ]));
    // Il nome arriva dalla join su ingredient, non da una colonna della tabella.
    expect(String(catena.find((c) => c.metodo === 'select')?.args[0])).toContain('ingredient(nome)');
  });

  it('senza righe restituisce []', async () => {
    const { sb } = creaClientMock(() => ({ data: [], error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(leggiRisparmioSettimana('week-1')).resolves.toEqual([]);
  });

  it('un errore Supabase viene propagato', async () => {
    const { sb } = creaClientMock(() => ({ data: null, error: { message: 'boom' } }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(leggiRisparmioSettimana('week-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('leggiRisparmioTotale', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
  });

  it('legge solo le settimane chiuse: join inner su week e filtro su week.stato', async () => {
    const { sb, letture } = creaClientMock(() => ({ data: [RIGA_AVENA], error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    const voci = await leggiRisparmioTotale();

    expect(voci).toEqual([VOCE_AVENA]);
    const catena = letture['risparmio_settimana'][0];
    expect(String(catena.find((c) => c.metodo === 'select')?.args[0])).toContain('week!inner(stato)');
    expect(catena).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week.stato', 'chiusa'] },
    ]));
  });

  it('senza righe restituisce []', async () => {
    const { sb } = creaClientMock(() => ({ data: [], error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(leggiRisparmioTotale()).resolves.toEqual([]);
  });

  it('un errore Supabase viene propagato', async () => {
    const { sb } = creaClientMock(() => ({ data: null, error: { message: 'boom' } }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(leggiRisparmioTotale()).rejects.toEqual({ message: 'boom' });
  });
});
