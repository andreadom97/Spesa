import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlot, MealSlotDef } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';

vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
  aggiornaSlot: vi.fn(),
}));
vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

const push = vi.fn();
// La data scelta è un giovedì (2026-08-27): verifica sia l'etichetta header
// ("GIOVEDÌ 27 · CENA") sia il giorno minuscolo nella nota ("cena di
// giovedì"), senza dipendere dall'orologio di sistema.
let paramsMock = { data: '2026-08-27', slotDefId: 'sd-3' };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => paramsMock,
}));

import { leggiSettimanaCorrente, aggiornaSlot } from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import ScegliPiatto from '../page';

const DATA = '2026-08-27';

const SD_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) };
const SD_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: Array(7).fill(false) };
const SLOT_DEFS = [SD_COLAZIONE, SD_CENA];

const ING_POLLO: Ingredient = {
  id: 'i-1', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000,
};
const ING_RISO: Ingredient = {
  id: 'i-2', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000,
};
const ING_YOGURT: Ingredient = {
  id: 'i-3', nome: 'Yogurt', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500,
};

// Piatto di colazione: non deve mai comparire nella lista dello slot cena.
const DISH_COLAZIONE: Dish = {
  id: 'd-0', nome: 'Yogurt e frutta', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  ingredienti: [{ ingredientId: 'i-3', quantita: 150, unita: 'g' }],
};
const DISH_POLLO: Dish = {
  id: 'd-1', nome: 'Pollo e riso', slotDefId: 'sd-3', fonte: 'proprio', attivo: true,
  ingredienti: [{ ingredientId: 'i-1', quantita: 200, unita: 'g' }, { ingredientId: 'i-2', quantita: 80, unita: 'g' }],
};
const DISH_MERLUZZO: Dish = {
  id: 'd-2', nome: 'Merluzzo e piselli', slotDefId: 'sd-3', fonte: 'proprio', attivo: true,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
};

const SLOT_CENA: MealSlot = { id: 'slot-cena', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-1', fonteStato: 'default' };
const SLOT_COLAZIONE: MealSlot = { id: 'slot-colazione', data: DATA, slotDefId: 'sd-1', stato: 'casa', dishId: 'd-0', fonteStato: 'default' };

const SETTIMANA_BASE: SettimanaCorrente = {
  id: 'week-1', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_COLAZIONE, SLOT_CENA],
};

// Ordine deliberatamente diverso da ORDINE_AREE_DEFAULT (che metterebbe
// macelleria prima di cereali): prova che i quadratini seguono l'ordine
// scelto dall'utente in Impostazioni, non l'ordine fisso di aree.ts.
const ORDINE_AREE_TEST = ['surgelati', 'dispensa', 'cereali', 'latticini', 'macelleria', 'ortofrutta'] as const;

function mockCarico() {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(SETTIMANA_BASE);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_POLLO, DISH_MERLUZZO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_POLLO, ING_RISO, ING_YOGURT]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
  });
}

describe('Scegli il piatto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock = { data: DATA, slotDefId: 'sd-3' };
  });

  it('mostra solo i piatti attivi dello slot corrente, non quelli di altri pasti', async () => {
    mockCarico();
    render(<ScegliPiatto />);

    expect(await screen.findByText('Pollo e riso')).toBeInTheDocument();
    expect(screen.getByText('Merluzzo e piselli')).toBeInTheDocument();
    expect(screen.queryByText('Yogurt e frutta')).not.toBeInTheDocument();
  });

  it('header ed etichetta usano il giorno e il pasto reali', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    expect(screen.getByText('GIOVEDÌ 27 · CENA')).toBeInTheDocument();
  });

  it('il piatto assegnato allo slot mostra il badge "ORA IN PROGRAMMA" ed è selezionato', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    expect(screen.getByText('ORA IN PROGRAMMA')).toBeInTheDocument();
    const rigaPollo = screen.getByText('Pollo e riso').closest('button');
    expect(rigaPollo).toHaveAttribute('aria-pressed', 'true');
  });

  it('la nota, senza selezione cambiata, spiega che vale solo per quel pasto e giorno', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    expect(
      screen.getByText('Tocca un piatto per sostituire Cena di giovedì. Vale solo per quel giorno, non cambia il piatto nel repertorio.'),
    ).toBeInTheDocument();
  });

  it('i quadratini delle aree seguono l\'ordine dell\'utente (ordineAree), non l\'ordine fisso di default', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    const nomePiatto = await screen.findByText('Pollo e riso');

    // Pollo e riso tocca macelleria (i-1) e cereali (i-2). Con
    // ORDINE_AREE_TEST cereali viene prima di macelleria: l'ordine di
    // default (aree.ts) li metterebbe nell'ordine opposto.
    const riga = nomePiatto.closest('button') as HTMLElement;
    const quadratini = riga.querySelectorAll('[data-area]');
    expect(Array.from(quadratini).map((el) => el.getAttribute('data-area'))).toEqual(['cereali', 'macelleria']);
  });

  it('il pulsante di conferma è disattivato finché non si sceglie un piatto diverso da quello attuale', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    const bottone = screen.getByText('SOSTITUISCI');
    expect(bottone).toBeDisabled();

    // Ri-selezionare lo stesso piatto già assegnato non cambia nulla.
    fireEvent.click(screen.getByText('Pollo e riso'));
    expect(bottone).toBeDisabled();
  });

  it('selezionare un altro piatto attiva conferma, cambia la nota, e la conferma scrive solo dishId sullo slot', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByText('Merluzzo e piselli'));

    expect(
      screen.getByText('Cambia solo Cena di giovedì. Gli altri giorni restano come sono. Se la lista della spesa è già stata creata, non si aggiorna da sola: va rigenerata dalla Settimana.'),
    ).toBeInTheDocument();
    const bottone = screen.getByText('SOSTITUISCI');
    expect(bottone).not.toBeDisabled();

    fireEvent.click(bottone);

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith('slot-cena', { dishId: 'd-2' }, 'correzione'),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });

  it('errore di salvataggio: mostra un messaggio inline e la schermata resta in piedi', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockRejectedValue(new Error('rete assente'));
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByText('Merluzzo e piselli'));
    fireEvent.click(screen.getByText('SOSTITUISCI'));

    expect(await screen.findByText('Non siamo riusciti a salvare la scelta. Riprova.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith('/settimana');
    // La schermata resta in piedi: il piatto è ancora lì, non è stato sostituito da un gate d'errore.
    expect(screen.getByText('Merluzzo e piselli')).toBeInTheDocument();
  });

  it('slot non trovato per data/slotDefId: mostra un errore invece di far crashare la schermata', async () => {
    paramsMock = { data: '2099-01-01', slotDefId: 'sd-3' };
    mockCarico();
    render(<ScegliPiatto />);

    expect(await screen.findByText('Non troviamo questo pasto.')).toBeInTheDocument();
  });

  it('il link "torna" e il bottone "annulla" puntano a /settimana senza chiamare aggiornaSlot', async () => {
    mockCarico();
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    expect(screen.getByLabelText('Torna alla Settimana')).toHaveAttribute('href', '/settimana');
    expect(screen.getByText('ANNULLA')).toHaveAttribute('href', '/settimana');
    expect(aggiornaSlot).not.toHaveBeenCalled();
  });
});
