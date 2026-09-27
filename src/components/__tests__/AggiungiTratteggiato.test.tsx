import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AggiungiTratteggiato } from '../AggiungiTratteggiato';

describe('AggiungiTratteggiato (DESIGN.md §8 Tasti, condiviso dalla fase 7)', () => {
  it('con href è un link: il nome è l\'etichetta, alto 56, raggio 14, bordo 2 tratteggiato, mono maiuscolo in --ink', () => {
    render(<AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />);
    const link = screen.getByRole('link', { name: 'Nuovo piatto' });
    expect(link).toHaveAttribute('href', '/piatti/nuovo');
    expect(link.style.height).toBe('56px');
    expect(link.style.borderRadius).toBe('14px');
    expect(link.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    expect(link.style.textTransform).toBe('uppercase');
    expect(link.style.color).toBe('var(--ink)');
  });

  it('con onClick è un bottone che la chiama, con lo stesso disegno', () => {
    const onClick = vi.fn();
    render(<AggiungiTratteggiato etichetta="AGGIUNGI COMPONENTE" onClick={onClick} />);
    const bottone = screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' });
    expect(bottone).toHaveAttribute('type', 'button');
    expect(bottone.style.height).toBe('56px');
    expect(bottone.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(bottone);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ariaLabel, se c\'è, diventa il nome accessibile; il testo visibile resta l\'etichetta', () => {
    render(
      <AggiungiTratteggiato
        etichetta="AGGIUNGI INGREDIENTE"
        ariaLabel="Aggiungi ingrediente all'opzione 2 del componente 1"
        onClick={() => {}}
      />,
    );
    const bottone = screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 2 del componente 1" });
    expect(bottone).toHaveTextContent('AGGIUNGI INGREDIENTE');
  });

  it('senza ariaLabel non scrive l\'attributo: il nome è il testo', () => {
    render(<AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />);
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-label');
  });
});
