import { describe, it, expect } from 'vitest';
import { aIngrediente, aMealSlot, aPantryState } from '../mappers';

describe('aIngrediente', () => {
  it('converte una riga in un ingrediente di dominio', () => {
    expect(aIngrediente({
      id: 'a', nome: 'Yogurt greco', unita_base: 'g', area: 'latticini',
      classe_residuo: 'porzionabile', deperibile: true, formato_confezione: '500',
    })).toEqual({
      id: 'a', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500,
    });
  });

  it('converte i numeric di Postgres, che arrivano come stringhe', () => {
    expect(aIngrediente({
      id: 'a', nome: 'x', unita_base: 'g', area: 'dispensa',
      classe_residuo: 'porzionabile', deperibile: false, formato_confezione: '0.5',
    }).formatoConfezione).toBe(0.5);
  });
});

describe('aMealSlot', () => {
  it('normalizza la data a yyyy-mm-dd', () => {
    expect(aMealSlot({
      id: 's', data: '2026-08-31', slot_def_id: 'col',
      stato: 'casa', dish_id: null, fonte_stato: 'default',
    }).data).toBe('2026-08-31');
  });

  it('tiene dishId a null quando non c\'è piatto', () => {
    expect(aMealSlot({
      id: 's', data: '2026-08-31', slot_def_id: 'col',
      stato: 'fuori', dish_id: null, fonte_stato: 'checkin',
    }).dishId).toBeNull();
  });
});

describe('aPantryState', () => {
  it('porta residuo e date nel dominio', () => {
    expect(aPantryState({
      ingredient_id: 'a', residuo: '300', ultimo_acquisto: '2026-01-10',
      giorni_stimati: 90, ultimo_check: null, congelato: false,
    })).toEqual({
      ingredientId: 'a', residuo: 300, ultimoAcquisto: '2026-01-10',
      giorniStimati: 90, ultimoCheck: null, congelato: false,
    });
  });

  it('legge congelato, e lo tratta come falso se la colonna non arriva', () => {
    // Difesa sul disallineamento fra codice e schema: se il deploy precede la
    // migrazione 0003, `congelato` arriva undefined. Vale false, cioe' il
    // comportamento di prima — mai true per sbaglio, che terrebbe in vita un
    // residuo di pollo per novanta giorni.
    expect(aPantryState({
      ingredient_id: 'a', residuo: 10, ultimo_acquisto: null,
      giorni_stimati: 90, ultimo_check: null, congelato: true,
    }).congelato).toBe(true);
    expect(aPantryState({
      ingredient_id: 'a', residuo: 10, ultimo_acquisto: null,
      giorni_stimati: 90, ultimo_check: null,
    }).congelato).toBe(false);
  });
});
