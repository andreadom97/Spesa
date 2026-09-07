import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ListaSalvata } from '@/data/lista';
import type { VoceComprata } from '@/data/confezioni';

vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
}));
vi.mock('@/data/confezioni', () => ({
  leggiVociComprate: vi.fn(),
  aggiornaFormatoDaScansione: vi.fn(),
}));

const replace = vi.fn();
const push = vi.fn();
// Un solo oggetto router, come quello vero di Next: la pagina lo mette fra le
// dipendenze dell'effect di caricamento, e un oggetto nuovo a ogni render lo
// farebbe ripartire (ricaricando le voci e cancellando l'aggiornamento locale).
const router = { push, replace, back: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe } from '@/data/lista';
import { leggiVociComprate, aggiornaFormatoDaScansione } from '@/data/confezioni';
import Confezioni from '../page';

const SETTIMANA = { id: 'week-1', dataInizio: '2026-08-24', stato: 'confermata' as const, slots: [] };
const EAN = '8076800195057';

/** Una lista davvero finita: ogni voce spuntata, nessun controllo in sospeso. */
function listaFinita(): ListaSalvata {
  return {
    base: [
      {
        area: 'cereali',
        voci: [{
          id: 'item-pasta', ingredientId: 'ing-pasta', nome: 'Pasta', area: 'cereali', unita: 'g',
          fabbisogno: 820, residuo: 0, confezioni: 2, quantitaTotale: 2000,
          spuntato: true, origine: 'piano', mostraDettaglio: true,
        }],
        controlli: [],
      },
    ],
    topup: [],
    baseListaId: 'lista-base-1',
    topupListaId: 'lista-topup-1',
  };
}

function listaAMeta(): ListaSalvata {
  const l = listaFinita();
  l.base[0].voci[0].spuntato = false;
  return l;
}

function voce(overrides: Partial<VoceComprata>): VoceComprata {
  return {
    itemId: 'item-pasta', ingredientId: 'ing-pasta', nome: 'Pasta', unita: 'g', classeResiduo: 'porzionabile',
    confezioni: 2, formato: 1000, quantitaTotale: 2000, ean: null,
    ...overrides,
  };
}

function vociMiste(): VoceComprata[] {
  return [
    voce({}),
    voce({ itemId: 'item-uova', ingredientId: 'ing-uova', nome: 'Uova', unita: 'pz', classeResiduo: 'intero', confezioni: 1, formato: 1, quantitaTotale: 1 }),
    voce({ itemId: 'item-insalata', ingredientId: 'ing-insalata', nome: 'Insalata', classeResiduo: 'stima', confezioni: 1, formato: 200, quantitaTotale: 200 }),
  ];
}

function rispostaJson(corpo: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => corpo } as unknown as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(leggiSettimanaCorrente).mockReset().mockResolvedValue(SETTIMANA);
  vi.mocked(leggiListe).mockReset().mockResolvedValue(listaFinita());
  vi.mocked(leggiVociComprate).mockReset().mockResolvedValue(vociMiste());
  vi.mocked(aggiornaFormatoDaScansione).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Apre lo scanner sulla (sola) voce, scrive il codice e preme CERCA. */
async function scansiona(codice = EAN) {
  fireEvent.click(await screen.findByRole('button', { name: 'SCANSIONA' }));
  const campo = await screen.findByLabelText('Scrivi il codice');
  fireEvent.change(campo, { target: { value: codice } });
  fireEvent.click(screen.getByRole('button', { name: 'CERCA' }));
}

describe('Confezioni — accesso ed elenco', () => {
  it('mostra solo le voci porzionabili, con N × formato e SCANSIONA', async () => {
    render(<Confezioni />);

    expect(await screen.findByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('2 × 1,0 kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCANSIONA' })).toBeInTheDocument();
    expect(screen.queryByText('Uova')).not.toBeInTheDocument();
    expect(screen.queryByText('Insalata')).not.toBeInTheDocument();
    expect(leggiVociComprate).toHaveBeenCalledWith('week-1');
    expect(screen.getByText('CONFEZIONI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Torna a Hai preso tutto' })).toHaveAttribute('href', '/lista/fatta');
    expect(screen.getByRole('link', { name: 'TORNA A HAI PRESO TUTTO' })).toHaveAttribute('href', '/lista/fatta');
    expect(replace).not.toHaveBeenCalled();
  });

  it('senza voci porzionabili lo dice', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue(vociMiste().filter((v) => v.classeResiduo !== 'porzionabile'));

    render(<Confezioni />);

    expect(await screen.findByText('Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SCANSIONA' })).not.toBeInTheDocument();
  });

  it('senza settimana rimanda a /lista', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);

    render(<Confezioni />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/lista'));
    expect(leggiVociComprate).not.toHaveBeenCalled();
  });

  it('con la lista non finita rimanda a /lista', async () => {
    vi.mocked(leggiListe).mockResolvedValue(listaAMeta());

    render(<Confezioni />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/lista'));
    expect(leggiVociComprate).not.toHaveBeenCalled();
  });
});

