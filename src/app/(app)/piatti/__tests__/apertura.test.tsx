// Il contratto dell'apertura (spec fase 7 §B.2): l'editor del Piatto ha un modo solo e si
// apre sempre modificabile, ma aprirlo NON emette scritture (né salvaPiatto né la bozza):
// SALVA resta spento finché niente cambia. Uscire con la freccia non scrive e tratta la
// bozza come la trattava ANNULLA prima della fase 7.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  salvaPiatto: vi.fn(),
  eliminaPiatto: vi.fn(),
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));

// vi.hoisted: push deve essere la STESSA istanza a ogni chiamata di useRouter() (il
// componente lo richiama a ogni render).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let paramsId = 'd-1';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

// Modulo mockato per intero (non solo spiato): verifica strutturale che all'apertura non
// parta nessun salvataggio automatico di bozza — se un effect nascosto la richiamasse a
// ogni render, questi mock lo intercetterebbero.
vi.mock('../[id]/bozza', () => ({
  raccogliIngredienteCreato: vi.fn(() => null),
  riprendiBozza: vi.fn(() => null),
  salvaBozza: vi.fn(),
  scartaBozza: vi.fn(),
}));

import { salvaPiatto, leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { riprendiBozza, salvaBozza, scartaBozza } from '../[id]/bozza';
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';
import Piatto from '../[id]/page';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_PRANZO: MealSlotDef = { id: 'sd-1', nome: 'Pranzo', posizione: 0, assenzeAbituali: ASSENZE };

const ING_RISO: Ingredient = {
  id: 'i-1', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_FARINA: Ingredient = {
  id: 'i-2', nome: 'Farina', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_PANE_INTEGRALE: Ingredient = {
  id: 'i-3', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};

const PIATTO_ESISTENTE: Dish = {
  id: 'd-1',
  nome: 'Riso e pane',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: 2,
  giornoCiclo: 3, // Giovedì
  ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
  componenti: [
    {
      id: 'c-1',
      nome: 'Pane',
      opzioni: [
        { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 50, unita: 'g' }] },
        { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 40, unita: 'g' }] },
      ],
    },
  ],
};

function mockBase(settimaneCiclo = 2) {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_PRANZO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RISO, ING_FARINA, ING_PANE_INTEGRALE]);
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    settimaneCiclo,
    cicloOrigine: '2026-08-24',
    giorniControllo: 90,
  });
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come nei test
// dell'editor dell'ingrediente. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Piatto />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

describe('dettaglio piatto: si apre modificabile, senza scrivere niente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsId = 'd-1';
    vi.mocked(riprendiBozza).mockReturnValue(null);
    slotDock = document.createElement('div');
    document.body.appendChild(slotDock);
    mockBase();
  });

  afterEach(() => {
    slotDock.remove();
    vi.restoreAllMocks();
  });

  it('aprire un piatto esistente mostra il modulo, non emette scritture, e SALVA è spento', async () => {
    rendi();

    expect(await screen.findByDisplayValue('Riso e pane')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MODIFICA' })).toBeNull();
    expect(salva()).toBeDisabled();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(salvaBozza).not.toHaveBeenCalled();
    expect(scartaBozza).not.toHaveBeenCalled();
  });

  it('il modulo mostra pasto, settimana del giro e giorno fisso del piatto caricato', async () => {
    rendi();
    await screen.findByDisplayValue('Riso e pane');

    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Settimana del giro: Settimana 2 del giro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Giorno fisso: Giovedì' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('il modulo mostra gli ingredienti fissi e i componenti con le loro opzioni', async () => {
    rendi();
    await screen.findByDisplayValue('Riso e pane');

    expect(screen.getByText('PER 1 PORZIONE')).toBeInTheDocument();
    expect(screen.getByText('Riso')).toBeInTheDocument();
    const pane = screen.getByRole('region', { name: 'Componente 1' });
    expect(within(pane).getByDisplayValue('Pane')).toBeInTheDocument();
    expect(within(pane).getByText('OPZIONE 1')).toBeInTheDocument();
    expect(within(pane).getByText('Farina')).toBeInTheDocument();
    expect(within(pane).getByText('OPZIONE 2')).toBeInTheDocument();
    expect(within(pane).getByText('Pane integrale')).toBeInTheDocument();
  });

  it('un piatto nuovo apre il modulo vuoto: SALVA spento, niente ELIMINA', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiRepertorio).mockResolvedValue([]);

    rendi();

    expect(await screen.findByPlaceholderText('Dai un nome al piatto')).toHaveValue('');
    expect(salva()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
    expect(salvaBozza).not.toHaveBeenCalled();
  });

  it('una bozza pendente vince sul piatto del server, e SALVA si accende: è lavoro non ancora salvato', async () => {
    vi.mocked(riprendiBozza).mockReturnValue({
      nome: 'Riso e pane, modifica in corso',
      slotDefId: 'sd-1',
      descrizione: '',
      settimanaCiclo: 2,
      giornoCiclo: 3,
      ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
      componenti: [],
    });

    rendi();

    expect(await screen.findByDisplayValue('Riso e pane, modifica in corso')).toBeInTheDocument();
    expect(salva()).toBeEnabled();
    expect(salvaPiatto).not.toHaveBeenCalled();
  });

  it('la freccia torna a /piatti senza chiedere e senza scrivere, e scarta la bozza come ANNULLA', async () => {
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Riso e pane'), { target: { value: 'Nome cambiato per sbaglio' } });

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(scartaBozza).toHaveBeenCalledWith('d-1');
  });

  it('su un piatto nuovo la freccia torna a /piatti senza toccare la bozza, come ANNULLA', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(scartaBozza).not.toHaveBeenCalled();
    expect(salvaPiatto).not.toHaveBeenCalled();
  });

  // Prima della fase 7 `salvando` restava vero dopo un salvataggio andato su un piatto
  // esistente (review finale, finding critico): qui il caso che resta è il fallimento,
  // dopo il quale il secondo SALVA deve ripartire.
  it('un salvataggio fallito: l’errore sopra il Dock, e il secondo SALVA riparte e torna a /piatti', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaPiatto).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('d-1');
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Riso e pane'), { target: { value: 'Riso e pane, seconda' } });

    fireEvent.click(salva());

    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(await within(dock).findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare il piatto. Riprova.');
    expect(push).not.toHaveBeenCalled();
    const secondo = within(dock).getByRole('button', { name: 'SALVA' });
    expect(secondo).toBeEnabled();

    fireEvent.click(secondo);

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
    expect(within(dock).queryByRole('alert')).toBeNull();
  });
});
