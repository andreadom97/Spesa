import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => {
  class IngredienteInUsoError extends Error {}
  return {
    salvaIngrediente: vi.fn(),
    leggiIngredienti: vi.fn(),
    eliminaIngrediente: vi.fn(),
    haAcquistiRegistrati: vi.fn(),
    IngredienteInUsoError,
  };
});

const push = vi.fn();
let paramsId = 'd-1';
let paramsIngId = 'nuovo';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId, ingId: paramsIngId }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, haAcquistiRegistrati, IngredienteInUsoError } from '@/data/repertorio';
import IngredienteEditor from '../page';

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500,
};

// Dato "sporco" come quello che la Important 1 della review permetteva di
// creare prima del fix: classe 'intero' salvata con un'unità diversa da PZ.
// Serve a verificare che il guardiano in salva() lo corregga anche quando
// arriva così dal caricamento, non solo quando nasce da un click in pagina.
const ING_INTERO_INCONSISTENTE: Ingredient = {
  id: 'i-2', nome: 'Uova', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500,
};

describe('Ingrediente (editor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsId = 'd-1';
    paramsIngId = 'nuovo';
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_INTERO_INCONSISTENTE]);
    vi.mocked(haAcquistiRegistrati).mockResolvedValue(false);
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

  it("con INTERO il segmento unità è disabilitato: cliccare G non lo riattiva, PZ resta l'unica scelta", async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    const g = screen.getByRole('button', { name: 'G' });
    const pz = screen.getByRole('button', { name: 'PZ' });
    expect(g).toBeDisabled();
    expect(pz).toBeDisabled();

    fireEvent.click(g);

    // Il click su un bottone disabled non scatena onClick in un browser reale
    // né in jsdom: PZ deve restare l'opzione attiva.
    expect(pz).toHaveAttribute('aria-pressed', 'true');
    expect(g).toHaveAttribute('aria-pressed', 'false');
  });

  it("il segmento unità torna cliccabile appena la classe non è più INTERO", async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    expect(screen.getByRole('button', { name: 'G' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'PORZIONABILE' }));

    expect(screen.getByRole('button', { name: 'G' })).toBeEnabled();
  });

  it('il guardiano in salva() corregge unità e formato anche per un ingrediente caricato già con la classe INTERO e un\'unità diversa da PZ', async () => {
    paramsIngId = 'i-2';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-2');

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Uova');

    // Il campo formato è disabilitato (classe INTERO), ma i dati caricati
    // sono ancora quelli sporchi: unitaBase 'g', formatoConfezione 500. Il
    // guardiano deve ricalcolare, non fidarsi di quello che era stato
    // salvato prima del fix.
    fireEvent.click(screen.getByRole('button', { name: 'SALVA INGREDIENTE' }));

    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ unitaBase: 'pz', formatoConfezione: 1 }),
    ));
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

  it('l\'etichetta sotto l\'interruttore deperibile segue lo stato: top-up di default (come Ingrediente.dc.html), base quando disattivato', async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    // Default deper: true come in Ingrediente.dc.html riga 86.
    expect(screen.getByText('FINISCE NELLA LISTA TOP-UP')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sì, va comprato fresco/ }));

    expect(screen.getByText('FINISCE NELLA LISTA BASE')).toBeInTheDocument();
    expect(screen.queryByText('FINISCE NELLA LISTA TOP-UP')).not.toBeInTheDocument();
  });

  it('salva chiama salvaIngrediente con i valori scelti (deperibile true di default) e torna al piatto', async () => {
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
      deperibile: true,
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

  it('il cestino su un ingrediente nuovo torna al piatto senza chiedere conferma né eliminare nulla', async () => {
    render(<IngredienteEditor />);
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));

    expect(screen.queryByText('Eliminare questo ingrediente?')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/piatti/d-1');
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('il cestino su un ingrediente esistente chiede conferma, poi elimina (hard delete) e torna al piatto', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockResolvedValue(undefined);

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    expect(screen.getByText('Eliminare questo ingrediente?')).toBeInTheDocument();
    // Nessun acquisto registrato (mock di default): niente frase sullo
    // storico, sarebbe rumore su un ingrediente mai comprato.
    expect(screen.getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Se è ancora usato in un ' +
      'piatto o in una lista della spesa, l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
    expect(eliminaIngrediente).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(eliminaIngrediente).toHaveBeenCalledWith('i-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  it('un ingrediente con acquisti registrati avvisa che lo storico va perso, per via della on delete cascade su purchase', async () => {
    paramsIngId = 'i-1';
    vi.mocked(haAcquistiRegistrati).mockResolvedValue(true);

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));

    expect(screen.getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Sparisce anche lo storico ' +
      'degli acquisti registrati: non si recupera. Se è ancora usato in un piatto o in una lista della spesa, ' +
      'l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
  });

  it('se non si riesce a sapere se ci sono acquisti, il fail-safe assume di sì (Important 3): un errore di rete non fa sparire l\'avviso', async () => {
    paramsIngId = 'i-1';
    vi.mocked(haAcquistiRegistrati).mockRejectedValue(new Error('rete assente'));

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));

    expect(screen.getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Sparisce anche lo storico ' +
      'degli acquisti registrati: non si recupera. Se è ancora usato in un piatto o in una lista della spesa, ' +
      'l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
  });

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsIngId = 'i-1';

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));

    expect(screen.queryByText('Eliminare questo ingrediente?')).not.toBeInTheDocument();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('un ingrediente ancora in uso mostra il motivo del blocco, non un errore Postgres grezzo', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockRejectedValue(
      new IngredienteInUsoError('Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.'),
    );

    render(<IngredienteEditor />);
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(screen.getByRole('button', { name: 'ELIMINA' }));

    expect(
      await screen.findByText(
        'Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.',
      ),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith('/piatti/d-1');
    // Il dialogo si chiude e il messaggio resta visibile nella pagina, stessa
    // convenzione già usata per l'eliminazione del piatto.
    expect(screen.queryByText('Eliminare questo ingrediente?')).not.toBeInTheDocument();
  });
});
