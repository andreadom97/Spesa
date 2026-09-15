import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Scanner } from '../Scanner';

// jsdom non ha né `BarcodeDetector` né `getUserMedia`: qui si prova solo il
// ramo "scrivi il codice". Il ramo camera non si testa (spec §6, dichiarato).
describe('Scanner (senza BarcodeDetector)', () => {
  it('mostra solo il campo per scrivere il codice, nessun video', async () => {
    render(<Scanner onCodice={vi.fn()} onAnnulla={vi.fn()} />);

    expect(screen.getByLabelText('Scrivi il codice')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('La fotocamera non è disponibile: scrivi il codice sotto il codice a barre.')).toBeInTheDocument(),
    );
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByLabelText('Scrivi il codice')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Scrivi il codice')).toHaveAttribute('maxlength', '14');
  });

  it('CERCA è disabilitato con un codice troppo corto e abilitato con un EAN-13; al tap chiama onCodice', () => {
    const onCodice = vi.fn();
    render(<Scanner onCodice={onCodice} onAnnulla={vi.fn()} />);
    const campo = screen.getByLabelText('Scrivi il codice');
    const cerca = screen.getByRole('button', { name: 'CERCA' });

    expect(cerca).toBeDisabled();
    fireEvent.change(campo, { target: { value: '123' } });
    expect(cerca).toBeDisabled();

    fireEvent.change(campo, { target: { value: '8076800195057' } });
    expect(cerca).toBeEnabled();
    fireEvent.click(cerca);
    expect(onCodice).toHaveBeenCalledWith('8076800195057');
  });

  it('filtra le lettere: restano solo le cifre', () => {
    render(<Scanner onCodice={vi.fn()} onAnnulla={vi.fn()} />);
    const campo = screen.getByLabelText<HTMLInputElement>('Scrivi il codice');

    fireEvent.change(campo, { target: { value: '80a76-800 19x5057' } });
    expect(campo.value).toBe('8076800195057');
  });

  it('ANNULLA chiama onAnnulla e non onCodice', () => {
    const onCodice = vi.fn();
    const onAnnulla = vi.fn();
    render(<Scanner onCodice={onCodice} onAnnulla={onAnnulla} />);

    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));
    expect(onAnnulla).toHaveBeenCalledTimes(1);
    expect(onCodice).not.toHaveBeenCalled();
  });
});
