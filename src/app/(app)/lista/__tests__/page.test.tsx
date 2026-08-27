import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ListaSalvata } from '@/data/lista';

// La coda offline (src/offline/coda.ts) NON è mockata: gira per davvero su
// localStorage/jsdom, così questi test esercitano l'integrazione reale fra
// la pagina e la coda, non una controfigura.
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
  spunta: vi.fn(),
}));
vi.mock('@/data/dispensa', () => ({
  rispondiControllo: vi.fn(),
}));

import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, spunta } from '@/data/lista';
import { rispondiControllo } from '@/data/dispensa';
import { leggiCoda } from '@/offline/coda';
import Lista from '../page';

const SETTIMANA = { id: 'week-1', dataInizio: '2026-08-24', stato: 'confermata' as const, slots: [] };

const VOCE_RISO = {
  id: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso Carnaroli', area: 'cereali' as const,
  unita: 'g' as const, fabbisogno: 820, residuo: 0, confezioni: 1, quantitaTotale: 1000,
  spuntato: false, origine: 'piano' as const, mostraDettaglio: true,
};
const VOCE_PASTA = {
  id: 'item-pasta', ingredientId: 'ing-pasta', nome: 'Pasta integrale', area: 'cereali' as const,
  unita: 'g' as const, fabbisogno: 500, residuo: 100, confezioni: 2, quantitaTotale: 1000,
  spuntato: false, origine: 'piano' as const, mostraDettaglio: false,
};
const CONTROLLO_OLIO = {
  id: 'item-olio', ingredientId: 'ing-olio', nome: 'Olio', area: 'dispensa' as const,
  unita: 'ml' as const, fabbisogno: 0, residuo: 0, confezioni: 0, quantitaTotale: 0,
  spuntato: false, origine: 'controllo' as const, mostraDettaglio: false,
};

function buildLista(): ListaSalvata {
  return {
    base: [
      { area: 'cereali', voci: [VOCE_RISO, VOCE_PASTA], controlli: [] },
      { area: 'dispensa', voci: [], controlli: [CONTROLLO_OLIO] },
    ],
    topup: [],
    baseListaId: 'lista-base-1',
    topupListaId: 'lista-topup-1',
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(leggiSettimanaCorrente).mockReset().mockResolvedValue(SETTIMANA);
  vi.mocked(leggiListe).mockReset();
  vi.mocked(spunta).mockReset().mockResolvedValue(undefined);
  vi.mocked(rispondiControllo).mockReset().mockResolvedValue(undefined);
});

