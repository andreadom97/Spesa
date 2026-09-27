import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VuotoRicercaPiatti } from '../VuotoRicercaPiatti';

describe('VuotoRicercaPiatti (Piatti, spec fase 3; condiviso dalla fase 7 §A.3)', () => {
  it('dice che la ricerca non ha trovato niente e cosa fare, coi testi e i colori di oggi di Piatti', () => {
    render(<VuotoRicercaPiatti />);
    const titolo = screen.getByText('Nessun piatto qui');
    expect(titolo.style.fontSize).toBe('17px');
    expect(titolo.style.color).toBe('var(--ink)');
    const sotto = screen.getByText("Prova un'altra parola, oppure aggiungine uno.");
    expect(sotto.style.fontSize).toBe('14px');
    expect(sotto.style.color).toBe('var(--testo-2)');
    const contenitore = titolo.parentElement as HTMLElement;
    expect(contenitore.style.padding).toBe('44px 20px');
    expect(contenitore.style.textAlign).toBe('center');
  });
});
