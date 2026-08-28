import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient, PantryState } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn() }));
vi.mock('@/data/dispensa', () => ({ leggiDispensa: vi.fn(), correggiResiduo: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { leggiIngredienti } from '@/data/repertorio';
import { leggiDispensa, correggiResiduo } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import Dispensa from '../page';

const ORDINE = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

const RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
};
const BANANE: Ingredient = {
  id: 'i-banane', nome: 'Banane', unitaBase: 'pz', area: 'ortofrutta',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 3,
};

function statoDispensa(righe: Partial<PantryState>[]): PantryState[] {
  return righe.map((r) => ({
    ingredientId: r.ingredientId!, residuo: r.residuo ?? 0,
    ultimoAcquisto: r.ultimoAcquisto ?? null, giorniStimati: 90, ultimoCheck: null,
  }));
}

function mockBase(dispensa: PantryState[], ingredienti: Ingredient[] = [RISO, BANANE]) {
  vi.mocked(leggiIngredienti).mockResolvedValue(ingredienti);
  vi.mocked(leggiDispensa).mockResolvedValue(dispensa);
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: [...ORDINE] });
}

describe('Dispensa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('separa quello che c e in casa da quello che e finito', async () => {
    mockBase(statoDispensa([
      { ingredientId: 'i-riso', residuo: 920, ultimoAcquisto: '2026-08-28' },
      { ingredientId: 'i-banane', residuo: 0 },
    ]));

    render(<Dispensa />);

    expect(await screen.findByText('IN CASA')).toBeInTheDocument();
    expect(screen.getByText('FINITI')).toBeInTheDocument();
    expect(screen.getByLabelText('Residuo di Riso')).toHaveValue(920);
    expect(screen.getByLabelText('Residuo di Banane')).toHaveValue(0);
  });

  it('mostra a zero un ingrediente che non ha ancora una riga di dispensa', async () => {
    // Mai comprato: la riga in pantry_state non esiste. Senza questo,
    // l'ingrediente sparirebbe dalla schermata e non sarebbe correggibile
    // proprio nel caso in cui serve — dichiarare che ne hai già in casa.
    mockBase([]);

    render(<Dispensa />);

    expect(await screen.findByLabelText('Residuo di Riso')).toHaveValue(0);
    expect(screen.getAllByText(/MAI COMPRATO/).length).toBe(2);
  });

  it('salva la correzione quando si esce dal campo, non a ogni tasto', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');

    fireEvent.change(campo, { target: { value: '5' } });
    fireEvent.change(campo, { target: { value: '50' } });
    // Ancora niente: scrivendo "500" si passa per 5 e 50, e salvarli
    // scriverebbe valori che l'utente non ha mai voluto.
    expect(correggiResiduo).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: '500' } });
    fireEvent.blur(campo);

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-riso', 500));
    expect(correggiResiduo).toHaveBeenCalledOnce();
  });

  it('non scrive nulla se il valore non e cambiato', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');
    fireEvent.blur(campo);

    expect(correggiResiduo).not.toHaveBeenCalled();
  });

  it('rifiuta un valore vuoto o negativo tornando a quello di prima', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');

    fireEvent.change(campo, { target: { value: '' } });
    fireEvent.blur(campo);
    expect(correggiResiduo).not.toHaveBeenCalled();
    expect(campo).toHaveValue(920);

    fireEvent.change(campo, { target: { value: '-3' } });
    fireEvent.blur(campo);
    expect(correggiResiduo).not.toHaveBeenCalled();
    expect(campo).toHaveValue(920);
  });

  it('se il salvataggio fallisce riporta il valore di prima e lo dice', async () => {
    // Una correzione persa in silenzio e peggio del residuo sbagliato:
    // l'utente crede di aver rimesso le cose a posto e non lo sono.
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(correggiResiduo).mockRejectedValue(new Error('rete'));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');
    fireEvent.change(campo, { target: { value: '500' } });
    fireEvent.blur(campo);

    await waitFor(() =>
      expect(screen.getByText('Non siamo riusciti a salvare la correzione. Riprova.')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Residuo di Riso')).toHaveValue(920);
  });

  it('senza ingredienti spiega che la dispensa si riempie da se', async () => {
    mockBase([], []);

    render(<Dispensa />);

    expect(await screen.findByText('Ancora niente in dispensa')).toBeInTheDocument();
  });
});
