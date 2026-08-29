import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlot, MealSlotDef, PantryState } from '@/domain/types';
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
vi.mock('@/data/dispensa', () => ({
  leggiDispensa: vi.fn(),
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
import { leggiDispensa } from '@/data/dispensa';
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
// Ingredienti delle due opzioni del componente di prova (Task 9): Ricotta
// coperta dalla dispensa mockata (chip IN CASA sul default), Noci no
// (nessuna riga in leggiDispensa → residuo 0 → costa una confezione).
const ING_RICOTTA: Ingredient = {
  id: 'i-4', nome: 'Ricotta', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 250,
};
const ING_NOCI: Ingredient = {
  id: 'i-5', nome: 'Noci', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200,
};

// Piatto di colazione: non deve mai comparire nella lista dello slot cena.
const DISH_COLAZIONE: Dish = {
  id: 'd-0', nome: 'Yogurt e frutta', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-3', quantita: 150, unita: 'g' }],
  componenti: [],
};
const DISH_POLLO: Dish = {
  id: 'd-1', nome: 'Pollo e riso', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 200, unita: 'g' }, { ingredientId: 'i-2', quantita: 80, unita: 'g' }],
  componenti: [],
};
const DISH_MERLUZZO: Dish = {
  id: 'd-2', nome: 'Merluzzo e piselli', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
  componenti: [],
};

const SLOT_CENA: MealSlot = { id: 'slot-cena', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {} };
const SLOT_COLAZIONE: MealSlot = { id: 'slot-colazione', data: DATA, slotDefId: 'sd-1', stato: 'casa', dishId: 'd-0', fonteStato: 'default', scelte: {} };

const SETTIMANA_BASE: SettimanaCorrente = {
  id: 'week-1', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_COLAZIONE, SLOT_CENA],
};

// Piatto con un componente a due opzioni, per i test del Task 9 (ciclo al
// tap, chip IN CASA). Nessun ingrediente fisso: quello che conta qui sono le
// righe delle opzioni.
const DISH_TORTA: Dish = {
  id: 'd-3', nome: 'Torta salata', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [
    {
      id: 'c-farcitura',
      nome: 'Farcitura',
      opzioni: [
        { id: 'o-ricotta', righe: [{ ingredientId: 'i-4', quantita: 50, unita: 'g' }] },
        { id: 'o-noci', righe: [{ ingredientId: 'i-5', quantita: 20, unita: 'g' }] },
      ],
    },
  ],
};

const SLOT_TORTA: MealSlot = { id: 'slot-torta', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-3', fonteStato: 'default', scelte: {} };
const SETTIMANA_TORTA: SettimanaCorrente = {
  id: 'week-2', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_TORTA],
};

// Nessuna riga per Noci: residuo 0, la conta costerà sempre una confezione.
const PANTRY_RICOTTA_COPERTA: PantryState = {
  ingredientId: 'i-4', residuo: 100, ultimoAcquisto: null, giorniStimati: 90, congelato: false, ultimoCheck: null,
};

// Piatto con DUE componenti (fix round 1, finding ALTA): serve a provare che
// un ciclo andata-e-ritorno su un componente (che lascia una entry in
// scelteCorrenti identica all'originale) non viene mandato come scelta
// manuale, mentre un cambio vero sull'altro componente sì.
const ING_PREZZEMOLO: Ingredient = {
  id: 'i-6', nome: 'Prezzemolo', unitaBase: 'g', area: 'ortofrutta',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 30,
};
const ING_BASILICO: Ingredient = {
  id: 'i-7', nome: 'Basilico', unitaBase: 'g', area: 'ortofrutta',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 30,
};
const DISH_TORTA_DUE: Dish = {
  id: 'd-4', nome: 'Torta salata doppia', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [
    {
      id: 'c-farcitura2',
      nome: 'Farcitura',
      opzioni: [
        { id: 'o-ricotta2', righe: [{ ingredientId: 'i-4', quantita: 50, unita: 'g' }] },
        { id: 'o-noci2', righe: [{ ingredientId: 'i-5', quantita: 20, unita: 'g' }] },
      ],
    },
    {
      id: 'c-guarnizione',
      nome: 'Guarnizione',
      opzioni: [
        { id: 'o-prezzemolo', righe: [{ ingredientId: 'i-6', quantita: 5, unita: 'g' }] },
        { id: 'o-basilico', righe: [{ ingredientId: 'i-7', quantita: 5, unita: 'g' }] },
      ],
    },
  ],
};
const SLOT_TORTA_DUE: MealSlot = { id: 'slot-torta-due', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-4', fonteStato: 'default', scelte: {} };
const SETTIMANA_TORTA_DUE: SettimanaCorrente = {
  id: 'week-3', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_TORTA_DUE],
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
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiDispensa).mockResolvedValue([]);
}