describe('Confezioni — scansione', () => {
  it('SCANSIONA apre lo scanner; il codice va alla route e la quantità diversa propone AGGIORNA', async () => {
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Spaghetti n. 5', marca: 'Barilla', quantita: { valore: 500, unita: 'g' },
    }));

    render(<Confezioni />);
    await scansiona();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/prodotto/${EAN}`));
    expect(await screen.findByText('Barilla · Spaghetti n. 5 · 500 g')).toBeInTheDocument();
    expect(screen.getByText('La confezione è 500 g, nel formato avevi 1,0 kg. Aggiorno per questa settimana e per le prossime?')).toBeInTheDocument();
    // Lo scanner è stato smontato: niente campo del codice.
    expect(screen.queryByLabelText('Scrivi il codice')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: EAN,
      }),
    );
    expect(await screen.findByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('quantità uguale al formato: "Formato confermato" e memorizza il codice', async () => {
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Pasta', marca: 'X', quantita: { valore: 1000, unita: 'g' },
    }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Formato confermato: 1,0 kg.')).toBeInTheDocument();
    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 1000, ean: EAN,
      }),
    );
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(screen.queryByText(/AGGIORNATO/)).not.toBeInTheDocument();
  });

  it('unità diversa: messaggio e nessuna scrittura', async () => {
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Latte', marca: 'Y', quantita: { valore: 1000, unita: 'ml' },
    }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Unità diversa (ml contro g): non aggiorno. Correggi il formato a mano se serve.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Formato a mano')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('prodotto non trovato: campo a mano, AGGIORNA scrive il formato senza ean', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: false }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Prodotto non trovato: puoi scrivere il formato a mano.')).toBeInTheDocument();
    const campo = screen.getByLabelText('Formato a mano');
    expect(campo).toHaveAttribute('inputmode', 'decimal');
    const aggiorna = screen.getByRole('button', { name: 'AGGIORNA' });
    expect(aggiorna).toBeDisabled();

    fireEvent.change(campo, { target: { value: '750' } });
    expect(aggiorna).toBeEnabled();
    fireEvent.click(aggiorna);

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 750, ean: null,
      }),
    );
    expect(await screen.findByText('2 × 750 g · AGGIORNATO')).toBeInTheDocument();
  });

  it('trovato ma senza quantità: campo a mano con nome e marca, il codice si memorizza', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: true, nome: 'Fusilli', marca: 'Z', quantita: null }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Prodotto non trovato: puoi scrivere il formato a mano.')).toBeInTheDocument();
    expect(screen.getByText('Z · Fusilli')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Formato a mano'), { target: { value: '0,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 0.5, ean: EAN,
      }),
    );
  });

  it('fetch che rigetta: messaggio del catalogo e campo a mano', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato a mano')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  it('risposta non ok (502): stesso messaggio del catalogo', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(rispostaJson({ errore: 'servizio non raggiungibile' }, false, 502));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('errore "spesa già chiusa" in scrittura rimanda a /settimana', async () => {
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Spaghetti n. 5', marca: 'Barilla', quantita: { valore: 500, unita: 'g' },
    }));
    vi.mocked(aggiornaFormatoDaScansione).mockRejectedValue(new Error('spesa già chiusa'));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settimana'));
  });

  it('altro errore in scrittura: messaggio e si può riprovare', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Spaghetti n. 5', marca: 'Barilla', quantita: { valore: 500, unita: 'g' },
    }));
    vi.mocked(aggiornaFormatoDaScansione).mockRejectedValue(new Error('rete'));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    expect(await screen.findByText('Non siamo riusciti ad aggiornare. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AGGIORNA' })).toBeEnabled();
    expect(screen.getByText('2 × 1,0 kg')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  it('LASCIA chiude il riquadro senza scrivere', async () => {
    fetchMock.mockResolvedValue(rispostaJson({
      trovato: true, nome: 'Spaghetti n. 5', marca: 'Barilla', quantita: { valore: 500, unita: 'g' },
    }));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'LASCIA' }));

    expect(screen.queryByText(/La confezione è/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCANSIONA' })).toBeInTheDocument();
    expect(screen.getByText('2 × 1,0 kg')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('ANNULLA nello scanner torna alla scheda', async () => {
    render(<Confezioni />);
    fireEvent.click(await screen.findByRole('button', { name: 'SCANSIONA' }));
    expect(await screen.findByLabelText('Scrivi il codice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));

    expect(screen.queryByLabelText('Scrivi il codice')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCANSIONA' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con due voci lo scanner si apre su una sola alla volta', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([
      voce({}),
      voce({ itemId: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', formato: 1000 }),
    ]);

    render(<Confezioni />);
    const bottoni = await screen.findAllByRole('button', { name: 'SCANSIONA' });
    expect(bottoni).toHaveLength(2);
    fireEvent.click(bottoni[0]);

    expect(screen.getAllByLabelText('Scrivi il codice')).toHaveLength(1);
    // nome → colonna → riga di testa → scheda
    const schedaPasta = screen.getByText('Pasta').parentElement!.parentElement!.parentElement!;
    expect(within(schedaPasta).getByLabelText('Scrivi il codice')).toBeInTheDocument();
    expect(within(schedaPasta).queryByRole('button', { name: 'SCANSIONA' })).not.toBeInTheDocument();
  });
});
