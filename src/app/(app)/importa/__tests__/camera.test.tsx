import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

/** Le props obbligatorie che i test di sola logica non guardano. */
const NIENTE = { onIndietro: () => {}, onFinito: () => {} };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // jsdom non ha mediaDevices: di default siamo nel ramo fallback.
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  // jsdom non implementa gli object URL. Uno diverso per chiamata: le righe di
  // «Rivedi» usano l'URL come chiave, e con URL uguali lo spostamento non si
  // vedrebbe nel DOM.
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:finto-${++n}`);
  URL.revokeObjectURL = vi.fn();
  mockaDecodifica();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Camera: la galleria e il ripiego', () => {
  it('senza getUserMedia: il testo del ripiego, niente scatto, la galleria c\'è', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByText('La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scatta la foto del foglio' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/scegli le foto/i)).toBeInTheDocument();
  });

  it('la galleria è il tasto «Seleziona dalla galleria», con l\'input nascosto dentro', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByText('Seleziona dalla galleria')).toBeInTheDocument();
    expect(screen.getByLabelText(/scegli le foto/i)).toHaveStyle({ opacity: '0' });
  });

  it('la galleria apre la galleria: nessun attributo capture (riaprirebbe la fotocamera di sistema)', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('le foto scelte vengono ricompresse, arrivano a onFoto e il contatore le conta', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
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
    expect(screen.getByText('2 fogli')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' })).toBeInTheDocument();
  });

  it('la ricompressione ridimensiona al lato lungo di 1568px, come lo scatto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
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
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const rotto = new File(['x'], 'p1.heic', { type: 'image/heic' });
    const [buono] = fileFinti(1);
    fireEvent.change(input, { target: { files: [rotto, buono] } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/1 foto non leggibile/i);
  });

  it('oltre le 12 pagine le foto in più sono scartate con un messaggio', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(14) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(12);
    expect(screen.getByText('12 fogli')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/al massimo 12 fogli/i);
  });

  it('il tetto conta anche le pagine già presenti', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(11)} {...NIENTE} />);
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
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(1) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    spia.mockRestore();
    expect(errori.filter((m) => m.includes('Cannot update a component'))).toEqual([]);
  });

  it('smontare con pagine ancora in lista revoca tutti gli object URL residui', async () => {
    const onFoto = vi.fn();
    const { unmount } = render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await screen.findByText('2 fogli');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('con iniziali conta i fogli già presenti senza richiamare onFoto, e non inventa un\'ora', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(2)} {...NIENTE} />);
    expect(await screen.findByRole('button', { name: 'Rivedi i 2 fogli presi' })).toBeInTheDocument();
    expect(onFoto).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ultimo foglio alle/)).not.toBeInTheDocument();
  });
});

describe('Camera: la banda', () => {
  it('a zero fogli niente miniatura, niente «Ho finito», niente ultimo foglio', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    await screen.findByText('Seleziona dalla galleria');
    expect(screen.queryByRole('button', { name: /Rivedi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ho finito' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ultimo foglio alle/)).not.toBeInTheDocument();
  });

  it('con un foglio: la miniatura al singolare, «Ho finito» chiama onFinito', async () => {
    const onFinito = vi.fn();
    render(<Camera onFoto={() => {}} iniziali={fileFinti(1)} onIndietro={() => {}} onFinito={onFinito} />);
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
    expect(onFinito).toHaveBeenCalledTimes(1);
  });

  it('il tondo indietro chiama onIndietro, e il titolo è l\'intestazione della schermata', async () => {
    const onIndietro = vi.fn();
    render(<Camera onFoto={() => {}} onIndietro={onIndietro} onFinito={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Fotografa il piano' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(onIndietro).toHaveBeenCalledTimes(1);
  });

  it('con getUserMedia: lo scatto c\'è, e smontando le tracce si fermano', async () => {
    const { stop } = abilitaFotocamera();
    const { unmount } = render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByRole('button', { name: 'Scatta la foto del foglio' })).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('lo scatto aggiunge un foglio e scrive l\'ora dello scatto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 23, 18, 4));
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scatta la foto del foglio' }));
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    expect(screen.getByText('Ultimo foglio alle 18:04')).toBeInTheDocument();
  });

  it('«Ultimo foglio alle» dice l\'ora dell\'ultimo foglio aggiunto, anche dopo un riordino', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 23, 18, 0));
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const scatto = await screen.findByRole('button', { name: 'Scatta la foto del foglio' });
    fireEvent.click(scatto);
    await waitFor(() => expect(onFoto).toHaveBeenCalledTimes(1));
    vi.setSystemTime(new Date(2026, 8, 23, 18, 4));
    fireEvent.click(scatto);
    await waitFor(() => expect(onFoto).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Ultimo foglio alle 18:04')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 2 più su' }));
    await waitFor(() => expect(onFoto).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.getByText('Ultimo foglio alle 18:04')).toBeInTheDocument();
  });

  it('anche con la fotocamera aperta c\'è la galleria, senza capture, sullo stesso percorso', async () => {
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    await screen.findByRole('button', { name: 'Scatta la foto del foglio' });
    const input = screen.getByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const blob = onFoto.mock.lastCall![0] as Blob[];
    expect(blob).toHaveLength(2);
    expect(blob.every((b) => b.type === 'image/jpeg')).toBe(true);
  });
});

describe('Camera: «Rivedi i fogli presi»', () => {
  async function apriRivedi(onFoto = vi.fn()) {
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const [prima, seconda] = onFoto.mock.lastCall![0] as Blob[];
    fireEvent.click(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' }));
    screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    return { onFoto, prima, seconda };
  }

  it('togliere un foglio aggiorna il genitore e la numerazione', async () => {
    const { onFoto, seconda } = await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 1' }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([seconda]));
    expect(screen.getAllByRole('img').map((f) => f.getAttribute('alt'))).toEqual(['Foglio 1']);
  });

  it('spostare un foglio cambia l\'ordine che arriva al genitore', async () => {
    const { onFoto, prima, seconda } = await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 1 più giù' }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([seconda, prima]));
  });

  it('togliere l\'ultimo foglio chiude «Rivedi» e toglie la miniatura', async () => {
    await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Rivedi/ })).not.toBeInTheDocument();
    // Senza fotocamera non c'è un otturatore: il fuoco va alla galleria.
    expect(screen.getByLabelText(/scegli le foto/i)).toHaveFocus();
  });

  it('Chiudi riporta il fuoco sulla miniatura', async () => {
    await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' })).toHaveFocus();
  });
});
