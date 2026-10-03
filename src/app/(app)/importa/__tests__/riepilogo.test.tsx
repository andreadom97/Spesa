import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';
import type { AvanzamentoScritture } from '@/data/importa';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';

vi.mock('@/data/importa', () => ({
  leggiBozzaImport: vi.fn(),
  salvaBozzaImport: vi.fn(),
  cancellaBozzaImport: vi.fn(),
  eseguiScritture: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace }),
}));

import { leggiBozzaImport, salvaBozzaImport, eseguiScritture } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { SlotDockProvider } from '@/components/dock-slot';
import Importa from '../page';
import { testoDialogo } from '../Riepilogo';

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
];

/** Un piano minimo, con quantità già tutte risolte: un solo pasto, un solo piatto, una sola riga. */
const PIANO_SEMPLICE: PianoEstratto = {
  archetipo: 'giornata_unica',
  fonte: 'fixture test',
  noteEstrazione: [],
  settimane: [{
    numero: 1,
    giorni: [{
      giorno: 0,
      titolo: null,
      pasti: [{
        nomeOriginale: 'pranzo',
        piatti: [{
          nome: 'Pasta al pomodoro', descrizione: null, componenti: [],
          righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g', quantitaInferita: false, testoOriginale: '80g pasta' }],
        }],
      }],
    }],
  }],
};

const INGREDIENTE_NUOVO = {
  alimento: 'pasta di semola', nome: 'Pasta di semola', unitaBase: 'g' as const,
  area: 'cereali' as const, classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 500,
  prezzoConfezione: null,
};

const STATO_OK: StatoRevisione = {
  passo: 'riepilogo',
  mappaturaPasti: { pranzo: 's-col' },
  pastiConfermati: [],
  correzioni: {},
  ingredientiNuovi: [INGREDIENTE_NUOVO],
};

const STATO_SENZA_MAPPATURA: StatoRevisione = { ...STATO_OK, mappaturaPasti: {} };

/** Un piatto del nutrizionista che la nuova dieta non contiene: l'import lo disattiva. */
const PIATTO_VECCHIO: Dish = {
  id: 'd-vecchio', nome: 'Minestrone', slotDefId: 's-col', fonte: 'nutrizionista', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
};

let slotDock: HTMLElement;

async function riprendiBozza() {
  render(<SlotDockProvider slot={slotDock}><Importa /></SlotDockProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'RIPRENDI' }));
}

const dock = () => screen.getByRole('region', { name: 'Azione principale' });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
  vi.mocked(leggiIngredienti).mockResolvedValue([] as Ingredient[]);
  vi.mocked(leggiRepertorio).mockResolvedValue([]);
  vi.mocked(salvaBozzaImport).mockResolvedValue(undefined);
});

afterEach(() => {
  slotDock.remove();
});

