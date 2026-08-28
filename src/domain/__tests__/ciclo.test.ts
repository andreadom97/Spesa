import { describe, it, expect } from 'vitest';
import { ORIGINE_ROTAZIONE, settimanaDelCiclo, settimaneTrascorse } from '../ciclo';

describe('settimaneTrascorse', () => {
  it('conta le settimane piene dall\'origine', () => {
    expect(settimaneTrascorse('2026-08-31', '2026-08-31')).toBe(0);
    expect(settimaneTrascorse('2026-09-07', '2026-08-31')).toBe(1);
    expect(settimaneTrascorse('2026-10-05', '2026-08-31')).toBe(5);
  });

  it('è negativo prima dell\'origine, non un errore', () => {
    // Chi imposta il ciclo oggi e riapre una settimana passata deve vedere
    // una settimana del ciclo, non una schermata rotta.
    expect(settimaneTrascorse('2026-08-24', '2026-08-31')).toBe(-1);
  });

  it('senza origine conta dall\'origine di ripiego', () => {
    expect(settimaneTrascorse(ORIGINE_ROTAZIONE, null)).toBe(0);
    expect(settimaneTrascorse('2026-01-12', null)).toBe(1);
  });

  it('normalizza al lunedì: un\'origine sporca non produce mezze settimane', () => {
    // 2026-09-02 è un mercoledì; il suo lunedì è il 31/08.
    expect(settimaneTrascorse('2026-09-09', '2026-09-02')).toBe(1);
  });
});

describe('settimanaDelCiclo', () => {
  it('con un ciclo di una settimana risponde sempre 1', () => {
    for (const lunedi of ['2026-08-31', '2026-09-07', '2026-09-14']) {
      expect(settimanaDelCiclo({ lunedi, origine: '2026-08-31', settimaneCiclo: 1 })).toBe(1);
    }
  });

  it('alterna 1 e 2 su un ciclo di due settimane', () => {
    const g = (lunedi: string) => settimanaDelCiclo({ lunedi, origine: '2026-08-31', settimaneCiclo: 2 });
    expect([g('2026-08-31'), g('2026-09-07'), g('2026-09-14'), g('2026-09-21')]).toEqual([1, 2, 1, 2]);
  });

  it('gira su quattro settimane e ricomincia', () => {
    const g = (lunedi: string) => settimanaDelCiclo({ lunedi, origine: '2026-08-31', settimaneCiclo: 4 });
    expect([g('2026-08-31'), g('2026-09-07'), g('2026-09-14'), g('2026-09-21'), g('2026-09-28')])
      .toEqual([1, 2, 3, 4, 1]);
  });

  it('resta nell\'intervallo 1..N anche prima dell\'origine', () => {
    // -1 % 2 in JS vale -1: senza modulo positivo qui uscirebbe la settimana 0.
    expect(settimanaDelCiclo({ lunedi: '2026-08-24', origine: '2026-08-31', settimaneCiclo: 2 })).toBe(2);
    expect(settimanaDelCiclo({ lunedi: '2026-08-17', origine: '2026-08-31', settimaneCiclo: 3 })).toBe(2);
  });

  it('senza origine il ciclo funziona lo stesso, ancorato al ripiego', () => {
    const g = (lunedi: string) => settimanaDelCiclo({ lunedi, origine: null, settimaneCiclo: 2 });
    expect([g('2026-01-05'), g('2026-01-12')]).toEqual([1, 2]);
  });

  it('rientra nei limiti se il numero di settimane è fuori scala', () => {
    // Il database ha già un check 1..4; questo è il secondo cancello, per i
    // dati che arrivano da un client vecchio o da una scrittura a mano.
    expect(settimanaDelCiclo({ lunedi: '2026-09-07', origine: '2026-08-31', settimaneCiclo: 0 })).toBe(1);
    expect(settimanaDelCiclo({ lunedi: '2026-09-07', origine: '2026-08-31', settimaneCiclo: 99 })).toBe(2);
  });
});
