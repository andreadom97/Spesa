import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlot, MealSlotDef, PantryState } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';
import type { ListaSalvata } from '@/data/lista';
import { giorniTra, lunediDi, sommaGiorni } from '@/domain/date';
import { etichettaScadenza } from '@/domain/scadenza';

vi.mock('@/data/settimana', () => ({
  leggiSettimana: vi.fn(),
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
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
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

import { leggiSettimana, aggiornaSlot } from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiDispensa } from '@/data/dispensa';
import { leggiListe } from '@/data/lista';
import ScegliPiatto from '../page';

const DATA = '2026-08-27';

const SD_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) };
const SD_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: Array(7).fill(false) };
const SLOT_DEFS = [SD_COLAZIONE, SD_CENA];

const ING_POLLO: Ingredient = {
  id: 'i-1', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null,
};
const ING_RISO: Ingredient = {
  id: 'i-2', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null,
};
const ING_YOGURT: Ingredient = {
  id: 'i-3', nome: 'Yogurt', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500, prezzoConfezione: null,
};
// Ingredienti delle due opzioni del componente di prova (Task 9): Ricotta
// coperta dalla dispensa mockata (chip IN CASA sul default), Noci no
// (nessuna riga in leggiDispensa → residuo 0 → costa una confezione).
const ING_RICOTTA: Ingredient = {
  id: 'i-4', nome: 'Ricotta', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 250, prezzoConfezione: null,
};
const ING_NOCI: Ingredient = {
  id: 'i-5', nome: 'Noci', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200, prezzoConfezione: null,
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

const SLOT_CENA: MealSlot = { id: 'slot-cena', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
const SLOT_COLAZIONE: MealSlot = { id: 'slot-colazione', data: DATA, slotDefId: 'sd-1', stato: 'casa', dishId: 'd-0', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };

const SETTIMANA_BASE: SettimanaCorrente = {
  id: 'week-1', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_COLAZIONE, SLOT_CENA],
};

// Slot 'saltato'/'sostituito' (fix round 2, Important): il flusso "Ho
// mangiato un altro piatto" dal FoglioAzioniPasto arriva qui con lo slot già
// spuntato da 'checkin'. Scegliere un piatto deve riportarlo a 'casa' con
// fonte 'correzione', o il sostituto non verrebbe mai addebitato.
const SLOT_CENA_SALTATO: MealSlot = { id: 'slot-cena', data: DATA, slotDefId: 'sd-3', stato: 'saltato', dishId: 'd-1', fonteStato: 'checkin', scelte: {}, porzioniPreparate: 0, daPronti: false };
const SLOT_CENA_SOSTITUITO: MealSlot = { id: 'slot-cena', data: DATA, slotDefId: 'sd-3', stato: 'sostituito', dishId: 'd-1', fonteStato: 'checkin', scelte: {}, porzioniPreparate: 0, daPronti: false };
const SETTIMANA_SALTATA: SettimanaCorrente = {
  id: 'week-1', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_COLAZIONE, SLOT_CENA_SALTATO],
};
const SETTIMANA_SOSTITUITA: SettimanaCorrente = {
  id: 'week-1', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_COLAZIONE, SLOT_CENA_SOSTITUITO],
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

