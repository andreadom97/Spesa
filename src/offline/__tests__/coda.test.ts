import { describe, it, expect, beforeEach } from 'vitest';
import { accodaSpunta, leggiCoda, svuotaCoda, applicaCodaSuVoci } from '../coda';

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
});
