import { describe, it, expect } from 'vitest';
import { eanValido, analizzaQuantitaOFF, formatoProposto, MAX_TESTO_QUANTITA } from '../ean';
import type { QuantitaConfezione } from '../ean';

describe('eanValido', () => {
  it('accetta un EAN-13 vero', () => {
    expect(eanValido('8076800195057')).toBe(true);
  });

  it('accetta un EAN-8', () => {
    expect(eanValido('80768001')).toBe(true);
  });

  it('accetta un GTIN-14', () => {
    expect(eanValido('18076800195054')).toBe(true);
  });

  it('ignora gli spazi attorno: il campo digitato a mano li porta con sé', () => {
    expect(eanValido(' 8076800195057 ')).toBe(true);
  });

  it('rifiuta un codice troppo corto', () => {
    expect(eanValido('123')).toBe(false);
  });

  it('rifiuta un codice troppo lungo', () => {
    expect(eanValido('12345678901234567')).toBe(false);
  });

  it('rifiuta lettere in mezzo alle cifre', () => {
    expect(eanValido('8076a00195057')).toBe(false);
  });

  it('rifiuta la stringa vuota', () => {
    expect(eanValido('')).toBe(false);
  });

  it('rifiuta spazi interni e segni: solo cifre contigue', () => {
    expect(eanValido('8076 800195057')).toBe(false);
    expect(eanValido('8076-800195057')).toBe(false);
  });
});

