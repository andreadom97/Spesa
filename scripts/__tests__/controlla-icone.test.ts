import { describe, it, expect } from 'vitest';
import { leggiRotazione } from '../controlla-icone';

describe('leggiRotazione', () => {
  it('nessuna rotazione: null', () => {
    expect(leggiRotazione(undefined)).toBeNull();
  });
  it('legge angolo e centro', () => {
    expect(leggiRotazione('rotate(-28 12 12)')).toEqual([-28, 12, 12]);
    expect(leggiRotazione(' rotate(40 12 12) ')).toEqual([40, 12, 12]);
  });
  it('una forma diversa è un errore, non un silenzio', () => {
    expect(() => leggiRotazione('rotate(30)')).toThrow('rotazione non riconosciuta');
  });
});
