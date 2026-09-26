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

// Ruling 26/09 (controller): 'Zucchine' → chiave 'zucchina', fuori dal pilota
// (12 chiavi con tracciato). Qui si usa 'Carote' → chiave 'carota', stessa
// area ortofrutta, stesso tono #7AA838 e colore d'area #A8D96A: la fixture
// `base` resta quella dei test sopra.
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

  it('spenta: icona spenta, nome opaco #ABACB8 con alone #F7F7F8', () => {
    const { container } = render(<Tessera {...base} nome="Carote" spuntato protagonista={false} />);
    expect(icona(container)).toHaveAttribute('stroke', '#9A9AA6');
    const nome = screen.getByText('Carote');
    expect(nome).toHaveStyle({ color: '#ABACB8' });
    expect(nome.style.textShadow).toContain('#F7F7F8');
  });

  it('fuori catalogo: nessuna icona e nessun alone', () => {
    const { container } = render(<Tessera {...base} nome="Quark" spuntato={false} protagonista={false} />);
    expect(icona(container)).toBeNull();
    expect(screen.getByText('Quark').style.textShadow).toBe('');
  });
});
