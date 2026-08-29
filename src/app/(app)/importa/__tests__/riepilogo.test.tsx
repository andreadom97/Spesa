import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';

vi.mock('@/data/importa', () => ({
  leggiBozzaImport: vi.fn(),
  salvaBozzaImport: vi.fn(),
  cancellaBozzaImport: vi.fn(),
  eseguiScritture: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { leggiBozzaImport, salvaBozzaImport, eseguiScritture } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
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
      pasti: [{
        nomeOriginale: 'pranzo',
        piatti: [{
          nome: 'Pasta al pomodoro', descrizione: null, componenti: [],
          righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g', testoOriginale: '80g pasta' }],
        }],
      }],
    }],
  }],
};

const INGREDIENTE_NUOVO = {
  alimento: 'pasta di semola', nome: 'Pasta di semola', unitaBase: 'g' as const,
  area: 'cereali' as const, classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 500,
};

const STATO_OK: StatoRevisione = {
  passo: 'riepilogo',
  mappaturaPasti: { pranzo: 's-col' },
  pastiConfermati: [],
  correzioni: {},
  ingredientiNuovi: [INGREDIENTE_NUOVO],
};

const STATO_SENZA_MAPPATURA: StatoRevisione = { ...STATO_OK, mappaturaPasti: {} };

async function riprendiBozza() {
  render(<Importa />);
  fireEvent.click(await screen.findByRole('button', { name: /riprendi/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
  vi.mocked(leggiIngredienti).mockResolvedValue([] as Ingredient[]);
  vi.mocked(leggiRepertorio).mockResolvedValue([]);
  vi.mocked(salvaBozzaImport).mockResolvedValue(undefined);
});

describe('Riepilogo', () => {
  it('mostra il conto, chiede conferma in due passi e commette solo al secondo sì', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    await riprendiBozza();

    expect(await screen.findByText(/1 piatti su 1 settimane · 1 ingredienti nuovi · 0 piatti/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sostituisci il piano/i }));
    expect(await screen.findByText(/sostituire il piano attuale/i)).toBeInTheDocument();
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /sì, sostituisci/i }));
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });

  it('BozzaIncompletaError: mostra il messaggio e un link che riporta alla revisione', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_SENZA_MAPPATURA });
    await riprendiBozza();

    expect(await screen.findByText(/nessuna mappatura per il pasto/i)).toBeInTheDocument();
    expect(eseguiScritture).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /torna alla revisione/i }));
    await waitFor(() => {
      const bozza = vi.mocked(salvaBozzaImport).mock.calls.at(-1)![0];
      expect(bozza.statoRevisione.passo).toBe('revisione');
    });
  });

  it('errore di eseguiScritture: messaggio di riprova, nessun redirect', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    vi.mocked(eseguiScritture).mockRejectedValue(new Error('scrittura fallita'));
    await riprendiBozza();

    fireEvent.click(await screen.findByRole('button', { name: /sostituisci il piano/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, sostituisci/i }));

    expect(await screen.findByText(/qualcosa si è fermato/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('retry dopo un errore: ricalcola le scritture con dati freschi invece di riusare le vecchie', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano: PIANO_SEMPLICE, statoRevisione: STATO_OK });
    const ESISTENTE: Ingredient = {
      id: 'i-pasta-gia-creata', nome: 'Pasta di semola', unitaBase: 'g',
      area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
    };
    // page.tsx legge leggiIngredienti una volta al mount (per i formati); Riepilogo la
    // rilegge da sé nel suo effect. Tre chiamate in tutto prima del retry: mount, calcolo
    // iniziale di Riepilogo (nessun esistente -> nuovoAlimento, eseguiScritture fallisce),
    // e il ricalcolo automatico scatenato dall'errore — qui l'ingrediente esiste già (come
    // se il primo giro l'avesse davvero creato prima di fermarsi): se il retry riusasse
    // l'oggetto scritture calcolato la prima volta invece di rileggere, continuerebbe a
    // proporlo come nuovo invece di agganciarlo per id.
    vi.mocked(leggiIngredienti).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([ESISTENTE]);
    vi.mocked(eseguiScritture).mockRejectedValueOnce(new Error('scrittura fallita'));
    await riprendiBozza();

    fireEvent.click(await screen.findByRole('button', { name: /sostituisci il piano/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, sostituisci/i }));
    expect(await screen.findByText(/qualcosa si è fermato/i)).toBeInTheDocument();

    // Il ricalcolo è automatico (scatenato dall'errore, non da un'altra azione dell'utente):
    // attende solo che leggiIngredienti sia stato richiamato una terza volta e che il
    // pulsante torni disponibile prima di procedere.
    await waitFor(() => expect(leggiIngredienti).toHaveBeenCalledTimes(3));
    const bottoneRetry = await screen.findByRole('button', { name: /sì, sostituisci/i });
    await waitFor(() => expect(bottoneRetry).not.toBeDisabled());

    vi.mocked(eseguiScritture).mockResolvedValue(undefined);
    fireEvent.click(bottoneRetry);

    // 2 chiamate in tutto: il primo tentativo fallito + questo retry.
    await waitFor(() => expect(eseguiScritture).toHaveBeenCalledTimes(2));
    const scrittureRicalcolate = vi.mocked(eseguiScritture).mock.calls[1][0];
    expect(scrittureRicalcolate.ingredientiDaCreare).toHaveLength(0);
    expect(scrittureRicalcolate.piattiDaCreare[0].righe).toContainEqual({
      ingredientId: 'i-pasta-gia-creata', quantita: 80, unita: 'g',
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));
  });
});
