import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));
vi.mock('../TabBar', () => ({ TabBar: () => <nav aria-label="Sezioni" /> }));

import { Guscio, calcolaStatoBarra } from '../Guscio';

describe('calcolaStatoBarra (spec §B)', () => {
  it('si riduce scorrendo giù di almeno 6 oltre i 24 di scrollTop', () => {
    expect(calcolaStatoBarra('grande', 40, 6)).toBe('ridotta');
    expect(calcolaStatoBarra('grande', 40, 5)).toBe('grande');
    expect(calcolaStatoBarra('grande', 20, 30)).toBe('grande');
  });
  it('torna grande scorrendo su di almeno 6 o sotto gli 8 di scrollTop', () => {
    expect(calcolaStatoBarra('ridotta', 300, -6)).toBe('grande');
    expect(calcolaStatoBarra('ridotta', 300, -5)).toBe('ridotta');
    expect(calcolaStatoBarra('ridotta', 4, 0)).toBe('grande');
  });
});

describe('Guscio', () => {
  it('parte grande, si riduce a uno scroll verso il basso di un figlio e torna grande risalendo', () => {
    const { container } = render(
      <Guscio><div className="sc scroll-app" data-testid="s" style={{ height: 100, overflowY: 'auto' }}><div style={{ height: 1000 }} /></div></Guscio>,
    );
    const guscio = container.firstElementChild as HTMLElement;
    const s = container.querySelector('[data-testid="s"]') as HTMLElement;
    expect(guscio.dataset.barra).toBe('grande');
    Object.defineProperty(s, 'scrollTop', { value: 80, configurable: true, writable: true });
    fireEvent.scroll(s);
    expect(guscio.dataset.barra).toBe('ridotta');
    Object.defineProperty(s, 'scrollTop', { value: 60, configurable: true, writable: true });
    fireEvent.scroll(s);
    expect(guscio.dataset.barra).toBe('grande');
  });

  it('dipinge il gradiente e monta la tab bar', () => {
    const { container } = render(<Guscio><p>x</p></Guscio>);
    const guscio = container.firstElementChild as HTMLElement;
    expect(guscio.className).toContain('guscio');
    expect(container.querySelector('nav[aria-label="Sezioni"]')).toBeInTheDocument();
  });

  it('il cambio di route riporta la barra a grande', () => {
    percorso.valore = '/lista';
    const { container, rerender } = render(
      <Guscio><div className="sc scroll-app" data-testid="s" style={{ height: 100, overflowY: 'auto' }}><div style={{ height: 1000 }} /></div></Guscio>,
    );
    const guscio = container.firstElementChild as HTMLElement;
    const s = container.querySelector('[data-testid="s"]') as HTMLElement;
    Object.defineProperty(s, 'scrollTop', { value: 80, configurable: true, writable: true });
    fireEvent.scroll(s);
    expect(guscio.dataset.barra).toBe('ridotta');

    percorso.valore = '/piano';
    rerender(
      <Guscio><div className="sc scroll-app" data-testid="s" style={{ height: 100, overflowY: 'auto' }}><div style={{ height: 1000 }} /></div></Guscio>,
    );
    expect(guscio.dataset.barra).toBe('grande');
  });

  it('uno scroll su un elemento senza scroll-app non cambia lo stato', () => {
    const { container } = render(
      <Guscio><div data-testid="altro" style={{ height: 100, overflowY: 'auto' }}><div style={{ height: 1000 }} /></div></Guscio>,
    );
    const guscio = container.firstElementChild as HTMLElement;
    const altro = container.querySelector('[data-testid="altro"]') as HTMLElement;
    Object.defineProperty(altro, 'scrollTop', { value: 80, configurable: true, writable: true });
    fireEvent.scroll(altro);
    expect(guscio.dataset.barra).toBe('grande');
  });
});
