import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatoImporta } from '../StatoImporta';

describe('StatoImporta (DESIGN.md §8 Stato vuoto)', () => {
  it('titolo, testo e secondo testo nella scheda, dentro uno scroller dell\'app', () => {
    const { container } = render(<StatoImporta titolo="Hai un import in corso" testo="Primo." testo2="Secondo." />);
    expect(screen.getByRole('heading', { level: 2, name: 'Hai un import in corso' })).toBeInTheDocument();
    expect(screen.getByText('Primo.')).toBeInTheDocument();
    expect(screen.getByText('Secondo.')).toBeInTheDocument();
    const scroller = container.firstElementChild as HTMLElement;
    expect(scroller).toHaveClass('sc', 'scroll-app');
    expect(scroller).not.toHaveClass('con-dock');
  });

  it('lo scroller usa "safe center": a testi lunghi su un telefono piccolo la cima della scheda resta raggiungibile', () => {
    const { container } = render(<StatoImporta titolo="T" testo="x" />);
    expect((container.firstElementChild as HTMLElement).style.justifyContent).toBe('safe center');
  });

  it('con conDock lo scroller lascia la coda al Dock', () => {
    const { container } = render(<StatoImporta titolo="T" testo="x" conDock />);
    expect(container.firstElementChild).toHaveClass('con-dock');
  });

  it('con luce il titolo luccica, con stato la scheda è annunciata', () => {
    render(<StatoImporta titolo="Sto leggendo la dieta…" testo="x" luce stato />);
    expect(screen.getByRole('heading', { name: 'Sto leggendo la dieta…' })).toHaveClass('anim-luce-testo');
    expect(screen.getByRole('status')).toHaveTextContent('Sto leggendo la dieta…');
  });

  it('senza luce né stato: niente classe e niente role', () => {
    render(<StatoImporta titolo="T" testo="x" />);
    expect(screen.getByRole('heading', { name: 'T' })).not.toHaveClass('anim-luce-testo');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('un figlio sta nella scheda, sotto i testi', () => {
    render(<StatoImporta titolo="T" testo="x"><button type="button">RICOMINCIA</button></StatoImporta>);
    const tasto = screen.getByRole('button', { name: 'RICOMINCIA' });
    expect(screen.getByText('x').compareDocumentPosition(tasto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('solo token, niente colori scritti a mano', () => {
    const { container } = render(<StatoImporta titolo="T" testo="x" testo2="y" />);
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{3,6}\b|rgba?\(/);
  });
});
