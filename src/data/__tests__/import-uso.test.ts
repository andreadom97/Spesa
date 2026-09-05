import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { contaImportRecenti, limiteImport30ggConfigurato, registraImport } from '../import-uso';

const ADESSO = new Date('2026-09-05T10:00:00.000Z');
const SOGLIA = '2026-08-06T10:00:00.000Z';

/**
 * Finto query builder: registra ogni passo della catena e risolve con la
 * risposta preparata, come fa il client vero quando lo si attende.
 */
function creaClientMock(risposta: { data: unknown; error: unknown }) {
  const chiamate: [string, ...unknown[]][] = [];
  const proxy: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'gte', 'order', 'insert']) {
    proxy[metodo] = (...args: unknown[]) => {
      chiamate.push([metodo, ...args]);
      return proxy;
    };
  }
  proxy.then = (onFulfilled: (v: unknown) => unknown) => Promise.resolve(risposta).then(onFulfilled);
  const from = vi.fn((tabella: string) => {
    chiamate.push(['from', tabella]);
    return proxy;
  });
  return { sb: { from } as unknown as SupabaseClient, chiamate };
}

describe('contaImportRecenti', () => {
  it('filtra le righe dell\'utente nella finestra di 30 giorni, in ordine crescente', async () => {
    const { sb, chiamate } = creaClientMock({ data: [{ avviato_il: '2026-08-10T08:00:00.000Z' }, { avviato_il: '2026-09-01T08:00:00.000Z' }], error: null });
    const esito = await contaImportRecenti(sb, 'u1', ADESSO);
    expect(chiamate).toEqual([
      ['from', 'import_uso'],
      ['select', 'avviato_il'],
      ['eq', 'user_id', 'u1'],
      ['gte', 'avviato_il', SOGLIA],
      ['order', 'avviato_il', { ascending: true }],
    ]);
    expect(esito).toEqual({ conteggio: 2, piuVecchio: new Date('2026-08-10T08:00:00.000Z') });
  });

  it('senza righe: conteggio zero e nessun più vecchio', async () => {
    const { sb } = creaClientMock({ data: [], error: null });
    await expect(contaImportRecenti(sb, 'u1', ADESSO)).resolves.toEqual({ conteggio: 0, piuVecchio: null });
  });

  it('un errore di Supabase propaga', async () => {
    const { sb } = creaClientMock({ data: null, error: new Error('rls') });
    await expect(contaImportRecenti(sb, 'u1', ADESSO)).rejects.toThrow('rls');
  });
});

describe('registraImport', () => {
  it('inserisce user_id, pagine e modello', async () => {
    const { sb, chiamate } = creaClientMock({ data: null, error: null });
    await registraImport(sb, 'u1', 3, 'claude-sonnet-5');
    expect(chiamate).toEqual([
      ['from', 'import_uso'],
      ['insert', { user_id: 'u1', pagine: 3, modello: 'claude-sonnet-5' }],
    ]);
  });

  it('un errore di Supabase propaga', async () => {
    const { sb } = creaClientMock({ data: null, error: new Error('check') });
    await expect(registraImport(sb, 'u1', 3, 'claude-sonnet-5')).rejects.toThrow('check');
  });
});

describe('limiteImport30ggConfigurato', () => {
  const originale = process.env.IMPORT_LIMITE_30GG;
  beforeEach(() => { delete process.env.IMPORT_LIMITE_30GG; });
  afterEach(() => {
    if (originale === undefined) delete process.env.IMPORT_LIMITE_30GG;
    else process.env.IMPORT_LIMITE_30GG = originale;
  });

  it('assente → 3', () => {
    expect(limiteImport30ggConfigurato()).toBe(3);
  });

  it('"0" disattiva il limite', () => {
    process.env.IMPORT_LIMITE_30GG = '0';
    expect(limiteImport30ggConfigurato()).toBe(0);
  });

  it('"5" → 5, letto a ogni chiamata', () => {
    process.env.IMPORT_LIMITE_30GG = '5';
    expect(limiteImport30ggConfigurato()).toBe(5);
    process.env.IMPORT_LIMITE_30GG = '2';
    expect(limiteImport30ggConfigurato()).toBe(2);
  });

  it('non numerico o negativo → 3', () => {
    process.env.IMPORT_LIMITE_30GG = 'abc';
    expect(limiteImport30ggConfigurato()).toBe(3);
    process.env.IMPORT_LIMITE_30GG = '-1';
    expect(limiteImport30ggConfigurato()).toBe(3);
  });
});
