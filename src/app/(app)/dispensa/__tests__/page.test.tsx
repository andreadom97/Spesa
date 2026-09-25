import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import type { Dish, Ingredient, LottoPronto, MealSlot, PantryState } from '@/domain/types';
import { giorniTra, lunediDi, sommaGiorni } from '@/domain/date';
import { dataCorta } from '@/domain/dispensa-vista';
import { SlotDockProvider } from '@/components/dock-slot';
import type { SpeechRecognitionLike } from '../useDettatura';

vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn(), salvaIngrediente: vi.fn() }));
vi.mock('@/data/dispensa', () => ({
  leggiDispensa: vi.fn(),
  correggiResiduo: vi.fn(),
  impostaCongelato: vi.fn(),
  impostaScadenza: vi.fn(),
  aggiungiConfezione: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));
vi.mock('@/data/pronti', () => ({
  leggiPronti: vi.fn(),
  correggiLotto: vi.fn(),
  impostaCongelatoLotto: vi.fn(),
  eliminaLotto: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({ leggiSettimanaCorrente: vi.fn() }));
// Il widget AI e la Testata leggono la sessione: qui non serve una rete.
vi.mock('@/data/supabase', () => ({
  client: () => ({ auth: { getSession: vi.fn(), getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }),
}));
// Lo scanner: come in scansione.test.tsx, il finto hook risponde 'fallback'
// e tiene l'`onCodice`, così il test simula una lettura.
let onCodiceCapturato: ((ean: string) => void) | null = null;
vi.mock('@/components/useLettoreCodici', () => ({
  useLettoreCodici: (onCodice: (ean: string) => void) => {
    onCodiceCapturato = onCodice;
    return { modo: 'fallback', videoRef: { current: null } };
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

import { leggiIngredienti, leggiRepertorio, salvaIngrediente } from '@/data/repertorio';
import { aggiungiConfezione, correggiResiduo, impostaCongelato, impostaScadenza, leggiDispensa } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import { correggiLotto, eliminaLotto, impostaCongelatoLotto, leggiPronti } from '@/data/pronti';
import { leggiSettimanaCorrente } from '@/data/settimana';
import Dispensa from '../page';

const OGGI = new Date().toISOString().slice(0, 10);
const EAN_POLLO = '8076800195057';
// Non l'ordine di default: il test vede che i widget seguono le Impostazioni.
const ORDINE = ['cereali', 'ortofrutta', 'macelleria', 'latticini', 'dispensa', 'surgelati'] as const;

function ingrediente(p: Partial<Ingredient> & Pick<Ingredient, 'id' | 'nome' | 'area'>): Ingredient {
  return {
    unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
    ...p,
  };
}

const POLLO = ingrediente({ id: 'pollo', nome: 'Petto di pollo', area: 'macelleria', deperibile: true, formatoConfezione: 300, ean: EAN_POLLO });
const PASTA = ingrediente({ id: 'pasta', nome: 'Pasta', area: 'cereali' });
const BANANE = ingrediente({ id: 'banane', nome: 'Banane', area: 'ortofrutta', unitaBase: 'pz', deperibile: true, formatoConfezione: 3 });
const PANE = ingrediente({ id: 'pane', nome: 'Pane', area: 'cereali' });

function pantry(p: Partial<PantryState> & Pick<PantryState, 'ingredientId'>): PantryState {
  return { residuo: 0, ultimoAcquisto: null, giorniStimati: 90, congelato: false, scadenzaManuale: null, ultimoCheck: null, ...p };
}

const RAGU: Dish = {
  id: 'd-ragu', nome: 'Ragù di lenticchie', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
};

function lotto(p: Partial<LottoPronto> & Pick<LottoPronto, 'id'>): LottoPronto {
  return { dishId: RAGU.id, porzioni: 4, congelato: false, preparataIl: OGGI, mealSlotId: null, ...p };
}

/**
 * Il caso di sempre: pollo in casa (fresco, comprato oggi), pasta in casa,
 * banane finite, pane mai comprato; un lotto di ragù, uno di un piatto
 * cancellato e uno di ragù ormai decaduto.
 */
function mockBase({
  ingredienti = [POLLO, PASTA, BANANE, PANE],
  dispensa = [
    pantry({ ingredientId: 'pollo', residuo: 600, ultimoAcquisto: OGGI }),
    pantry({ ingredientId: 'pasta', residuo: 500, ultimoAcquisto: '2026-09-01' }),
    pantry({ ingredientId: 'banane', residuo: 0, ultimoAcquisto: sommaGiorni(OGGI, -10) }),
  ],
  lotti = [
    lotto({ id: 'lp-1' }),
    lotto({ id: 'lp-2', dishId: 'd-sparito', porzioni: 2, congelato: true, preparataIl: sommaGiorni(OGGI, -5) }),
    lotto({ id: 'lp-3', porzioni: 1, preparataIl: sommaGiorni(OGGI, -10) }),
  ],
}: { ingredienti?: Ingredient[]; dispensa?: PantryState[]; lotti?: LottoPronto[] } = {}) {
  vi.mocked(leggiIngredienti).mockResolvedValue(ingredienti);
  vi.mocked(leggiDispensa).mockResolvedValue(dispensa);
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: [...ORDINE], settimaneCiclo: 1, cicloOrigine: null });
  vi.mocked(leggiPronti).mockResolvedValue(lotti);
  vi.mocked(leggiRepertorio).mockResolvedValue([RAGU]);
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

let slot: HTMLElement;

/** La pagina dentro il Guscio in piccolo: uno slot vero per il Dock, come in dock.test.tsx. */
function monta() {
  return render(
    <SlotDockProvider slot={slot}>
      <Dispensa />
    </SlotDockProvider>,
  );
}

async function montaCaricata() {
  monta();
  await screen.findByRole('button', { name: 'Apri Petto di pollo' });
}

function dock() {
  return screen.queryByRole('region', { name: 'Azione principale' });
}

/** I widget in pagina, per nome, nell'ordine del documento (il Dock escluso). */
function widget(): string[] {
  return screen.getAllByRole('region').map((r) => r.getAttribute('aria-label') ?? '').filter((n) => n !== 'Azione principale');
}

function tessera(nome: string) {
  return screen.getByRole('button', { name: `Apri ${nome}` });
}

function mai(): Promise<never> {
  return new Promise(() => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  onCodiceCapturato = null;
  slot = document.createElement('div');
  document.body.appendChild(slot);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // La cronologia (vedi indietro.test.ts): `pushState` quello di jsdom,
  // osservato; `go` non naviga, così nessun `popstate` in ritardo cade in un
  // altro test. Il gesto indietro lo emette il test con `indietro()`.
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});

/** Il gesto indietro del telefono, o il `popstate` che segue un `go()`. */
function indietro() {
  act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
}

afterEach(() => {
  slot.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
});

describe('Dispensa: gli stati', () => {
  it('caricamento: la luce sui widget vuoti, la ricerca ferma, niente Dock', () => {
    mockBase();
    vi.mocked(leggiIngredienti).mockReturnValue(mai());
    monta();
    expect(screen.getByRole('status', { name: 'Carico la dispensa' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Cerca in dispensa' })).toBeDisabled();
    expect(dock()).not.toBeInTheDocument();
  });

  it('dopo 8 s senza dati: l\'errore con RIPROVA; la risposta tardiva si scarta; RIPROVA rilegge', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    mockBase();
    let rispondi: (v: Ingredient[]) => void = () => {};
    vi.mocked(leggiIngredienti).mockReturnValueOnce(new Promise((r) => { rispondi = r; }));
    monta();

    act(() => { vi.advanceTimersByTime(7999); });
    expect(screen.getByRole('status', { name: 'Carico la dispensa' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('Non riusciamo a caricare la dispensa. Riprova.')).toBeInTheDocument();
    expect(dock()).not.toBeInTheDocument();

    // La risposta arriva dopo il timeout: la pagina resta sull'errore.
    await act(async () => { rispondi([POLLO, PASTA, BANANE, PANE]); });
    expect(screen.getByText('Non riusciamo a caricare la dispensa. Riprova.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apri Petto di pollo' })).not.toBeInTheDocument();

    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(leggiIngredienti).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('button', { name: 'Apri Petto di pollo' })).toBeInTheDocument();
    expect(screen.queryByText('Non riusciamo a caricare la dispensa. Riprova.')).not.toBeInTheDocument();
    expect(dock()).toBeInTheDocument();
  });

  it('una lettura che fallisce: stesso messaggio, niente Dock', async () => {
    mockBase();
    vi.mocked(leggiDispensa).mockRejectedValue(new Error('rete'));
    monta();
    expect(await screen.findByText('Non riusciamo a caricare la dispensa. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RIPROVA' })).toBeInTheDocument();
    expect(dock()).not.toBeInTheDocument();
  });

  it('vuoto: niente in casa né finito e nessun lotto; il Dock e la ricerca restano, e i mai comprati si trovano', async () => {
    mockBase({ ingredienti: [PANE, PASTA], dispensa: [], lotti: [] });
    monta();
    expect(await screen.findByText('Ancora niente in dispensa')).toBeInTheDocument();
    expect(screen.getByText('Si riempie da sé: appena chiudi la prima spesa, qui trovi quello che è rimasto.')).toBeInTheDocument();
    expect(dock()).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Cerca in dispensa' }), { target: { value: 'pane' } });
    expect(tessera('Pane')).toHaveTextContent('Mai comprato');
    expect(screen.queryByText('Ancora niente in dispensa')).not.toBeInTheDocument();
  });
});

describe('Dispensa: i widget', () => {
  it('un widget per area con tessere, nell\'ordine delle Impostazioni, senza contatori; Pronti in fondo', async () => {
    mockBase();
    await montaCaricata();
    expect(widget()).toEqual(['PASTA, RISO E CEREALI', 'ORTOFRUTTA', 'MACELLERIA E PESCHERIA', 'Pronti']);
    expect(screen.queryByText(/\d+ voci/)).not.toBeInTheDocument();

    expect(tessera('Petto di pollo')).toHaveTextContent('600 g');
    expect(tessera('Banane')).toHaveTextContent('Finito');
    // Il mai comprato sta solo fra i risultati della ricerca.
    expect(screen.queryByRole('button', { name: 'Apri Pane' })).not.toBeInTheDocument();
  });

  it('Pronti: solo i lotti utilizzabili, e Piatto eliminato per un piatto che non c\'è più', async () => {
    mockBase();
    await montaCaricata();
    const pronti = screen.getByRole('region', { name: 'Pronti' });
    expect(within(pronti).getAllByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveLength(1);
    expect(within(pronti).getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveTextContent('4 porz.');
    expect(within(pronti).getByRole('button', { name: 'Apri il lotto di Piatto eliminato' })).toHaveTextContent('Congelato');
  });

  it('senza lotti utilizzabili il widget Pronti non c\'è', async () => {
    mockBase({ lotti: [lotto({ id: 'lp-3', preparataIl: sommaGiorni(OGGI, -10) })] });
    await montaCaricata();
    expect(screen.queryByRole('region', { name: 'Pronti' })).not.toBeInTheDocument();
  });

  it('la pillola: una voce dimenticata dice NESSUN PASTO LO USA', async () => {
    // La macelleria ha tre giorni: perché la scadenza cada entro domenica,
    // l'acquisto va spostato indietro se oggi è troppo vicino alla fine.
    const domenica = sommaGiorni(lunediDi(OGGI), 6);
    const acquisto = giorniTra(OGGI, domenica) >= 3 ? OGGI : sommaGiorni(OGGI, -3);
    mockBase({ dispensa: [pantry({ ingredientId: 'pollo', residuo: 600, ultimoAcquisto: acquisto })] });
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({ id: 'w-1', dataInizio: lunediDi(OGGI), stato: 'confermata', slots: [] });
    await montaCaricata();
    expect(tessera('Petto di pollo')).toHaveTextContent('NESSUN PASTO LO USA');

    fireEvent.click(tessera('Petto di pollo'));
    expect(within(screen.getByRole('dialog', { name: 'Petto di pollo' })).getByText('Nessun pasto in programma lo usa prima che scada.')).toBeInTheDocument();
  });

  it('una scadenza dopo la domenica corrente: il piano di questa settimana non dice niente, resta la data', async () => {
    // Stessa settimana senza pasti, ma la data a mano cade lunedì prossimo:
    // l'avviso c'è (nessun uso in tempo), la pillola dimenticata no.
    const lunediProssimo = sommaGiorni(lunediDi(OGGI), 7);
    mockBase({ dispensa: [pantry({ ingredientId: 'pollo', residuo: 600, ultimoAcquisto: OGGI, scadenzaManuale: lunediProssimo })] });
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({ id: 'w-1', dataInizio: lunediDi(OGGI), stato: 'confermata', slots: [] });
    await montaCaricata();
    expect(tessera('Petto di pollo')).not.toHaveTextContent('NESSUN PASTO LO USA');
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(lunediProssimo)}`);

    fireEvent.click(tessera('Petto di pollo'));
    expect(screen.queryByText('Nessun pasto in programma lo usa prima che scada.')).not.toBeInTheDocument();
  });

  it('la pillola: una scadenza, e un fresco troppo vecchio', async () => {
    mockBase({
      dispensa: [
        pantry({ ingredientId: 'pollo', residuo: 600, ultimoAcquisto: OGGI }),
        pantry({ ingredientId: 'banane', residuo: 2, ultimoAcquisto: sommaGiorni(OGGI, -30) }),
        pantry({ ingredientId: 'pasta', residuo: 500, ultimoAcquisto: sommaGiorni(OGGI, -30) }),
      ],
    });
    await montaCaricata();
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(sommaGiorni(OGGI, 3))}`);
    expect(tessera('Banane')).toHaveTextContent('FORSE NON PIÙ BUONO');
    expect(tessera('Banane')).not.toHaveTextContent('Scade');
    // Un non deperibile non scade: nessuna pillola.
    expect(tessera('Pasta')).toHaveTextContent(/^500 gPasta$/);
  });
});

describe('Dispensa: la ricerca', () => {
  it('filtra widget e tessere, mostra i mai comprati e il contatore; la X torna alla pagina', async () => {
    mockBase();
    await montaCaricata();
    const campo = screen.getByRole('textbox', { name: 'Cerca in dispensa' });
    fireEvent.change(campo, { target: { value: 'pa' } });

    expect(widget()).toEqual(['PASTA, RISO E CEREALI']);
    expect(tessera('Pasta')).toBeInTheDocument();
    expect(tessera('Pane')).toHaveTextContent('Mai comprato');
    expect(screen.queryByRole('button', { name: 'Apri Petto di pollo' })).not.toBeInTheDocument();
    expect(screen.getByText('2 risultati')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Svuota la ricerca' }));
    expect(campo).toHaveValue('');
    expect(campo).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Apri Pane' })).not.toBeInTheDocument();
    expect(tessera('Petto di pollo')).toBeInTheDocument();
    expect(screen.queryByText(/risultat/)).not.toBeInTheDocument();
  });

  it('trova i lotti per nome del piatto, col singolare nel contatore', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cerca in dispensa' }), { target: { value: 'lentic' } });
    expect(widget()).toEqual(['Pronti']);
    expect(screen.getByText('1 risultato')).toBeInTheDocument();
  });

  it('nessun risultato: la scheda Crea, che apre Nuovo ingrediente col nome della query', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cerca in dispensa' }), { target: { value: ' zenzero ' } });

    expect(screen.getByText('Nessun ingrediente si chiama «zenzero»')).toBeInTheDocument();
    expect(screen.getByText('Crealo ora: entra fra gli ingredienti e da qui lo segni in casa.')).toBeInTheDocument();
    expect(screen.queryByText(/risultat/)).not.toBeInTheDocument();
    expect(widget()).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'CREA «ZENZERO»' }));
    const foglio = screen.getByRole('dialog', { name: 'Nuovo ingrediente' });
    expect(within(foglio).getByRole('textbox', { name: 'Nome' })).toHaveValue('zenzero');
  });
});

describe('Dispensa: il dettaglio', () => {
  it('il tocco sulla tessera apre il dettaglio; FINITO scrive 0 col residuo di prima e la tessera diventa Finito', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(tessera('Petto di pollo'));
    const foglio = screen.getByRole('dialog', { name: 'Petto di pollo' });
    fireEvent.click(within(foglio).getByRole('button', { name: 'Petto di pollo: segna finito' }));

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('pollo', 0, 600));
    expect(tessera('Petto di pollo')).toHaveTextContent('Finito');
    await waitFor(() => expect(within(foglio).getByRole('button', { name: 'Petto di pollo: segna finito' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('se la scrittura fallisce la tessera torna com\'era e il foglio lo dice', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockRejectedValue(new Error('rete'));
    await montaCaricata();

    fireEvent.click(tessera('Petto di pollo'));
    fireEvent.click(screen.getByRole('button', { name: 'Petto di pollo: segna finito' }));

    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(tessera('Petto di pollo')).toHaveTextContent('600 g');
  });

  it('SÌ su una finita scrive una confezione, da 0', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(tessera('Banane'));
    fireEvent.click(screen.getByRole('button', { name: 'Banane: segna in casa' }));

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('banane', 3, 0));
    expect(tessera('Banane')).toHaveTextContent('3 pz');
  });

  it('il residuo si salva con SALVA; il mai comprato con un residuo entra in pagina', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.change(screen.getByRole('textbox', { name: 'Cerca in dispensa' }), { target: { value: 'pane' } });
    fireEvent.click(tessera('Pane'));
    const foglio = screen.getByRole('dialog', { name: 'Pane' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Residuo di Pane' }), { target: { value: '250' } });
    fireEvent.click(within(foglio).getByRole('button', { name: 'SALVA' }));
    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('pane', 250, 0));

    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi il foglio' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Svuota la ricerca' }));
    expect(tessera('Pane')).toHaveTextContent('250 g');
  });

  it('SALVA del residuo che fallisce: il campo tiene il numero tentato, RIPROVA è premibile e lo rimanda', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(undefined);
    await montaCaricata();

    fireEvent.click(tessera('Petto di pollo'));
    const foglio = screen.getByRole('dialog', { name: 'Petto di pollo' });
    const campo = within(foglio).getByRole('textbox', { name: 'Residuo di Petto di pollo' });
    fireEvent.change(campo, { target: { value: '250' } });
    fireEvent.click(within(foglio).getByRole('button', { name: 'SALVA' }));

    // La pagina ha già fatto l'ottimistico (250) e il ritorno a prima (600).
    const riprova = await within(foglio).findByRole('button', { name: 'RIPROVA' });
    expect(tessera('Petto di pollo')).toHaveTextContent('600 g');
    expect(campo).toHaveValue('250');
    expect(riprova).not.toBeDisabled();

    fireEvent.click(riprova);
    await waitFor(() => expect(correggiResiduo).toHaveBeenLastCalledWith('pollo', 250, 600));
    expect(correggiResiduo).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(within(foglio).getByRole('button', { name: 'SALVA' })).toBeDisabled());
    expect(campo).toHaveValue('250');
    expect(tessera('Petto di pollo')).toHaveTextContent('250 g');
  });

  it('RIPROVA acceso, poi FINITO: il campo segue lo 0, RIPROVA sparisce e il numero tentato non si scrive più come entrata', async () => {
    mockBase();
    vi.mocked(correggiResiduo).mockRejectedValueOnce(new Error('rete')).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(tessera('Petto di pollo'));
    const foglio = screen.getByRole('dialog', { name: 'Petto di pollo' });
    const campo = within(foglio).getByRole('textbox', { name: 'Residuo di Petto di pollo' });
    fireEvent.change(campo, { target: { value: '250' } });
    fireEvent.click(within(foglio).getByRole('button', { name: 'SALVA' }));
    await within(foglio).findByRole('button', { name: 'RIPROVA' });

    fireEvent.click(within(foglio).getByRole('button', { name: 'Petto di pollo: segna finito' }));
    await waitFor(() => expect(correggiResiduo).toHaveBeenLastCalledWith('pollo', 0, 600));
    await waitFor(() => expect(tessera('Petto di pollo')).toHaveTextContent('Finito'));

    expect(campo).toHaveValue('0');
    expect(within(foglio).queryByRole('button', { name: 'RIPROVA' })).not.toBeInTheDocument();
    expect(within(foglio).queryByText('Non siamo riusciti a salvare la correzione. Riprova.')).not.toBeInTheDocument();
    // Invio nel campo è SALVA/RIPROVA: con il campo riallineato non scrive niente.
    fireEvent.keyDown(campo, { key: 'Enter' });
    await act(async () => {});
    expect(correggiResiduo).not.toHaveBeenCalledWith('pollo', 250, 0);
    expect(correggiResiduo).toHaveBeenCalledTimes(2);
  });

  it('la scadenza: MODIFICA, una data, SALVA; la tessera mostra la data nuova', async () => {
    mockBase();
    vi.mocked(impostaScadenza).mockResolvedValue(undefined);
    await montaCaricata();
    const nuova = sommaGiorni(OGGI, 5);

    fireEvent.click(tessera('Petto di pollo'));
    const foglio = screen.getByRole('dialog', { name: 'Petto di pollo' });
    fireEvent.click(within(foglio).getByRole('button', { name: 'Modifica la scadenza di Petto di pollo' }));
    const data = within(foglio).getByLabelText('Scadenza di Petto di pollo');
    fireEvent.change(data, { target: { value: nuova } });
    // Il SALVA accanto al campo data, non quello del residuo.
    fireEvent.click(within(data.parentElement!).getByRole('button', { name: 'SALVA' }));

    await waitFor(() => expect(impostaScadenza).toHaveBeenCalledWith('pollo', nuova));
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(nuova)}`);
    expect(await within(foglio).findByText('MODIFICATA DA TE')).toBeInTheDocument();
  });

  it('il congelatore scrive e toglie la data a mano: la tessera torna alla stima in congelatore', async () => {
    mockBase({ dispensa: [pantry({ ingredientId: 'pollo', residuo: 600, ultimoAcquisto: OGGI, scadenzaManuale: sommaGiorni(OGGI, 2) })] });
    vi.mocked(impostaCongelato).mockResolvedValue(undefined);
    await montaCaricata();
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(sommaGiorni(OGGI, 2))}`);

    fireEvent.click(tessera('Petto di pollo'));
    fireEvent.click(screen.getByRole('button', { name: 'Petto di pollo: metti in congelatore' }));

    await waitFor(() => expect(impostaCongelato).toHaveBeenCalledWith('pollo', true));
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(sommaGiorni(OGGI, 90))}`);
  });

  it('due scritture in volo: il congelatore fallisce dopo che la scadenza è riuscita, e a schermo resta la scadenza nuova', async () => {
    mockBase();
    let rifiuta: (e: Error) => void = () => {};
    vi.mocked(impostaCongelato).mockReturnValue(new Promise((_, r) => { rifiuta = r; }));
    vi.mocked(impostaScadenza).mockResolvedValue(undefined);
    await montaCaricata();
    const nuova = sommaGiorni(OGGI, 5);

    fireEvent.click(tessera('Petto di pollo'));
    const foglio = screen.getByRole('dialog', { name: 'Petto di pollo' });
    fireEvent.click(within(foglio).getByRole('button', { name: 'Petto di pollo: metti in congelatore' }));
    // Il congelatore è in volo; intanto si corregge la scadenza.
    fireEvent.click(within(foglio).getByRole('button', { name: 'Modifica la scadenza di Petto di pollo' }));
    const data = within(foglio).getByLabelText('Scadenza di Petto di pollo');
    fireEvent.change(data, { target: { value: nuova } });
    fireEvent.click(within(data.parentElement!).getByRole('button', { name: 'SALVA' }));
    await waitFor(() => expect(impostaScadenza).toHaveBeenCalledWith('pollo', nuova));
    await within(foglio).findByText('MODIFICATA DA TE');

    await act(async () => { rifiuta(new Error('rete')); });

    expect(await within(foglio).findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: 'Petto di pollo: metti in congelatore' })).toHaveAttribute('aria-pressed', 'false');
    expect(tessera('Petto di pollo')).toHaveTextContent(`Scade il ${dataCorta(nuova)}`);
    expect(within(foglio).getByText('MODIFICATA DA TE')).toBeInTheDocument();
  });

  it('un non deperibile non ha il congelatore', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Pasta'));
    expect(screen.getByRole('dialog', { name: 'Pasta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pasta: metti in congelatore' })).not.toBeInTheDocument();
  });
});

describe('Dispensa: la scansione', () => {
  it('SCANSIONA UNA CONFEZIONE porta alla lettura; la freccia torna al dettaglio', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Petto di pollo'));
    fireEvent.click(screen.getByRole('button', { name: /SCANSIONA UNA CONFEZIONE/ }));

    expect(screen.getByRole('dialog', { name: 'Scansiona una confezione' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna a Petto di pollo' }));
    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
  });

  it('AGGIUNGI scrive la confezione e torna al dettaglio, con la tessera aggiornata', async () => {
    mockBase();
    vi.mocked(aggiungiConfezione).mockResolvedValue(undefined);
    await montaCaricata();
    fireEvent.click(tessera('Petto di pollo'));
    fireEvent.click(screen.getByRole('button', { name: /SCANSIONA UNA CONFEZIONE/ }));

    await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
    act(() => onCodiceCapturato!(EAN_POLLO));
    expect(await screen.findByText('Confezione da 300 g')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI' }));

    await waitFor(() => expect(aggiungiConfezione).toHaveBeenCalledWith({ ingredientId: 'pollo', formato: 300, ean: EAN_POLLO, residuoPrima: 600 }));
    expect(await screen.findByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
    expect(tessera('Petto di pollo')).toHaveTextContent('900 g');
  });
});

describe('Dispensa: il lotto', () => {
  function slotPronti(id: string, data: string, dishId: string): MealSlot {
    return {
      id, data, slotDefId: 'sd-cena', stato: 'casa', dishId, fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: true,
    };
  }
  /** Tre pasti dai Pronti: uno futuro sul ragù, uno passato sul ragù, uno futuro su un altro piatto. Conta solo il primo. */
  function settimanaConImpegni() {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({
      id: 'w-1', dataInizio: lunediDi(OGGI), stato: 'confermata',
      slots: [
        slotPronti('ms-futuro', sommaGiorni(OGGI, 2), RAGU.id),
        slotPronti('ms-passato', sommaGiorni(OGGI, -1), RAGU.id),
        slotPronti('ms-altro', sommaGiorni(OGGI, 1), 'd-altro'),
      ],
    });
  }

  it('le impegnate del lotto: solo i pasti di oggi o dopo, dello stesso piatto; anche nel dialogo di eliminazione', async () => {
    mockBase();
    settimanaConImpegni();
    await montaCaricata();

    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    const foglio = screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' });
    expect(within(foglio).getByText('1 impegnata')).toBeInTheDocument();

    fireEvent.click(within(foglio).getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Elimini il lotto?' });
    expect(within(dialogo).getByText(
      'Ragù di lenticchie, 4 porzioni. 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.',
    )).toBeInTheDocument();
  });

  it('con un altro lotto vivo dello stesso piatto che copre gli impegni, il lotto non ne porta', async () => {
    mockBase({ lotti: [lotto({ id: 'lp-1' }), lotto({ id: 'lp-4', porzioni: 2, congelato: true, preparataIl: sommaGiorni(OGGI, -5) })] });
    settimanaConImpegni();
    await montaCaricata();

    fireEvent.click(screen.getAllByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })[0]!);
    const foglio = screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' });
    expect(within(foglio).queryByText(/impegnat/)).not.toBeInTheDocument();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));
    expect(within(screen.getByRole('alertdialog', { name: 'Elimini il lotto?' })).getByText('Ragù di lenticchie, 4 porzioni.')).toBeInTheDocument();
  });

  it('la tessera apre il lotto; il dialogo di eliminazione non si chiude dal velo; ELIMINA toglie la tessera', async () => {
    mockBase();
    vi.mocked(eliminaLotto).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    expect(screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));

    const dialogo = screen.getByRole('alertdialog', { name: 'Elimini il lotto?' });
    const veli = screen.getAllByTestId('velo-foglio');
    fireEvent.click(veli[veli.length - 1]!);
    expect(dialogo).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'ELIMINA' }));
    await waitFor(() => expect(eliminaLotto).toHaveBeenCalledWith('lp-1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).not.toBeInTheDocument();
  });

  it('SALVA a 0 porzioni: il lotto esce dalla pagina e il foglio si chiude', async () => {
    mockBase();
    vi.mocked(correggiLotto).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Porzioni di Ragù di lenticchie' }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));

    await waitFor(() => expect(correggiLotto).toHaveBeenCalledWith('lp-1', 0));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).not.toBeInTheDocument();
  });

  it('SALVA delle porzioni che fallisce: il campo tiene il numero tentato, RIPROVA è premibile e lo rimanda', async () => {
    mockBase();
    vi.mocked(correggiLotto).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(undefined);
    await montaCaricata();

    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    const foglio = screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' });
    const campo = within(foglio).getByRole('textbox', { name: 'Porzioni di Ragù di lenticchie' });
    fireEvent.change(campo, { target: { value: '2' } });
    fireEvent.click(within(foglio).getByRole('button', { name: 'SALVA' }));

    const riprova = await within(foglio).findByRole('button', { name: 'RIPROVA' });
    expect(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveTextContent('4 porz.');
    expect(campo).toHaveValue('2');
    expect(riprova).not.toBeDisabled();

    fireEvent.click(riprova);
    await waitFor(() => expect(correggiLotto).toHaveBeenLastCalledWith('lp-1', 2));
    expect(correggiLotto).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(within(foglio).getByRole('button', { name: 'SALVA' })).toBeDisabled());
    expect(campo).toHaveValue('2');
    expect(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveTextContent('2 porz.');
  });

  it('SALVA a 3 porzioni: il foglio resta e la tessera dice 3 porz.; il congelatore del lotto scrive', async () => {
    mockBase();
    vi.mocked(correggiLotto).mockResolvedValue(undefined);
    vi.mocked(impostaCongelatoLotto).mockResolvedValue(undefined);
    await montaCaricata();

    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Porzioni di Ragù di lenticchie' }), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'SALVA' }));

    await waitFor(() => expect(correggiLotto).toHaveBeenCalledWith('lp-1', 3));
    expect(screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveTextContent('3 porz.');

    fireEvent.click(screen.getByRole('button', { name: 'Ragù di lenticchie: metti in congelatore' }));
    await waitFor(() => expect(impostaCongelatoLotto).toHaveBeenCalledWith('lp-1', true));
    expect(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toHaveTextContent('Congelato');
  });
});

describe('Dispensa: la creazione', () => {
  async function apriNuovo() {
    mockBase();
    await montaCaricata();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cerca in dispensa' }), { target: { value: 'zenzero' } });
    fireEvent.click(screen.getByRole('button', { name: 'CREA «ZENZERO»' }));
    const foglio = screen.getByRole('dialog', { name: 'Nuovo ingrediente' });
    fireEvent.click(within(foglio).getByRole('button', { name: 'ORTOFRUTTA' }));
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Residuo di zenzero' }), { target: { value: '50' } });
    return foglio;
  }

  it('CREA L\'INGREDIENTE salva, scrive il residuo da 0, svuota la ricerca e rilegge', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-zenzero');
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    const foglio = await apriNuovo();
    expect(leggiIngredienti).toHaveBeenCalledTimes(1);

    fireEvent.click(within(foglio).getByRole('button', { name: "CREA L'INGREDIENTE" }));

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-zenzero', 50, 0));
    expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'zenzero', area: 'ortofrutta', prezzoConfezione: null, id: undefined }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Cerca in dispensa' })).toHaveValue('');
    await waitFor(() => expect(leggiIngredienti).toHaveBeenCalledTimes(2));
  });

  it('se il residuo non si scrive, RIPROVA riscrive lo stesso ingrediente invece di crearne un altro', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-zenzero');
    vi.mocked(correggiResiduo).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(undefined);
    const foglio = await apriNuovo();

    fireEvent.click(within(foglio).getByRole('button', { name: "CREA L'INGREDIENTE" }));
    expect(await within(foglio).findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();

    fireEvent.click(within(foglio).getByRole('button', { name: "CREA L'INGREDIENTE" }));
    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledTimes(2));
    expect(salvaIngrediente).toHaveBeenLastCalledWith(expect.objectContaining({ nome: 'zenzero', id: 'i-zenzero' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('Dispensa: il gesto indietro', () => {
  it('aprire un ingrediente mette una voce; il gesto indietro chiude il foglio e la pagina resta la Dispensa', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Petto di pollo'));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);

    indietro();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tessera('Petto di pollo')).toBeInTheDocument();
    expect(dock()).toBeInTheDocument();
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('dettaglio → scansione: il primo gesto indietro torna al dettaglio, il secondo chiude', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Petto di pollo'));
    fireEvent.click(screen.getByRole('button', { name: /SCANSIONA UNA CONFEZIONE/ }));
    expect(screen.getByRole('dialog', { name: 'Scansiona una confezione' })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(2);

    indietro();
    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
    indietro();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('lotto → dialogo di eliminazione: il gesto indietro chiude solo il dialogo', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));
    expect(screen.getByRole('alertdialog', { name: 'Elimini il lotto?' })).toBeInTheDocument();

    indietro();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' })).toBeInTheDocument();
  });

  it('la X consuma la voce con go(-1), una volta anche col doppio tocco; il popstate che segue non chiude altro', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Petto di pollo'));
    const x = screen.getByRole('button', { name: 'Chiudi il foglio' });
    fireEvent.click(x);
    fireEvent.click(x);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-1);

    // Il popstate di quel go(-1) arriva mentre si è già riaperto un foglio: non lo chiude.
    fireEvent.click(tessera('Pasta'));
    indietro();
    expect(screen.getByRole('dialog', { name: 'Pasta' })).toBeInTheDocument();
  });

  it('ANNULLA nel dialogo (2 → 1) chiama go(-1) e il popstate che segue lascia aperto il lotto', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Elimini il lotto?' })).getByRole('button', { name: 'ANNULLA' }));
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-1);

    indietro();
    expect(screen.getByRole('dialog', { name: 'Lotto di Ragù di lenticchie' })).toBeInTheDocument();
  });

  it('ELIMINA dal dialogo (2 → 0) chiama go(-2) una volta', async () => {
    mockBase();
    vi.mocked(eliminaLotto).mockResolvedValue(undefined);
    await montaCaricata();
    fireEvent.click(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elimina il lotto di Ragù di lenticchie' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Elimini il lotto?' })).getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-2);
    indietro();
    expect(tessera('Petto di pollo')).toBeInTheDocument();
  });

  it('APRI {Y} dalla scansione (2 → 1) chiama go(-1) e lascia aperto il dettaglio di Y', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(tessera('Pasta'));
    fireEvent.click(screen.getByRole('button', { name: /SCANSIONA UNA CONFEZIONE/ }));
    await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
    act(() => onCodiceCapturato!(EAN_POLLO));
    fireEvent.click(await screen.findByRole('button', { name: 'APRI PETTO DI POLLO' }));

    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-1);
    indietro(); // il popstate di quel go(-1)
    expect(screen.getByRole('dialog', { name: 'Petto di pollo' })).toBeInTheDocument();
    indietro(); // il gesto dell'utente
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Modifica con l\'AI mette una voce; il gesto indietro chiude il widget e torna il Dock', async () => {
    mockBase();
    await montaCaricata();
    fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);

    indietro();
    expect(screen.queryByRole('dialog', { name: "Modifica con l'AI" })).not.toBeInTheDocument();
    expect(dock()).toBeInTheDocument();
  });
});

describe('Dispensa: il Dock e Modifica con l\'AI', () => {
  it('Modifica con l\'AI apre il widget e il Dock sparisce; Chiudi lo richiude, e la bozza resta', async () => {
    mockBase();
    await montaCaricata();

    fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
    const widgetAI = screen.getByRole('dialog', { name: "Modifica con l'AI" });
    expect(dock()).not.toBeInTheDocument();
    fireEvent.change(within(widgetAI).getByRole('textbox', { name: "Nota per l'AI" }), { target: { value: 'ho finito il riso' } });

    fireEvent.click(within(widgetAI).getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog', { name: "Modifica con l'AI" })).not.toBeInTheDocument();
    expect(dock()).toBeInTheDocument();

    fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
    expect(screen.getByRole('textbox', { name: "Nota per l'AI" })).toHaveValue('ho finito il riso');
  });

  it('senza SpeechRecognition non c\'è Registra un vocale, né nel Dock né nel widget', async () => {
    mockBase();
    await montaCaricata();
    expect(screen.queryByRole('button', { name: 'Registra un vocale' })).not.toBeInTheDocument();
    fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
    expect(screen.queryByRole('button', { name: 'Registra un vocale' })).not.toBeInTheDocument();
  });

  describe('con la dettatura', () => {
    let ultima: Finto | null = null;
    class Finto implements SpeechRecognitionLike {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: SpeechRecognitionLike['onresult'] = null;
      onend: SpeechRecognitionLike['onend'] = null;
      onerror: SpeechRecognitionLike['onerror'] = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        ultima = this;
      }
    }
    function puntatore(tipo: string, pointerId: number): Event {
      return Object.assign(new Event(tipo), { pointerId });
    }
    function detta(testo: string) {
      act(() => ultima!.onresult!({ resultIndex: 0, results: [Object.assign([{ transcript: testo }], { isFinal: true })] }));
    }

    beforeEach(() => {
      ultima = null;
      window.SpeechRecognition = Finto;
    });

    it('il microfono del Dock apre il widget già in dettatura; conta solo il rilascio del dito che ha premuto', async () => {
      mockBase();
      await montaCaricata();

      fireEvent.pointerDown(within(dock()!).getByRole('button', { name: 'Registra un vocale' }), { pointerId: 3 });
      expect(screen.getByRole('dialog', { name: "Modifica con l'AI" })).toBeInTheDocument();
      expect(dock()).not.toBeInTheDocument();
      expect(ultima!.start).toHaveBeenCalledTimes(1);
      expect(screen.getByText('RILASCIA PER FERMARE')).toBeInTheDocument();

      act(() => { window.dispatchEvent(puntatore('pointerup', 9)); });
      expect(screen.getByText('RILASCIA PER FERMARE')).toBeInTheDocument();
      // Rilasciato subito: era un tocco breve, la dettatura continua a tocchi.
      act(() => { window.dispatchEvent(puntatore('pointerup', 3)); });
      expect(screen.getByText('TOCCA PER FERMARE')).toBeInTheDocument();
    });

    it('il click che segue il tocco sul microfono del Dock e cade sul velo non chiude il widget; un tocco sul velo sì', async () => {
      mockBase();
      await montaCaricata();

      fireEvent.pointerDown(within(dock()!).getByRole('button', { name: 'Registra un vocale' }), { pointerId: 3 });
      act(() => { window.dispatchEvent(puntatore('pointerup', 3)); });
      // Il pointerdown era sul Dock: il click sul velo è il resto di quel tocco.
      fireEvent.click(screen.getByTestId('velo-widget'));
      expect(screen.getByRole('dialog', { name: "Modifica con l'AI" })).toBeInTheDocument();
      expect(screen.getByText('TOCCA PER FERMARE')).toBeInTheDocument();

      const velo = screen.getByTestId('velo-widget');
      fireEvent.pointerDown(velo);
      fireEvent.click(velo);
      expect(screen.queryByRole('dialog', { name: "Modifica con l'AI" })).not.toBeInTheDocument();
      expect(ultima!.stop).toHaveBeenCalledTimes(1);
      expect(dock()).toBeInTheDocument();
    });

    it('il gesto indietro col widget in dettatura lo chiude e ferma la dettatura', async () => {
      mockBase();
      await montaCaricata();

      fireEvent.pointerDown(within(dock()!).getByRole('button', { name: 'Registra un vocale' }), { pointerId: 3 });
      act(() => { window.dispatchEvent(puntatore('pointerup', 3)); });
      expect(screen.getByText('TOCCA PER FERMARE')).toBeInTheDocument();
      expect(window.history.pushState).toHaveBeenCalledTimes(1);

      indietro();
      expect(screen.queryByRole('dialog', { name: "Modifica con l'AI" })).not.toBeInTheDocument();
      expect(ultima!.stop).toHaveBeenCalledTimes(1);
      expect(dock()).toBeInTheDocument();
      expect(window.history.go).not.toHaveBeenCalled();
    });

    it('il testo dettato si accoda alla bozza con uno spazio; chiudere ferma la dettatura e tiene il testo', async () => {
      mockBase();
      await montaCaricata();

      fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
      fireEvent.change(screen.getByRole('textbox', { name: "Nota per l'AI" }), { target: { value: 'ho finito il riso' } });
      // Da tastiera: il click senza pointerdown (detail 0) avvia a tocchi.
      fireEvent.click(screen.getByRole('button', { name: 'Registra un vocale' }), { detail: 0 });
      expect(screen.getByText('TOCCA PER FERMARE')).toBeInTheDocument();
      detta("l'olio è a metà");

      fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
      expect(ultima!.stop).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog', { name: "Modifica con l'AI" })).not.toBeInTheDocument();

      fireEvent.click(within(dock()!).getByRole('button', { name: "Modifica con l'AI" }));
      expect(screen.getByRole('textbox', { name: "Nota per l'AI" })).toHaveValue("ho finito il riso l'olio è a metà");
      expect(screen.queryByText('TOCCA PER FERMARE')).not.toBeInTheDocument();
    });
  });
});
