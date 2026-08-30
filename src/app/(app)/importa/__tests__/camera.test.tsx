import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Camera } from '../Camera';

beforeEach(() => {
  vi.restoreAllMocks();
  // jsdom non ha mediaDevices: di default siamo nel ramo fallback.
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  // jsdom non implementa gli object URL.
  URL.createObjectURL = vi.fn(() => 'blob:finto');
  URL.revokeObjectURL = vi.fn();
});

describe('Camera', () => {
  it('senza getUserMedia mostra il picker di fallback', async () => {
    render(<Camera onFoto={() => {}} />);
    expect(await screen.findByLabelText(/scegli le foto/i)).toBeInTheDocument();
  });

  it('le foto scelte dal picker producono miniature e arrivano a onFoto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1, f2] } });
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f1, f2]));
    expect(screen.getByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
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
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1] } });
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f1]));
    spia.mockRestore();
    expect(errori.filter((m) => m.includes('Cannot update a component'))).toEqual([]);
  });

  it('eliminare una pagina aggiorna elenco e numerazione', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1, f2] } });
    fireEvent.click(await screen.findByRole('button', { name: /elimina pag\. 1/i }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f2]));
    expect(screen.queryByText('pag. 2')).not.toBeInTheDocument();
  });

  it('smontare con pagine ancora in lista revoca tutti gli object URL residui', async () => {
    const onFoto = vi.fn();
    const { unmount } = render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1, f2] } });
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f1, f2]));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('con iniziali mostra le miniature già presenti senza richiamare onFoto', async () => {
    const onFoto = vi.fn();
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    render(<Camera onFoto={onFoto} iniziali={[f1, f2]} />);
    expect(await screen.findByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
    expect(onFoto).not.toHaveBeenCalled();
  });

  it('con getUserMedia disponibile mostra anteprima e pulsante scatta, e ferma le tracce allo smontaggio', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    const { unmount } = render(<Camera onFoto={() => {}} />);
    expect(await screen.findByRole('button', { name: /scatta/i })).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});
