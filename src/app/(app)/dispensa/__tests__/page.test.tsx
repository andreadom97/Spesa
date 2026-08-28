import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient, PantryState } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn() }));
vi.mock('@/data/dispensa', () => ({ leggiDispensa: vi.fn(), correggiResiduo: vi.fn(), impostaCongelato: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { leggiIngredienti } from '@/data/repertorio';
import { leggiDispensa, correggiResiduo, impostaCongelato } from '@/data/dispensa';
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
    congelato: r.congelato ?? false,
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

  it('separa in casa, finiti e mai comprati', async () => {
    // "Finito" e "mai avuto" non sono la stessa cosa: il primo e' una cosa
    // che usi e si e' esaurita, il secondo e' catalogo. Dopo il seed i
    // secondi sono decine e seppellivano i primi.
    mockBase(statoDispensa([
      { ingredientId: 'i-riso', residuo: 920, ultimoAcquisto: '2026-08-28' },
      { ingredientId: 'i-banane', residuo: 0, ultimoAcquisto: '2026-08-20' },
    ]));

    render(<Dispensa />);

    expect(await screen.findByText('IN CASA')).toBeInTheDocument();
    expect(screen.getByText('FINITI')).toBeInTheDocument();
    expect(screen.queryByText('MAI COMPRATI')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Residuo di Riso')).toHaveValue(920);
    expect(screen.getByLabelText('Residuo di Banane')).toHaveValue(0);
  });

  it('i mai comprati stanno in un gruppo a parte, chiuso di partenza', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920, ultimoAcquisto: '2026-08-28' }]));

    render(<Dispensa />);

    // Banane non ha riga di dispensa: mai comprato.
    const intestazione = await screen.findByRole('button', { name: /MAI COMPRATI/ });
    expect(intestazione).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('FINITI')).not.toBeInTheDocument();

    fireEvent.click(intestazione);
    expect(intestazione).toHaveAttribute('aria-expanded', 'true');
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

  it('avverte quando un fresco e troppo vecchio per contare ancora', async () => {
    // Senza questo avviso la schermata direbbe "200 g di pollo" mentre la
    // lista lo richiede lo stesso: due verita' diverse nella stessa app.
    const POLLO: Ingredient = {
      id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300,
    };
    mockBase(statoDispensa([{ ingredientId: 'i-pollo', residuo: 200, ultimoAcquisto: '2020-01-01' }]), [POLLO]);

    render(<Dispensa />);

    expect(await screen.findByText(/Troppo tempo per essere ancora buono/)).toBeInTheDocument();
  });

  it('non avverte se quel fresco e dichiarato in congelatore', async () => {
    const POLLO: Ingredient = {
      id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300,
    };
    const oggi = new Date().toISOString().slice(0, 10);
    mockBase(statoDispensa([{ ingredientId: 'i-pollo', residuo: 200, ultimoAcquisto: oggi, congelato: true }]), [POLLO]);

    render(<Dispensa />);

    await screen.findByLabelText('Residuo di Petto di pollo');
    expect(screen.queryByText(/Troppo tempo per essere ancora buono/)).not.toBeInTheDocument();
    expect(screen.getByText(/IN CONGELATORE/)).toBeInTheDocument();
  });

  it('il congelatore si accende e si spegne, e non compare sui non deperibili', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-banane', residuo: 3 }]));
    vi.mocked(impostaCongelato).mockResolvedValue(undefined);

    render(<Dispensa />);

    // Riso non e' deperibile: un controllo che non farebbe niente.
    expect(await screen.findByLabelText(/Banane: metti in congelatore/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Riso: metti in congelatore/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Banane: metti in congelatore/));
    await waitFor(() => expect(impostaCongelato).toHaveBeenCalledWith('i-banane', true));
  });

  it('senza ingredienti spiega che la dispensa si riempie da se', async () => {
    mockBase([], []);

    render(<Dispensa />);

    expect(await screen.findByText('Ancora niente in dispensa')).toBeInTheDocument();
  });
});
