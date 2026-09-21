import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));

import { TabBar } from '../TabBar';
import { MarchioProvider, useAreeMancanti } from '../marchio-context';

function Pubblica({ aree }: { aree: 'ortofrutta'[] }) { useAreeMancanti(aree); return null; }
const monta = (extra?: React.ReactNode) => render(<MarchioProvider>{extra}<TabBar /></MarchioProvider>);

describe('TabBar (spec §C)', () => {
  it('ha quattro voci nell\'ordine Lista, Piano, Piatti, Dispensa con gli href giusti', () => {
    monta();
    const voci = screen.getAllByRole('link');
    expect(voci.map((v) => v.textContent)).toEqual(['Lista', 'Piano', 'Piatti', 'Dispensa']);
    expect(voci.map((v) => v.getAttribute('href'))).toEqual(['/lista', '/piano', '/piatti', '/dispensa']);
  });

  it('la voce attiva è quella il cui href è prefisso del percorso, con aria-current', () => {
    percorso.valore = '/piano/2026-09-21/sd-1/scegli';
    monta();
    expect(screen.getByRole('link', { name: 'Piano' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Lista' })).not.toHaveAttribute('aria-current');
    percorso.valore = '/lista';
  });

  it('la voce Lista porta il Marchio e riflette le aree mancanti', () => {
    monta(<Pubblica aree={['ortofrutta']} />);
    const lista = screen.getByRole('link', { name: 'Lista' });
    expect(lista.querySelectorAll('[data-area]')).toHaveLength(6);
    expect(lista.querySelector('[data-area="ortofrutta"]')).toHaveAttribute('data-stato', 'vuoto');
    expect(lista.querySelector('[data-area="cereali"]')).toHaveAttribute('data-stato', 'pieno');
  });

  it('il nav si chiama Sezioni e le etichette restano nel DOM (a barra ridotta sono nascoste dal CSS, non tolte)', () => {
    monta();
    expect(screen.getByRole('navigation', { name: 'Sezioni' })).toBeInTheDocument();
    expect(screen.getByText('Dispensa')).toHaveClass('barra-etichetta');
  });
});
