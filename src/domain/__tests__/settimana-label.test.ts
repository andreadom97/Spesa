import { describe, it, expect } from 'vitest';
import { etichettaSettimana, parolaTemporale } from '../settimana-label';

describe('etichettaSettimana', () => {
  it('nomina il lunedì della settimana in parole', () => {
    expect(etichettaSettimana('2026-09-21')).toBe('Settimana del 21 settembre');
  });

  it('funziona il primo del mese', () => {
    expect(etichettaSettimana('2026-06-01')).toBe('Settimana del 1 giugno');
  });

  it('nomina il lunedì anche quando la settimana finisce nel mese dopo', () => {
    // 29 settembre → domenica 5 ottobre: l'etichetta non prova a dire due mesi.
    expect(etichettaSettimana('2026-09-29')).toBe('Settimana del 29 settembre');
  });

  it('con una data non valida non scrive "NaN": torna stringa vuota e la pillola non compare', () => {
    expect(etichettaSettimana('non-una-data')).toBe('');
  });
});

describe('parolaTemporale', () => {
  it('dice Oggi, Domani e Ieri', () => {
    expect(parolaTemporale('2026-09-17', '2026-09-17')).toBe('Oggi');
    expect(parolaTemporale('2026-09-18', '2026-09-17')).toBe('Domani');
    expect(parolaTemporale('2026-09-16', '2026-09-17')).toBe('Ieri');
  });

  it('tace sui giorni più lontani', () => {
    expect(parolaTemporale('2026-09-19', '2026-09-17')).toBeNull();
    expect(parolaTemporale('2026-09-15', '2026-09-17')).toBeNull();
  });
});