const SLOT_TORTA: MealSlot = { id: 'slot-torta', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-3', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
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
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 30, prezzoConfezione: null,
};
const ING_BASILICO: Ingredient = {
  id: 'i-7', nome: 'Basilico', unitaBase: 'g', area: 'ortofrutta',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 30, prezzoConfezione: null,
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
const SLOT_TORTA_DUE: MealSlot = { id: 'slot-torta-due', data: DATA, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-4', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
const SETTIMANA_TORTA_DUE: SettimanaCorrente = {
  id: 'week-3', dataInizio: '2026-08-24', stato: 'bozza', slots: [SLOT_TORTA_DUE],
};

// Ordine deliberatamente diverso da ORDINE_AREE_DEFAULT (che metterebbe
// macelleria prima di cereali): prova che i quadratini seguono l'ordine
// scelto dall'utente in Impostazioni, non l'ordine fisso di aree.ts.
const ORDINE_AREE_TEST = ['surgelati', 'dispensa', 'cereali', 'latticini', 'macelleria', 'ortofrutta'] as const;

function mockCarico() {
  vi.mocked(leggiSettimana).mockResolvedValue(SETTIMANA_BASE);
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

// Varianti di mockCarico() con lo slot cena già 'saltato'/'sostituito'.
function mockCaricoSaltato() {
  vi.mocked(leggiSettimana).mockResolvedValue(SETTIMANA_SALTATA);
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
function mockCaricoSostituito() {
  vi.mocked(leggiSettimana).mockResolvedValue(SETTIMANA_SOSTITUITA);
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
  vi.mocked(leggiSettimana).mockResolvedValue(SETTIMANA_TORTA);
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
  vi.mocked(leggiSettimana).mockResolvedValue(SETTIMANA_TORTA_DUE);
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
    // Nessuna lista salvata: i test di questo blocco sono nati prima del
    // conflitto di residuo e non devono cambiare per la lettura in più.
    vi.mocked(leggiListe).mockResolvedValue(null);
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

  it('selezionare un altro piatto attiva conferma, cambia la nota, e la conferma scrive solo dishId sullo slot (slot "casa": nessun campo stato nel patch)', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByText('Merluzzo e piselli'));

    expect(
      screen.getByText('Cambia solo Cena di giovedì. Gli altri giorni restano come sono. Se la lista è già fatta, quello che manca entra nel top-up quando la riapri.'),
    ).toBeInTheDocument();
    const bottone = screen.getByText('SOSTITUISCI');
    expect(bottone).not.toBeDisabled();

    fireEvent.click(bottone);

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith('slot-cena', { dishId: 'd-2' }, 'correzione'),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });

  // Fix round 2 (Important): il flusso "Ho mangiato un altro piatto" dal
  // FoglioAzioniPasto arriva su uno slot già 'saltato'/'sostituito' (fonte
  // 'checkin'). Senza riportare lo stato a 'casa' nel patch, consumoDopo in
  // aggiornaSlot resta vuoto e il sostituto non viene mai addebitato.
  it('slot già "saltato": la conferma riporta lo stato a casa con fonte correzione', async () => {
    mockCaricoSaltato();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByText('Merluzzo e piselli'));
    fireEvent.click(screen.getByText('SOSTITUISCI'));

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith('slot-cena', { dishId: 'd-2', stato: 'casa' }, 'correzione'),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });

  it('slot già "sostituito": la conferma riporta lo stato a casa con fonte correzione', async () => {
    mockCaricoSostituito();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<ScegliPiatto />);
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByText('Merluzzo e piselli'));
    fireEvent.click(screen.getByText('SOSTITUISCI'));

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith('slot-cena', { dishId: 'd-2', stato: 'casa' }, 'correzione'),
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

// ── Conflitto di residuo (spec scadenza-fresco §3.3) ────────────────────────
//
// `oggi` nella schermata è l'orologio reale, e `conflittiSostituzione` conta
// in `pastiDopo` solo gli slot con data ≥ oggi: la settimana di questi test
// è costruita intorno all'oggi vero, non intorno alla DATA fissa di sopra.
// L'ingrediente è porzionabile e NON deperibile, così il residuo non decade
// qualunque sia il giorno in cui gira la suite.

const OGGI = new Date().toISOString().slice(0, 10);
const LUNEDI_OGGI = lunediDi(OGGI);
// L'altro pasto che usa l'ingrediente: domani, se è ancora in questa
// settimana; di domenica, la colazione di oggi (uno slotDef diverso, stesso giorno).
const DATA_ALTRO = giorniTra(LUNEDI_OGGI, OGGI) < 6 ? sommaGiorni(OGGI, 1) : OGGI;
const SD_ALTRO: MealSlotDef = DATA_ALTRO === OGGI ? SD_COLAZIONE : SD_CENA;

const ING_YOGURT_GRECO: Ingredient = {
  id: 'i-8', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null,
};

/** Il piatto attuale dello slot: non usa lo yogurt. */
const DISH_SENZA_YOGURT: Dish = {
  id: 'd-10', nome: 'Merluzzo al vapore', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
  componenti: [],
};
/** Il candidato: 400 g di yogurt. */
const DISH_YOGURT_400: Dish = {
  id: 'd-11', nome: 'Pollo allo yogurt', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-8', quantita: 400, unita: 'g' }],
  componenti: [],
};
/** Il piatto attuale nel caso a settimana chiusa: 200 g di yogurt da stornare. */
const DISH_YOGURT_200: Dish = {
  id: 'd-12', nome: 'Yogurt e miele', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-8', quantita: 200, unita: 'g' }],
  componenti: [],
};
/** L'altro pasto della settimana che usa lo yogurt: 350 g. */
const DISH_YOGURT_350: Dish = {
  id: 'd-13', nome: 'Tzatziki', slotDefId: SD_ALTRO.id, fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-8', quantita: 350, unita: 'g' }],
  componenti: [],
};

const SLOT_OGGI_CENA: MealSlot = { id: 'slot-oggi-cena', data: OGGI, slotDefId: 'sd-3', stato: 'casa', dishId: 'd-10', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
const SLOT_ALTRO: MealSlot = { id: 'slot-altro', data: DATA_ALTRO, slotDefId: SD_ALTRO.id, stato: 'casa', dishId: 'd-13', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };

const PANTRY_YOGURT_100: PantryState = {
  ingredientId: 'i-8', residuo: 100, ultimoAcquisto: OGGI, giorniStimati: 90, congelato: false, ultimoCheck: null,
};

/**
 * Una voce di lista da 500 g di yogurt, congelata con residuo 100 alla
 * generazione: a settimana confermata il disponibile è 100 + 500 = 600,
 * qualunque cosa dica la dispensa oggi.
 */
const LISTA_YOGURT_500: ListaSalvata = {
  base: [{
    area: 'latticini',
    voci: [{
      id: 'item-1', ingredientId: 'i-8', nome: 'Yogurt greco', area: 'latticini', unita: 'g',
      fabbisogno: 350, residuo: 100, confezioni: 1, quantitaTotale: 500, spuntato: false, origine: 'piano', mostraDettaglio: true,
    }],
    controlli: [],
  }],
  topup: [],
  baseListaId: 'lista-base',
  topupListaId: 'lista-topup',
};

function mockCaricoConflitto(stato: SettimanaCorrente['stato']) {
  vi.mocked(leggiSettimana).mockResolvedValue({
    id: 'week-conflitto', dataInizio: LUNEDI_OGGI, stato, slots: [SLOT_OGGI_CENA, SLOT_ALTRO],
  });
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([DISH_SENZA_YOGURT, DISH_YOGURT_400, DISH_YOGURT_350]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RISO, ING_YOGURT_GRECO]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiDispensa).mockResolvedValue([PANTRY_YOGURT_100]);
  vi.mocked(leggiListe).mockResolvedValue(LISTA_YOGURT_500);
}

describe('Conflitto di residuo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock = { data: OGGI, slotDefId: 'sd-3' };
  });

  it('settimana confermata: il candidato che sfora lista più residuo congelato mostra il mancante e il pasto che resterà senza', async () => {
    mockCaricoConflitto('confermata');
    // La dispensa dice 300 (uno storno già passato di lì): non conta, a
    // settimana confermata vale il residuo congelato nella riga di lista.
    vi.mocked(leggiDispensa).mockResolvedValue([{ ...PANTRY_YOGURT_100, residuo: 300 }]);
    render(<ScegliPiatto />);
    await screen.findByText('Merluzzo al vapore');

    expect(screen.queryByText(/non basta/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Pollo allo yogurt'));

    // Fabbisogno dopo = 400 (candidato) + 350 (altro pasto) = 750;
    // disponibile = 100 (residuo congelato nella voce) + 500 (lista) = 600
    // → mancano 150 g. Col residuo vivo (300) sarebbero stati 0: falso.
    expect(
      screen.getByText(`Con questo piatto Yogurt greco non basta: ne mancano 150 g, e serve anche ${etichettaScadenza(DATA_ALTRO, OGGI)} (${SD_ALTRO.nome}).`),
    ).toBeInTheDocument();
    expect(screen.getByText('SOSTITUISCI')).not.toBeDisabled();
  });

  it('settimana bozza: nessun conflitto, mai', async () => {
    mockCaricoConflitto('bozza');
    render(<ScegliPiatto />);
    await screen.findByText('Merluzzo al vapore');

    fireEvent.click(screen.getByText('Pollo allo yogurt'));

    expect(screen.queryByText(/non basta/)).not.toBeInTheDocument();
  });

  it('col piatto originale selezionato non compare nessun conflitto', async () => {
    mockCaricoConflitto('confermata');
    render(<ScegliPiatto />);
    await screen.findByText('Merluzzo al vapore');

    fireEvent.click(screen.getByText('Merluzzo al vapore'));

    expect(screen.queryByText(/non basta/)).not.toBeInTheDocument();
  });

  it('lettura della lista fallita: schermata normale, nessun conflitto, SOSTITUISCI resta abilitato', async () => {
    mockCaricoConflitto('confermata');
    vi.mocked(leggiListe).mockRejectedValue(new Error('rete assente'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<ScegliPiatto />);
      await screen.findByText('Merluzzo al vapore');

      fireEvent.click(screen.getByText('Pollo allo yogurt'));

      expect(screen.queryByText(/non basta/)).not.toBeInTheDocument();
      expect(screen.getByText('SOSTITUISCI')).not.toBeDisabled();
      expect(errore).toHaveBeenCalledWith('scegli: lettura della lista fallita.', expect.any(Error));
    } finally {
      errore.mockRestore();
    }
  });

  it('settimana chiusa: lo storno restituisce il piatto attuale, il mancante è il resto, senza coda se nessun altro pasto lo usa', async () => {
    mockCaricoConflitto('chiusa');
    vi.mocked(leggiSettimana).mockResolvedValue({
      id: 'week-conflitto', dataInizio: LUNEDI_OGGI, stato: 'chiusa',
      slots: [{ ...SLOT_OGGI_CENA, dishId: 'd-12' }],
    });
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_YOGURT_200, DISH_YOGURT_400]);
    vi.mocked(leggiDispensa).mockResolvedValue([{ ...PANTRY_YOGURT_100, residuo: 50 }]);
    render(<ScegliPiatto />);
    await screen.findByText('Yogurt e miele');

    fireEvent.click(screen.getByText('Pollo allo yogurt'));

    // Disponibile = 50 (residuo vivo: qui conta lui, non il 100 congelato
    // nella voce) + 200 (storno del piatto attuale) = 250; fabbisogno = 400
    // → mancano 150 g. Nessun altro slot: niente coda.
    expect(screen.getByText('Con questo piatto Yogurt greco non basta: ne mancano 150 g.')).toBeInTheDocument();
  });
});
