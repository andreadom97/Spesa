import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tessera } from '../Tessera';

const base = {
  nome: 'Zucchine', area: 'ortofrutta' as const, unita: 'g' as const,
  fabbisogno: 540, residuo: 0, confezioni: 1, quantitaTotale: 600,
  mostraDettaglio: true, onToggle: vi.fn(),
};

describe('Tessera', () => {
  it('accesa dentro il widget: nessun fondo bianco, nessuna ombra, solo il filo d\'area', () => {
    render(<Tessera {...base} spuntato={false} protagonista={false} />);
    const t = screen.getByRole('button');
    expect(t.style.background).toBe('none');
    expect(t.style.boxShadow).toBe('');
    expect(t.style.border).toContain('rgba(168, 217, 106, 0.45)');
  });

  it('protagonista: fondo pieno nel colore d\'area', () => {
    render(<Tessera {...base} spuntato={false} protagonista />);
    expect(screen.getByRole('button').style.background).toBe('rgb(168, 217, 106)');
  });

  it('spenta: fondo --spento e nome barrato', () => {
    render(<Tessera {...base} spuntato protagonista={false} />);
    const t = screen.getByRole('button');
    expect(t.style.background).toBe('rgba(20, 22, 58, 0.035)');
    expect(screen.getByText('Zucchine')).toHaveStyle({ textDecoration: 'line-through' });
  });
});