describe('analizzaQuantitaOFF', () => {
  describe('dal testo `quantity`', () => {
    it.each<[string, QuantitaConfezione | null]>([
      // forme semplici, con e senza spazio
      ['500 g', { valore: 500, unita: 'g' }],
      ['500g', { valore: 500, unita: 'g' }],
      ['330 ml', { valore: 330, unita: 'ml' }],
      ['1 L', { valore: 1000, unita: 'ml' }],
      ['1kg', { valore: 1000, unita: 'g' }],
      // maiuscole e virgole
      ['1,5 l', { valore: 1500, unita: 'ml' }],
      ['0.75 kg', { valore: 750, unita: 'g' }],
      ['1,5 KG', { valore: 1500, unita: 'g' }],
      ['0,33 L', { valore: 330, unita: 'ml' }],
      // centilitri e decilitri
      ['33 cl', { valore: 330, unita: 'ml' }],
      ['2 dl', { valore: 200, unita: 'ml' }],
      // multipack: si moltiplica
      ['6 x 125 g', { valore: 750, unita: 'g' }],
      ['4 x 500ml', { valore: 2000, unita: 'ml' }],
      ['12 x 33 cl', { valore: 3960, unita: 'ml' }],
      ['6X125G', { valore: 750, unita: 'g' }],
      ['2 x 1,5 l', { valore: 3000, unita: 'ml' }],
      // pezzi
      ['6 pz', { valore: 6, unita: 'pz' }],
      ['x6', { valore: 6, unita: 'pz' }],
      ['x 12', { valore: 12, unita: 'pz' }],
      ['6 uova', { valore: 6, unita: 'pz' }],
      ['6 pezzi', { valore: 6, unita: 'pz' }],
      ['10 Uova', { valore: 10, unita: 'pz' }],
      // rumore: vince la prima quantità totale, il resto si ignora
      ['1 kg (2 x 500 g)', { valore: 1000, unita: 'g' }],
      ['500 g e', { valore: 500, unita: 'g' }],
      ['  500 g  ', { valore: 500, unita: 'g' }],
      ['Peso netto 400 g', { valore: 400, unita: 'g' }],
      // decimali lunghi: arrotondati a 3 cifre
      ['0,3333 kg', { valore: 333.3, unita: 'g' }],
      // non si capisce → null
      ['', null],
      ['   ', null],
      ['confezione', null],
      ['500', null],
      ['500 oz', null],
      ['500 grandi', null],
      ['0 g', null],
      ['x0', null],
      ['-500 g', null],
    ])('"%s" → %j', (quantity, atteso) => {
      expect(analizzaQuantitaOFF({ quantity })).toEqual(atteso);
    });

    it('una stringa di 50.000 cifre non blocca l\'event loop: risposta in meno di 100 ms', () => {
      // Con `\\d+` ripetuti nella regex il tempo cresceva col quadrato del testo
      // (10.000 cifre ≈ 0,2 s, 40.000 ≈ 12 s), in modo sincrono. Il testo di OFF
      // è un campo libero: chiunque può scriverci quello che vuole.
      const inizio = performance.now();
      const esito = analizzaQuantitaOFF({ quantity: '9'.repeat(50_000) });
      expect(performance.now() - inizio).toBeLessThan(100);
      expect(esito).toBeNull();
    });

    it('anche con 50.000 cifre seguite da un\'unità, o con "x" ripetute, risponde subito', () => {
      const inizio = performance.now();
      analizzaQuantitaOFF({ quantity: '9'.repeat(50_000) + ' g' });
      analizzaQuantitaOFF({ quantity: '1 x '.repeat(20_000) });
      analizzaQuantitaOFF({ quantity: '1.'.repeat(30_000) });
      expect(performance.now() - inizio).toBeLessThan(100);
    });

    it('legge solo i primi MAX_TESTO_QUANTITA caratteri del testo', () => {
      // Dentro il tetto: si capisce.
      expect(analizzaQuantitaOFF({ quantity: ' '.repeat(MAX_TESTO_QUANTITA - 5) + '500 g' })).toEqual({ valore: 500, unita: 'g' });
      // Oltre il tetto: la quantità sta nella parte che non si legge → null.
      expect(analizzaQuantitaOFF({ quantity: ' '.repeat(MAX_TESTO_QUANTITA) + '500 g' })).toBeNull();
    });

    it('una sequenza di più di 7 cifre non è un numero: nessuna confezione ha otto cifre', () => {
      expect(analizzaQuantitaOFF({ quantity: '12345678 g' })).toBeNull();
      expect(analizzaQuantitaOFF({ quantity: '1234567 g' })).toEqual({ valore: 1234567, unita: 'g' });
    });

    it('restituisce null se `quantity` manca o non è una stringa', () => {
      expect(analizzaQuantitaOFF({})).toBeNull();
      expect(analizzaQuantitaOFF({ quantity: undefined })).toBeNull();
      expect(analizzaQuantitaOFF({ quantity: null })).toBeNull();
      expect(analizzaQuantitaOFF({ quantity: 500 })).toBeNull();
      expect(analizzaQuantitaOFF({ quantity: { valore: 500 } })).toBeNull();
    });
  });

  describe('dai campi numerici `product_quantity` + `product_quantity_unit`', () => {
    it.each<[unknown, unknown, QuantitaConfezione | null]>([
      [500, 'g', { valore: 500, unita: 'g' }],
      ['500', 'g', { valore: 500, unita: 'g' }],
      [1.5, 'kg', { valore: 1500, unita: 'g' }],
      ['0,75', 'l', { valore: 750, unita: 'ml' }],
      [33, 'cl', { valore: 330, unita: 'ml' }],
      [2, 'dl', { valore: 200, unita: 'ml' }],
      [330, 'ML', { valore: 330, unita: 'ml' }],
      [' 250 ', ' g ', { valore: 250, unita: 'g' }],
      [0.3333, 'kg', { valore: 333.3, unita: 'g' }],
    ])('product_quantity=%j unit=%j → %j', (product_quantity, product_quantity_unit, atteso) => {
      expect(analizzaQuantitaOFF({ product_quantity, product_quantity_unit })).toEqual(atteso);
    });

    it('vince sul testo `quantity` quando è valido', () => {
      expect(
        analizzaQuantitaOFF({ quantity: '6 x 125 g', product_quantity: '750', product_quantity_unit: 'g' }),
      ).toEqual({ valore: 750, unita: 'g' });
      expect(
        analizzaQuantitaOFF({ quantity: '1 L', product_quantity: 900, product_quantity_unit: 'ml' }),
      ).toEqual({ valore: 900, unita: 'ml' });
    });

    it.each<[unknown, unknown]>([
      [0, 'g'],
      [-5, 'g'],
      ['abc', 'g'],
      ['', 'g'],
      [Number.NaN, 'g'],
      [Number.POSITIVE_INFINITY, 'g'],
      [null, 'g'],
      [undefined, 'g'],
      [500, undefined],
      [500, ''],
      [500, 'oz'],
      [500, 'pz'],
      [500, 42],
    ])('ricade sul testo se product_quantity=%j unit=%j non è valido', (product_quantity, product_quantity_unit) => {
      expect(analizzaQuantitaOFF({ quantity: '500 g', product_quantity, product_quantity_unit })).toEqual({
        valore: 500,
        unita: 'g',
      });
    });

    it('null se né i campi numerici né il testo si capiscono', () => {
      expect(analizzaQuantitaOFF({ quantity: 'boh', product_quantity: 'abc', product_quantity_unit: 'g' })).toBeNull();
      expect(analizzaQuantitaOFF({ product_quantity: 500, product_quantity_unit: 'oz' })).toBeNull();
    });
  });
});

describe('formatoProposto', () => {
  it('propone il valore quando l’unità coincide con la base', () => {
    expect(formatoProposto({ valore: 750, unita: 'g' }, 'g')).toBe(750);
    expect(formatoProposto({ valore: 1000, unita: 'ml' }, 'ml')).toBe(1000);
    expect(formatoProposto({ valore: 6, unita: 'pz' }, 'pz')).toBe(6);
  });

  it('null se l’unità non coincide: niente conversione g↔ml senza densità', () => {
    expect(formatoProposto({ valore: 750, unita: 'ml' }, 'g')).toBeNull();
    expect(formatoProposto({ valore: 750, unita: 'g' }, 'ml')).toBeNull();
    expect(formatoProposto({ valore: 6, unita: 'pz' }, 'g')).toBeNull();
    expect(formatoProposto({ valore: 500, unita: 'g' }, 'pz')).toBeNull();
  });
});
