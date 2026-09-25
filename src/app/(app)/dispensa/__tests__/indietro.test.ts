import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIndietroFogli } from '../useIndietroFogli';

/*
 * La cronologia di jsdom (misurata il 25/09 con jsdom del progetto): `go(-n)` e
 * `back()` emettono un solo `popstate` per traversata, ma dopo un tick, mai
 * dentro la chiamata. Qui `go` non naviga: la chiamata si osserva, e il
 * `popstate` che il browser manderebbe dopo lo emette il test, quando serve.
 * `pushState` resta quello di jsdom, osservato.
 */
function indietro() {
  act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
}

beforeEach(() => {
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function monta(profondita: number, chiudiUltimo: () => void = vi.fn()) {
  const r = renderHook(({ p, c }: { p: number; c: () => void }) => useIndietroFogli(p, c), {
    initialProps: { p: profondita, c: chiudiUltimo },
  });
  return { ...r, chiudiUltimo, porta: (p: number, c: () => void = chiudiUltimo) => r.rerender({ p, c }) };
}

describe('useIndietroFogli', () => {
  it('a profondità 0 non tocca la cronologia', () => {
    monta(0);
    expect(window.history.pushState).not.toHaveBeenCalled();
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('un livello che si apre mette una voce sullo stesso URL; due livelli insieme ne mettono due', () => {
    const { porta } = monta(0);
    porta(1);
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(window.history.pushState).toHaveBeenLastCalledWith(null, '');
    porta(1);
    expect(window.history.pushState).toHaveBeenCalledTimes(1);

    const altro = monta(0);
    altro.porta(2);
    expect(window.history.pushState).toHaveBeenCalledTimes(3);
  });

  it('il gesto indietro (popstate non atteso) chiude l\'ultimo livello, uno alla volta, senza go()', () => {
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(1);
    porta(2);

    indietro();
    expect(chiudi).toHaveBeenCalledTimes(1);
    porta(1); // la pagina riporta lo stato al livello di sotto
    indietro();
    expect(chiudi).toHaveBeenCalledTimes(2);
    porta(0);

    expect(window.history.go).not.toHaveBeenCalled();
    expect(window.history.pushState).toHaveBeenCalledTimes(2);
  });

  it('una chiusura dall\'interfaccia consuma la voce con go(-1), e il popstate che segue non chiude altro', () => {
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(1);
    porta(0);
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-1);

    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });

  it('da 2 a 0 in un colpo (ELIMINA dal dialogo): un solo go(-2)', () => {
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(2);
    porta(0);
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-2);
    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });

  it('due chiusure di fila allo stesso livello non producono due go()', () => {
    const { porta } = monta(0);
    porta(1);
    porta(0);
    porta(0);
    expect(window.history.go).toHaveBeenCalledTimes(1);
  });

  it('dopo una chiusura dall\'interfaccia, un gesto indietro vero chiude di nuovo', () => {
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(2);
    porta(1); // da scansione a dettaglio col tasto: go(-1)
    expect(window.history.go).toHaveBeenLastCalledWith(-1);
    indietro(); // il popstate di quel go(-1): atteso
    expect(chiudi).not.toHaveBeenCalled();
    indietro(); // il gesto dell'utente
    expect(chiudi).toHaveBeenCalledTimes(1);
  });

  it('un popstate atteso scade dopo 1 s: quello che arriva dopo è il gesto dell\'utente', () => {
    let avanti = 0;
    const vero = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => vero() + avanti);
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(2);
    porta(1); // go(-1): un popstate atteso, che il browser qui non manda mai
    expect(window.history.go).toHaveBeenCalledTimes(1);

    avanti = 1001;
    indietro(); // il gesto dell'utente, oltre la scadenza
    expect(chiudi).toHaveBeenCalledTimes(1);
    porta(0);
    // L'atteso scaduto è azzerato: non si mangia neanche il popstate successivo.
    porta(1);
    indietro();
    expect(chiudi).toHaveBeenCalledTimes(2);
  });

  it('un popstate atteso entro 1 s si consuma', () => {
    let avanti = 0;
    const vero = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => vero() + avanti);
    const chiudi = vi.fn();
    const { porta } = monta(0, chiudi);
    porta(1);
    porta(0);
    avanti = 999;
    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });

  it('un popstate senza livelli aperti non chiama niente (è la navigazione della pagina)', () => {
    const chiudi = vi.fn();
    monta(0, chiudi);
    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });

  it('chiama sempre l\'ultimo chiudiUltimo, con un solo ascoltatore', () => {
    const aggiungi = vi.spyOn(window, 'addEventListener');
    const primo = vi.fn();
    const secondo = vi.fn();
    const { porta } = monta(0, primo);
    porta(1, primo);
    porta(1, secondo);
    indietro();
    expect(primo).not.toHaveBeenCalled();
    expect(secondo).toHaveBeenCalledTimes(1);
    expect(aggiungi.mock.calls.filter(([tipo]) => tipo === 'popstate')).toHaveLength(1);
  });

  it('allo smontaggio non tocca la cronologia e smette di ascoltare', () => {
    const chiudi = vi.fn();
    const { porta, unmount } = monta(0, chiudi);
    porta(2);
    unmount();
    expect(window.history.go).not.toHaveBeenCalled();
    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });
});
