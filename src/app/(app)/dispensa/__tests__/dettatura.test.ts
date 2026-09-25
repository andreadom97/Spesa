import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MSG_MICROFONO, useDettatura, type SpeechRecognitionLike } from '../useDettatura';

// Il riconoscitore finto: registra start/stop/abort e lascia l'ultima istanza
// in `ultima`, così il test può chiamarne a mano onresult / onerror / onend.
let ultima: Finto | null = null;
class Finto implements SpeechRecognitionLike {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onend: SpeechRecognitionLike['onend'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    ultima = this;
  }
}

/** Un risultato di SpeechRecognition: una lista di alternative con `isFinal`. */
function risultato(transcript: string, isFinal: boolean) {
  return Object.assign([{ transcript }], { isFinal });
}

function istanza(): Finto {
  if (!ultima) throw new Error('nessun riconoscitore creato');
  return ultima;
}

describe('useDettatura', () => {
  beforeEach(() => {
    ultima = null;
  });
  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    vi.useRealTimers();
  });

  it('senza SpeechRecognition non è disponibile e tocca() non fa niente', () => {
    const { result } = renderHook(() => useDettatura(vi.fn()));
    expect(result.current.disponibile).toBe(false);
    act(() => result.current.tocca());
    expect(result.current.attiva).toBe(false);
    expect(ultima).toBeNull();
  });

  it('con webkitSpeechRecognition è disponibile', () => {
    window.webkitSpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    expect(result.current.disponibile).toBe(true);
  });

  it('tocca() avvia in modo tocco, continua e con provvisori; un secondo tocca() ferma', () => {
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    expect(result.current.disponibile).toBe(true);

    act(() => result.current.tocca());
    const r = istanza();
    expect(r.start).toHaveBeenCalledTimes(1);
    expect(r.lang).toBe('it-IT');
    expect(r.continuous).toBe(true);
    expect(r.interimResults).toBe(true);
    expect(result.current.attiva).toBe(true);
    expect(result.current.modo).toBe('tocco');

    act(() => result.current.tocca());
    expect(r.stop).toHaveBeenCalledTimes(1);
    expect(result.current.attiva).toBe(false);
    expect(result.current.modo).toBeNull();
  });

  it('il provvisorio resta nel hook; il definitivo va a onDefinitivo, e il provvisorio si svuota', () => {
    window.SpeechRecognition = Finto;
    const onDefinitivo = vi.fn();
    const { result } = renderHook(() => useDettatura(onDefinitivo));
    act(() => result.current.tocca());
    const r = istanza();

    act(() => r.onresult!({ resultIndex: 0, results: [risultato('ho finito', false)] }));
    expect(result.current.provvisorio).toBe('ho finito');
    expect(onDefinitivo).not.toHaveBeenCalled();

    act(() => r.onresult!({ resultIndex: 0, results: [risultato(' ho finito il riso ', true)] }));
    expect(onDefinitivo).toHaveBeenCalledWith('ho finito il riso');
    expect(result.current.provvisorio).toBe('');
  });

  it('legge solo i risultati da resultIndex in poi (i precedenti sono già stati consegnati)', () => {
    window.SpeechRecognition = Finto;
    const onDefinitivo = vi.fn();
    const { result } = renderHook(() => useDettatura(onDefinitivo));
    act(() => result.current.tocca());
    const r = istanza();

    act(() => r.onresult!({
      resultIndex: 1,
      results: [risultato('ho finito il riso', true), risultato("l'olio è a metà", true), risultato('e il', false)],
    }));
    expect(onDefinitivo).toHaveBeenCalledTimes(1);
    expect(onDefinitivo).toHaveBeenCalledWith("l'olio è a metà");
    expect(result.current.provvisorio).toBe('e il');
  });

  it('premi() e rilascio dopo 400 ms: tenuto premuto, il rilascio ferma', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));

    act(() => result.current.premi());
    expect(result.current.attiva).toBe(true);
    expect(result.current.modo).toBe('tenuto');

    vi.setSystemTime(new Date('2026-09-25T10:00:00.400Z'));
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    expect(istanza().stop).toHaveBeenCalledTimes(1);
    expect(result.current.attiva).toBe(false);
  });

  it('premi() e rilascio dopo 100 ms: diventa un tocco e resta attiva; premi() di nuovo ferma', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));

    act(() => result.current.premi());
    vi.setSystemTime(new Date('2026-09-25T10:00:00.100Z'));
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
    const r = istanza();
    expect(r.stop).not.toHaveBeenCalled();
    expect(result.current.attiva).toBe(true);
    expect(result.current.modo).toBe('tocco');

    act(() => result.current.premi());
    expect(r.stop).toHaveBeenCalledTimes(1);
    expect(result.current.attiva).toBe(false);
  });

  it('pointercancel vale come rilascio', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T10:00:00.000Z'));
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));

    act(() => result.current.premi());
    vi.setSystemTime(new Date('2026-09-25T10:00:01.000Z'));
    act(() => {
      window.dispatchEvent(new Event('pointercancel'));
    });
    expect(result.current.attiva).toBe(false);
  });

  it('permesso negato → errore MSG_MICROFONO', () => {
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    act(() => result.current.tocca());
    act(() => istanza().onerror!({ error: 'not-allowed' }));
    expect(result.current.errore).toBe(MSG_MICROFONO);
    expect(MSG_MICROFONO).toBe('Il microfono non è disponibile: scrivi la nota.');
  });

  it('start() che lancia → spenta, con MSG_MICROFONO', () => {
    class Rotto extends Finto {
      start = vi.fn(() => {
        throw new Error('già avviata');
      });
    }
    window.SpeechRecognition = Rotto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    act(() => result.current.tocca());
    expect(result.current.attiva).toBe(false);
    expect(result.current.errore).toBe(MSG_MICROFONO);
  });

  it('onend dal browser (silenzio) → spenta, senza chiamare stop', () => {
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    act(() => result.current.tocca());
    const r = istanza();
    act(() => r.onend!());
    expect(result.current.attiva).toBe(false);
    expect(result.current.modo).toBeNull();
    expect(r.stop).not.toHaveBeenCalled();
  });

  it('secondi sale di 1 al secondo mentre è attiva, e riparte da 0 al prossimo avvio', () => {
    vi.useFakeTimers();
    window.SpeechRecognition = Finto;
    const { result } = renderHook(() => useDettatura(vi.fn()));
    act(() => result.current.tocca());
    expect(result.current.secondi).toBe(0);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.secondi).toBe(3);

    act(() => result.current.ferma());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.secondi).toBe(3);

    act(() => result.current.tocca());
    expect(result.current.secondi).toBe(0);
  });

  it('smontare il componente interrompe il riconoscimento', () => {
    window.SpeechRecognition = Finto;
    const { result, unmount } = renderHook(() => useDettatura(vi.fn()));
    act(() => result.current.tocca());
    const r = istanza();
    unmount();
    expect(r.abort).toHaveBeenCalledTimes(1);
  });
});
