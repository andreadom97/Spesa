import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, MealSlotDef } from '@/domain/types';

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
const SLOT_PRANZO: MealSlotDef = { id: 'sd-1', nome: 'Pranzo', posizione: 0, assenzeAbituali: ASSENZE };

const PIATTO_RISO: Dish = {
  id: 'd-1',
  nome: 'Riso con frittata',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: null,
  giornoCiclo: null,
  ingredienti: [],
  componenti: [],
};

const PIATTO_PESCE: Dish = {
  id: 'd-2',
  nome: 'Pesce al forno',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: null,
  giornoCiclo: null,
  ingredienti: [],
  componenti: [],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorio() {
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_RISO, PIATTO_PESCE]);
  vi.mocked(leggiIngredienti).mockResolvedValue([]);
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_PRANZO]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

describe('ricerca piatti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra per nome, accenti e maiuscole ignorati', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Cerca un piatto' }), {
      target: { value: 'PÉSCE' },
    });
    await waitFor(() => expect(screen.queryByText('Riso con frittata')).not.toBeInTheDocument());
    expect(screen.getByText('Pesce al forno')).toBeInTheDocument();
  });
});
