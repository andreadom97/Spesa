import { describe, it, expect } from 'vitest';
import { nuovoResiduo, serveControllo, GIORNI_CONTROLLO_STAPLE, residuoUtilizzabile } from '../pantry';

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

describe('residuoUtilizzabile', () => {
  const BASE = {
    residuo: 200,
    deperibile: true,
    area: 'macelleria' as const,
    ultimoAcquisto: '2026-08-20',
    congelato: false,
    oggi: '2026-08-28',
  };

  it('un non deperibile non decade mai', () => {
    // Il riso comprato mesi fa e' ancora riso.
    expect(residuoUtilizzabile({ ...BASE, deperibile: false, ultimoAcquisto: '2020-01-01' })).toBe(200);
  });

  it('azzera il fresco oltre la soglia della sua area', () => {
    // Otto giorni per un petto di pollo: non c'e' piu'. Contarlo lo stesso
    // significa non metterlo in lista e accorgersene ai fornelli.
    expect(residuoUtilizzabile(BASE)).toBe(0);
  });

  it('lo tiene finche la soglia non e superata', () => {
    expect(residuoUtilizzabile({ ...BASE, oggi: '2026-08-23' })).toBe(200);
  });

  it('il giorno esatto della soglia vale ancora', () => {
    // Tre giorni per macelleria: il terzo giorno il pollo si mangia.
    expect(residuoUtilizzabile({ ...BASE, oggi: '2026-08-23' })).toBe(200);
    expect(residuoUtilizzabile({ ...BASE, oggi: '2026-08-24' })).toBe(0);
  });

  it('usa soglie diverse per aree diverse', () => {
    // Sette giorni dall'acquisto: lo yogurt c'e' ancora, il pollo no.
    const setteGiorni = { ...BASE, ultimoAcquisto: '2026-08-21', oggi: '2026-08-28' };
    expect(residuoUtilizzabile({ ...setteGiorni, area: 'latticini' })).toBe(200);
    expect(residuoUtilizzabile({ ...setteGiorni, area: 'macelleria' })).toBe(0);
  });

  it('il congelatore sposta la soglia a mesi', () => {
    // Il caso che rende sicuro l'azzeramento automatico: chi fa scorta e
    // congela non deve vedersi dire di ricomprare quello che ha nel freezer.
    expect(residuoUtilizzabile({ ...BASE, congelato: true })).toBe(200);
    expect(residuoUtilizzabile({ ...BASE, congelato: true, ultimoAcquisto: '2026-01-01' })).toBe(0);
  });

  it('i surgelati non decadono: sono gia congelati', () => {
    expect(residuoUtilizzabile({ ...BASE, area: 'surgelati', ultimoAcquisto: '2026-01-01' })).toBe(200);
  });

  it('non tocca un residuo dichiarato a mano su qualcosa mai comprato', () => {
    // Senza ultimo_acquisto non c'e' un orologio da cui contare, e il numero
    // e' un'affermazione che l'utente ha appena fatto dalla Dispensa:
    // cancellarla al primo ricalcolo sarebbe assurdo.
    expect(residuoUtilizzabile({ ...BASE, ultimoAcquisto: null })).toBe(200);
  });

  it('zero resta zero', () => {
    expect(residuoUtilizzabile({ ...BASE, residuo: 0 })).toBe(0);
  });
});
