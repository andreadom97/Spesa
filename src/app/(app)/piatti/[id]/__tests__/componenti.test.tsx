import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AreaId, Componente, Ingredient } from '@/domain/types';
import { ComponentiPiatto } from '../ComponentiPiatto';

function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {
  return {
    id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: false,
    formatoConfezione: 100, prezzoConfezione: null, ean: null,
  };
}

const FARINA = ingrediente('i-2', 'Farina');
const PANE_INTEGRALE = ingrediente('i-3', 'Pane integrale', 'cereali');
const CATALOGO = new Map([[FARINA.id, FARINA], [PANE_INTEGRALE.id, PANE_INTEGRALE]]);

const PANE: Componente = {
  id: 'c-1',
  nome: 'Pane',
  opzioni: [
    { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 50, unita: 'g' }] },
    { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 40, unita: 'g' }] },
  ],
};

const TESTO_COMPONENTE_SENZA_NOME = 'Dai un nome a ogni componente: senza, non si distinguerebbe in Scegli.';
const TESTO_OPZIONE_SENZA_RIGHE = "Ogni opzione deve avere almeno un ingrediente: aggiungine uno o elimina l'opzione.";
const TESTO_OPZIONE_QUANTITA =
  'Manca la grammatura di uno o più ingredienti nelle opzioni: tocca il numero sulla tessera e scrivi quanto ne usi.';

function rendi(componenti: Componente[] = [PANE]) {
  const cb = {
    onAggiungiComponente: vi.fn(),
    onRimuoviComponente: vi.fn(),
    onCambiaNomeComponente: vi.fn(),
    onAggiungiOpzione: vi.fn(),
    onRimuoviOpzione: vi.fn(),
    onAggiungiIngrediente: vi.fn(),
    onCambiaQuantita: vi.fn(),
    onRimuoviRiga: vi.fn(),
  };
  render(<ComponentiPiatto componenti={componenti} catalogoPerId={CATALOGO} {...cb} />);
  return cb;
}

describe('ComponentiPiatto (spec fase 7 §B.3 punto 4)', () => {
  it('ogni componente è un widget bianco a raggio 22, col nome, le opzioni e le loro tessere', () => {
    rendi();
    expect(screen.getByText('COMPONENTI A SCELTA')).toBeInTheDocument();
    const widget = screen.getByRole('region', { name: 'Componente 1' });
    expect(widget.style.borderRadius).toBe('22px');
    expect(widget.style.background).toBe('var(--superficie)');
    expect(within(widget).getByDisplayValue('Pane')).toBeInTheDocument();
    expect(within(widget).getByText('OPZIONE 1')).toBeInTheDocument();
    expect(within(widget).getByText('OPZIONE 2')).toBeInTheDocument();
    expect(within(widget).getByText('Farina')).toBeInTheDocument();
    expect(within(widget).getByText('Pane integrale')).toBeInTheDocument();
  });

  it('il campo del nome è alto 44 e chiama onCambiaNomeComponente', () => {
    const cb = rendi();
    const campo = screen.getByLabelText('Nome del componente 1');
    expect(campo.style.height).toBe('44px');
    fireEvent.change(campo, { target: { value: 'Pane nero' } });
    expect(cb.onCambiaNomeComponente).toHaveBeenCalledWith('c-1', 'Pane nero');
  });

  it('le ✕ di componente e di opzione sono tondi 44 con gli aria-label di oggi', () => {
    const cb = rendi();
    const viaComponente = screen.getByRole('button', { name: 'Elimina componente 1' });
    expect(viaComponente.style.width).toBe('44px');
    expect(viaComponente.style.height).toBe('44px');
    expect(viaComponente.style.borderRadius).toBe('999px');
    fireEvent.click(viaComponente);
    expect(cb.onRimuoviComponente).toHaveBeenCalledWith('c-1');

    const viaOpzione = screen.getByRole('button', { name: 'Elimina opzione 2 del componente 1' });
    expect(viaOpzione.style.width).toBe('44px');
    fireEvent.click(viaOpzione);
    expect(cb.onRimuoviOpzione).toHaveBeenCalledWith('c-1', 'o-2');
  });

  it('AGGIUNGI INGREDIENTE di un’opzione è un Aggiungi tratteggiato e apre il selettore su quell’opzione', () => {
    const cb = rendi();
    const aggiungi = screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 2 del componente 1" });
    expect(aggiungi).toHaveTextContent('AGGIUNGI INGREDIENTE');
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    expect(cb.onAggiungiIngrediente).toHaveBeenCalledWith('c-1', 'o-2');
  });

  it('AGGIUNGI OPZIONE è un tasto secondario, senza il fondo 0,05', () => {
    const cb = rendi();
    const opzione = screen.getByRole('button', { name: 'AGGIUNGI OPZIONE' });
    expect(opzione.style.background).toBe('var(--superficie)');
    expect(opzione.style.height).toBe('54px');
    fireEvent.click(opzione);
    expect(cb.onAggiungiOpzione).toHaveBeenCalledWith('c-1');
  });

  it('AGGIUNGI COMPONENTE è l’Aggiungi tratteggiato sotto i widget', () => {
    const cb = rendi();
    const aggiungi = screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' });
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    expect(cb.onAggiungiComponente).toHaveBeenCalledTimes(1);
  });

  it('grammatura e rimozione di una riga passano componente, opzione e ingrediente', () => {
    const cb = rendi();
    fireEvent.change(screen.getByLabelText('Grammatura di Farina'), { target: { value: '60' } });
    expect(cb.onCambiaQuantita).toHaveBeenCalledWith('c-1', 'o-1', 'i-2', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Pane integrale' }));
    expect(cb.onRimuoviRiga).toHaveBeenCalledWith('c-1', 'o-2', 'i-3');
  });

  it('un componente senza nome e un’opzione senza righe: i due messaggi, in --errore', () => {
    rendi([{ id: 'c-9', nome: '  ', opzioni: [{ id: 'o-9', righe: [] }] }]);
    expect(screen.getByText(TESTO_COMPONENTE_SENZA_NOME).style.color).toBe('var(--errore)');
    expect(screen.getByText(TESTO_OPZIONE_SENZA_RIGHE).style.color).toBe('var(--errore)');
    // Con un'opzione vuota la grammatura non si nomina: prima va aggiunto un ingrediente.
    expect(screen.queryByText(TESTO_OPZIONE_QUANTITA)).toBeNull();
  });

  it('una riga a grammatura 0 chiede la grammatura, in --errore, e la tessera la segnala', () => {
    rendi([{ ...PANE, opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 0, unita: 'g' }] }] }]);
    expect(screen.getByText(TESTO_OPZIONE_QUANTITA).style.color).toBe('var(--errore)');
    expect(screen.getByText('Farina').closest('[data-quantita-valida]')).toHaveAttribute('data-quantita-valida', 'false');
  });

  it('senza componenti: l’etichetta e AGGIUNGI COMPONENTE, nessun messaggio', () => {
    rendi([]);
    expect(screen.getByText('COMPONENTI A SCELTA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' })).toBeInTheDocument();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText(TESTO_COMPONENTE_SENZA_NOME)).toBeNull();
    expect(screen.queryByText(TESTO_OPZIONE_SENZA_RIGHE)).toBeNull();
  });
});
