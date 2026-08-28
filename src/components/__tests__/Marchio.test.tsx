import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Marchio } from '../Marchio';

function caselle(c: HTMLElement) {
  return Array.from(c.querySelectorAll('[data-area]')) as HTMLElement[];
}

describe('Marchio', () => {
  it('ha sempre sei caselle', () => {
    const { container } = render(<Marchio aree={[]} />);
    expect(caselle(container)).toHaveLength(6);
  });

  it('le dispone nell\'ordine ruotato: arancio, azzurro, verde, lilla, giallo, corallo', () => {
    const { container } = render(<Marchio aree={[]} />);
    expect(caselle(container).map((e) => e.dataset.area)).toEqual([
      'dispensa', 'latticini', 'ortofrutta', 'surgelati', 'cereali', 'macelleria',
    ]);
  });

  it('riempie tutto quando non manca niente', () => {
    const { container } = render(<Marchio aree={[]} />);
    expect(caselle(container).every((e) => e.dataset.stato === 'pieno')).toBe(true);
  });

  it('contorna solo le aree in cui manca qualcosa', () => {
    const { container } = render(<Marchio aree={['latticini', 'cereali']} />);
    const vuote = caselle(container).filter((e) => e.dataset.stato === 'vuoto');
    expect(vuote.map((e) => e.dataset.area).sort()).toEqual(['cereali', 'latticini']);
  });

  it('non usa mai il grigio: il bordo è sempre il colore dell\'area', () => {
    const { container } = render(<Marchio aree={['latticini']} />);
    const latticini = caselle(container).find((e) => e.dataset.area === 'latticini')!;
    expect(latticini.style.borderColor).toBe('rgb(156, 199, 242)'); // #9CC7F2
    expect(latticini.style.background).toBe('transparent');
  });
});
