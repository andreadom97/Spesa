import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  salvaIngrediente: vi.fn(),
  leggiIngredienti: vi.fn(),
}));

const push = vi.fn();
let paramsId = 'd-1';
let paramsIngId = 'nuovo';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId, ingId: paramsIngId }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { salvaIngrediente, leggiIngredienti } from '@/data/repertorio';
import IngredienteEditor from '../page';

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500,
};

describe('Ingrediente (editor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsId = 'd-1';
    paramsIngId = 'nuovo';
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT]);
  });

  it('creazione: il salvataggio è bloccato finché mancano nome, area e formato', async () => {
    render(<IngredienteEditor />);

    expect(await screen.findByPlaceholderText("Dai un nome all'ingrediente")).toBeInTheDocument();
    const salva = screen.getByRole('button', { name: 'SALVA INGREDIENTE' });
    expect(salva).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    expect(salva).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    expect(salva).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '6' } });
    expect(salva).toBeEnabled();
  });

  it('scegliendo INTERO l\'unità passa a PZ e il formato si blocca a 1', async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '30' } });
    expect(screen.getByRole('button', { name: 'ML' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));

    expect(screen.getByRole('button', { name: 'PZ' })).toHaveAttribute('aria-pressed', 'true');
    const formato = screen.getByLabelText('Formato della confezione') as HTMLInputElement;
    expect(formato.value).toBe('1');
    expect(formato).toBeDisabled();
  });

  it('le tre spiegazioni della classe di residuo sono quelle di Ingrediente.dc.html', async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    expect(
      screen.getByText(
        'La confezione copre più pasti. L’app calcola quanto ne resta dopo ogni porzione e lo riporta alla settimana dopo.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    expect(screen.getByText('Si conta a pezzi e non lascia resti frazionari: sei uova sono sei uova.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(
      screen.getByText('Non vale la pena contarlo a grammi. Ogni 90 giorni dall’ultimo acquisto la lista ti chiede se ne hai ancora.'),
    ).toBeInTheDocument();
  });

  it('l\'etichetta sotto l\'interruttore deperibile segue lo stato: base di default, top-up quando attivo', async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    expect(screen.getByText('FINISCE NELLA LISTA BASE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /No, si conserva a lungo/ }));

    expect(screen.getByText('FINISCE NELLA LISTA TOP-UP')).toBeInTheDocument();
    expect(screen.queryByText('FINISCE NELLA LISTA BASE')).not.toBeInTheDocument();
  });

  it('salva chiama salvaIngrediente con i valori scelti e torna al piatto', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-nuovo');
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));

    fireEvent.click(screen.getByRole('button', { name: 'SALVA INGREDIENTE' }));

    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith({
      id: undefined,
      nome: 'Uova',
      unitaBase: 'pz',
      area: 'macelleria',
      classeResiduo: 'intero',
      deperibile: false,
      formatoConfezione: 1,
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  it('modifica: carica le proprietà dell\'ingrediente esistente', async () => {
    paramsIngId = 'i-1';

    render(<IngredienteEditor />);

    expect(await screen.findByDisplayValue('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LATTICINI, UOVA E SALUMI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'A STIMA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('FINISCE NELLA LISTA TOP-UP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SALVA INGREDIENTE' })).toBeEnabled();
  });

  it('un ingId sconosciuto mostra un messaggio invece di un modulo vuoto', async () => {
    paramsIngId = 'i-inesistente';

    render(<IngredienteEditor />);

    expect(await screen.findByText('Ingrediente non trovato.')).toBeInTheDocument();
  });
});
