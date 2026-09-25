import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
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
  vi.useRealTimers();
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

/**
 * Il modo in cui il pannello userà l'hook (spec fase 5 §A.5): nello stesso gesto registra la
 * navigazione con `chiudiTuttoPoi` e porta il proprio stato a profondità 0.
 */
function Banco({ fn }: { fn: () => void }) {
  const [livelli, setLivelli] = useState(0);
  const { chiudiTuttoPoi } = useIndietroFogli(livelli, () => setLivelli((l) => Math.max(0, l - 1)));
  return (
    <div>
      <p>{`livelli ${livelli}`}</p>
      <button type="button" onClick={() => setLivelli(2)}>apri due</button>
      <button type="button" onClick={() => { chiudiTuttoPoi(fn); setLivelli(0); }}>vai</button>
    </div>
  );
}

const tocca = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }));

describe('chiudiTuttoPoi (spec fase 5 §A.5)', () => {
  it('con due voci aperte: un solo go(-2), e fn parte al popstate atteso, non prima, una volta sola', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    expect(window.history.pushState).toHaveBeenCalledTimes(2);

    tocca('vai');
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-2);
    expect(fn).not.toHaveBeenCalled();

    indietro(); // il popstate del go(-2)
    expect(fn).toHaveBeenCalledTimes(1);
    indietro(); // un popstate dopo: non è più nostro, non la richiama
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.getByText('livelli 0')).toBeInTheDocument();
  });

  it('senza voci aperte fn parte subito, nell\'effetto, senza go()', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('vai');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('se il popstate atteso non arriva, fn parte dopo 1 s, e il popstate in ritardo non la richiama', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let avanti = 0;
    const vero = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => vero() + avanti);
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');

    act(() => { vi.advanceTimersByTime(999); });
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(1);

    avanti = 1500;
    indietro(); // il popstate arrivato tardi: fuori tempo, e le voci sono già 0
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('dopo chiudiTuttoPoi il gesto indietro torna a chiudere un livello alla volta', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');
    indietro(); // atteso
    expect(fn).toHaveBeenCalledTimes(1);

    tocca('apri due');
    expect(window.history.pushState).toHaveBeenCalledTimes(4);
    indietro(); // il gesto dell'utente
    expect(screen.getByText('livelli 1')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allo smontaggio una fn in attesa non parte più', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fn = vi.fn();
    const { unmount } = render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');
    unmount();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it('chiudiTuttoPoi è la stessa funzione a ogni render', () => {
    const { result, porta } = monta(0);
    const prima = result.current.chiudiTuttoPoi;
    porta(1);
    expect(result.current.chiudiTuttoPoi).toBe(prima);
  });
});