describe('Riepilogo (spec fase 8a §C)', () => {
  it('il riassunto sempre visibile; senza un piano attuale SALVA IL PIANO scrive subito, e il Piano saprà «Piano salvato»', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    await riprendiBozza();

    expect(await screen.findByRole('heading', { name: 'Il nuovo piano' })).toBeInTheDocument();
    const conto = screen.getByRole('list', { name: 'Il conto dell\'import' });
    expect(within(conto).getByText('Piatti nuovi').nextSibling).toHaveTextContent('1');
    expect(within(conto).getByText('Piatti aggiornati').nextSibling).toHaveTextContent('0');
    expect(within(conto).getByText('Tolti da Piatti').nextSibling).toHaveTextContent('0');
    expect(within(conto).getByText('Ingredienti nuovi').nextSibling).toHaveTextContent('1');
    expect(within(conto).getByText('Settimane del giro').nextSibling).toHaveTextContent('1');

    const salva = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(salva).toBeEnabled());
    fireEvent.click(salva);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
    expect(sessionStorage.getItem('spesa:piano-salvato')).toBe('1');
    expect(push).not.toHaveBeenCalled();
  });

  it('con un piano attuale: il dialogo blu notte coi numeri, e si scrive solo con SALVA (spec 8c §H)', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_VECCHIO]);
    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    await riprendiBozza();

    const conto = await screen.findByRole('list', { name: 'Il conto dell\'import' });
    expect(within(conto).getByText('Tolti da Piatti').nextSibling).toHaveTextContent('1');
    const salva = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(salva).toBeEnabled());
    fireEvent.click(salva);
    const dialogo = await screen.findByRole('alertdialog', { name: 'Salvare il nuovo piano?' });
    expect(within(dialogo).getByText('1 piatto nuovo, 1 tolto da Piatti. I tuoi piatti restano.')).toBeInTheDocument();
    const conferma = within(dialogo).getByRole('button', { name: 'SALVA' });
    expect(conferma.style.background).toBe('var(--ink)');
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(conferma);
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('BozzaIncompletaError: uno stato vuoto col messaggio, TORNA A CONTROLLA nel Dock', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_SENZA_MAPPATURA });
    await riprendiBozza();

    expect(await screen.findByRole('heading', { name: 'C\'è ancora qualcosa da sistemare' })).toBeInTheDocument();
    expect(screen.getByText(/nessuna mappatura per il pasto/i)).toBeInTheDocument();
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(within(dock()).getByRole('button', { name: 'TORNA A CONTROLLA' }));
    await waitFor(() => {
      const bozza = vi.mocked(salvaBozzaImport).mock.calls.at(-1)![0];
      expect(bozza.statoRevisione.passo).toBe('revisione');
    });
  });

  it('caricamento fallito: uno stato vuoto, e RIPROVA rilegge', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    // La prima lettura è quella della pagina al mount (Task 11, l'esempio della Scheda del cambio);
    // la seconda è quella del Riepilogo, che deve fallire.
    vi.mocked(leggiRepertorio).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('rete'));
    await riprendiBozza();

    expect(await screen.findByRole('heading', { name: 'Il riepilogo non è pronto' })).toBeInTheDocument();
    fireEvent.click(within(dock()).getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByRole('heading', { name: 'Il nuovo piano' })).toBeInTheDocument();
  });

  it('errore di eseguiScritture dal dialogo: il dialogo si chiude, l\'errore sta sopra il Dock, nessun redirect', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_VECCHIO]);
    vi.mocked(eseguiScritture).mockRejectedValue(new Error('scrittura fallita'));
    await riprendiBozza();
    // Durante il primo calcolo il riepilogo non rende niente, Dock compreso: prima il conto.
    await screen.findByRole('list', { name: 'Il conto dell\'import' });

    const sostituisci = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(sostituisci).toBeEnabled());
    fireEvent.click(sostituisci);
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'SALVA' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(within(dock()).getByRole('alert')).toHaveTextContent(/qualcosa si è fermato/i);
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('retry dopo un errore: il Dock resta spento (SALVA IL PIANO) fino alla fine del ricalcolo, che rilegge i dati freschi', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    const ESISTENTE: Ingredient = {
      id: 'i-pasta-gia-creata', nome: 'Pasta di semola', unitaBase: 'g',
      area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
    };
    // Tre letture prima del retry: il mount della pagina, il primo calcolo del riepilogo
    // (nessun esistente: l'ingrediente è nuovo, e la scrittura fallisce), il ricalcolo dopo
    // l'errore, dove l'ingrediente esiste già come se il primo giro l'avesse creato. Il
    // ricalcolo resta in sospeso finché il test non lo risolve a mano: così si guarda il Dock
    // proprio nella finestra fra l'errore e la fine del ricalcolo.
    let finisciRicalcolo: (v: Ingredient[]) => void = () => {};
    const ricalcolo = new Promise<Ingredient[]>((r) => { finisciRicalcolo = r; });
    vi.mocked(leggiIngredienti).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockReturnValueOnce(ricalcolo);
    vi.mocked(eseguiScritture).mockRejectedValueOnce(new Error('scrittura fallita'));
    await riprendiBozza();
    // Durante il primo calcolo il riepilogo non rende niente, Dock compreso: prima il conto.
    await screen.findByRole('list', { name: 'Il conto dell\'import' });

    const crea = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(crea).toBeEnabled());
    fireEvent.click(crea);
    // Da qui il tasto è spento (scrittura in corso) e non deve riaccendersi mai, neanche per un
    // solo commit, prima che il ricalcolo finisca: un tocco in quel momento rieseguirebbe le
    // scritture di prima, cioè doppioni. Partendo spento, ogni cambio di `disabled` è
    // un'accensione.
    expect(crea).toBeDisabled();
    const cambiDisabled: MutationRecord[] = [];
    const osservatore = new MutationObserver((r) => { cambiDisabled.push(...r); });
    osservatore.observe(crea, { attributes: true, attributeFilter: ['disabled'], attributeOldValue: true });

    expect(await within(dock()).findByRole('alert')).toHaveTextContent(/qualcosa si è fermato/i);
    await waitFor(() => expect(leggiIngredienti).toHaveBeenCalledTimes(3));
    // Un giro di attesa in più: se un commit acceso fosse in coda, qui sarebbe già avvenuto.
    await new Promise((r) => setTimeout(r, 20));
    cambiDisabled.push(...osservatore.takeRecords());
    osservatore.disconnect();
    expect(cambiDisabled).toHaveLength(0);
    const riprova = within(dock()).getByRole('button', { name: 'SALVA IL PIANO' });
    expect(riprova).toBe(crea);
    expect(riprova).toBeDisabled();

    finisciRicalcolo([ESISTENTE]);
    await waitFor(() => expect(riprova).toBeEnabled());

    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    fireEvent.click(riprova);

    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(2));
    const ricalcolate = vi.mocked(eseguiScritture).mock.calls[1][0];
    expect(ricalcolate.ingredientiDaCreare).toHaveLength(0);
    expect(ricalcolate.piattiDaCreare[0].righe).toContainEqual({ ingredientId: 'i-pasta-gia-creata', quantita: 80, unita: 'g' });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('dopo il tocco: «Salvo il piano…» coi passi e aria-busy, il Dock spento, poi il Piano', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    let avanza: (a: AvanzamentoScritture) => void = () => {};
    let finisci: () => void = () => {};
    vi.mocked(eseguiScritture).mockImplementation((_s, onAvanzamento) => {
      avanza = onAvanzamento!;
      return new Promise<void>((r) => { finisci = r; });
    });
    await riprendiBozza();
    // Durante il primo calcolo il riepilogo non rende niente, Dock compreso: prima il conto.
    await screen.findByRole('list', { name: 'Il conto dell\'import' });
    const salva = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(salva).toBeEnabled());
    fireEvent.click(salva);

    const attesa = await screen.findByRole('status');
    expect(attesa).toHaveAttribute('aria-busy', 'true');
    expect(within(attesa).getByRole('heading', { name: 'Salvo il piano…' })).toBeInTheDocument();
    expect(attesa).toHaveTextContent('Gli ingredienti.');
    act(() => avanza({ passo: 'piatti', fatti: 2, totale: 5 }));
    expect(attesa).toHaveTextContent('I piatti: 2 di 5.');
    expect(salva).toBeDisabled();
    await act(async () => { finisci(); });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('durante il salvataggio l\'indietro non torna a Ingredienti (correzione D1)', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    let finisci: () => void = () => {};
    vi.mocked(eseguiScritture).mockImplementation(() => new Promise<void>((r) => { finisci = r; }));
    await riprendiBozza();
    await screen.findByRole('list', { name: 'Il conto dell\'import' });
    const salva = await within(dock()).findByRole('button', { name: 'SALVA IL PIANO' });
    await waitFor(() => expect(salva).toBeEnabled());
    fireEvent.click(salva);
    await screen.findByRole('heading', { name: 'Salvo il piano…' });
    const salvateme = vi.mocked(salvaBozzaImport).mock.calls.length;
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    // Si resta sull'attesa: nessun ritorno a Ingredienti, nessuna bozza riscritta dopo la cancellazione.
    expect(screen.getByRole('heading', { name: 'Salvo il piano…' })).toBeInTheDocument();
    expect(screen.queryByText('Passo 3 di 4 · Ingredienti')).toBeNull();
    expect(vi.mocked(salvaBozzaImport).mock.calls.length).toBe(salvateme);
    await act(async () => { finisci(); });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('testoDialogo: il sostantivo c\'è sempre, anche senza piatti nuovi (correzione D11)', () => {
    const r = { piattiNuovi: 0, piattiAggiornati: 12, piattiTolti: 4, ingredientiNuovi: 0, cambi: [], pianoAttuale: true };
    expect(testoDialogo(r)).toBe('12 piatti aggiornati, 4 tolti da Piatti. I tuoi piatti restano.');
    expect(testoDialogo({ ...r, piattiNuovi: 3 })).toBe('3 piatti nuovi, 12 aggiornati, 4 tolti da Piatti. I tuoi piatti restano.');
    expect(testoDialogo({ ...r, piattiAggiornati: 0, piattiTolti: 1 })).toBe('1 piatto tolto da Piatti. I tuoi piatti restano.');
  });
});
