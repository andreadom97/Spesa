import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { act, render, fireEvent, screen } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../TabBar', () => ({ TabBar: ({ inerte }: { inerte?: boolean }) => <nav aria-label="Sezioni" inert={inerte} /> }));
vi.mock('@/data/utente', () => ({ useUtente: () => ({ nome: 'Andrea', email: 'andrea@example.it' }), inizialeDi: () => 'A' }));
vi.mock('../pannello/Pannello', () => ({ Pannello: () => <div data-testid="pannello" /> }));
vi.mock('../pannello/DatiPannello', () => ({
  DatiPannelloProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Guscio, calcolaStatoBarra } from '../Guscio';
import { useNascondiBarra } from '../barra-context';
import { Testata } from '../Testata';

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

  it('renderizza lo slot del dock accanto alla tab bar', () => {
    const { container } = render(<Guscio><div /></Guscio>);
    const slot = container.querySelector('.dock-slot');
    expect(slot).not.toBeNull();
    expect(slot?.nextElementSibling?.tagName).toBe('NAV');
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

  it('una schermata che chiede di nascondere la barra la toglie dal DOM, e smontandosi la rimette', () => {
    function Nasconde() {
      useNascondiBarra(true);
      return <p>fotocamera</p>;
    }
    const { container, rerender } = render(<Guscio><Nasconde /></Guscio>);
    expect(container.querySelector('nav[aria-label="Sezioni"]')).not.toBeInTheDocument();
    rerender(<Guscio><p>porte</p></Guscio>);
    expect(container.querySelector('nav[aria-label="Sezioni"]')).toBeInTheDocument();
  });

  it('monta il pannello, e il Menù utente della pagina lo apre: data-pannello sul guscio (spec fase 5 §A.1, §B.2)', () => {
    const { container } = render(<Guscio><Testata titolo="Lista" /></Guscio>);
    const guscio = container.firstElementChild as HTMLElement;
    expect(screen.getByTestId('pannello')).toBeInTheDocument();
    expect(guscio).not.toHaveAttribute('data-pannello');
    fireEvent.click(screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' }));
    expect(guscio).toHaveAttribute('data-pannello', 'aperto');
    expect(guscio).not.toHaveAttribute('data-istantaneo');
  });

  // Review finale M2: nel Guscio l'apertura da indirizzo aspetta PrimoAvvio.
  it('da ?impostazioni= il pannello aspetta PrimoAvvio: senza il suo segnale resta chiuso e il parametro resta', async () => {
    window.history.replaceState(null, '', '/lista?impostazioni=cima');
    try {
      const { container } = render(<Guscio><Testata titolo="Lista" /></Guscio>);
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
      expect(container.firstElementChild).not.toHaveAttribute('data-pannello');
      expect(window.location.search).toBe('?impostazioni=cima');
    } finally {
      window.history.replaceState(null, '', '/lista');
    }
  });

  // Review del Task 6 (minor b): aria-modal da solo non trattiene il Tab dentro il pannello.
  it('a pannello aperto l\'app dietro, lo slot del Dock e la tab bar sono inert; chiuso, no', () => {
    const { container } = render(<Guscio><Testata titolo="Lista" /></Guscio>);
    const main = container.querySelector('main.guscio-main')!;
    const slot = container.querySelector('.dock-slot')!;
    const barra = () => container.querySelector('nav[aria-label="Sezioni"]')!;
    expect(main).not.toHaveAttribute('inert');
    expect(slot).not.toHaveAttribute('inert');
    expect(barra()).not.toHaveAttribute('inert');

    fireEvent.click(screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' }));
    expect(main).toHaveAttribute('inert');
    expect(slot).toHaveAttribute('inert');
    expect(barra()).toHaveAttribute('inert');

    // Nel telefono il Menù è sotto il velo, che chiude; qui il tocco arriva al bottone.
    fireEvent.click(screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' }));
    expect(main).not.toHaveAttribute('inert');
    expect(slot).not.toHaveAttribute('inert');
  });

  it('monta l\'avvio del Marchio su /lista, una volta per sessione (spec fase 5 §J)', () => {
    percorso.valore = '/lista';
    sessionStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    try {
      const { container, unmount } = render(<Guscio><p>x</p></Guscio>);
      expect(container.querySelector('[data-avvio]')).not.toBeNull();
      unmount();
      const secondo = render(<Guscio><p>x</p></Guscio>);
      expect(secondo.container.querySelector('[data-avvio]')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      sessionStorage.clear();
    }
  });
});
