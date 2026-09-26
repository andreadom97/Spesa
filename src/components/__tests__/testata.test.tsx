import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const utente = vi.hoisted(() => ({ valore: { nome: 'Andrea', email: 'andrea@example.it' } as { nome: string; email: string } | null }));
vi.mock('@/data/utente', () => ({
  useUtente: () => utente.valore,
  inizialeDi: (nome: string) => (nome.trim() ? nome.trim()[0].toLocaleUpperCase('it') : '·'),
}));
const pannello = vi.hoisted(() => ({ aperto: false, apri: vi.fn(), chiudi: vi.fn() }));
vi.mock('../pannello/PannelloProvider', () => ({ usePannello: () => pannello }));

import { Testata } from '../Testata';

beforeEach(() => {
  vi.clearAllMocks();
  pannello.aperto = false;
  utente.valore = { nome: 'Andrea', email: 'andrea@example.it' };
});

describe('Testata (spec §D)', () => {
  it('il Menù utente è un bottone col nome, che apre il pannello e mostra l\'iniziale (spec fase 5 §A.2)', () => {
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'pannello-impostazioni');
    expect(menu).toHaveTextContent('A');
    expect(menu.style.boxShadow).toBe('none');
    fireEvent.click(menu);
    expect(pannello.apri).toHaveBeenCalledTimes(1);
    expect(pannello.apri).toHaveBeenCalledWith();
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).not.toBeInTheDocument();
  });

  it('a pannello aperto il Menù dice aria-expanded, prende --ombra-nav, e un tocco lo chiude', () => {
    pannello.aperto = true;
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(menu.style.boxShadow).toBe('var(--ombra-nav)');
    fireEvent.click(menu);
    expect(pannello.chiudi).toHaveBeenCalledTimes(1);
    expect(pannello.apri).not.toHaveBeenCalled();
  });

  it('finché l\'utente non è letto: il puntino, e il nome accessibile senza nome', () => {
    utente.valore = null;
    render(<Testata titolo="Lista" />);
    expect(screen.getByRole('button', { name: 'Profilo e impostazioni' })).toHaveTextContent('·');
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

  it('la pillola rende maiuscola l\'etichetta, che arriva in sentence case', () => {
    // Chi la passa scrive "Settimana del 21 settembre" (etichettaSettimana):
    // la maiuscola è della pillola, non della stringa (DESIGN.md §3).
    render(<Testata titolo="Piano" settimana="Settimana del 21 settembre" />);
    expect(screen.getByText('Settimana del 21 settembre').style.textTransform).toBe('uppercase');
  });

  it('con indietro c\'è il link Indietro e non c\'è il Menù utente', () => {
    render(<Testata titolo="Importa la dieta" indietro />);
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni');
    expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).not.toBeInTheDocument();
  });
});
