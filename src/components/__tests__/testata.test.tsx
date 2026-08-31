import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Testata } from '../Testata';

describe('Testata', () => {
  it('il link alle impostazioni ha nome accessibile e icona ingranaggio', () => {
    render(<Testata titolo="Lista" />);
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('href', '/impostazioni');
  });

  it('la pillola settimana non ha la freccetta di un selettore che non esiste', () => {
    render(<Testata titolo="Lista" settimana="31 AGO — 6 SET" />);
    expect(screen.getByText('31 AGO — 6 SET')).toBeInTheDocument();
    // l'unico svg ammesso è l'ingranaggio nel link: dentro la pillola niente svg
    const pillola = screen.getByText('31 AGO — 6 SET').parentElement!;
    expect(pillola.querySelector('svg')).toBeNull();
  });

  it('con indietro c\'è il link "Indietro" e non c\'è "Impostazioni"', () => {
    render(<Testata titolo="Importa la dieta" indietro />);
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni');
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).not.toBeInTheDocument();
  });
});
