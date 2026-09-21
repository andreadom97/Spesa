import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/data/utente', () => ({ useIniziale: () => 'A', leggiIniziale: vi.fn() }));

import { Testata } from '../Testata';

describe('Testata (spec §D)', () => {
  it('il menù utente porta alle impostazioni, si chiama Impostazioni e mostra l\'iniziale', () => {
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('link', { name: 'Impostazioni' });
    expect(menu).toHaveAttribute('href', '/impostazioni');
    expect(menu).toHaveTextContent('A');
  });

  it('il titolo è in sentence case così come passato e non c\'è più il Marchio né il link Vai alla lista', () => {
    render(<Testata titolo="Piano" />);
    expect(screen.getByText('Piano')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Vai alla lista' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-area]')).toBeNull();
  });

  it('la pillola settimana è testo, senza svg dentro', () => {
    render(<Testata titolo="Lista" settimana="31 AGO — 6 SET" />);
    const pillola = screen.getByText('31 AGO — 6 SET').parentElement!;
    expect(pillola.querySelector('svg')).toBeNull();
  });

  it('con indietro c\'è il link Indietro e non c\'è Impostazioni', () => {
    render(<Testata titolo="Importa la dieta" indietro />);
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni');
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).not.toBeInTheDocument();
  });
});
