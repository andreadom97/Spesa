import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tessera } from '../Tessera';

const base = {
  nome: 'Zucchine', area: 'ortofrutta' as const, unita: 'g' as const,
  confezioni: 1, quantitaTotale: 600,
  onToggle: vi.fn(),
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

  it('niente dettaglio "serve · in casa": in Lista è spazio inutile (Andrea 26/09)', () => {
    render(<Tessera {...base} spuntato={false} protagonista={false} />);
    expect(screen.queryByText(/in casa/)).toBeNull();
    expect(screen.queryByText(/serve/)).toBeNull();
  });

  it('a pezzi la quantità accanto alla pillola non ripete la pillola', () => {
    render(<Tessera {...base} unita="pz" confezioni={7} quantitaTotale={7} spuntato={false} protagonista={false} />);
    expect(screen.getAllByText('7 pz')).toHaveLength(1);
  });

  it('a pezzi, se confezioni e pezzi differiscono, restano entrambi', () => {
    render(<Tessera {...base} unita="pz" confezioni={1} quantitaTotale={6} spuntato={false} protagonista={false} />);
    expect(screen.getByText('1 pz')).toBeInTheDocument();
    expect(screen.getByText('6 pz')).toBeInTheDocument();
  });

  it('a peso la quantità totale resta accanto alle confezioni', () => {
    render(<Tessera {...base} spuntato={false} protagonista={false} />);
    expect(screen.getByText('1 conf')).toBeInTheDocument();
    expect(screen.getByText('600 g')).toBeInTheDocument();
  });
});

// Tutte le chiavi hanno ora un tracciato. Qui si usa comunque 'Carote' →
// chiave 'carota', stessa area ortofrutta, stesso tono #7AA838 e colore
// d'area #A8D96A: resta come fixture, la fixture `base` resta quella dei
// test sopra.
describe('Tessera · icona ingrediente', () => {
  const icona = (c: HTMLElement) => c.querySelector('svg[data-icona]');

  it('accesa: icona nel tono medio, alone bianco sul nome', () => {
    const { container } = render(<Tessera {...base} nome="Carote" spuntato={false} protagonista={false} />);
    expect(icona(container)).toHaveAttribute('data-icona', 'carota');
    expect(icona(container)).toHaveAttribute('stroke', '#7AA838');
    expect(icona(container)).toHaveAttribute('width', '52');
    expect(screen.getByText('Carote').style.textShadow).toContain('#FFFFFF');
    const t = screen.getByRole('button');
    expect(t.style.position).toBe('relative');
    expect(t.style.overflow).toBe('hidden');
  });

  it('protagonista: icona bianca a 84 px, alone nel colore d\'area a 3 px', () => {
    const { container } = render(<Tessera {...base} nome="Carote" spuntato={false} protagonista />);
    expect(icona(container)).toHaveAttribute('stroke', '#FFFFFF');
    expect(icona(container)).toHaveAttribute('width', '84');
    expect(screen.getByText('Carote').style.textShadow).toContain('0 0 4px #A8D96A');
  });

  it('spenta: icona spenta, barra del nome senza alone (Andrea 26/09: l\'alone contornava la barra)', () => {
    const { container } = render(<Tessera {...base} nome="Carote" spuntato protagonista={false} />);
    expect(icona(container)).toHaveAttribute('stroke', '#9A9AA6');
    const nome = screen.getByText('Carote');
    expect(nome).toHaveStyle({ color: 'rgba(20, 22, 58, 0.34)' });
    expect(nome.style.textShadow).toBe('');
  });

  it('fuori catalogo: nessuna icona e nessun alone', () => {
    const { container } = render(<Tessera {...base} nome="Quark" spuntato={false} protagonista={false} />);
    expect(icona(container)).toBeNull();
    expect(screen.getByText('Quark').style.textShadow).toBe('');
  });
});
