import { describe, it, expect } from 'vitest';
import { giorniTra, lunediDi, giorniDellaSettimana } from '../date';

describe('giorniTra', () => {
  it('conta i giorni fra due date ISO', () => {
    expect(giorniTra('2026-08-26', '2026-08-31')).toBe(5);
  });

  it('attraversa il cambio di mese', () => {
    expect(giorniTra('2026-08-26', '2026-11-24')).toBe(90);
  });

  it('attraversa il cambio dell\'ora legale senza sbagliare di un giorno', () => {
    expect(giorniTra('2026-10-20', '2026-11-03')).toBe(14);
  });

  it('è zero sullo stesso giorno', () => {
    expect(giorniTra('2026-08-26', '2026-08-26')).toBe(0);
  });
});

describe('lunediDi', () => {
  it('restituisce sé stesso su un lunedì', () => {
    expect(lunediDi('2026-08-31')).toBe('2026-08-31');
  });

  it('torna indietro al lunedì da una domenica', () => {
    expect(lunediDi('2026-09-06')).toBe('2026-08-31');
  });

  it('torna indietro al lunedì da un mercoledì', () => {
    expect(lunediDi('2026-09-02')).toBe('2026-08-31');
  });
});

describe('giorniDellaSettimana', () => {
  it('produce sette date consecutive a partire dal lunedì', () => {
    expect(giorniDellaSettimana('2026-08-31')).toEqual([
      '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03',
      '2026-09-04', '2026-09-05', '2026-09-06',
    ]);
  });
});
