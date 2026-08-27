import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Segmento } from '../Segmento';

const OPZIONI = [
  { id: 'tutti', label: 'TUTTI' },
  { id: 'colazione', label: 'Colazione' },
  { id: 'pranzo', label: 'Pranzo' },
];

describe('Segmento', () => {
  it('rende una pillola per opzione', () => {
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marca attiva solo la pillola col valore corrente', () => {
    render(<Segmento opzioni={OPZIONI} valore="pranzo" onCambia={() => {}} />);
    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('chiama onCambia con l\'id dell\'opzione cliccata, non con la label', () => {
    const onCambia = vi.fn();
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={onCambia} />);
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }));
    expect(onCambia).toHaveBeenCalledWith('colazione');
  });

  it('non tocca il testo sorgente: la maiuscola è solo visiva (text-transform)', () => {
    render(<Segmento opzioni={OPZIONI} valore="tutti" onCambia={() => {}} />);
    expect(screen.getByText('Colazione')).toBeInTheDocument();
  });
});
