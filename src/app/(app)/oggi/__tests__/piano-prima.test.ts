import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dimenticaPianoPrima, leggiPianoPrima, salvaPianoPrima } from '../piano-prima';

const CHIAVE = 'spesa:oggi-piano-prima';
const PRIMA = { slotId: 's1', dishId: 'a', scelte: { c1: { opzioneId: 'o1', fonte: 'manuale' as const } } };

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('piano-prima (spec Oggi §C.6)', () => {
  it('salva e rilegge il piatto che lo slot aveva, con le sue scelte', () => {
    salvaPianoPrima(PRIMA);
    expect(leggiPianoPrima('s1')).toEqual(PRIMA);
  });

  it('non sovrascrive l\'annotazione già presente per lo stesso slot: il piatto «del piano» è il primo', () => {
    salvaPianoPrima(PRIMA);
    salvaPianoPrima({ slotId: 's1', dishId: 'b', scelte: {} });
    expect(leggiPianoPrima('s1')?.dishId).toBe('a');
  });

  it('chiedendo un altro slot non c\'è niente, e l\'annotazione si cancella (il poster è passato oltre)', () => {
    salvaPianoPrima(PRIMA);
    expect(leggiPianoPrima('s2')).toBeNull();
    expect(window.sessionStorage.getItem(CHIAVE)).toBeNull();
    expect(leggiPianoPrima('s1')).toBeNull();
  });

  it('un altro slot prende il posto: la voce è una sola', () => {
    salvaPianoPrima(PRIMA);
    expect(leggiPianoPrima('s2')).toBeNull();
    salvaPianoPrima({ slotId: 's2', dishId: 'c', scelte: {} });
    expect(leggiPianoPrima('s2')?.dishId).toBe('c');
    expect(leggiPianoPrima('s1')).toBeNull();
  });

  it('dimentica cancella', () => {
    salvaPianoPrima(PRIMA);
    dimenticaPianoPrima();
    expect(leggiPianoPrima('s1')).toBeNull();
  });

  it('un contenuto illeggibile vale come niente, senza lanciare', () => {
    window.sessionStorage.setItem(CHIAVE, '{non json');
    expect(leggiPianoPrima('s1')).toBeNull();
    window.sessionStorage.setItem(CHIAVE, 'null');
    expect(leggiPianoPrima('s1')).toBeNull();
  });

  it('con sessionStorage che lancia (navigazione privata, spazio esaurito) l\'annullo non c\'è e niente si rompe', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('negato'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('pieno'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('negato'); });
    expect(() => salvaPianoPrima(PRIMA)).not.toThrow();
    expect(leggiPianoPrima('s1')).toBeNull();
    expect(() => dimenticaPianoPrima()).not.toThrow();
  });
});
