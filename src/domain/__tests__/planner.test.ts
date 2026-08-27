import { describe, it, expect } from 'vitest';
import { assegnaPiatti } from '../planner';
import { generaSettimana } from '../week-shape';
import type { Dish, MealSlotDef } from '../types';

const DEFS: MealSlotDef[] = [
  { id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, true, false, false, false, false] },
  { id: 'cen', nome: 'Cena', posizione: 1, assenzeAbituali: Array(7).fill(false) },
];

function piatto(id: string, slotDefId: string, attivo = true): Dish {
  return { id, nome: id, slotDefId, fonte: 'proprio', attivo, ingredienti: [] };
}

const PIATTI = [piatto('c1', 'col'), piatto('c2', 'col'), piatto('n1', 'cen')];

describe('assegnaPiatti', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('assegna un piatto a ogni slot a casa', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.stato === 'casa').every((s) => s.dishId !== null)).toBe(true);
  });

  it('non assegna niente agli slot fuori casa', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.stato === 'fuori').every((s) => s.dishId === null)).toBe(true);
  });

  it('ruota fra i piatti disponibili per quel pasto', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    const col = dopo.filter((s) => s.slotDefId === 'col' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data));
    expect(col.map((s) => s.dishId)).toEqual(['c1', 'c2', 'c1', 'c2', 'c1', 'c2']);
  });

  it('non pesca piatti di un altro pasto', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 'n1')).toBe(true);
  });

  it('ignora i piatti disattivati', () => {
    const dopo = assegnaPiatti({ slots, dishes: [piatto('c1', 'col'), piatto('c2', 'col', false), piatto('n1', 'cen')] });
    expect(dopo.filter((s) => s.slotDefId === 'col' && s.stato === 'casa')
      .every((s) => s.dishId === 'c1')).toBe(true);
  });

  it('lascia lo slot vuoto se per quel pasto non c\'è nessun piatto', () => {
    const dopo = assegnaPiatti({ slots, dishes: [piatto('n1', 'cen')] });
    expect(dopo.filter((s) => s.slotDefId === 'col').every((s) => s.dishId === null)).toBe(true);
  });

  it('non tocca uno slot che ha già un piatto scelto a mano', () => {
    const conScelta = slots.map((s) =>
      s.data === '2026-08-31' && s.slotDefId === 'col' ? { ...s, dishId: 'c2' } : s);
    const dopo = assegnaPiatti({ slots: conScelta, dishes: PIATTI });
    expect(dopo.find((s) => s.data === '2026-08-31' && s.slotDefId === 'col')!.dishId).toBe('c2');
  });

  it('è stabile rispetto all\'ordine dell\'array: stessi slot in ordine diverso → stesse assegnazioni per date', () => {
    const dopo1 = assegnaPiatti({ slots, dishes: PIATTI });
    // Mescola l'ordine degli slot
    const slotsMescolati = [...slots].reverse();
    const dopo2 = assegnaPiatti({ slots: slotsMescolati, dishes: PIATTI });

    // Verifico che per ogni data e slotDef, l'assegnazione sia identica
    for (const slot of slots) {
      const s1 = dopo1.find((s) => s.data === slot.data && s.slotDefId === slot.slotDefId)!;
      const s2 = dopo2.find((s) => s.data === slot.data && s.slotDefId === slot.slotDefId)!;
      expect(s2.dishId).toBe(s1.dishId);
    }
  });
});
