import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { coloreArea } from '@/domain/aree';
import { TestataModifica } from '../TestataModifica';

// jsdom riscrive l'esadecimale inline in `rgb(…)`: stesso helper di `avvio-marchio.test.tsx`.
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

describe('TestataModifica (DESIGN.md §8, frame 12 — spec fase 7 §B.2)', () => {
  it('il tondo ha l\'aria-label della freccia e chiama onTorna al tocco', () => {
    const onTorna = vi.fn();
    render(<TestataModifica freccia={{ etichetta: 'Torna al piatto', onTorna }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(onTorna).toHaveBeenCalledTimes(1);
  });

  it('senza area passata non c\'è nessuna etichetta d\'area', () => {
    render(<TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} />);
    expect(screen.queryByText(/PASTA, RISO E CEREALI|MACELLERIA|LATTICINI/)).not.toBeInTheDocument();
  });

  it('con area passata mostra il quadratino colorato e il nome dell\'area', () => {
    render(<TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} area="cereali" />);
    const etichetta = screen.getByText('PASTA, RISO E CEREALI');
    const quadratino = etichetta.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(quadratino).toBeInTheDocument();
    expect(quadratino.style.background).toBe(rgb(coloreArea('cereali')));
  });

  it('rende il nome e i children passati', () => {
    render(
      <TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} nome={<span>Riso e pane</span>}>
        <p>Corpo della pagina</p>
      </TestataModifica>,
    );
    expect(screen.getByText('Riso e pane')).toBeInTheDocument();
    expect(screen.getByText('Corpo della pagina')).toBeInTheDocument();
  });
});