describe('Lista', () => {
  it('mostra le sezioni con le tessere e il periodo della settimana', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);

    expect(await screen.findByText('Riso Carnaroli')).toBeInTheDocument();
    expect(screen.getByText('Pasta integrale')).toBeInTheDocument();
    expect(screen.getByText('24 AGO — 30 AGO')).toBeInTheDocument();
    // Solo la voce porzionabile (riso) mostra il sottotitolo.
    expect(screen.getByText('serve 820 g · in casa 0 g')).toBeInTheDocument();
  });

  it('il marchio segna mancante solo l\'area con voci non spuntate: un\'area con solo un controllo resta piena', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    const { container } = render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    const cereali = container.querySelector('[data-area="cereali"]');
    const dispensa = container.querySelector('[data-area="dispensa"]');
    // cereali ha due voci non spuntate: contornata (manca qualcosa).
    expect(cereali).toHaveAttribute('data-stato', 'vuoto');
    // dispensa ha zero voci (solo un controllo, che non conta per il marchio): piena.
    expect(dispensa).toHaveAttribute('data-stato', 'pieno');
  });

  it('il tap spunta subito in locale, accoda offline, e sincronizza se il server risponde', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);
    const tessera = await screen.findByText('Riso Carnaroli');

    fireEvent.click(tessera.closest('button')!);

    // Ottimistico: il nome è barrato subito, prima che il server risponda.
    expect(tessera.closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(leggiCoda()).toEqual([{ itemId: 'item-riso', spuntato: true, ts: expect.any(Number) }]);

    await waitFor(() => expect(spunta).toHaveBeenCalledWith('item-riso', true));
    // Scrittura riuscita: la coda si svuota.
    await waitFor(() => expect(leggiCoda()).toEqual([]));
  });

  it('se la scrittura fallisce la voce resta in coda invece di sparire', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    vi.mocked(spunta).mockRejectedValue(new Error('offline'));
    render(<Lista />);
    const tessera = await screen.findByText('Riso Carnaroli');

    fireEvent.click(tessera.closest('button')!);

    await waitFor(() => expect(spunta).toHaveBeenCalled());
    // Fallita: resta in coda, lo stato locale in attesa non si perde.
    expect(leggiCoda()).toEqual([{ itemId: 'item-riso', spuntato: true, ts: expect.any(Number) }]);
    expect(tessera.closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('una spunta accodata mentre la sincronizzazione della precedente è ancora in volo non si perde se poi fallisce', async () => {
    // Riproduce la corsa trovata in review: tap su riso parte una prima
    // sincronizzazione la cui scrittura resta pending; mentre è in volo,
    // tap su pasta accoda una seconda voce. Se riso risolve per primo, uno
    // svuotamento incondizionato della coda cancellerebbe anche pasta,
    // ancora da scrivere — e se la sua scrittura fallisce dopo, sparirebbe
    // senza che nessuno se ne accorga. Con la coalescenza a lucchetto, la
    // seconda sincronizzazione riparte da zero *dopo* la prima, con
    // un'istantanea fresca che contiene solo pasta.
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    let risolviRiso: () => void = () => {};
    let rifiutaPasta: (e: Error) => void = () => {};
    const chiamatePerVoce: Record<string, number> = {};
    vi.mocked(spunta).mockImplementation((itemId: string) => {
      chiamatePerVoce[itemId] = (chiamatePerVoce[itemId] ?? 0) + 1;
      if (itemId === 'item-riso') return new Promise<void>((resolve) => { risolviRiso = resolve; });
      return new Promise<void>((_resolve, reject) => { rifiutaPasta = reject; });
    });

    render(<Lista />);
    const risoBottone = (await screen.findByText('Riso Carnaroli')).closest('button')!;
    const pastaBottone = screen.getByText('Pasta integrale').closest('button')!;

    // Tap 1: riso. Parte la prima sincronizzazione, scrittura ancora pending.
    fireEvent.click(risoBottone);
    await waitFor(() => expect(spunta).toHaveBeenCalledWith('item-riso', true));

    // Tap 2, mentre la prima sincronizzazione è ancora in volo: pasta si
    // accoda. La seconda chiamata a sincronizzaCoda() deve accodarsi alla
    // prima (coalescere), non partire in parallelo con un'istantanea vecchia
    // che non contiene ancora pasta.
    fireEvent.click(pastaBottone);
    expect(leggiCoda().map((s) => s.itemId).sort()).toEqual(['item-pasta', 'item-riso']);
    expect(chiamatePerVoce['item-pasta']).toBeUndefined();

    // La scrittura di riso (la prima, quella già in volo) risolve per prima.
    risolviRiso();
    // Solo riso viene tolto dalla coda: pasta, ancora da scrivere, resta.
    await waitFor(() => expect(leggiCoda()).toEqual([{ itemId: 'item-pasta', spuntato: true, ts: expect.any(Number) }]));

    // La coalescenza deve aver fatto ripartire subito un giro per pasta.
    await waitFor(() => expect(chiamatePerVoce['item-pasta']).toBe(1));
    rifiutaPasta(new Error('offline'));

    // La scrittura di pasta fallisce: resta in coda, non sparisce.
    await waitFor(() => expect(leggiCoda()).toEqual([{ itemId: 'item-pasta', spuntato: true, ts: expect.any(Number) }]));
  });

  it('il tab TOP-UP mostra le sue sezioni, non quelle di BASE', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    fireEvent.click(screen.getByText('TOP-UP'));

    expect(screen.queryByText('Riso Carnaroli')).not.toBeInTheDocument();
    expect(screen.getByText('Niente da comprare qui.')).toBeInTheDocument();
  });

  it('i pulsanti SÌ/NO del controllo hanno un\'area di tap di almeno 44px', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);
    await screen.findByText('Olio: ne hai ancora?');

    const si = screen.getByRole('button', { name: /Sì, hai ancora Olio/ });
    const no = screen.getByRole('button', { name: /No, comprane una confezione di Olio/ });
    for (const bottone of [si, no]) {
      const stile = getComputedStyle(bottone);
      // padding verticale 0 + height 44 = 44px di area di tap, indipendente
      // dal box-sizing (nessuna % o unità relativa in gioco): letto dallo
      // stile calcolato del nodo reso da React Testing Library, non dedotto
      // dal solo codice sorgente.
      expect(stile.height).toBe('44px');
      expect(stile.paddingTop).toBe('0px');
      expect(stile.paddingBottom).toBe('0px');
      expect(parseFloat(stile.minWidth)).toBeGreaterThanOrEqual(44);
    }
  });

  it('"SÌ" su un controllo lo fa sparire senza toccare il server per il resto della lista', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);
    expect(await screen.findByText('Olio: ne hai ancora?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sì, hai ancora Olio/ }));

    await waitFor(() => expect(rispondiControllo).toHaveBeenCalledWith('ing-olio', 'lista-base-1', true));
    await waitFor(() => expect(screen.queryByText('Olio: ne hai ancora?')).not.toBeInTheDocument());
  });

  it('"NO" su un controllo lo converte e ricarica la lista dal server', async () => {
    const primaVolta = buildLista();
    const dopoLaRisposta: ListaSalvata = {
      ...primaVolta,
      base: [
        primaVolta.base[0],
        { area: 'dispensa', voci: [{ ...CONTROLLO_OLIO, confezioni: 1, quantitaTotale: 1000 }], controlli: [] },
      ],
    };
    vi.mocked(leggiListe).mockResolvedValueOnce(primaVolta).mockResolvedValueOnce(dopoLaRisposta);
    render(<Lista />);
    await screen.findByText('Olio: ne hai ancora?');

    fireEvent.click(screen.getByRole('button', { name: /No, comprane una confezione di Olio/ }));

    await waitFor(() => expect(rispondiControllo).toHaveBeenCalledWith('ing-olio', 'lista-base-1', false));
    await waitFor(() => expect(screen.queryByText('Olio: ne hai ancora?')).not.toBeInTheDocument());
    expect(await screen.findByText('Olio')).toBeInTheDocument();
    expect(leggiListe).toHaveBeenCalledTimes(2);
  });

  it('con un controllo ancora in sospeso non mostra il link per chiudere la spesa, anche se tutte le voci sono spuntate', async () => {
    const lista = buildLista();
    lista.base[0].voci = lista.base[0].voci.map((v) => ({ ...v, spuntato: true }));
    vi.mocked(leggiListe).mockResolvedValue(lista);
    render(<Lista />);
    await screen.findByText('Olio: ne hai ancora?');

    expect(screen.queryByRole('link', { name: 'HAI PRESO TUTTO' })).not.toBeInTheDocument();
  });

  it('quando ogni voce è spuntata e non resta nessun controllo in sospeso, mostra il link per chiudere la spesa', async () => {
    const lista = buildLista();
    lista.base[0].voci = lista.base[0].voci.map((v) => ({ ...v, spuntato: true }));
    lista.base[1].controlli = []; // il controllo sull'olio è stato risposto
    vi.mocked(leggiListe).mockResolvedValue(lista);
    render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    expect(screen.getByRole('link', { name: 'HAI PRESO TUTTO' })).toHaveAttribute('href', '/lista/fatta');
  });

  it('senza lista per la settimana mostra lo stato vuoto con il link alla Settimana', async () => {
    vi.mocked(leggiListe).mockResolvedValue(null);
    render(<Lista />);

    expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'VAI ALLA SETTIMANA' })).toHaveAttribute('href', '/settimana');
  });

  it('senza settimana corrente mostra lo stato vuoto senza pillola', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
    render(<Lista />);

    expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
    // La pillola della settimana è nel formato "24 AGO — 30 AGO": senza
    // settimana non c'è nulla da formattare, quindi niente em-dash in pagina.
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });
});
