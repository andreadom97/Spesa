import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { accodaSpunta, leggiCoda, svuotaCoda, applicaCodaSuVoci, rimuoviConfermate } from '../coda';

beforeEach(() => localStorage.clear());

describe('coda delle spunte', () => {
  it('accoda una spunta', () => {
    accodaSpunta('v1', true, 1000);
    expect(leggiCoda()).toEqual([{ itemId: 'v1', spuntato: true, ts: 1000 }]);
  });

  it('tiene solo l\'ultima decisione per voce: la spunta è idempotente', () => {
    accodaSpunta('v1', true, 1000);
    accodaSpunta('v1', false, 2000);
    expect(leggiCoda()).toEqual([{ itemId: 'v1', spuntato: false, ts: 2000 }]);
  });

  it('non lascia che un evento vecchio sovrascriva uno nuovo', () => {
    accodaSpunta('v1', false, 2000);
    accodaSpunta('v1', true, 1000);
    expect(leggiCoda()).toEqual([{ itemId: 'v1', spuntato: false, ts: 2000 }]);
  });

  it('tiene separate voci diverse', () => {
    accodaSpunta('v1', true, 1000);
    accodaSpunta('v2', true, 1001);
    expect(leggiCoda()).toHaveLength(2);
  });

  it('sovrascrive lo stato del server con quello locale in attesa', () => {
    accodaSpunta('v1', true, 1000);
    const voci = [{ id: 'v1', spuntato: false }, { id: 'v2', spuntato: true }];
    expect(applicaCodaSuVoci(voci)).toEqual([
      { id: 'v1', spuntato: true }, { id: 'v2', spuntato: true },
    ]);
  });

  it('si svuota', () => {
    accodaSpunta('v1', true, 1000);
    svuotaCoda();
    expect(leggiCoda()).toEqual([]);
  });

  it('sopravvive a un localStorage corrotto invece di rompere la schermata', () => {
    localStorage.setItem('spesa:coda', 'non è json');
    expect(leggiCoda()).toEqual([]);
  });

  // Le scritture hanno la stessa guardia delle letture e di lista-cache.ts:
  // un tap in corsia non deve rompere la schermata perché lo storage è
  // pieno o bloccato.
  describe('se lo storage rifiuta la scrittura', () => {
    let errore: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('accodare non propaga e logga', () => {
      const quota = new Error('QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quota; });

      expect(() => accodaSpunta('v1', true, 1000)).not.toThrow();
      expect(errore).toHaveBeenCalledWith('coda: scrittura fallita.', quota);
    });

    it('rimuovere le confermate non propaga e logga', () => {
      accodaSpunta('v1', true, 1000);
      const quota = new Error('QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quota; });

      expect(() => rimuoviConfermate([{ itemId: 'v1', spuntato: true, ts: 1000 }])).not.toThrow();
      expect(errore).toHaveBeenCalledWith('coda: scrittura fallita.', quota);
    });

    it('svuotare non propaga e logga', () => {
      accodaSpunta('v1', true, 1000);
      const bloccato = new Error('SecurityError');
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw bloccato; });

      expect(() => svuotaCoda()).not.toThrow();
      expect(errore).toHaveBeenCalledWith('coda: scrittura fallita.', bloccato);
    });
  });

  describe('senza localStorage', () => {
    const originale = globalThis.localStorage;

    beforeEach(() => {
      // Come in lista-cache.test.ts: jsdom espone localStorage come getter
      // sul prototipo di window, si copre sull'istanza con undefined.
      Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'localStorage', { value: originale, configurable: true, writable: true });
    });

    it('leggere torna vuoto, accodare e svuotare non lanciano', () => {
      expect(typeof localStorage).toBe('undefined');
      expect(leggiCoda()).toEqual([]);
      expect(() => accodaSpunta('v1', true, 1000)).not.toThrow();
      expect(() => rimuoviConfermate([])).not.toThrow();
      expect(() => svuotaCoda()).not.toThrow();
    });
  });
});

describe('rimuoviConfermate', () => {
  it('rimuove solo le voci confermate, lasciando le altre intatte', () => {
    accodaSpunta('v1', true, 1000);
    accodaSpunta('v2', true, 1000);
    rimuoviConfermate([{ itemId: 'v1', spuntato: true, ts: 1000 }]);
    expect(leggiCoda()).toEqual([{ itemId: 'v2', spuntato: true, ts: 1000 }]);
  });

  it('non rimuove una voce se nel frattempo è arrivato un evento più recente sulla stessa voce', () => {
    accodaSpunta('v1', true, 1000);
    // Mentre la scrittura del vecchio evento (ts 1000) era in volo, un nuovo
    // tap ha già accodato un evento più recente sulla stessa voce.
    accodaSpunta('v1', false, 2000);
    rimuoviConfermate([{ itemId: 'v1', spuntato: true, ts: 1000 }]);
    expect(leggiCoda()).toEqual([{ itemId: 'v1', spuntato: false, ts: 2000 }]);
  });

  it('non tocca la coda se non conferma nulla', () => {
    accodaSpunta('v1', true, 1000);
    rimuoviConfermate([]);
    expect(leggiCoda()).toEqual([{ itemId: 'v1', spuntato: true, ts: 1000 }]);
  });
});
