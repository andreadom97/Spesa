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