// Variante di mockCarico() per i test del componente a scelta: un solo
// piatto (Torta salata), la sua dispensa mockata copre solo Ricotta.
function mockCaricoConComponenti() {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(SETTIMANA_TORTA);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([DISH_TORTA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RICOTTA, ING_NOCI]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiDispensa).mockResolvedValue([PANTRY_RICOTTA_COPERTA]);
}

// Variante con un piatto a DUE componenti, per il test del ciclo no-op (fix round 1).
function mockCaricoConDueComponenti() {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(SETTIMANA_TORTA_DUE);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([DISH_TORTA_DUE]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RICOTTA, ING_NOCI, ING_PREZZEMOLO, ING_BASILICO]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiDispensa).mockResolvedValue([PANTRY_RICOTTA_COPERTA]);
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

  it('un piatto con componente a due opzioni mostra la riga del componente col nome dell\'opzione di default', async () => {
    mockCaricoConComponenti();
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata');

    expect(screen.getByText('FARCITURA')).toBeInTheDocument();
    expect(screen.getByText('Ricotta')).toBeInTheDocument();
  });

  it('il tap sul componente cicla alla seconda opzione e abilita il bottone SOSTITUISCI', async () => {
    mockCaricoConComponenti();
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata');

    const bottone = screen.getByText('SOSTITUISCI');
    expect(bottone).toBeDisabled();

    fireEvent.click(screen.getByText('Ricotta'));

    expect(screen.getByText('Noci')).toBeInTheDocument();
    expect(bottone).not.toBeDisabled();
  });

  it('il chip IN CASA compare quando la dispensa mockata copre l\'opzione corrente, sparisce quando non la copre', async () => {
    mockCaricoConComponenti();
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata');

    expect(screen.getByText('IN CASA')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ricotta'));
    expect(screen.queryByText('IN CASA')).not.toBeInTheDocument();
  });

  it('confermare dopo aver toccato un componente salva il dishId invariato e la scelta manuale del componente', async () => {
    mockCaricoConComponenti();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata');

    fireEvent.click(screen.getByText('Ricotta'));
    fireEvent.click(screen.getByText('SOSTITUISCI'));

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith(
        'slot-torta',
        { dishId: 'd-3', scelte: { 'c-farcitura': { opzioneId: 'o-noci', fonte: 'manuale' } } },
        'correzione',
      ),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });

  it('un ciclo andata-e-ritorno su un componente non lo manda come scelta manuale, un cambio vero su un altro sì', async () => {
    mockCaricoConDueComponenti();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata doppia');

    // Farcitura: Ricotta (default) -> Noci -> di nuovo Ricotta. Torna
    // esattamente all'originale: non deve comparire nel patch.
    fireEvent.click(screen.getByText('Ricotta'));
    fireEvent.click(screen.getByText('Noci'));
    expect(screen.getByText('Ricotta')).toBeInTheDocument();

    // Guarnizione: Prezzemolo (default) -> Basilico. Cambio vero.
    fireEvent.click(screen.getByText('Prezzemolo'));
    expect(screen.getByText('Basilico')).toBeInTheDocument();

    fireEvent.click(screen.getByText('SOSTITUISCI'));

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith(
        'slot-torta-due',
        { dishId: 'd-4', scelte: { 'c-guarnizione': { opzioneId: 'o-basilico', fonte: 'manuale' } } },
        'correzione',
      ),
    );
  });

  it('la riga del componente ha un aria-label che dice cosa cambia e qual è l\'opzione corrente', async () => {
    mockCaricoConComponenti();
    render(<ScegliPiatto />);
    await screen.findByText('Torta salata');

    expect(screen.getByLabelText('Cambia Farcitura: ora Ricotta')).toBeInTheDocument();
  });
});
