import { describe, it, expect } from 'vitest';
import { convertiInUnitaBase, UnitaIncompatibileError } from '../unita';

describe('convertiInUnitaBase', () => {
  it('lascia invariata una quantità già nella base', () => {
    expect(convertiInUnitaBase(150, 'g', 'g')).toBe(150);
  });

  it('converte i chili in grammi', () => {
    expect(convertiInUnitaBase(1.2, 'kg', 'g')).toBe(1200);
  });

  it('converte i litri in millilitri', () => {
    expect(convertiInUnitaBase(0.75, 'l', 'ml')).toBe(750);
  });

  it('lascia invariati i pezzi', () => {
    expect(convertiInUnitaBase(6, 'pz', 'pz')).toBe(6);
  });

  it('rifiuta grammi su un ingrediente contato a pezzi', () => {
    expect(() => convertiInUnitaBase(100, 'g', 'pz')).toThrow(UnitaIncompatibileError);
  });

  it('rifiuta millilitri su un ingrediente in grammi: niente inferenza di densità', () => {
    expect(() => convertiInUnitaBase(100, 'ml', 'g')).toThrow(UnitaIncompatibileError);
  });
});
