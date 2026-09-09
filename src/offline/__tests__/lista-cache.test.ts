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

const GIORNO_MS = 86_400_000;

function salvaDiProva(sovrascrivi: Partial<{ casaId: string; userId: string }> = {}) {
  salvaIstantaneaLista({
    casaId: 'casa-1', userId: 'user-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA, ...sovrascrivi,
  });
}

beforeEach(() => localStorage.clear());

describe('istantanea della lista', () => {
  it('salva e rilegge la stessa lista, con settimana e momento del salvataggio', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    salvaDiProva();

    expect(leggiIstantaneaLista()).toEqual({
      casaId: 'casa-1', userId: 'user-1', weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista: LISTA, salvataIl: 1_700_000_000_000,
    });
    vi.restoreAllMocks();
  });

  // L'istantanea porta l'id della casa: un membro tolto dal proprietario non
  // passa da entra/esci (che la cancellano), e senza questo controllo si
  // terrebbe sul telefono l'ultima lista della casa che ha lasciato.
  describe('con l\'id della casa', () => {
    it('si rilegge se è della stessa casa', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'casa-1' })).toMatchObject({ casaId: 'casa-1', weekId: 'week-1', lista: LISTA });
    });

    it('se è di un\'altra casa torna null e si cancella', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'altra' })).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
      expect(leggiIstantaneaLista()).toBeNull();
    });

    it('senza id (casa non verificabile, a freddo senza rete) si rilegge comunque', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista()).toMatchObject({ casaId: 'casa-1', weekId: 'week-1' });
      expect(localStorage.getItem('spesa:lista')).not.toBeNull();
    });

    it('un\'istantanea vecchia senza casaId torna null, anche letta senza id', () => {
      localStorage.setItem('spesa:lista', JSON.stringify({ userId: 'u', weekId: 'w', settimanaLabel: 'x', salvataIl: Date.now(), lista: { base: [], topup: [] } }));
      expect(leggiIstantaneaLista()).toBeNull();
      expect(leggiIstantaneaLista({ casaId: 'casa-1' })).toBeNull();
    });
  });

  // L'istantanea porta anche l'id dell'account: sullo stesso browser due
  // account condividono localStorage, e senza questo controllo chi entra
  // dopo vedrebbe offline la lista di chi c'era prima.
  describe('con l\'id dell\'account', () => {
    it('si rilegge se è dello stesso account', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ userId: 'user-1' })).toMatchObject({ userId: 'user-1', weekId: 'week-1', lista: LISTA });
    });

    it('se è di un altro account torna null e si cancella', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ userId: 'user-2' })).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
    });

    it('con casa e account insieme basta che uno dei due non torni', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'casa-1', userId: 'user-2' })).toBeNull();
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'altra', userId: 'user-1' })).toBeNull();
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'casa-1', userId: 'user-1' })).not.toBeNull();
    });

    it('senza id (sessione non leggibile) si rilegge comunque', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista({ casaId: 'casa-1' })).toMatchObject({ userId: 'user-1' });
    });

    // B4 della review di correttezza: `''` non è un altro account, è un
    // account non verificato al salvataggio. Simmetrico alla lettura senza
    // id: "non verificabile si mostra" (spec lista-offline §1 e §5).
    it('salvata con userId vuoto (sessione non leggibile al salvataggio) si rilegge sia senza id sia con un id', () => {
      salvaDiProva({ userId: '' });
      expect(leggiIstantaneaLista()).toMatchObject({ userId: '' });
      expect(leggiIstantaneaLista({ userId: 'user-1' })).toMatchObject({ userId: '', weekId: 'week-1' });
      expect(leggiIstantaneaLista({ casaId: 'casa-1', userId: 'user-1' })).toMatchObject({ userId: '' });
      expect(localStorage.getItem('spesa:lista')).not.toBeNull();
    });

    it('salvata con userId vuoto, la casa si verifica comunque', () => {
      salvaDiProva({ userId: '' });
      expect(leggiIstantaneaLista({ casaId: 'altra', userId: 'user-1' })).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
    });

    it('un\'istantanea vecchia senza userId torna null, anche letta senza id', () => {
      localStorage.setItem('spesa:lista', JSON.stringify({ casaId: 'c', weekId: 'w', settimanaLabel: 'x', salvataIl: Date.now(), lista: { base: [], topup: [] } }));
      expect(leggiIstantaneaLista()).toBeNull();
      expect(leggiIstantaneaLista({ userId: 'user-1' })).toBeNull();
    });
  });

  // Oltre i 30 giorni non è più "l'ultima lista vista": è un dato vecchio
  // che in corsia farebbe comprare cose sbagliate, e su un browser condiviso
  // resterebbe in giro a tempo indefinito.
  describe('scadenza', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-07T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('a 30 giorni esatti si rilegge ancora', () => {
      salvaDiProva();
      vi.setSystemTime(new Date('2026-09-07T10:00:00Z').getTime() + 30 * GIORNO_MS);
      expect(leggiIstantaneaLista()).not.toBeNull();
      expect(leggiIstantaneaLista({ casaId: 'casa-1', userId: 'user-1' })).not.toBeNull();
    });

    it('oltre i 30 giorni torna null e si cancella, anche senza id', () => {
      salvaDiProva();
      vi.setSystemTime(new Date('2026-09-07T10:00:00Z').getTime() + 30 * GIORNO_MS + 1);
      expect(leggiIstantaneaLista()).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
    });

    it('oltre i 30 giorni torna null anche con casa e account giusti', () => {
      salvaDiProva();
      vi.setSystemTime(new Date('2026-09-07T10:00:00Z').getTime() + 31 * GIORNO_MS);
      expect(leggiIstantaneaLista({ casaId: 'casa-1', userId: 'user-1' })).toBeNull();
      expect(localStorage.getItem('spesa:lista')).toBeNull();
    });

    it('un\'istantanea appena salvata si rilegge', () => {
      salvaDiProva();
      expect(leggiIstantaneaLista()).toMatchObject({ salvataIl: new Date('2026-09-07T10:00:00Z').getTime() });
    });
  });

  it('usa la chiave spesa:lista, come le altre memorie dell\'app', () => {
    salvaDiProva();
    expect(localStorage.getItem('spesa:lista')).not.toBeNull();
  });

  it('senza nulla di salvato torna null', () => {
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it('si cancella', () => {
    salvaDiProva();
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

  // Ogni caso ha tutti gli altri campi validi e `salvataIl` recente: è il
  // solo campo indicato a far cadere la validazione.
  const VALIDA = { casaId: 'c', userId: 'u', weekId: 'w', settimanaLabel: 'x', salvataIl: Date.now(), lista: { base: [], topup: [] } };
  it.each([
    ['senza casaId', { ...VALIDA, casaId: undefined }],
    ['casaId non stringa', { ...VALIDA, casaId: 1 }],
    ['senza userId', { ...VALIDA, userId: undefined }],
    ['userId non stringa', { ...VALIDA, userId: 1 }],
    ['senza weekId', { ...VALIDA, weekId: undefined }],
    ['weekId non stringa', { ...VALIDA, weekId: 1 }],
    ['senza settimanaLabel', { ...VALIDA, settimanaLabel: undefined }],
    ['salvataIl non numero', { ...VALIDA, salvataIl: 'ieri' }],
    ['senza lista', { ...VALIDA, lista: undefined }],
    ['lista non oggetto', { ...VALIDA, lista: 'lista' }],
    ['lista senza base', { ...VALIDA, lista: { topup: [] } }],
    ['lista con topup non array', { ...VALIDA, lista: { base: [], topup: {} } }],
    ['array invece di oggetto', []],
    ['null', null],
  ])('con forma incompleta (%s) torna null', (_, valore) => {
    localStorage.setItem('spesa:lista', JSON.stringify(valore));
    expect(leggiIstantaneaLista()).toBeNull();
  });

  it('la forma di controllo del caso precedente, intera, passa', () => {
    localStorage.setItem('spesa:lista', JSON.stringify(VALIDA));
    expect(leggiIstantaneaLista()).not.toBeNull();
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
      expect(() => salvaDiProva()).not.toThrow();
      expect(() => cancellaIstantaneaLista()).not.toThrow();
    });
  });

  it('se lo storage rifiuta la scrittura (quota superata) non propaga e logga', () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const quota = new Error('QuotaExceededError');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quota; });

    expect(() => salvaDiProva()).not.toThrow();
    expect(errore).toHaveBeenCalledWith('lista offline: istantanea non salvata.', quota);

    setItem.mockRestore();
    errore.mockRestore();
    expect(leggiIstantaneaLista()).toBeNull();
  });
});
