import { describe, it, expect } from 'vitest';
import { assegnaPiatti } from '../planner';
import { generaSettimana } from '../week-shape';
import type { Dish, MealSlotDef } from '../types';

const DEFS: MealSlotDef[] = [
  { id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, true, false, false, false, false] },
  { id: 'cen', nome: 'Cena', posizione: 1, assenzeAbituali: Array(7).fill(false) },
];

function piatto(
  id: string,
  slotDefId: string,
  attivo = true,
  ciclo: { settimanaCiclo?: number | null; giornoCiclo?: number | null } = {},
): Dish {
  return {
    id, nome: id, slotDefId, fonte: 'proprio', attivo, descrizione: null,
    settimanaCiclo: ciclo.settimanaCiclo ?? null,
    giornoCiclo: ciclo.giornoCiclo ?? null,
    ingredienti: [],
    componenti: [],
  };
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

  it('con quattordici piatti non riusa sempre i primi sette', () => {
    // Il difetto che il ciclo esiste per correggere: l'ordinale ripartiva da
    // zero ogni lunedì, quindi metà repertorio non veniva mai usata.
    const quattordici = Array.from({ length: 14 }, (_, i) => piatto(`p${i}`, 'cen'));
    const prima = assegnaPiatti({ slots, dishes: quattordici, settimaneTrascorse: 0 });
    const dopo = assegnaPiatti({ slots, dishes: quattordici, settimaneTrascorse: 1 });

    const cene = (r: typeof prima) => r
      .filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((s) => s.dishId);

    expect(cene(prima)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(cene(dopo)).toEqual(['p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13']);
  });

  it('la rotazione riprende da capo dopo un giro intero', () => {
    const due = [piatto('a', 'cen'), piatto('b', 'cen')];
    const s0 = assegnaPiatti({ slots, dishes: due, settimaneTrascorse: 0 });
    const s2 = assegnaPiatti({ slots, dishes: due, settimaneTrascorse: 2 });
    const cene = (r: typeof s0) => r
      .filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data)).map((s) => s.dishId);
    // 7 giorni e 2 piatti: la settimana dopo parte dall'altro piatto, quella
    // dopo ancora torna al primo.
    expect(cene(s2)).toEqual(cene(s0));
  });
});

describe('assegnaPiatti — ciclo su più settimane', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('usa solo i piatti della settimana del ciclo in corso', () => {
    const dishes = [
      piatto('s1a', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s1b', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s2a', 'cen', true, { settimanaCiclo: 2 }),
    ];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's1a' || s.dishId === 's1b')).toBe(true);

    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's2a')).toBe(true);
  });

  it('i piatti senza settimana dichiarata valgono per tutte', () => {
    const dishes = [piatto('sempre', 'cen'), piatto('s2', 'cen', true, { settimanaCiclo: 2 })];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 'sempre')).toBe(true);
  });

  it('se per quella settimana non c\'è nessun piatto, ripiega su tutto il repertorio', () => {
    // Meglio un piatto fuori giro che una cena vuota: chi ha taggato solo
    // metà repertorio non deve trovarsi mezza settimana in bianco.
    const dishes = [piatto('s1', 'cen', true, { settimanaCiclo: 1 })];
    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's1')).toBe(true);
  });

  it('un piatto con giorno fisso va in quel giorno, non in rotazione', () => {
    const dishes = [
      piatto('mercoledi', 'cen', true, { giornoCiclo: 2 }),
      piatto('altro1', 'cen'),
      piatto('altro2', 'cen'),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    // 2026-09-02 è il mercoledì della settimana che inizia il 31/08.
    expect(dopo.find((s) => s.data === '2026-09-02' && s.slotDefId === 'cen')!.dishId).toBe('mercoledi');
    // E non compare in nessun altro giorno.
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.data !== '2026-09-02')
      .every((s) => s.dishId !== 'mercoledi')).toBe(true);
  });

  it('il giorno fisso vale dentro la sua settimana del ciclo, non nell\'altra', () => {
    const dishes = [
      piatto('lun1', 'cen', true, { settimanaCiclo: 1, giornoCiclo: 0 }),
      piatto('lun2', 'cen', true, { settimanaCiclo: 2, giornoCiclo: 0 }),
    ];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.find((s) => s.data === '2026-08-31' && s.slotDefId === 'cen')!.dishId).toBe('lun1');
    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.find((s) => s.data === '2026-08-31' && s.slotDefId === 'cen')!.dishId).toBe('lun2');
  });

  it('se tutti i piatti hanno un giorno fisso, i giorni scoperti ruotano lo stesso', () => {
    const dishes = [
      piatto('lun', 'cen', true, { giornoCiclo: 0 }),
      piatto('mar', 'cen', true, { giornoCiclo: 1 }),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId !== null)).toBe(true);
  });
});
describe('assegnaPiatti — ciclo spento', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('senza settimana del ciclo le etichette dei piatti non filtrano niente', () => {
    // Spegnere la rotazione deve riportare al comportamento di prima, non
    // nascondere per sempre i piatti che erano stati taggati settimana 2.
    const dishes = [
      piatto('s1', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s2', 'cen', true, { settimanaCiclo: 2 }),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    const usati = new Set(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa').map((s) => s.dishId));
    expect([...usati].sort()).toEqual(['s1', 's2']);
  });

  it('il giorno fisso continua a valere anche a ciclo spento', () => {
    // "Il venerdì è pizza" non ha bisogno di una rotazione per essere vero.
    const dishes = [piatto('venerdi', 'cen', true, { giornoCiclo: 4 }), piatto('altro', 'cen')];
    const dopo = assegnaPiatti({ slots, dishes });
    expect(dopo.find((s) => s.data === '2026-09-04' && s.slotDefId === 'cen')!.dishId).toBe('venerdi');
  });
});
