import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TitoloSezione, capitalizza, nomePasto, plurale } from '../sezione';

describe('i testi di Importa', () => {
  it('capitalizza, nomePasto, plurale', () => {
    expect(capitalizza('olive taggiasche')).toBe('Olive taggiasche');
    expect(capitalizza('')).toBe('');
    expect(nomePasto('spuntino_mattina')).toBe('Spuntino mattina');
    expect(plurale(1, 'pasto', 'pasti')).toBe('1 pasto');
    expect(plurale(3, 'pasto', 'pasti')).toBe('3 pasti');
  });

  it('TitoloSezione: testo e contatore', () => {
    render(<h3><TitoloSezione testo="Da sistemare" contatore="2" /></h3>);
    expect(screen.getByRole('heading', { name: 'Da sistemare 2' })).toBeInTheDocument();
  });
});
