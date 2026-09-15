import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Camera } from '../Camera';

/**
 * jsdom non decodifica immagini né produce blob da canvas: si mockano
 * `createImageBitmap` (decodifica), `getContext` (disegno) e `toBlob`
 * (ricompressione jpeg). Ogni file scelto — o scatto — diventa così un blob
 * jpeg finto, distinto dal File originale: è il percorso che nel browser vero
 * ridimensiona e ricomprime anche le foto di galleria (3–5 MB, HEIC su iPhone).
 */
function mockaDecodifica() {
  const contesto = { drawImage: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3000, height: 4000, close: vi.fn() })));
  // Il ripiego `<img>` (browser senza `createImageBitmap`, o formato che la
  // bitmap non decodifica) in jsdom non emetterebbe mai `load` né `error`:
  // qui fallisce subito, come fa un browser vero con un file illeggibile.
  vi.stubGlobal(
    'Image',
    class {
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => contesto) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, cb: BlobCallback) {
    cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
  });
  return contesto;
}

function fileFinti(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File([String(i)], `p${i + 1}.jpg`, { type: 'image/jpeg' }));
}

function abilitaFotocamera() {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  });
  return { stop };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // jsdom non ha mediaDevices: di default siamo nel ramo fallback.
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  // jsdom non implementa gli object URL.
  URL.createObjectURL = vi.fn(() => 'blob:finto');
  URL.revokeObjectURL = vi.fn();
  mockaDecodifica();
});

describe('Camera', () => {
  it('senza getUserMedia mostra il picker di fallback', async () => {
    render(<Camera onFoto={() => {}} />);
    expect(await screen.findByLabelText(/scegli le foto/i)).toBeInTheDocument();
  });

  // L'input reale resta accessibile (nome accessibile invariato, verificato
  // sopra) ma visivamente nascosto: il tap va sul finto bottone testuale,
  // vestito come gli altri bottoni dell'app.
  it('il picker di fallback mostra un bottone "DALLA GALLERIA", non l\'input di sistema', async () => {
    render(<Camera onFoto={() => {}} />);
    expect(await screen.findByText('DALLA GALLERIA')).toBeInTheDocument();
    const input = screen.getByLabelText(/scegli le foto/i);
    expect(input).toHaveStyle({ opacity: '0' });
  });

  it('il picker di fallback apre la galleria: nessun attributo capture (riaprirebbe la fotocamera di sistema)', async () => {
    render(<Camera onFoto={() => {}} />);
    const input = await screen.findByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('le foto scelte dal picker vengono ricompresse, producono miniature e arrivano a onFoto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const [f1, f2] = fileFinti(2);
    fireEvent.change(input, { target: { files: [f1, f2] } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const blob = onFoto.mock.lastCall![0] as Blob[];
    expect(blob).toHaveLength(2);
    // Non i File originali: i blob jpeg usciti dal canvas.
    expect(blob[0]).not.toBe(f1);
    expect(blob[1]).not.toBe(f2);
    expect(blob.every((b) => b.type === 'image/jpeg')).toBe(true);
    expect(screen.getByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
  });

  it('la ricompressione ridimensiona al lato lungo di 1568px, come lo scatto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(1) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const toBlob = vi.mocked(HTMLCanvasElement.prototype.toBlob);
    const canvas = toBlob.mock.contexts[0] as HTMLCanvasElement;
    // 3000×4000 → lato lungo 1568 → 1176×1568.
    expect(canvas.width).toBe(1176);
    expect(canvas.height).toBe(1568);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.75);
  });

  it('un file che non si decodifica è scartato con un messaggio, gli altri passano', async () => {
    const onFoto = vi.fn();
    vi.mocked(globalThis.createImageBitmap)
      .mockRejectedValueOnce(new Error('formato sconosciuto'))
      .mockResolvedValueOnce({ width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap);
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const rotto = new File(['x'], 'p1.heic', { type: 'image/heic' });
    const [buono] = fileFinti(1);
    fireEvent.change(input, { target: { files: [rotto, buono] } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    expect(screen.getByText('pag. 1')).toBeInTheDocument();
    expect(screen.queryByText('pag. 2')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/1 foto non leggibile/i);
  });

  it('oltre le 12 pagine le foto in più sono scartate con un messaggio', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(14) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(12);
    expect(screen.getByText('pag. 12')).toBeInTheDocument();
    expect(screen.queryByText('pag. 13')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/al massimo 12 fogli/i);
  });

  it('il tetto conta anche le pagine già presenti', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(11)} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(3) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(12);
    expect(screen.getByRole('status')).toHaveTextContent(/al massimo 12 fogli/i);
  });

  it('la scelta dei file non aggiorna il genitore durante il render (E2E 30/08: miniature visibili ma ESTRAI spento)', async () => {
    // Regressione: onFoto chiamato dentro l'updater di setPagine è un
    // setState-during-render del genitore — React lo segnala con "Cannot
    // update a component" e l'aggiornamento del genitore può andare perso.
    // NOTA: in jsdom il warning del codice pre-fix non si riproduce (visto
    // solo nel browser vero, E2E 30/08); questo test è una guardia, la
    // prova del fix è la verifica manuale nel browser.
    const errori: string[] = [];
    const spia = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errori.push(args.map(String).join(' '));
    });
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(1) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    spia.mockRestore();
    expect(errori.filter((m) => m.includes('Cannot update a component'))).toEqual([]);
  });

  it('eliminare una pagina aggiorna elenco e numerazione', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(screen.getByText('pag. 2')).toBeInTheDocument());
    const [, seconda] = onFoto.mock.lastCall![0] as Blob[];
    fireEvent.click(screen.getByRole('button', { name: /elimina pag\. 1/i }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([seconda]));
    expect(screen.queryByText('pag. 2')).not.toBeInTheDocument();
  });

  it('smontare con pagine ancora in lista revoca tutti gli object URL residui', async () => {
    const onFoto = vi.fn();
    const { unmount } = render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(screen.getByText('pag. 2')).toBeInTheDocument());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('con iniziali mostra le miniature già presenti senza richiamare onFoto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(2)} />);
    expect(await screen.findByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
    expect(onFoto).not.toHaveBeenCalled();
  });

  it('con getUserMedia disponibile mostra anteprima e pulsante scatta, e ferma le tracce allo smontaggio', async () => {
    const { stop } = abilitaFotocamera();
    const { unmount } = render(<Camera onFoto={() => {}} />);
    expect(await screen.findByRole('button', { name: /scatta/i })).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('anche con la fotocamera aperta c\'è il tasto DALLA GALLERIA, senza capture', async () => {
    abilitaFotocamera();
    render(<Camera onFoto={() => {}} />);
    await screen.findByRole('button', { name: /scatta/i });
    expect(screen.getByText('DALLA GALLERIA')).toBeInTheDocument();
    const input = screen.getByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
  });

  it('nel ramo fotocamera le foto dalla galleria seguono lo stesso percorso degli scatti', async () => {
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    await screen.findByRole('button', { name: /scatta/i });
    const input = screen.getByLabelText(/scegli le foto dalla galleria/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const blob = onFoto.mock.lastCall![0] as Blob[];
    expect(blob).toHaveLength(2);
    expect(blob.every((b) => b.type === 'image/jpeg')).toBe(true);
    expect(screen.getByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
  });
});
