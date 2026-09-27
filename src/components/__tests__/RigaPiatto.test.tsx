import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Dish } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { RigaPiatto } from '../RigaPiatto';

// jsdom riscrive un colore esadecimale inline in `rgb(…)`: `coloreArea` torna l'esadecimale,
// quindi il confronto passa da qui (lo stesso helper di `avvio-marchio.test.tsx`).
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

const PIATTO: Dish = {
  id: 'd-1', nome: 'Riso e pane', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
  componenti: [],
};
const PIATTO_DIETA: Dish = {
  id: 'd-2', nome: 'Merenda', slotDefId: 'sd-1', fonte: 'nutrizionista', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [{
    id: 'c-1', nome: 'a scelta',
    opzioni: [
      { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 30, unita: 'g' }] },
      { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 150, unita: 'ml' }] },
    ],
  }],
};

describe('RigaPiatto — modo apri (identico a oggi)', () => {
  it('è un link che apre il piatto, con aria-label, sottoriga e pallini d\'area', () => {
    render(<RigaPiatto piatto={PIATTO} aree={['cereali']} modo="apri" href="/piatti/d-1" />);
    const link = screen.getByRole('link', { name: 'Apri Riso e pane' });
    expect(link).toHaveAttribute('href', '/piatti/d-1');
    expect(screen.getByText('1 INGREDIENTE')).toBeInTheDocument();
    expect(link.style.background).toBe('var(--superficie)');
    expect(Array.from(link.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['cereali']);
  });

  it('dice «dalla dieta» solo sui piatti dell\'import, e conta gli ingredienti delle opzioni', () => {
    render(<RigaPiatto piatto={PIATTO_DIETA} aree={[]} modo="apri" href="/piatti/d-2" />);
    expect(screen.getByText('2 INGREDIENTI · DALLA DIETA')).toBeInTheDocument();
  });

  it('il bersaglio a destra è il chevron, non la spunta', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="apri" href="/piatti/d-1" />);
    expect(container.querySelector('svg path[d^="M6 3.2"]')).toBeInTheDocument();
  });
});

describe('RigaPiatto — modo scegli (spec fase 7 §A.3)', () => {
  it('è un bottone con aria-pressed e aria-label «Scegli {nome}», che chiama onScegli', () => {
    const onScegli = vi.fn();
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={onScegli} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bottone);
    expect(onScegli).toHaveBeenCalledTimes(1);
  });

  it('il piatto in programma dice ORA IN PROGRAMMA in testa alla sottoriga', () => {
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto corrente onScegli={() => {}} />);
    expect(screen.getByText('ORA IN PROGRAMMA · 1 INGREDIENTE')).toBeInTheDocument();
  });

  it('il nome accessibile del piatto in programma lo dice: «Scegli {nome}, ora in programma» (review finale, M1)', () => {
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente onScegli={() => {}} />);
    expect(screen.getByRole('button', { name: 'Scegli Riso e pane, ora in programma' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scegli Riso e pane' })).toBeNull();
  });

  it('senza essere quello in programma la sottoriga non ha il prefisso', () => {
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={() => {}} />);
    expect(screen.getByText('1 INGREDIENTE')).toBeInTheDocument();
    expect(screen.queryByText(/ORA IN PROGRAMMA/)).not.toBeInTheDocument();
  });

  it('la riga scelta è piena: fondo --ink, nome in --superficie, sottoriga a rgba(255,255,255,0.62), pallini invariati', () => {
    render(<RigaPiatto piatto={PIATTO} aree={['cereali']} modo="scegli" scelto corrente={false} onScegli={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone).toHaveAttribute('aria-pressed', 'true');
    expect(bottone.style.background).toBe('var(--ink)');
    expect(screen.getByText('Riso e pane').style.color).toBe('var(--superficie)');
    expect(screen.getByText('1 INGREDIENTE').style.color).toBe('rgba(255, 255, 255, 0.62)');
    const pallino = bottone.querySelector('[data-area]') as HTMLElement;
    expect(pallino.style.background).toBe(rgb(coloreArea('cereali')));
  });

  it('non scelta, la riga resta come oggi: fondo --superficie e il chevron', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone.style.background).toBe('var(--superficie)');
    expect(container.querySelector('svg path[d^="M6 3.2"]')).toBeInTheDocument();
  });

  it('scelta, al posto del chevron c\'è un tondo 24 in --superficie con la spunta --ink di oggi di Scegli', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto corrente={false} onScegli={() => {}} />);
    expect(container.querySelector('svg path[d^="M6 3.2"]')).not.toBeInTheDocument();
    // La geometria è quella della spunta di oggi di Scegli (viewBox 20, tratto 3,2): cambia solo il colore.
    const spunta = container.querySelector('svg[viewBox="0 0 20 20"] path[d="M4.5 10.5 8.2 14 15.5 6.4"]');
    expect(spunta).toBeInTheDocument();
    expect(spunta).toHaveAttribute('stroke', 'var(--ink)');
    expect(spunta).toHaveAttribute('stroke-width', '3.2');
    const tondo = spunta!.closest('span') as HTMLElement;
    expect(tondo.style.width).toBe('24px');
    expect(tondo.style.background).toBe('var(--superficie)');
  });

  it('dentro il bottone solo span: niente div, che in un button non è HTML valido', () => {
    render(<RigaPiatto piatto={PIATTO} aree={['cereali']} modo="scegli" scelto corrente onScegli={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane, ora in programma' });
    expect(bottone.querySelector('div')).toBeNull();
  });
});
