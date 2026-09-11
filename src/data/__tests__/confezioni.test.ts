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
  /** Le tabelle nell'ordine in cui sono state interrogate (una voce per catena risolta). */
  const ordine: string[] = [];

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
        ordine.push(tabella);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }

  return { sb: { from }, catene, ordine };
}

const ING_PASTA = { nome: 'Pasta', classe_residuo: 'porzionabile', formato_confezione: '1000', ean: '8076800105735' };
const ING_YOGURT = { nome: 'Yogurt greco', classe_residuo: 'porzionabile', formato_confezione: '500', ean: null };
const ING_OLIO = { nome: 'Olio', classe_residuo: 'stima', formato_confezione: '1000', ean: null };
const ING_UOVA = { nome: 'Uova', classe_residuo: 'intero', formato_confezione: '1', ean: null };
const ING_ACETO = { nome: 'Aceto', classe_residuo: 'porzionabile', formato_confezione: '500', ean: null };

describe('leggiVociComprate', () => {
  it('tiene le voci spuntate di origine piano o manuale, anche a 0 confezioni; non i controlli', async () => {
    const { sb, catene } = creaClientMock(() => ({
      data: [
        {
          id: 'lista-base',
          tipo: 'base',
          shopping_list_item: [
            { id: 'r-yogurt', ingredient_id: 'ing-yogurt', fabbisogno: '750', residuo: '0', confezioni: 2, quantita_totale: '1000', spuntato: true, origine: 'piano', unita: 'g', ingredient: ING_YOGURT },
            // Non spuntata: non comprata.
            { id: 'r-uova', ingredient_id: 'ing-uova', fabbisogno: '6', residuo: '0', confezioni: 6, quantita_totale: '6', spuntato: false, origine: 'piano', unita: 'pz', ingredient: ING_UOVA },
            // Controllo staple: non è un acquisto.
            { id: 'r-olio', ingredient_id: 'ing-olio', fabbisogno: '0', residuo: '0', confezioni: 1, quantita_totale: '1000', spuntato: true, origine: 'controllo', unita: 'ml', ingredient: ING_OLIO },
          ],
        },
        {
          id: 'lista-topup',
          tipo: 'topup',
          shopping_list_item: [
            { id: 'r-pasta', ingredient_id: 'ing-pasta', fabbisogno: '820', residuo: '120', confezioni: 1, quantita_totale: '1000', spuntato: true, origine: 'manuale', unita: 'g', ingredient: ING_PASTA },
            // Zero confezioni su una riga di piano: scritta così da una
            // scansione ("non l'ho preso" o un refuso). Deve restare in
            // pagina, altrimenti non si può più correggere.
            { id: 'r-aceto', ingredient_id: 'ing-aceto', fabbisogno: '500', residuo: '0', confezioni: 0, quantita_totale: '0', spuntato: true, origine: 'piano', unita: 'ml', ingredient: ING_ACETO },
            // Un controllo staple risposto "sì" resta a 0: fuori per l'origine, non per le confezioni.
            { id: 'r-olio-zero', ingredient_id: 'ing-olio', fabbisogno: '0', residuo: '0', confezioni: 0, quantita_totale: '0', spuntato: true, origine: 'controllo', unita: 'ml', ingredient: ING_OLIO },
          ],
        },
      ],
      error: null,
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    const voci = await leggiVociComprate('week-1');

    // In ordine di nome, numeric di Postgres convertiti, ean dall'ingrediente,
    // fabbisogno e residuo congelati della riga.
    expect(voci).toEqual([
      {
        itemId: 'r-aceto', ingredientId: 'ing-aceto', nome: 'Aceto', unita: 'ml',
        classeResiduo: 'porzionabile', fabbisogno: 500, residuo: 0,
        confezioni: 0, formato: 500, quantitaTotale: 0,
        ean: null,
      },
      {
        itemId: 'r-pasta', ingredientId: 'ing-pasta', nome: 'Pasta', unita: 'g',
        classeResiduo: 'porzionabile', fabbisogno: 820, residuo: 120,
        confezioni: 1, formato: 1000, quantitaTotale: 1000,
        ean: '8076800105735',
      },
      {
        itemId: 'r-yogurt', ingredientId: 'ing-yogurt', nome: 'Yogurt greco', unita: 'g',
        classeResiduo: 'porzionabile', fabbisogno: 750, residuo: 0,
        confezioni: 2, formato: 500, quantitaTotale: 1000,
        ean: null,
      },
    ]);
    // La lettura è della settimana e della casa.
    expect(catene['shopping_list'][0]).toEqual(expect.arrayContaining([
      { metodo: 'eq', args: ['week_id', 'week-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
    const select = catene['shopping_list'][0].find((c) => c.metodo === 'select')?.args[0];
    expect(select).toContain('fabbisogno, residuo, confezioni');
    expect(select).toContain('ingredient(nome, classe_residuo, formato_confezione, ean)');
  });

  it('lo stesso ingrediente in base e top-up: prima la base, come la scrittura', async () => {
    const riga = (id: string) => ({
      id, ingredient_id: 'ing-pasta', fabbisogno: '500', residuo: '0', confezioni: 1, quantita_totale: '1000',
      spuntato: true, origine: 'piano', unita: 'g', ingredient: ING_PASTA,
    });
    const { sb } = creaClientMock(() => ({
      data: [
        { id: 'lista-topup', tipo: 'topup', shopping_list_item: [riga('r-topup')] },
        { id: 'lista-base', tipo: 'base', shopping_list_item: [riga('r-base')] },
      ],
      error: null,
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    expect((await leggiVociComprate('week-1')).map((v) => v.itemId)).toEqual(['r-base', 'r-topup']);
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
  const PASTA = { ingredientId: 'ing-pasta', weekId: 'week-1' };

  /**
   * Settimana aperta, due liste (il top-up torna per primo dal database, per
   * provare l'ordine), la pasta in entrambe più un controllo staple.
   */
  function preparaSettimana(stato = 'confermata') {
    const mock = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato }, error: null };
      if (tabella === 'shopping_list') {
        return { data: [{ id: 'lista-topup', tipo: 'topup' }, { id: 'lista-base', tipo: 'base' }], error: null };
      }
      if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
        return {
          data: [
            { id: 'r-topup', shopping_list_id: 'lista-topup', origine: 'manuale' },
            { id: 'r-base', shopping_list_id: 'lista-base', origine: 'piano' },
            { id: 'r-controllo', shopping_list_id: 'lista-base', origine: 'controllo' },
          ],
          error: null,
        };
      }
      // L'update dell'ingrediente rilegge la riga toccata: una sola, la pasta.
      if (tabella === 'ingredient') return { data: [{ id: 'ing-pasta' }], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(mock.sb as never);
    return mock;
  }

  it('scrive formato ed ean sull\'ingrediente, filtrando per id e casa, e rilegge l\'id per sapere se la riga c\'era', async () => {
    const { catene } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: '8076800105735', confezioni: 2 });

    expect(catene['ingredient']).toHaveLength(1);
    expect(catene['ingredient'][0]).toEqual([
      { metodo: 'update', args: [{ formato_confezione: 500, ean: '8076800105735' }] },
      { metodo: 'eq', args: ['id', 'ing-pasta'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
      { metodo: 'select', args: ['id'] },
    ]);
  });

  it('l\'ean si scrive senza gli spazi ai bordi', async () => {
    const { catene } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: ' 8076800105735 ', confezioni: 2 });

    expect(catene['ingredient'][0][0]).toEqual({ metodo: 'update', args: [{ formato_confezione: 500, ean: '8076800105735' }] });
  });

  it.each(['12ab', '123', '', '8076 800105735', '12345678901234567'])('con ean "%s" lancia "codice non valido" prima di toccare il database', async (ean) => {
    // Il check SQL (`^[0-9]{8,14}$`) lo fermerebbe, ma sull'ultimo update:
    // le righe della settimana sarebbero già riscritte.
    const { catene } = preparaSettimana();

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean, confezioni: 1 }),
    ).rejects.toThrow('codice non valido');

    expect(catene).toEqual({});
    expect(idCasa).not.toHaveBeenCalled();
  });

  it('se l\'update dell\'ingrediente non tocca righe (altra casa o cancellato) lancia "ingrediente non trovato"', async () => {
    const { sb, catene } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'shopping_list') return { data: [{ id: 'lista-base', tipo: 'base' }], error: null };
      if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
        return { data: [{ id: 'r-base', shopping_list_id: 'lista-base', origine: 'piano' }], error: null };
      }
      if (tabella === 'ingredient') return { data: [], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 }),
    ).rejects.toThrow('ingrediente non trovato');
    // L'update c'è stato (a vuoto): la pagina deve saperlo, non segnare AGGIORNATO.
    expect(catene['ingredient']).toHaveLength(1);
  });

  it('senza ean aggiorna solo il formato: l\'ultimo codice memorizzato resta', async () => {
    const { catene } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 });

    const update = catene['ingredient'][0].find((c) => c.metodo === 'update')?.args[0] as Record<string, unknown>;
    expect(update).toEqual({ formato_confezione: 500 });
    expect('ean' in update).toBe(false);
  });

  it('scrive le confezioni comprate e quantita_totale = confezioni × formato sulla prima riga (base), 0 sulle altre, niente sul controllo', async () => {
    const { catene } = preparaSettimana();

    // Formato 1000 e 1 confezione: la lista ne chiedeva 2 da 500. Le
    // confezioni della riga NON si tengono: sono derivate dal formato vecchio.
    await aggiornaFormatoDaScansione({ ...PASTA, formato: 1000, ean: null, confezioni: 1 });

    // Le liste della settimana, poi le righe dell'ingrediente in quelle liste.
    expect(catene['shopping_list'][0]).toEqual(expect.arrayContaining([
      { metodo: 'select', args: ['id, tipo'] },
      { metodo: 'eq', args: ['week_id', 'week-1'] },
      { metodo: 'eq', args: ['user_id', 'user-1'] },
    ]));
    const [lettura, ...scritture] = catene['shopping_list_item'];
    expect(lettura).toEqual(expect.arrayContaining([
      { metodo: 'select', args: ['id, shopping_list_id, origine'] },
      { metodo: 'in', args: ['shopping_list_id', ['lista-base', 'lista-topup']] },
      { metodo: 'eq', args: ['ingredient_id', 'ing-pasta'] },
    ]));
    // Base prima del top-up anche se il database le ha date al contrario.
    expect(scritture).toEqual([
      [
        { metodo: 'update', args: [{ confezioni: 1, quantita_totale: 1000 }] },
        { metodo: 'eq', args: ['id', 'r-base'] },
        { metodo: 'eq', args: ['user_id', 'user-1'] },
      ],
      [
        { metodo: 'update', args: [{ confezioni: 0, quantita_totale: 0 }] },
        { metodo: 'eq', args: ['id', 'r-topup'] },
        { metodo: 'eq', args: ['user_id', 'user-1'] },
      ],
    ]);
  });

  it('confezioni 0 ("non l\'ho preso"): la riga resta con 0 confezioni e quantita_totale 0', async () => {
    const { catene } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 1000, ean: '8076800105735', confezioni: 0 });

    const [, ...scritture] = catene['shopping_list_item'];
    expect(scritture.map((s) => s[0])).toEqual([
      { metodo: 'update', args: [{ confezioni: 0, quantita_totale: 0 }] },
      { metodo: 'update', args: [{ confezioni: 0, quantita_totale: 0 }] },
    ]);
    // Il formato e il codice si memorizzano lo stesso: servono alle settimane prossime.
    expect(catene['ingredient'][0][0]).toEqual({ metodo: 'update', args: [{ formato_confezione: 1000, ean: '8076800105735' }] });
  });

  it('prima le righe della settimana, poi l\'ingrediente', async () => {
    const { ordine } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 });

    expect(ordine.indexOf('ingredient')).toBe(ordine.length - 1);
    expect(ordine.lastIndexOf('shopping_list_item')).toBeLessThan(ordine.indexOf('ingredient'));
  });

  it('senza liste nella settimana aggiorna solo l\'ingrediente', async () => {
    const { sb, catene } = creaClientMock((tabella) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'shopping_list') return { data: [], error: null };
      if (tabella === 'ingredient') return { data: [{ id: 'ing-pasta' }], error: null };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 });

    expect(catene['shopping_list_item']).toBeUndefined();
    expect(catene['ingredient']).toHaveLength(1);
  });

  it('a settimana chiusa lancia "spesa già chiusa" senza scrivere nulla', async () => {
    const { catene } = preparaSettimana('chiusa');

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: '8076800105735', confezioni: 2 }),
    ).rejects.toThrow('spesa già chiusa');

    expect(catene['ingredient']).toBeUndefined();
    expect(catene['shopping_list']).toBeUndefined();
    expect(catene['shopping_list_item']).toBeUndefined();
  });

  it('con una settimana che non esiste lancia senza scrivere', async () => {
    const { sb, catene } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ingredientId: 'ing-pasta', weekId: 'week-x', formato: 500, ean: null, confezioni: 2 }),
    ).rejects.toThrow('settimana non trovata');
    expect(catene['ingredient']).toBeUndefined();
  });

  it.each([0, -1, 0.0009, 100_001, Number.NaN, Number.POSITIVE_INFINITY])('con formato %s lancia "formato non valido" prima di toccare il database', async (formato) => {
    const { catene } = preparaSettimana();

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato, ean: null, confezioni: 1 }),
    ).rejects.toThrow('formato non valido');

    expect(catene).toEqual({});
    expect(idCasa).not.toHaveBeenCalled();
  });

  it.each([0.001, 100_000])('formato %s è ai limiti ma valido', async (formato) => {
    const { catene } = preparaSettimana();

    await aggiornaFormatoDaScansione({ ...PASTA, formato, ean: null, confezioni: 1 });

    expect(catene['ingredient']).toHaveLength(1);
  });

  it.each([-1, 1.5, 1001, Number.NaN, Number.POSITIVE_INFINITY])('con confezioni %s lancia "confezioni non valide" prima di toccare il database', async (confezioni) => {
    const { catene } = preparaSettimana();

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni }),
    ).rejects.toThrow('confezioni non valide');

    expect(catene).toEqual({});
    expect(idCasa).not.toHaveBeenCalled();
  });

  it('un errore sulla scrittura di una riga viene propagato e l\'ingrediente non si tocca', async () => {
    const { sb, catene } = creaClientMock((tabella, chiamate) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'shopping_list') return { data: [{ id: 'lista-base', tipo: 'base' }], error: null };
      if (tabella === 'shopping_list_item' && chiamate.some((c) => c.metodo === 'select')) {
        return { data: [{ id: 'r-base', shopping_list_id: 'lista-base', origine: 'piano' }], error: null };
      }
      if (tabella === 'shopping_list_item') return { data: null, error: { message: 'boom' } };
      return { data: null, error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 }),
    ).rejects.toEqual({ message: 'boom' });
    expect(catene['ingredient']).toBeUndefined();
  });

  it('un errore sulla scrittura dell\'ingrediente viene propagato', async () => {
    const { sb } = creaClientMock((tabella) => {
      if (tabella === 'week') return { data: { stato: 'confermata' }, error: null };
      if (tabella === 'ingredient') return { data: null, error: { message: 'boom' } };
      return { data: [], error: null };
    });
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(
      aggiornaFormatoDaScansione({ ...PASTA, formato: 500, ean: null, confezioni: 2 }),
    ).rejects.toEqual({ message: 'boom' });
  });
});
