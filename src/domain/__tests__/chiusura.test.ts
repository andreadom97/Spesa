import { describe, it, expect } from 'vitest';
import { calcolaChiusura } from '../chiusura';

const OGGI = '2026-09-06';

describe('calcolaChiusura', () => {
  it('somma il comprato e sottrae il fabbisogno del piano', () => {
    const r = calcolaChiusura({
      voci: [{ ingredientId: 'yogurt', spuntato: true, quantitaTotale: 1000, fabbisogno: 750, residuo: 50, confezioni: 2, origine: 'piano' }],
      oggi: OGGI,
    });
    expect(r).toEqual([{
      ingredientId: 'yogurt', residuo: 300, ultimoAcquisto: OGGI,
      confezioni: 2, quantita: 1000, registraAcquisto: true,
    }]);
  });

  it('non conta come comprato ciò che non è stato spuntato, ma consuma comunque il piano', () => {
    const r = calcolaChiusura({
      voci: [{ ingredientId: 'yogurt', spuntato: false, quantitaTotale: 1000, fabbisogno: 750, residuo: 50, confezioni: 2, origine: 'piano' }],
      oggi: OGGI,
    });
    expect(r[0].residuo).toBe(0);              // max(0, 50 + 0 − 750)
    expect(r[0].registraAcquisto).toBe(false);
    expect(r[0].ultimoAcquisto).toBeNull();
  });

  it('registra l\'acquisto di una riga di controllo senza toccarne il residuo', () => {
    const r = calcolaChiusura({
      voci: [{ ingredientId: 'olio', spuntato: true, quantitaTotale: 1000, fabbisogno: 0, residuo: 0, confezioni: 1, origine: 'controllo' }],
      oggi: OGGI,
    });
    expect(r[0].registraAcquisto).toBe(true);
    expect(r[0].ultimoAcquisto).toBe(OGGI);
    expect(r[0].residuo).toBeNull();  // la classe stima non tiene residuo
  });

  it('non produce mai un residuo negativo', () => {
    const r = calcolaChiusura({
      voci: [{ ingredientId: 'x', spuntato: false, quantitaTotale: 0, fabbisogno: 900, residuo: 100, confezioni: 0, origine: 'piano' }],
      oggi: OGGI,
    });
    expect(r[0].residuo).toBe(0);
  });
});
