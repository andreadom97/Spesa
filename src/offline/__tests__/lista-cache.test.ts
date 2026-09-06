import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ListaSalvata } from '@/data/lista';
import { leggiIstantaneaLista, salvaIstantaneaLista, cancellaIstantaneaLista } from '../lista-cache';

const LISTA: ListaSalvata = {
  base: [
    {
      area: 'cereali',
      voci: [{
        id: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', area: 'cereali', unita: 'g',
        fabbisogno: 500, residuo: 0, confezioni: 1, quantitaTotale: 1000, spuntato: false,
        origine: 'piano', mostraDettaglio: true,
      }],
      controlli: [],
    },
  ],
  topup: [],
  baseListaId: 'lista-base-1',
  topupListaId: 'lista-topup-1',
};

beforeEach(() => localStorage.clear());

describe('istantanea della lista', () => {
  it('salva e rilegge la stessa lista, con settimana e momento del salvataggio', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    salvaIstantaneaLista({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });

    expect(leggiIstantaneaLista()).toEqual({
      weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA, salvataIl: 1_700_000_000_000,
    });
    vi.restoreAllMocks();
  });

  it('usa la chiave spesa:lista, come le altre memorie dell\'app', () => {
    salvaIstantaneaLista({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
    expect(localStorage.getItem('spesa:lista')).not.toBeNull();
  });

  it('senza nulla di salvato torna null', () => {
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it('si cancella', () => {
    salvaIstantaneaLista({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
    cancellaIstantaneaLista();
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it('cancellare senza nulla di salvato non fa niente', () => {
    expect(() => cancellaIstantaneaLista()).not.toThrow();
  });

  it('con JSON malformato torna null invece di rompere la schermata', () => {
    localStorage.setItem('spesa:lista', 'non è json');
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it.each([
    ['senza weekId', { settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['weekId non stringa', { weekId: 1, settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['senza settimanaLabel', { weekId: 'w', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['salvataIl non numero', { weekId: 'w', settimanaLabel: 'x', salvataIl: 'ieri', lista: { base: [], topup: [] } }],
    ['senza lista', { weekId: 'w', settimanaLabel: 'x', salvataIl: 1 }],
    ['lista non oggetto', { weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: 'lista' }],
    ['lista senza base', { weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { topup: [] } }],
    ['lista con topup non array', { weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: {} } }],
    ['array invece di oggetto', []],
    ['null', null],
  ])('con forma incompleta (%s) torna null', (_, valore) => {
    localStorage.setItem('spesa:lista', JSON.stringify(valore));
    expect(leggiIstantaneaLista()).toBeNull();
  });

  describe('senza localStorage', () => {
    const originale = globalThis.localStorage;

    beforeEach(() => {
      // jsdom espone localStorage come getter sul prototipo di window: si
      // sovrascrive sull'istanza con undefined, così `typeof localStorage`
      // dà 'undefined' come in un ambiente che non ce l'ha.
      Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'localStorage', { value: originale, configurable: true, writable: true });
    });

    it('leggere torna null senza errori', () => {
      expect(typeof localStorage).toBe('undefined');
      expect(leggiIstantaneaLista()).toBeNull();
    });

    it('salvare e cancellare non lanciano', () => {
      expect(() => salvaIstantaneaLista({ weekId: 'w', settimanaLabel: 'x', lista: LISTA })).not.toThrow();
      expect(() => cancellaIstantaneaLista()).not.toThrow();
    });
  });

  it('se lo storage rifiuta la scrittura (quota superata) non propaga e logga', () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const quota = new Error('QuotaExceededError');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quota; });

    expect(() => salvaIstantaneaLista({ weekId: 'w', settimanaLabel: 'x', lista: LISTA })).not.toThrow();
    expect(errore).toHaveBeenCalledWith('lista offline: istantanea non salvata.', quota);

    setItem.mockRestore();
    errore.mockRestore();
    expect(leggiIstantaneaLista()).toBeNull();
  });
});
