import { describe, it, expect } from 'vitest';
import { generaSettimana, applicaStato } from '../week-shape';
import type { MealSlot, MealSlotDef } from '../types';

const SLOT_DEFS: MealSlotDef[] = [
  { id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, true, false, false, false, false] },
  { id: 'pra', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, true, true, true, true, false, false] },
  { id: 'cen', nome: 'Cena', posizione: 2, assenzeAbituali: [false, false, false, false, false, false, false] },
];

describe('generaSettimana', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: SLOT_DEFS });

  it('produce sette giorni per ogni pasto definito', () => {
    expect(slots).toHaveLength(21);
  });

  it('regge tre pasti come cinque: niente enum a quattro slot', () => {
    const cinque = [...SLOT_DEFS,
      { id: 'spu1', nome: 'Spuntino', posizione: 3, assenzeAbituali: Array(7).fill(false) },
      { id: 'spu2', nome: 'Merenda', posizione: 4, assenzeAbituali: Array(7).fill(false) },
    ];
    expect(generaSettimana({ dataInizio: '2026-08-31', slotDefs: cinque })).toHaveLength(35);
  });

  it('mette a casa di default', () => {
    const lun = slots.find((s) => s.data === '2026-08-31' && s.slotDefId === 'cen')!;
    expect(lun.stato).toBe('casa');
  });

  it('applica le assenze abituali: il pranzo infrasettimanale è fuori', () => {
    const mar = slots.find((s) => s.data === '2026-09-01' && s.slotDefId === 'pra')!;
    expect(mar.stato).toBe('fuori');
  });

  it('non applica l\'assenza abituale nel weekend se non è segnata', () => {
    const sab = slots.find((s) => s.data === '2026-09-05' && s.slotDefId === 'pra')!;
    expect(sab.stato).toBe('casa');
  });

  it('marca ogni slot come proveniente dal default', () => {
    expect(slots.every((s) => s.fonteStato === 'default')).toBe(true);
  });

  it('non assegna nessun piatto: lo fa il planner', () => {
    expect(slots.every((s) => s.dishId === null)).toBe(true);
  });
});

describe('applicaStato', () => {
  const slot: MealSlot = {
    id: 's1', data: '2026-08-31', slotDefId: 'cen',
    stato: 'casa', dishId: null, fonteStato: 'checkin',
    scelte: {},
  };

  it('una fonte più forte sovrascrive', () => {
    expect(applicaStato(slot, 'fuori', 'correzione').stato).toBe('fuori');
  });

  it('la stessa fonte sovrascrive: correggersi due volte deve funzionare', () => {
    expect(applicaStato(slot, 'fuori', 'checkin').stato).toBe('fuori');
  });

  it('una fonte più debole non tocca niente', () => {
    const dopo = applicaStato(slot, 'fuori', 'default');
    expect(dopo.stato).toBe('casa');
    expect(dopo.fonteStato).toBe('checkin');
  });

  it('registra la nuova fonte quando scrive', () => {
    expect(applicaStato(slot, 'fuori', 'correzione').fonteStato).toBe('correzione');
  });
});
