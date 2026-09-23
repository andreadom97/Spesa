import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import Piatti from '../page';

const ING_UOVA: Ingredient = {
  id: 'i-uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 6, prezzoConfezione: null, ean: null,
};

const PIATTO_RISO: Dish = {
  id: 'd-1', nome: 'Riso con frittata', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-uova', quantita: 2, unita: 'pz' }],
  componenti: [],
};
const PIATTO_PESCE: Dish = {
  id: 'd-2', nome: 'Pesce al forno', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorio() {
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_RISO, PIATTO_PESCE]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_UOVA]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

function campo() {
  return screen.getByRole('searchbox', { name: 'Cerca un piatto o un ingrediente' });
}

describe('ricerca piatti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('il campo si chiama come il suo segnaposto', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    expect(campo()).toHaveAttribute('placeholder', 'Cerca un piatto o un ingrediente');
  });

  it('filtra per nome, accenti e maiuscole ignorati', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'PÉSCE' } });
    await waitFor(() => expect(screen.queryByText('Riso con frittata')).not.toBeInTheDocument());
    expect(screen.getByText('Pesce al forno')).toBeInTheDocument();
  });

  it('trova un piatto per un ingrediente che non è nel nome', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'uova' } });
    await waitFor(() => expect(screen.queryByText('Pesce al forno')).not.toBeInTheDocument());
    expect(screen.getByText('Riso con frittata')).toBeInTheDocument();
  });

  it('senza risultati: il vuoto di ricerca col testo nuovo, e l\'aggiungi resta', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'zzz' } });
    expect(await screen.findByText('Nessun piatto qui')).toBeInTheDocument();
    expect(screen.getByText("Prova un'altra parola, oppure aggiungine uno.")).toBeInTheDocument();
    expect(screen.queryByText(/Cambia filtro/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuovo piatto' })).toBeInTheDocument();
  });
});
