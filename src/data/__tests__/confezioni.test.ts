import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { leggiVociComprate, aggiornaFormatoDaScansione } from '../confezioni';

beforeEach(() => {
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
  vi.mocked(client).mockReset();
});

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura minimale di lista.chiudiSpesa.test.ts: registra le catene per tabella, risolve alla `await`. */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const catene: Record<string, Chiamata[][]> = {};

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
      update: registra('update'),
      returns: () => proxy,
      maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (catene[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return { sb: { from }, catene };
}

const ING_PASTA = { nome: 'Pasta', classe_residuo: 'porzionabile', formato_confezione: '1000', ean: '8076800105735' };
const ING_YOGURT = { nome: 'Yogurt greco', classe_residuo: 'porzionabile', formato_confezione: '500', ean: null };
const ING_OLIO = { nome: 'Olio', classe_residuo: 'stima', formato_confezione: '1000', ean: null };
const ING_UOVA = { nome: 'Uova', classe_residuo: 'intero', formato_confezione: '1', ean: null };
const ING_ACETO = { nome: 'Aceto', classe_residuo: 'porzionabile', formato_confezione: '500', ean: null };

describe('leggiVociComprate', () => {
  it('tiene solo le voci spuntate, di origine piano o manuale, con almeno una confezione', async () => {
    const { sb, catene } = creaClientMock(() => ({
      data: [
        {
          id: 'lista-base',
          shopping_list_item: [
            { id: 'r-yogurt', ingredient_id: 'ing-yogurt', confezioni: 2, quantita_totale: '1000', spuntato: true, origine: 'piano', unita: 'g', ingredient: ING_YOGURT },
            // Non spuntata: non comprata.
            { id: 'r-uova', ingredient_id: 'ing-uova', confezioni: 6, quantita_totale: '6', spuntato: false, origine: 'piano', unita: 'pz', ingredient: ING_UOVA },
            // Controllo staple: non è un acquisto.
            { id: 'r-olio', ingredient_id: 'ing-olio', confezioni: 1, quantita_totale: '1000', spuntato: true, origine: 'controllo', unita: 'ml', ingredient: ING_OLIO },
          ],
        },
        {
          id: 'lista-topup',
          shopping_list_item: [
            { id: 'r-pasta', ingredient_id: 'ing-pasta', confezioni: 1, quantita_totale: '1000', spuntato: true, origine: 'manuale', unita: 'g', ingredient: ING_PASTA },
            // Zero confezioni (controllo risposto "sì"): niente da scansionare.
            { id: 'r-aceto', ingredient_id: 'ing-aceto', confezioni: 0, quantita_totale: '0', spuntato: true, origine: 'piano', unita: 'ml', ingredient: ING_ACETO },
          ],
        },
      ],
      error: null,
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    const voci = await leggiVociComprate('week-1');

    // In ordine di nome, numeric di Postgres convertiti, ean dall'ingrediente.
    expect(voci).toEqual([
      {
        itemId: 'r-pasta', ingredientId: 'ing-pasta', nome: 'Pasta', unita: 'g',
        classeResiduo: 'porzionabile', confezioni: 1, formato: 1000, quantitaTotale: 1000,
        ean: '8076800105735',
      },
      {
        itemId: 'r-yogurt', ingredientId: 'ing-yogurt', nome: 'Yogurt greco', unita: 'g',
        classeResiduo: 'porzionabile', confezioni: 2, formato: 500, quantitaTotale: 1000,
        ean: null,
      },
    ]);
    // La lettura è della settimana e della casa.
    expect(catene['shopping_list'][0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week_id', 'week-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
    const select = catene['shopping_list'][0].find((c) => c.metodo === 'select')?.args[0];
    expect(select).toContain('ingredient(nome, classe_residuo, formato_confezione, ean)');
  });

  it('senza liste restituisce un elenco vuoto', async () => {
    const { sb } = creaClientMock(() => ({ data: [], error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    expect(await leggiVociComprate('week-1')).toEqual([]);
  });

  it('un errore Supabase viene propagato', async () => {
    const { sb } = creaClientMock(() => ({ data: null, error: { message: 'boom' } }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(leggiVociComprate('week-1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('aggiornaFormatoDaScansione', () => {
  /** Settimana aperta, due liste, la pasta in entrambe (1 e 2 confezioni) più un controllo a 0. */
  function preparaSettimana(stato = 'confermata') {
    const mock = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato }, error: null };
      if (tabella === 'shopping_list') return { data: [{ id: 'lista-base' }, { id: 'lista-topup' }], error: null };
      if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
        return {
          data: [
            { id: 'r-base', confezioni: 1 },
            { id: 'r-topup', confezioni: 2 },
            { id: 'r-controllo', confezioni: 0 },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(mock.sb as never);
    return mock.catene;
  }

  it('scrive formato ed ean sull\'ingrediente, filtrando per id e casa', async () => {
    const catene = preparaSettimana();

    await aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: '8076800105735' });

    expect(catene['ingredient']).toHaveLength(1);
    expect(catene['ingredient'][0]).toEqual([
      { metodo: 'update', args: [{ formato_confezione: 500, ean: '8076800105735' }] },
      { metodo: 'eq', args: ['id', 'ing-pasta'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]);
  });

  it('senza ean aggiorna solo il formato: l\'ultimo codice memorizzato resta', async () => {
    const catene = preparaSettimana();

    await aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: null });

    const update = catene['ingredient'][0].find((c) => c.metodo === 'update')?.args[0] as Record<string, unknown>;
    expect(update).toEqual({ formato_confezione: 500 });
    expect('ean' in update).toBe(false);
  });

  it('riscrive quantita_totale = confezioni × formato su ogni riga comprata della settimana', async () => {
    const catene = preparaSettimana();

    await aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: null });

    // Le liste della settimana, poi le righe dell'ingrediente in quelle liste.
    expect(catene['shopping_list'][0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week_id', 'week-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
    const [lettura, ...scritture] = catene['shopping_list_item'];
    expect(lettura).toEqual(expect.arrayContaining([
      { metodo: 'select', args: ['id, confezioni'] },
      { metodo: 'in', args: ['shopping_list_id', ['lista-base', 'lista-topup']] },
      { metodo: 'eq', args: ['ingredient_id', 'ing-pasta'] },
    ]));
    // Una scrittura per riga con confezioni, nessuna per il controllo a 0.
    expect(scritture).toEqual([
      [
        { metodo: 'update', args: [{ quantita_totale: 500 }] },
        { metodo: 'eq', args: ['id', 'r-base'] },
        { metodo: 'eq', args: ['user_id', 'user-1'] },
      ],
      [
        { metodo: 'update', args: [{ quantita_totale: 1000 }] },
        { metodo: 'eq', args: ['id', 'r-topup'] },
        { metodo: 'eq', args: ['user_id', 'user-1'] },
      ],
    ]);
  });

  it('a settimana chiusa lancia "spesa già chiusa" senza scrivere nulla', async () => {
    const catene = preparaSettimana('chiusa');

    await expect(
      aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: '8076800105735' }),
    ).rejects.toThrow('spesa già chiusa');

    expect(catene['ingredient']).toBeUndefined();
    expect(catene['shopping_list']).toBeUndefined();
    expect(catene['shopping_list_item']).toBeUndefined();
  });

  it('con una settimana che non esiste lancia senza scrivere', async () => {
    const { sb, catene } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-x', formato: 500, ean: null }),
    ).rejects.toThrow('settimana non trovata');
    expect(catene['ingredient']).toBeUndefined();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('con formato %s lancia "formato non valido" prima di toccare il database', async (formato) => {
    const catene = preparaSettimana();

    await expect(
      aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato, ean: null }),
    ).rejects.toThrow('formato non valido');

    expect(catene).toEqual({});
    expect(idCasa).not.toHaveBeenCalled();
  });

  it('un errore sulla scrittura dell\'ingrediente viene propagato prima delle righe', async () => {
    const { sb, catene } = creaClientMock((tabella) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'ingredient') return { data: null, error: { message: 'boom' } };
      return { data: [], error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: null }),
    ).rejects.toEqual({ message: 'boom' });
    expect(catene['shopping_list_item']).toBeUndefined();
  });
});
