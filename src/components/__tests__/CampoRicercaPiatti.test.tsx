import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampoRicercaPiatti } from '../CampoRicercaPiatti';

describe('CampoRicercaPiatti (spec fase 3 §A, condiviso dalla fase 7 §A.3)', () => {
  it('il campo si trova per aria-label e segnaposto, e chiama onCambia col testo digitato', () => {
    const onCambia = vi.fn();
    render(<CampoRicercaPiatti valore="" onCambia={onCambia} />);
    const campo = screen.getByRole('searchbox', { name: 'Cerca un piatto o un ingrediente' });
    expect(campo).toHaveAttribute('placeholder', 'Cerca un piatto o un ingrediente');
    fireEvent.change(campo, { target: { value: 'pasta' } });
    expect(onCambia).toHaveBeenCalledWith('pasta');
  });

  it('è controllato: mostra il valore ricevuto, non tiene stato proprio', () => {
    render(<CampoRicercaPiatti valore="riso" onCambia={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('riso');
  });
});
