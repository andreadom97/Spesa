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
    salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });

    expect(leggiIstantaneaLista()).toEqual({
      casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA, salvataIl: 1_700_000_000_000,
    });
    vi.restoreAllMocks();
  });

  // L'istantanea porta l'id della casa: un membro tolto dal proprietario non
  // passa da entra/esci (che la cancellano), e senza questo controllo si
  // terrebbe sul telefono l'ultima lista della casa che ha lasciato.
  describe('con l\'id della casa', () => {
    it('si rilegge se è della stessa casa', () => {
      salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
      expect(leggiIstantaneaLista('casa-1')).toMatchObject({ casaId: 'casa-1', weekId: 'week-1', lista: LISTA });
    });

    it('se è di un\'altra casa torna null e si cancella', () => {
      salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
      expect(leggiIstantaneaLista('altra')).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
      expect(leggiIstantaneaLista()).toBeNull();
    });

    it('senza id (casa non verificabile, a freddo senza rete) si rilegge comunque', () => {
      salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
      expect(leggiIstantaneaLista()).toMatchObject({ casaId: 'casa-1', weekId: 'week-1' });
      expect(localStorage.getItem('spesa:lista')).not.toBeNull();
    });

    it('un\'istantanea vecchia senza casaId torna null, anche letta senza id', () => {
      localStorage.setItem('spesa:lista', JSON.stringify({ weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }));
      expect(leggiIstantaneaLista()).toBeNull();
      expect(leggiIstantaneaLista('casa-1')).toBeNull();
    });
  });

  it('usa la chiave spesa:lista, come le altre memorie dell\'app', () => {
    salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
    expect(localStorage.getItem('spesa:lista')).not.toBeNull();
  });

  it('senza nulla di salvato torna null', () => {
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it('si cancella', () => {
    salvaIstantaneaLista({ casaId: 'casa-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA });
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
    ['senza casaId', { weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['casaId non stringa', { casaId: 1, weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['senza weekId', { casaId: 'c', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['weekId non stringa', { casaId: 'c', weekId: 1, settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['senza settimanaLabel', { casaId: 'c', weekId: 'w', salvataIl: 1, lista: { base: [], topup: [] } }],
    ['salvataIl non numero', { casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: 'ieri', lista: { base: [], topup: [] } }],
    ['senza lista', { casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: 1 }],
    ['lista non oggetto', { casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: 'lista' }],
    ['lista senza base', { casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { topup: [] } }],
    ['lista con topup non array', { casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: 1, lista: { base: [], topup: {} } }],
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
      expect(() => salvaIstantaneaLista({ casaId: 'c', weekId: 'w', settimanaLabel: 'x', lista: LISTA })).not.toThrow();
      expect(() => cancellaIstantaneaLista()).not.toThrow();
    });
  });

  it('se lo storage rifiuta la scrittura (quota superata) non propaga e logga', () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const quota = new Error('QuotaExceededError');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quota; });

    expect(() => salvaIstantaneaLista({ casaId: 'c', weekId: 'w', settimanaLabel: 'x', lista: LISTA })).not.toThrow();
    expect(errore).toHaveBeenCalledWith('lista offline: istantanea non salvata.', quota);

    setItem.mockRestore();
    errore.mockRestore();
    expect(leggiIstantaneaLista()).toBeNull();
  });
});
