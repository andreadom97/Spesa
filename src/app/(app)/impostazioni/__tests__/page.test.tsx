import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MealSlotDef } from '@/domain/types';

// pastiDiDefault non è nella lista solo per pigrizia: la pagina reale la usa
// quando leggiSlotDefs() torna vuoto (C3), quindi il mock deve fornirla —
// altrimenti la pagina la chiamerebbe come undefined e il caricamento
// fallirebbe in modo silenzioso, mascherando il test come un bug diverso.
const ASSENZE_VUOTE_MODULO = [false, false, false, false, false, false, false];
vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
  leggiSlotDefs: vi.fn(),
  salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => [
    { id: 'default-colazione', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE_MODULO },
    { id: 'default-spuntino', nome: 'Spuntino', posizione: 1, assenzeAbituali: [false, false, false, false, false, true, true] },
    { id: 'default-pranzo', nome: 'Pranzo', posizione: 2, assenzeAbituali: [true, true, true, true, true, false, false] },
    { id: 'default-cena', nome: 'Cena', posizione: 3, assenzeAbituali: ASSENZE_VUOTE_MODULO },
  ]),
}));

const back = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back, replace: vi.fn() }),
}));

import { leggiImpostazioni, salvaImpostazioni, leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import Impostazioni from '../page';

const ASSENZE_VUOTE = [false, false, false, false, false, false, false];

// Tre pasti (non i quattro cablati nell'artboard): verifica che la schermata
// legga davvero da leggiSlotDefs() e non da un mock interno.
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE_VUOTE };

const ORDINE_AREE_TEST = ['dispensa', 'latticini', 'ortofrutta', 'surgelati', 'cereali', 'macelleria'] as const;

