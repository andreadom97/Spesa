import { describe, it, expect } from 'vitest';
import { nuovoResiduo, serveControllo, GIORNI_CONTROLLO_STAPLE } from '../pantry';

describe('nuovoResiduo', () => {
  it('somma il comprato e sottrae il consumato dal piano', () => {
    // Il caso yogurt: 50 g avanzati, due confezioni da 500, 750 g di porzioni.
    expect(nuovoResiduo({ residuoPrecedente: 50, acquistato: 1000, consumatoDaPiano: 750 })).toBe(300);
  });

  it('accumula il residuo su più settimane consecutive', () => {
    // 150 g al giorno per 5 giorni = 750 g, confezione da 500 g.
    let r = 0;
    r = nuovoResiduo({ residuoPrecedente: r, acquistato: 1000, consumatoDaPiano: 750 }); // 250
    r = nuovoResiduo({ residuoPrecedente: r, acquistato: 500, consumatoDaPiano: 750 });  // 0
    r = nuovoResiduo({ residuoPrecedente: r, acquistato: 1000, consumatoDaPiano: 750 }); // 250
    expect(r).toBe(250);
  });

  it('alza il residuo quando uno slot passa a fuori casa e non consuma', () => {
    expect(nuovoResiduo({ residuoPrecedente: 300, acquistato: 0, consumatoDaPiano: 0 })).toBe(300);
  });

  it('non scende sotto zero: una dispensa negativa non esiste', () => {
    expect(nuovoResiduo({ residuoPrecedente: 100, acquistato: 0, consumatoDaPiano: 400 })).toBe(0);
  });
});

describe('serveControllo', () => {
  const oggi = '2026-08-26';

  it('non chiede niente senza almeno un acquisto a storico', () => {
    expect(serveControllo({ ultimoAcquisto: null, ultimoCheck: null, oggi })).toBe(false);
  });

  it('non chiede niente prima dei 90 giorni', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-06-01', ultimoCheck: null, oggi })).toBe(false);
  });

  it('chiede esattamente al novantesimo giorno', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-05-28', ultimoCheck: null, oggi })).toBe(true);
  });

  it('chiede dopo il novantesimo giorno', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-01-10', ultimoCheck: null, oggi })).toBe(true);
  });

  it('un "sì" recente fa ripartire il conto e zittisce il controllo', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-01-10', ultimoCheck: '2026-08-01', oggi })).toBe(false);
  });

  it('torna a chiedere quando anche il "sì" ha novanta giorni', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-01-10', ultimoCheck: '2026-05-01', oggi })).toBe(true);
  });

  it('usa la costante dichiarata, non un numero magico', () => {
    expect(GIORNI_CONTROLLO_STAPLE).toBe(90);
  });
});
