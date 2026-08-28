import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import Piatti from '../page';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };

const ING_LATTE: Ingredient = {
  id: 'i-1', nome: 'Latte', unitaBase: 'ml', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 1000,
};
const ING_PANE: Ingredient = {
  id: 'i-2', nome: 'Pane', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500,
};

const PIATTO_COLAZIONE: Dish = {
  id: 'd-1', nome: 'Latte e pane', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-1', quantita: 200, unita: 'ml' },
    { ingredientId: 'i-2', quantita: 50, unita: 'g' },
  ],
};
const PIATTO_PRANZO: Dish = {
  id: 'd-2', nome: 'Pasta al pomodoro', slotDefId: 'sd-2', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorioPieno() {
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_COLAZIONE, PIATTO_PRANZO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_LATTE, ING_PANE]);
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

describe('Piatti (repertorio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra l'onboarding quando leggiRepertorio torna vuoto", async () => {
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    vi.mocked(leggiIngredienti).mockResolvedValue([]);
    vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });

    render(<Piatti />);

    expect(await screen.findByText('Non hai ancora nessun piatto')).toBeInTheDocument();
    expect(screen.getByText('CREA IL PRIMO PIATTO')).toBeInTheDocument();
  });

  it('i filtri sono TUTTI più un\'opzione per ogni meal_slot_def reale, non i quattro cablati nel mock', async () => {
    mockRepertorioPieno();
    render(<Piatti />);

    expect(await screen.findByText('Latte e pane')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TUTTI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pranzo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cena' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spuntino' })).not.toBeInTheDocument();
  });

  it('filtra i piatti sul pasto scelto', async () => {
    mockRepertorioPieno();
    render(<Piatti />);
    await screen.findByText('Latte e pane');

    fireEvent.click(screen.getByRole('button', { name: 'Pranzo' }));

    expect(screen.queryByText('Latte e pane')).not.toBeInTheDocument();
    expect(screen.getByText('Pasta al pomodoro')).toBeInTheDocument();
  });

  it('un pallino per area distinta negli ingredienti, non uno per ingrediente, nell\'ordine dell\'utente', async () => {
    mockRepertorioPieno();
    render(<Piatti />);

    const nomeConDuePallini = await screen.findByText('Latte e pane');
    const schedaConDuePallini = nomeConDuePallini.closest('a')!;
    const pallini = schedaConDuePallini.querySelectorAll('[data-area]');
    expect(Array.from(pallini).map((el) => el.getAttribute('data-area'))).toEqual(['latticini', 'cereali']);

    const nomeConUnPallino = screen.getByText('Pasta al pomodoro');
    const schedaConUnPallino = nomeConUnPallino.closest('a')!;
    // Pane compare due volte nel piatto? No: un solo ingrediente (pane) -> un solo pallino, non uno a riga.
    const pallino = schedaConUnPallino.querySelectorAll('[data-area]');
    expect(Array.from(pallino).map((el) => el.getAttribute('data-area'))).toEqual(['cereali']);
  });

  it('la meta mostra numero ingredienti e fonte', async () => {
    mockRepertorioPieno();
    render(<Piatti />);
    expect(await screen.findByText('2 INGR. · PROPRIO')).toBeInTheDocument();
    expect(screen.getByText('1 INGR. · NUTRIZIONISTA')).toBeInTheDocument();
  });
});