function mockDati(overrides?: { porzioni?: number; pasti?: MealSlotDef[] }) {
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: overrides?.porzioni ?? 1,
    ordineAree: [...ORDINE_AREE_TEST],
  });
  vi.mocked(leggiSlotDefs).mockResolvedValue(overrides?.pasti ?? [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
}

describe('Impostazioni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard', async () => {
    mockDati();
    render(<Impostazioni />);

    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    expect(screen.getByText('3 DI 5')).toBeInTheDocument();
  });

  it('il moltiplicatore porzioni va da 1 a 6: ai limiti i pulsanti sono disattivati', async () => {
    mockDati({ porzioni: 1 });
    render(<Impostazioni />);

    expect(await screen.findByText('1')).toBeInTheDocument();
    const meno = screen.getByLabelText('Diminuisci porzioni');
    const piu = screen.getByLabelText('Aumenta porzioni');
    expect(meno).toBeDisabled();
    expect(piu).not.toBeDisabled();

    fireEvent.click(piu);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    expect(salvaImpostazioni).toHaveBeenCalledWith({ moltiplicatorePorzioni: 2, ordineAree: [...ORDINE_AREE_TEST] });
  });

  it('a 6 porzioni il pulsante + è disattivato e non supera il limite', async () => {
    mockDati({ porzioni: 6 });
    render(<Impostazioni />);

    expect(await screen.findByText('6')).toBeInTheDocument();
    const piu = screen.getByLabelText('Aumenta porzioni');
    expect(piu).toBeDisabled();
    fireEvent.click(piu);
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('se il salvataggio delle porzioni fallisce, torna al valore precedente e mostra un errore', async () => {
    mockDati({ porzioni: 1 });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    render(<Impostazioni />);

    await screen.findByText('1');
    fireEvent.click(screen.getByLabelText('Aumenta porzioni'));

    await waitFor(() => expect(screen.getByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument());
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('sotto il minimo di 3 pasti il pulsante di rimozione è disattivato', async () => {
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA] });
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    expect(screen.getByLabelText('Rimuovi Colazione')).toBeDisabled();
    expect(screen.getByLabelText('Rimuovi Pranzo')).toBeDisabled();
    expect(screen.getByLabelText('Rimuovi Cena')).toBeDisabled();
  });

  it('sopra il minimo la rimozione funziona e salva l’insieme aggiornato', async () => {
    const SLOT_SPUNTINO: MealSlotDef = { id: 'sd-4', nome: 'Spuntino', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA, SLOT_SPUNTINO] });
    render(<Impostazioni />);

    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));

    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, posizione: 0 },
      { ...SLOT_PRANZO, posizione: 1 },
      { ...SLOT_CENA, posizione: 2 },
    ]);
  });

  it('al massimo di 5 pasti il pulsante di aggiunta è disattivato', async () => {
    const pasti: MealSlotDef[] = [
      SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA,
      { id: 'sd-4', nome: 'Spuntino mattina', posizione: 3, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-5', nome: 'Spuntino pomeriggio', posizione: 4, assenzeAbituali: ASSENZE_VUOTE },
    ];
    mockDati({ pasti });
    render(<Impostazioni />);

    await screen.findByText('5 DI 5');
    const aggiungi = screen.getByText('AGGIUNGI PASTO').closest('button');
    expect(aggiungi).toBeDisabled();
    fireEvent.click(aggiungi!);
    expect(salvaSlotDefs).not.toHaveBeenCalled();
  });

  it('aggiunge un pasto sotto il massimo e lo salva con un id generato', async () => {
    mockDati();
    render(<Impostazioni />);

    await screen.findByText('3 DI 5');
    fireEvent.click(screen.getByText('AGGIUNGI PASTO').closest('button')!);

    await waitFor(() => expect(screen.getByText('4 DI 5')).toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato).toHaveLength(4);
    expect(salvato[3].nome).toBe('Nuovo pasto');
    expect(typeof salvato[3].id).toBe('string');
    expect(salvato[3].id.length).toBeGreaterThan(0);
  });

  it('la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva', async () => {
    mockDati();
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    const suColazione = screen.getByLabelText('Sposta Colazione in alto');
    const giuCena = screen.getByLabelText('Sposta Cena in basso');
    expect(suColazione).toBeDisabled();
    expect(giuCena).toBeDisabled();
    // Stesso trattamento visivo delle frecce dell'ordine reparti: dimming al
    // 35% ai limiti, non solo l'attributo disabled — altrimenti lo stesso
    // gesto (freccia su/giù) avrebbe due resti diversi a un tap di distanza.
    expect(suColazione).toHaveStyle({ opacity: '0.35' });
    expect(giuCena).toHaveStyle({ opacity: '0.35' });
    expect(screen.getByLabelText('Sposta Colazione in basso')).toHaveStyle({ opacity: '1' });
    expect(screen.getByLabelText('Sposta Cena in alto')).toHaveStyle({ opacity: '1' });

    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_PRANZO, posizione: 0 },
      { ...SLOT_COLAZIONE, posizione: 1 },
      { ...SLOT_CENA, posizione: 2 },
    ]));
  });

  it('la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px', async () => {
    mockDati();
    render(<Impostazioni />);

    const inputColazione = await screen.findByDisplayValue('Colazione');
    const rigaColazione = inputColazione.closest('div[style*="overflow: hidden"]') as HTMLElement;
    const lunedi = within(rigaColazione).getByLabelText('Lunedì, abitualmente fuori casa');
    expect(lunedi).toHaveStyle({ height: '44px' });
    const pillola = lunedi.firstElementChild as HTMLElement;
    expect(pillola).toHaveStyle({ height: '36px' });
  });

  it('accende una pastiglia del giorno e salva le assenze abituali aggiornate', async () => {
    mockDati();
    render(<Impostazioni />);

    const inputColazione = await screen.findByDisplayValue('Colazione');
    const rigaColazione = inputColazione.closest('div[style*="overflow: hidden"]') as HTMLElement;
    fireEvent.click(within(rigaColazione).getByLabelText('Lunedì, abitualmente fuori casa'));

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, assenzeAbituali: [true, false, false, false, false, false, false] },
      SLOT_PRANZO,
      SLOT_CENA,
    ]));
  });

  it('rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato', async () => {
    mockDati();
    render(<Impostazioni />);

    const input = await screen.findByDisplayValue('Colazione');
    fireEvent.change(input, { target: { value: 'Brunch' } });
    expect(salvaSlotDefs).not.toHaveBeenCalled();

    fireEvent.blur(input);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, nome: 'Brunch' },
      SLOT_PRANZO,
      SLOT_CENA,
    ]));
  });

  // Regressione su C3: un utente nuovo, mai passato da seed.sql, ha
  // leggiSlotDefs() vuoto. Senza un seed automatico qui, il primo "+" in
  // AGGIUNGI PASTO produrrebbe una sola riga, rifiutata dal minimo di 3 di
  // salvaSlotDefs — un vicolo cieco.
  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server', async () => {
    mockDati({ pasti: [] });
    render(<Impostazioni />);

    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.getByText('4 DI 5')).toBeInTheDocument();

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato.map((p) => p.nome)).toEqual(['Colazione', 'Spuntino', 'Pranzo', 'Cena']);
    // Spuntino fuori sabato e domenica, Pranzo fuori lunedì-venerdì: gli
    // stessi valori di supabase/seed.sql, non inventati qui.
    expect(salvato[1].assenzeAbituali).toEqual([false, false, false, false, false, true, true]);
    expect(salvato[2].assenzeAbituali).toEqual([true, true, true, true, true, false, false]);
  });

  it('il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso', async () => {
    mockDati();
    render(<Impostazioni />);

    const link = await screen.findByRole('link', { name: /Ordine dei reparti/ });
    expect(link).toHaveAttribute('href', '/impostazioni/reparti');
    expect(
      within(link).getByText('DISPENSA E CONSERVE · LATTICINI, UOVA E SALUMI · ORTOFRUTTA · SURGELATI · PASTA, RISO E CEREALI · MACELLERIA E PESCHERIA'),
    ).toBeInTheDocument();
  });
});
