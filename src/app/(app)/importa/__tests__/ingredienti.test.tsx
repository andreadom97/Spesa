import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';
import type { StatoRevisione } from '@/domain/import/types';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import { SlotDockProvider } from '@/components/dock-slot';
import { Ingredienti } from '../Ingredienti';

const ing = (id: string, nome: string, unitaBase: Ingredient['unitaBase']): Ingredient => ({
  id, nome, unitaBase, area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
});
const AVENA = ing('i-avena', "Fiocchi d'avena", 'g');
const LATTE = ing('i-latte', 'Latte intero', 'ml');
const PARMIGIANO = ing('i-parm', 'Parmigiano', 'g');
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

let slotDock: HTMLElement;
beforeEach(() => {
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  slotDock.remove();
});

function rendi(esistenti: Ingredient[] = [AVENA], stato: StatoRevisione = STATO) {
  const onStato = vi.fn();
  render(<SlotDockProvider slot={slotDock}><Ingredienti piano={PIANO_MENU_SETTIMANALE} stato={stato} ingredientiEsistenti={esistenti} onStato={onStato} /></SlotDockProvider>);
  return onStato;
}
const avanti = () => within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'VAI AL RIEPILOGO' });

describe('Ingredienti', () => {
  it('la frase, le olive da controllare con la scheda aperta, gli altri come righe', () => {
    const onStato = rendi();
    expect(onStato).toHaveBeenCalledTimes(1);
    expect(onStato.mock.calls[0][0].ingredientiNuovi).toHaveLength(9);
    expect(screen.getByText('9 ingredienti nuovi. Ne conosco 8; per 1 ho messo valori prudenti: controllali.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Da controllare 1' })).toBeInTheDocument();
    expect(screen.getByText('Non è nella mia tabella dei formati: 500 g è un valore di ripiego.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Proposti da me 8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apri Pane integrale' })).toHaveTextContent('Pasta, riso e cereali · fresco');
    expect(screen.getByRole('button', { name: 'Apri Pane di segale' })).toBeInTheDocument();
    expect(avanti()).toBeEnabled();
  });

  it('niente prezzo e niente scelta dell\'unità', () => {
    rendi();
    expect(screen.queryByLabelText(/prezzo/i)).toBeNull();
    expect(screen.queryByRole('group', { name: /Unità/ })).toBeNull();
  });

  it('una riga apre la sua scheda nel foglio; la confezione a zero spegne il Dock', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    const foglio = screen.getByRole('dialog', { name: 'Latte parzialmente scremato' });
    expect(within(foglio).getByRole('textbox', { name: 'Nome' })).toHaveValue('Latte parzialmente scremato');
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Confezione' }), { target: { value: '0' } });
    expect(avanti()).toBeDisabled();
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Confezione' }), { target: { value: '750' } });
    expect(avanti()).toBeEnabled();
  });

  it('un nome doppio blocca finché non si rinomina', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    const foglio = screen.getByRole('dialog', { name: 'Pane di segale' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane integrale' } });
    expect(avanti()).toBeDisabled();
    expect(within(foglio).getByText('Un altro ingrediente si chiama già così: cambia il nome.')).toBeInTheDocument();
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane nero' } });
    expect(avanti()).toBeEnabled();
    // Entrati in «Da sistemare», ci restano: niente salti sotto il dito.
    expect(screen.getByRole('heading', { name: 'Da sistemare Fatto' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pane integrale' })).toBeInTheDocument();
  });

  it('«È lo stesso di…» offre gli esistenti con la stessa unità, e torna indietro con «No, è nuovo»', () => {
    rendi([AVENA, LATTE, PARMIGIANO]);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    const foglio = screen.getByRole('dialog', { name: 'Latte parzialmente scremato' });
    fireEvent.click(within(foglio).getByRole('button', { name: /È lo stesso di/ }));
    const scelta = screen.getByRole('dialog', { name: 'Latte parzialmente scremato è lo stesso di…' });
    expect(within(scelta).getByText('Solo gli ingredienti che conti in millilitri, come questo.')).toBeInTheDocument();
    expect(within(scelta).getByRole('radio', { name: 'No, è un ingrediente nuovo' })).toHaveAttribute('aria-checked', 'true');
    expect(within(scelta).queryByRole('radio', { name: 'Parmigiano' })).toBeNull();
    fireEvent.click(within(scelta).getByRole('radio', { name: 'Latte intero' }));
    expect(screen.getByText("Userò l'ingrediente che hai già.")).toBeInTheDocument();
    expect(screen.getByText('8 ingredienti nuovi. Ne conosco 7; per 1 ho messo valori prudenti: controllali.')).toBeInTheDocument();

    // Anche la scheda delle olive, aperta in pagina, ha «È lo stesso di…» e «Nome»: si lavora dentro il foglio.
    const legato = screen.getByRole('dialog', { name: 'Latte intero' });
    fireEvent.click(within(legato).getByRole('button', { name: /È lo stesso di/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Latte intero è lo stesso di…' })).getByRole('radio', { name: 'No, è un ingrediente nuovo' }));
    expect(within(legato).getByRole('textbox', { name: 'Nome' })).toHaveValue('Latte parzialmente scremato');
  });

  it("l'area si sceglie dal foglio", () => {
    rendi();
    const olive = screen.getByRole('region', { name: 'Olive taggiasche' });
    fireEvent.click(within(olive).getByRole('button', { name: /Area/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Area di Olive taggiasche' })).getByRole('radio', { name: 'Surgelati' }));
    expect(within(olive).getByRole('button', { name: /Area/ })).toHaveTextContent('Surgelati');
  });

  it('VAI AL RIEPILOGO porta gli ingredienti e il passo', () => {
    const onStato = rendi();
    fireEvent.click(avanti());
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.passo).toBe('riepilogo');
    expect(stato.ingredientiNuovi).toHaveLength(9);
  });
});
