import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogoConferma, type PropsDialogo } from '../DialogoConferma';

function props(p: Partial<PropsDialogo> = {}) {
  return {
    titolo: 'Cancellare la dispensa?',
    testo: 'Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.',
    azione: 'CANCELLA',
    tono: 'distruttivo' as const,
    erroreTesto: 'Non siamo riusciti a cancellare la dispensa. Riprova.',
    onConferma: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onAnnulla: vi.fn(),
    ...p,
  };
}

describe('DialogoConferma (spec fase 5 §D)', () => {
  it('titolo, testo, e i due tasti: ANNULLA a sinistra, l\'azione a destra', () => {
    render(<DialogoConferma {...props()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Cancellare la dispensa?' })).toBeInTheDocument();
    expect(screen.getByText(/Tutto quello che risulta in casa torna a zero/)).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ANNULLA', 'CANCELLA']);
  });

  it('il tono distruttivo è pieno in --errore, il primario in --ink', () => {
    const { rerender } = render(<DialogoConferma {...props()} />);
    expect(screen.getByRole('button', { name: 'CANCELLA' }).style.background).toBe('var(--errore)');
    rerender(<DialogoConferma {...props({ azione: 'ESCI', tono: 'primario' })} />);
    expect(screen.getByRole('button', { name: 'ESCI' }).style.background).toBe('var(--ink)');
  });

  it('ANNULLA chiama onAnnulla e non conferma', () => {
    const p = props();
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));
    expect(p.onAnnulla).toHaveBeenCalledTimes(1);
    expect(p.onConferma).not.toHaveBeenCalled();
  });

  it('in volo i due tasti sono spenti a 0,5, e un secondo tocco non conferma di nuovo', () => {
    const p = props({ onConferma: vi.fn(() => new Promise<void>(() => {})) });
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    const azione = screen.getByRole('button', { name: 'CANCELLA' });
    const annulla = screen.getByRole('button', { name: 'ANNULLA' });
    expect(azione).toBeDisabled();
    expect(annulla).toBeDisabled();
    expect(azione.style.opacity).toBe('0.5');
    expect(annulla.style.opacity).toBe('0.5');
    fireEvent.click(azione);
    expect(p.onConferma).toHaveBeenCalledTimes(1);
  });

  it('se l\'azione fallisce l\'errore compare sotto i tasti, con role alert, e i tasti si riaccendono', async () => {
    const p = props({ onConferma: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('rete')) });
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    const errore = await screen.findByRole('alert');
    expect(errore).toHaveTextContent('Non siamo riusciti a cancellare la dispensa. Riprova.');
    const tasti = screen.getByRole('button', { name: 'ANNULLA' }).parentElement!;
    expect(tasti.compareDocumentPosition(errore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CANCELLA' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'ANNULLA' })).not.toBeDisabled();
  });

  it('un nuovo tentativo toglie l\'errore di prima', async () => {
    const onConferma = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('rete'))
      .mockReturnValueOnce(new Promise<void>(() => {}));
    render(<DialogoConferma {...props({ onConferma })} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se l\'azione riesce il dialogo resta spento: lo chiude chi lo ha aperto', async () => {
    const p = props();
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    await Promise.resolve();
    expect(p.onConferma).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'CANCELLA' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
