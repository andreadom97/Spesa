import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';
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
  it('il conto in righe; senza piatti da disattivare CREA IL PIANO scrive subito e va al Piano con replace', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    await riprendiBozza();

    expect(await screen.findByRole('heading', { name: 'Il nuovo piano' })).toBeInTheDocument();
    const conto = screen.getByRole('list', { name: 'Il conto dell\'import' });
    expect(within(conto).getByText('Piatti').nextSibling).toHaveTextContent('1');
    expect(within(conto).getByText('Settimane del giro').nextSibling).toHaveTextContent('1');
    expect(within(conto).getByText('Ingredienti nuovi').nextSibling).toHaveTextContent('1');
    expect(within(conto).queryByText('Piatti del piano attuale da disattivare')).toBeNull();

    const crea = await within(dock()).findByRole('button', { name: 'CREA IL PIANO' });
    await waitFor(() => expect(crea).toBeEnabled());
    fireEvent.click(crea);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
    expect(push).not.toHaveBeenCalled();
  });

  it('con piatti da disattivare: la riga in più, SOSTITUISCI IL PIANO, e si scrive solo alla conferma del dialogo', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_VECCHIO]);
    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    await riprendiBozza();

    const conto = await screen.findByRole('list', { name: 'Il conto dell\'import' });
    expect(within(conto).getByText('Piatti del piano attuale da disattivare').nextSibling).toHaveTextContent('1');

    const sostituisci = await within(dock()).findByRole('button', { name: 'SOSTITUISCI IL PIANO' });
    await waitFor(() => expect(sostituisci).toBeEnabled());
    fireEvent.click(sostituisci);
    const dialogo = await screen.findByRole('alertdialog', { name: 'Sostituire il piano attuale?' });
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'SOSTITUISCI' }));
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(1));
    // L'uscita passa da chiudiTuttoPoi: prima si consuma la voce del dialogo.
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('BozzaIncompletaError: uno stato vuoto col messaggio, TORNA ALLA REVISIONE nel Dock', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_SENZA_MAPPATURA });
    await riprendiBozza();

    expect(await screen.findByRole('heading', { name: 'C\'è ancora qualcosa da sistemare' })).toBeInTheDocument();
    expect(screen.getByText(/nessuna mappatura per il pasto/i)).toBeInTheDocument();
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(within(dock()).getByRole('button', { name: 'TORNA ALLA REVISIONE' }));
    await waitFor(() => {
      const bozza = vi.mocked(salvaBozzaImport).mock.calls.at(-1)![0];
      expect(bozza.statoRevisione.passo).toBe('revisione');
    });
  });

  it('caricamento fallito: uno stato vuoto, e RIPROVA rilegge', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(leggiRepertorio).mockRejectedValueOnce(new Error('rete'));
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

    const sostituisci = await within(dock()).findByRole('button', { name: 'SOSTITUISCI IL PIANO' });
    await waitFor(() => expect(sostituisci).toBeEnabled());
    fireEvent.click(sostituisci);
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'SOSTITUISCI' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(within(dock()).getByRole('alert')).toHaveTextContent(/qualcosa si è fermato/i);
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('retry dopo un errore: il Dock resta spento fino al ricalcolo, che rilegge i dati freschi', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    const ESISTENTE: Ingredient = {
      id: 'i-pasta-gia-creata', nome: 'Pasta di semola', unitaBase: 'g',
      area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
    };
    // Tre letture prima del retry: il mount della pagina, il primo calcolo del riepilogo
    // (nessun esistente: l'ingrediente è nuovo, e la scrittura fallisce), il ricalcolo dopo
    // l'errore, dove l'ingrediente esiste già come se il primo giro l'avesse creato.
    vi.mocked(leggiIngredienti).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([ESISTENTE]);
    vi.mocked(eseguiScritture).mockRejectedValueOnce(new Error('scrittura fallita'));
    await riprendiBozza();
    // Durante il primo calcolo il riepilogo non rende niente, Dock compreso: prima il conto.
    await screen.findByRole('list', { name: 'Il conto dell\'import' });

    const crea = await within(dock()).findByRole('button', { name: 'CREA IL PIANO' });
    await waitFor(() => expect(crea).toBeEnabled());
    fireEvent.click(crea);
    expect(await within(dock()).findByRole('alert')).toHaveTextContent(/qualcosa si è fermato/i);

    await waitFor(() => expect(leggiIngredienti).toHaveBeenCalledTimes(3));
    const riprova = within(dock()).getByRole('button', { name: 'CREA IL PIANO' });
    await waitFor(() => expect(riprova).toBeEnabled());

    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    fireEvent.click(riprova);

    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(2));
    const ricalcolate = vi.mocked(eseguiScritture).mock.calls[1][0];
    expect(ricalcolate.ingredientiDaCreare).toHaveLength(0);
    expect(ricalcolate.piattiDaCreare[0].righe).toContainEqual({ ingredientId: 'i-pasta-gia-creata', quantita: 80, unita: 'g' });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });
});
