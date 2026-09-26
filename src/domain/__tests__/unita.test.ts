import { describe, it, expect } from 'vitest';
import { convertiInUnitaBase, motivoBloccoUnita, UnitaIncompatibileError } from '../unita';

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

describe('motivoBloccoUnita', () => {
  const libero = { da: 'g' as const, a: 'ml' as const, piatti: [], residuo: 0 };

  it('nessun blocco se l\'unità non cambia, anche con piatti e residuo', () => {
    expect(motivoBloccoUnita({ da: 'g', a: 'g', piatti: ['Yogurt e avena'], residuo: 300 })).toBeNull();
  });

  it('nessun blocco se nessun piatto lo usa e la dispensa è a zero', () => {
    expect(motivoBloccoUnita(libero)).toBeNull();
  });

  it('un piatto lo usa: dice quale, in che unità, e cosa fare', () => {
    expect(motivoBloccoUnita({ ...libero, piatti: ['Yogurt e avena'] })).toBe(
      'Il piatto «Yogurt e avena» lo usa con le quantità in g: per passare a ml toglilo prima da lì, o crea un ingrediente nuovo in ml.',
    );
  });

  it('più piatti: li elenca tutti, una volta sola ciascuno', () => {
    expect(motivoBloccoUnita({ ...libero, a: 'pz', piatti: ['Frittata', 'Yogurt e avena', 'Frittata', 'Torta'] })).toBe(
      'I piatti «Frittata», «Yogurt e avena» e «Torta» lo usano con le quantità in g: per passare a pz toglilo prima da lì, o crea un ingrediente nuovo in pz.',
    );
  });

  it('residuo in dispensa: chiede di azzerarlo, col numero all\'italiana', () => {
    expect(motivoBloccoUnita({ ...libero, residuo: 312.5 })).toBe(
      'In dispensa ne risultano 312,5 g: azzeralo dalla Dispensa, poi cambia l\'unità.',
    );
  });

  it('piatti e residuo insieme: entrambi i motivi', () => {
    expect(motivoBloccoUnita({ ...libero, piatti: ['Yogurt e avena'], residuo: 300 })).toBe(
      'Il piatto «Yogurt e avena» lo usa con le quantità in g: per passare a ml toglilo prima da lì, o crea un ingrediente nuovo in ml. '
      + 'In dispensa ne risultano 300 g: azzeralo dalla Dispensa, poi cambia l\'unità.',
    );
  });
});
