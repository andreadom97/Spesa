import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { salvaFile } from '../salva-file';

const file = new File(['{"formato":1}'], 'dispesa-25-09-2026.json', { type: 'application/json' });

/** Il foglio di condivisione del sistema, finto: `share` e `canShare` come le dà il browser. */
function condivisione(share: () => Promise<void>, canShare: () => boolean = () => true) {
  Object.defineProperty(navigator, 'canShare', { value: vi.fn(canShare), configurable: true });
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true });
}

let clic: MockInstance<HTMLAnchorElement['click']>;
let creaUrl: MockInstance<typeof URL.createObjectURL>;
let revoca: MockInstance<typeof URL.revokeObjectURL>;

/** L'<a> su cui è partito il click: Vitest tiene il `this` di ogni chiamata in `mock.contexts`. */
function ancora(): HTMLAnchorElement {
  return clic.mock.contexts[0] as HTMLAnchorElement;
}

beforeEach(() => {
  creaUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:finto');
  revoca = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).canShare;
  delete (navigator as unknown as Record<string, unknown>).share;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('salvaFile (spec fase 5 §E.3)', () => {
  it('con la condivisione dei file apre il foglio del sistema, e non scarica', async () => {
    condivisione(() => Promise.resolve());
    expect(await salvaFile(file)).toBe('condiviso');
    expect(navigator.canShare).toHaveBeenCalledWith({ files: [file] });
    expect(navigator.share).toHaveBeenCalledWith({ files: [file] });
    expect(creaUrl).not.toHaveBeenCalled();
  });

  it('se l\'utente chiude il foglio (AbortError) non è un errore, e non scarica', async () => {
    condivisione(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    expect(await salvaFile(file)).toBe('annullato');
    expect(creaUrl).not.toHaveBeenCalled();
  });

  it('senza condivisione scarica: un <a download> col nome del file, cliccato da codice e tolto', async () => {
    vi.useFakeTimers();
    expect(await salvaFile(file)).toBe('scaricato');
    expect(creaUrl).toHaveBeenCalledWith(file);
    expect(clic).toHaveBeenCalledTimes(1);
    expect(ancora().download).toBe('dispesa-25-09-2026.json');
    expect(ancora().href).toBe('blob:finto');
    expect(document.body.contains(ancora())).toBe(false);
    // L'URL resta vivo il tempo che il download parta, poi si libera.
    expect(revoca).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40_000);
    expect(revoca).toHaveBeenCalledWith('blob:finto');
  });

  it('se il browser non condivide file (canShare falso) scarica', async () => {
    condivisione(() => Promise.resolve(), () => false);
    expect(await salvaFile(file)).toBe('scaricato');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('se la condivisione fallisce per un altro motivo, ripiega sul download (D4)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    condivisione(() => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')));
    expect(await salvaFile(file)).toBe('scaricato');
    expect(ancora().download).toBe('dispesa-25-09-2026.json');
  });
});
