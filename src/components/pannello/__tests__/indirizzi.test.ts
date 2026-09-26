import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  indirizzoPannello, indirizzoRitorno, leggiDestinazione, leggiOrigine,
  prendiScrollPannello, salvaOrigine, salvaScrollPannello,
} from '../indirizzi';
import { SOTTO_SCHERMATE } from '../tipi';

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('leggiDestinazione (spec §A.3)', () => {
  it('senza il parametro è null', () => {
    expect(leggiDestinazione('')).toBeNull();
    expect(leggiDestinazione('?da=lista')).toBeNull();
  });

  it('cima e le otto sotto-schermate si leggono come sono', () => {
    expect(SOTTO_SCHERMATE).toHaveLength(8);
    expect(leggiDestinazione('?impostazioni=cima')).toBe('cima');
    for (const s of SOTTO_SCHERMATE) expect(leggiDestinazione(`?impostazioni=${s}`)).toBe(s);
  });

  it('un valore sconosciuto, o vuoto, vale cima', () => {
    expect(leggiDestinazione('?impostazioni=boh')).toBe('cima');
    expect(leggiDestinazione('?impostazioni=')).toBe('cima');
  });
});

describe('indirizzoPannello', () => {
  it('il percorso più il parametro', () => {
    expect(indirizzoPannello('/dispensa', 'ingredienti')).toBe('/dispensa?impostazioni=ingredienti');
    expect(indirizzoPannello('/lista', 'cima')).toBe('/lista?impostazioni=cima');
  });
});

describe('origine (spec §A.5)', () => {
  it('senza origine il ritorno va in cima sopra la Lista', () => {
    expect(leggiOrigine()).toBeNull();
    expect(indirizzoRitorno()).toBe('/lista?impostazioni=cima');
  });

  it('con l\'origine il ritorno è il pannello sopra la pagina di partenza', () => {
    salvaOrigine({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(leggiOrigine()).toEqual({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(indirizzoRitorno()).toBe('/dispensa?impostazioni=ingredienti');
  });

  it('un\'origine malformata non vale: JSON rotto, un percorso non interno, un sotto sconosciuto', () => {
    window.sessionStorage.setItem('spesa:origine-pannello', '{rotto');
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: '//altro.sito', sotto: 'cima' }));
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: 'lista', sotto: 'cima' }));
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: '/lista', sotto: 'casa' }));
    expect(leggiOrigine()).toBeNull();
  });

  it('con sessionStorage che lancia non lancia niente, e il ritorno è quello di riserva', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloccato'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloccato'); });
    expect(() => salvaOrigine({ pathname: '/lista', sotto: 'cima' })).not.toThrow();
    expect(indirizzoRitorno()).toBe('/lista?impostazioni=cima');
    expect(() => salvaScrollPannello('ingredienti', 300)).not.toThrow();
    expect(prendiScrollPannello('ingredienti')).toBeNull();
  });
});

describe('scorrimento (spec §A.3)', () => {
  it('si salva intero, e prenderlo lo legge e lo cancella', () => {
    salvaScrollPannello('ingredienti', 420.6);
    expect(window.sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).toBe('421');
    expect(prendiScrollPannello('ingredienti')).toBe(421);
    expect(prendiScrollPannello('ingredienti')).toBeNull();
  });

  it('un valore che non è un numero non vale, e si cancella lo stesso', () => {
    window.sessionStorage.setItem('spesa:pannello-scroll:cima', 'tanto');
    expect(prendiScrollPannello('cima')).toBeNull();
    expect(window.sessionStorage.getItem('spesa:pannello-scroll:cima')).toBeNull();
  });
});
