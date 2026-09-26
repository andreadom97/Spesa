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

  describe('modo indietro: la pillola (spec fase 5 §G.2)', () => {
    it.each([
      ['IMPOSTAZIONI', 'Torna alle impostazioni'],
      ['LISTA', 'Torna alla lista'],
      ['PIANO', 'Torna al piano'],
    ])('la pillola dice %s e si chiama «%s»', (etichetta, ariaLabel) => {
      const onTorna = vi.fn();
      render(<Testata titolo="Piatti" indietro={{ etichetta, ariaLabel, onTorna }} />);
      const pillola = screen.getByRole('button', { name: ariaLabel });
      expect(pillola).toHaveTextContent(etichetta);
      expect(pillola.style.height).toBe('44px');
      fireEvent.click(pillola);
      expect(onTorna).toHaveBeenCalledTimes(1);
    });

    it('con la pillola non c\'è il Menù utente, e il titolo resta a 52 sotto la pillola', () => {
      render(<Testata titolo="Piatti" indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => {} }} />);
      expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).toBeNull();
      const titolo = screen.getByRole('heading', { level: 1, name: 'Piatti' });
      expect(titolo.style.fontSize).toBe('52px');
      const pillola = screen.getByRole('button', { name: 'Torna alle impostazioni' });
      // La pillola viene prima del titolo nell'ordine del documento, come nel frame 22.
      expect(pillola.compareDocumentPosition(titolo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('nessun link a /impostazioni resta nella Testata', () => {
      const { container } = render(<Testata titolo="Importa la dieta" indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => {} }} />);
      expect(container.querySelector('a[href="/impostazioni"]')).toBeNull();
    });
  });

  describe('Testata in modo indietro con la settimana (spec fase 6 §D.2)', () => {
    const indietro = { etichetta: 'LISTA', ariaLabel: 'Torna alla lista', onTorna: vi.fn() };

    it('mostra la pillola settimana sotto il titolo, e niente Menù utente', () => {
      render(<Testata titolo="Fine spesa" settimana="Settimana del 21 settembre" indietro={indietro} />);
      const titolo = screen.getByRole('heading', { level: 1, name: 'Fine spesa' });
      const pillola = screen.getByText('Settimana del 21 settembre');
      expect(titolo.compareDocumentPosition(pillola) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(pillola.style.textTransform).toBe('uppercase');
      expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).not.toBeInTheDocument();
    });

    it('senza settimana la pillola non c\'è', () => {
      render(<Testata titolo="Confezioni" indietro={indietro} />);
      expect(screen.getByRole('button', { name: 'Torna alla lista' })).toBeInTheDocument();
      expect(screen.queryByText(/Settimana del/)).not.toBeInTheDocument();
    });
  });
});
