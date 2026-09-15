import { describe, it, expect } from 'vitest';
import type { MealSlotDef } from '@/domain/types';
import { PIATTI_PER_GIRARE, PIATTI_PER_PASTO, settimanaPuoGirare, testoContatore } from '../contatore';

const ASSENZE = [false, false, false, false, false, false, false];
const COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };
const CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };
const SPUNTINO: MealSlotDef = { id: 'sd-4', nome: 'Spuntino', posizione: 3, assenzeAbituali: ASSENZE };
const QUATTRO_PASTI = [COLAZIONE, PRANZO, CENA, SPUNTINO];

/** Conteggio per pasto nell'ordine Colazione/Pranzo/Cena/Spuntino; il totale è la somma. */
function conta(colazione: number, pranzo: number, cena: number, spuntino: number) {
  const perPasto = new Map([
    ['sd-1', colazione], ['sd-2', pranzo], ['sd-3', cena], ['sd-4', spuntino],
  ]);
  return { n: colazione + pranzo + cena + spuntino, perPasto };
}

describe('costanti del contatore', () => {
  it('la soglia è quattro pasti per due piatti', () => {
    expect(PIATTI_PER_PASTO).toBe(2);
    expect(PIATTI_PER_GIRARE).toBe(8);
  });
});

describe('settimanaPuoGirare', () => {
  it('vero con la soglia raggiunta e ogni pasto con almeno due piatti', () => {
    const { n, perPasto } = conta(2, 2, 2, 2);
    expect(settimanaPuoGirare(n, perPasto, QUATTRO_PASTI)).toBe(true);
  });

  it('falso con la soglia raggiunta ma un pasto scoperto (la prova del 15/09: 2/6/2/1)', () => {
    const { n, perPasto } = conta(2, 6, 2, 1);
    expect(settimanaPuoGirare(n, perPasto, QUATTRO_PASTI)).toBe(false);
  });

  it('falso con un pasto senza nessun piatto, anche se manca dalla mappa', () => {
    const perPasto = new Map([['sd-1', 3], ['sd-2', 3], ['sd-3', 3]]);
    expect(settimanaPuoGirare(9, perPasto, QUATTRO_PASTI)).toBe(false);
  });

  it('falso sotto la soglia anche se ogni pasto è coperto', () => {
    const { n, perPasto } = conta(2, 2, 2, 0);
    expect(settimanaPuoGirare(n, perPasto, [COLAZIONE, PRANZO, CENA])).toBe(false);
  });

  it('falso con zero piatti', () => {
    expect(settimanaPuoGirare(0, new Map(), QUATTRO_PASTI)).toBe(false);
  });
});

describe('testoContatore', () => {
  describe('sotto la soglia', () => {
    it('con zero piatti non propone di uscire', () => {
      expect(testoContatore(0, new Map(), QUATTRO_PASTI)).toBe(
        'Nessun piatto ancora · ne bastano 8 per far girare la settimana',
      );
    });

    it('con un piatto: singolare e la via d\'uscita', () => {
      const { n, perPasto } = conta(1, 0, 0, 0);
      expect(testoContatore(n, perPasto, QUATTRO_PASTI)).toBe(
        '1 piatto salvato · ne bastano 8 per far girare la settimana · o esci con HO FINITO',
      );
    });

    it('con più piatti: plurale e la via d\'uscita', () => {
      const { n, perPasto } = conta(2, 3, 2, 0);
      expect(testoContatore(n, perPasto, QUATTRO_PASTI)).toBe(
        '7 piatti salvati · ne bastano 8 per far girare la settimana · o esci con HO FINITO',
      );
    });
  });

  describe('soglia raggiunta', () => {
    it('con tutti i pasti coperti dice che la settimana può girare', () => {
      const { n, perPasto } = conta(2, 2, 2, 2);
      expect(testoContatore(n, perPasto, QUATTRO_PASTI)).toBe(
        'Ne hai 8: la settimana può girare. Aggiungine quanti vuoi.',
      );
    });

    it('con un pasto a cui manca un piatto lo dice al singolare e ricorda che si può uscire', () => {
      const { n, perPasto } = conta(2, 6, 2, 1);
      expect(testoContatore(n, perPasto, QUATTRO_PASTI)).toBe(
        '11 piatti salvati · manca 1 piatto per Spuntino (o esci con HO FINITO)',
      );
    });

    it('con un pasto senza piatti lo dice al plurale', () => {
      const { n, perPasto } = conta(3, 3, 0, 2);
      expect(testoContatore(n, perPasto, QUATTRO_PASTI)).toBe(
        '8 piatti salvati · mancano 2 piatti per Cena (o esci con HO FINITO)',
      );
    });

    it('nomina il pasto con meno piatti, a parità il primo nell\'ordine', () => {
      // Pranzo ha 1, Spuntino 0: si nomina Spuntino.
      const uno = conta(7, 1, 2, 0);
      expect(testoContatore(uno.n, uno.perPasto, QUATTRO_PASTI)).toContain('mancano 2 piatti per Spuntino');
      // Pranzo e Cena entrambi a 1: si nomina Pranzo.
      const due = conta(6, 1, 1, 2);
      expect(testoContatore(due.n, due.perPasto, QUATTRO_PASTI)).toContain('manca 1 piatto per Pranzo');
    });
  });
});
