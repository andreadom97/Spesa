import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ListaSalvata } from '@/data/lista';
import type { Dish } from '@/domain/types';

// La coda offline (src/offline/coda.ts) NON è mockata: gira per davvero su
// localStorage/jsdom, così questi test esercitano l'integrazione reale fra
// la pagina e la coda, non una controfigura.
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
  spunta: vi.fn(),
  allineaTopUp: vi.fn(),
}));
vi.mock('@/data/dispensa', () => ({
  rispondiControllo: vi.fn(),
}));
// Il repertorio si legge solo nel ramo "lista non trovata", per scegliere fra
// le due schede vuote (spec due-porte §2.4). Di default un piatto: i test
// che non parlano di repertorio vedono la scheda di sempre.
vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
}));

import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, spunta, allineaTopUp } from '@/data/lista';
import { rispondiControllo } from '@/data/dispensa';
import { leggiRepertorio } from '@/data/repertorio';
import { accodaSpunta, leggiCoda } from '@/offline/coda';
// Anche l'istantanea offline (src/offline/lista-cache.ts) gira per davvero
// su localStorage/jsdom: qui si prova l'integrazione fra la pagina e la copia
// locale, non una controfigura.
import { leggiIstantaneaLista, salvaIstantaneaLista } from '@/offline/lista-cache';
import Lista from '../page';

const SETTIMANA = { id: 'week-1', dataInizio: '2026-08-24', stato: 'confermata' as const, slots: [] };

const PIATTO: Dish = {
  id: 'd-1', nome: 'Pasta al pomodoro', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
};

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
  vi.mocked(allineaTopUp).mockReset().mockResolvedValue(0);
  vi.mocked(rispondiControllo).mockReset().mockResolvedValue(undefined);
  vi.mocked(leggiRepertorio).mockReset().mockResolvedValue([PIATTO]);
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

  // Corretto in sede di revisione finale (I10): prima un'area con solo un
  // controllo in sospeso risultava "piena" nel marchio, mentre tuttoFatto()
  // già richiedeva zero controlli oltre a ogni voce spuntata — l'utente
  // vedeva il marchio completo senza capire perché HAI PRESO TUTTO non
  // compariva. Ora un controllo in sospeso conta come "manca qualcosa"
  // anche per il marchio, non solo per il pulsante finale.
  it('il marchio segna mancante sia l\'area con voci non spuntate sia quella con un controllo ancora in sospeso', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    const { container } = render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    const cereali = container.querySelector('[data-area="cereali"]');
    const dispensa = container.querySelector('[data-area="dispensa"]');
    // cereali ha due voci non spuntate: contornata (manca qualcosa).
    expect(cereali).toHaveAttribute('data-stato', 'vuoto');
    // dispensa ha zero voci ma un controllo ancora in sospeso: manca
    // qualcosa anche lì, quindi il marchio non deve segnarla piena.
    expect(dispensa).toHaveAttribute('data-stato', 'vuoto');
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

  it('il conteggio delle voci è singolare con una sola voce, plurale altrimenti', async () => {
    const lista = buildLista();
    lista.base[0].voci = [VOCE_RISO]; // cereali: una sola voce
    // dispensa (buildLista) ha zero voci: resta plurale, "0 VOCI".
    vi.mocked(leggiListe).mockResolvedValue(lista);
    render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    expect(screen.getByText('1 VOCE')).toBeInTheDocument();
    expect(screen.getByText('0 VOCI')).toBeInTheDocument();
  });

  it('i pulsanti BASE e TOP-UP hanno un nome accessibile col conteggio da prendere', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    render(<Lista />);
    await screen.findByText('Riso Carnaroli');

    expect(screen.getByRole('button', { name: 'Base, 2 da prendere' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top-up, 0 da prendere' })).toBeInTheDocument();
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

  // Stati vuoti collegati alle porte (spec due-porte §2.4): senza piatti
  // "vai alla settimana" è un vicolo cieco, perché la settimana non ha nulla
  // da assegnare. La scheda manda prima ai piatti.
  it('senza settimana e con repertorio vuoto manda ai piatti, non alla settimana', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    render(<Lista />);

    expect(await screen.findByText('Prima servono i piatti')).toBeInTheDocument();
    expect(screen.getByText('La lista nasce dai piatti che mangi: dicci quali sono e da lì la settimana e la spesa si costruiscono da sole.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'COMINCIA DAI PIATTI' })).toHaveAttribute('href', '/piatti');
    expect(screen.queryByText('La lista non c’è ancora')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'VAI ALLA SETTIMANA' })).not.toBeInTheDocument();
  });

  it('con settimana ma senza lista, a repertorio vuoto, manda comunque ai piatti', async () => {
    vi.mocked(leggiListe).mockResolvedValue(null);
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    render(<Lista />);

    expect(await screen.findByText('Prima servono i piatti')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'COMINCIA DAI PIATTI' })).toHaveAttribute('href', '/piatti');
  });

  it('senza settimana ma con almeno un piatto resta la scheda di sempre, verso la settimana', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO]);
    render(<Lista />);

    expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'VAI ALLA SETTIMANA' })).toHaveAttribute('href', '/settimana');
    expect(screen.queryByText('Prima servono i piatti')).not.toBeInTheDocument();
  });

  it('se la lettura del repertorio fallisce si comporta come con piatti: scheda di sempre, nessun errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
    vi.mocked(leggiRepertorio).mockRejectedValue(new Error('rete assente'));
    render(<Lista />);

    expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'VAI ALLA SETTIMANA' })).toHaveAttribute('href', '/settimana');
    expect(screen.queryByText('Non riusciamo a caricare la lista. Riprova più tardi.')).not.toBeInTheDocument();
    expect(errore).toHaveBeenCalledWith('lista: lettura del repertorio fallita.', expect.any(Error));
    errore.mockRestore();
  });

  it('le voci gia prese scendono in fondo, e la grande in cima e la prossima', async () => {
    // In corsia la tessera grande e' quella da prendere adesso: lasciarci una
    // voce gia' spuntata significa leggere in grande una cosa gia' fatta.
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(SETTIMANA);
    vi.mocked(leggiListe).mockResolvedValue({
      base: [
        {
          area: 'cereali' as const,
          voci: [
            { ...VOCE_RISO, spuntato: true },
            { ...VOCE_PASTA, spuntato: false },
          ],
          controlli: [],
        },
      ],
      topup: [],
      baseListaId: 'l-base',
      topupListaId: 'l-topup',
    });

    render(<Lista />);

    await screen.findByText('Pasta integrale');
    const etichette = screen
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
      .filter((l): l is string => !!l && (l.startsWith('Riso Carnaroli') || l.startsWith('Pasta integrale')));
    expect(etichette[0]).toMatch(/^Pasta integrale/);
    expect(etichette[1]).toMatch(/^Riso Carnaroli/);
  });

  // La lista in due (spec casa-condivisa §5): due telefoni sulla stessa
  // lista non si vedono finché non ricaricano. Al ritorno in primo piano la
  // pagina rilegge le liste, con la coda offline applicata sopra.
  describe('ritorno in primo piano', () => {
    const VOCE_UOVA = {
      id: 'item-uova', ingredientId: 'ing-uova', nome: 'Uova', area: 'latticini' as const,
      unita: 'pz' as const, fabbisogno: 6, residuo: 0, confezioni: 1, quantitaTotale: 6,
      spuntato: false, origine: 'manuale' as const, mostraDettaglio: false,
    };

    function simulaVisibilita(stato: 'visible' | 'hidden') {
      Object.defineProperty(document, 'visibilityState', { value: stato, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    afterEach(() => {
      // La proprietà definita sull'istanza nasconde il getter del prototipo: si toglie, così jsdom torna al suo.
      delete (document as unknown as Record<string, unknown>).visibilityState;
    });

    it('quando il documento torna visibile rilegge leggiListe (non allineaTopUp) e mostra la nuova voce', async () => {
      const prima = buildLista();
      const dopo: ListaSalvata = {
        ...prima,
        base: [
          { area: 'cereali', voci: [VOCE_RISO, { ...VOCE_PASTA, spuntato: true }], controlli: [] },
          { area: 'dispensa', voci: [], controlli: [CONTROLLO_OLIO] },
          { area: 'latticini', voci: [VOCE_UOVA], controlli: [] },
        ],
      };
      vi.mocked(leggiListe).mockResolvedValueOnce(prima).mockResolvedValueOnce(dopo);
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');
      expect(screen.queryByText('Uova')).not.toBeInTheDocument();
      expect(allineaTopUp).toHaveBeenCalledTimes(1);

      simulaVisibilita('visible');

      expect(await screen.findByText('Uova')).toBeInTheDocument();
      // L'altro telefono ha spuntato la pasta: qui si vede.
      expect(screen.getByText('Pasta integrale').closest('button')).toHaveAttribute('aria-pressed', 'true');
      expect(leggiListe).toHaveBeenCalledTimes(2);
      expect(leggiListe).toHaveBeenLastCalledWith('week-1');
      expect(allineaTopUp).toHaveBeenCalledTimes(1);
    });

    it('una spunta locale ancora in coda vince sulla rilettura', async () => {
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      vi.mocked(spunta).mockRejectedValue(new Error('offline'));
      render(<Lista />);
      const tessera = await screen.findByText('Riso Carnaroli');
      fireEvent.click(tessera.closest('button')!);
      await waitFor(() => expect(spunta).toHaveBeenCalled());
      expect(leggiCoda()).toHaveLength(1);

      simulaVisibilita('visible');

      await waitFor(() => expect(leggiListe).toHaveBeenCalledTimes(2));
      // Il server dice "non spuntata", la coda dice "spuntata": la coda ha ragione.
      await waitFor(() => expect(screen.getByText('Riso Carnaroli').closest('button')).toHaveAttribute('aria-pressed', 'true'));
    });

    it('se il documento va in secondo piano non rilegge nulla', async () => {
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');

      simulaVisibilita('hidden');

      await new Promise((r) => setTimeout(r, 0));
      expect(leggiListe).toHaveBeenCalledTimes(1);
    });

    it('se la rilettura fallisce la lista resta com\'è e l\'errore va in console', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(leggiListe).mockResolvedValueOnce(buildLista()).mockRejectedValueOnce(new Error('rete'));
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');

      simulaVisibilita('visible');

      await waitFor(() => expect(leggiListe).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(errore).toHaveBeenCalledWith('lista: rilettura al ritorno in primo piano fallita.', expect.any(Error)));
      expect(screen.getByText('Riso Carnaroli')).toBeInTheDocument();
      expect(screen.getByText('Pasta integrale')).toBeInTheDocument();
      expect(screen.queryByText('Non riusciamo a caricare la lista. Riprova più tardi.')).not.toBeInTheDocument();
      errore.mockRestore();
    });

    it('allo smontaggio il listener se ne va: nessuna rilettura dopo', async () => {
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      const { unmount } = render(<Lista />);
      await screen.findByText('Riso Carnaroli');
      unmount();

      simulaVisibilita('visible');

      await new Promise((r) => setTimeout(r, 0));
      expect(leggiListe).toHaveBeenCalledTimes(1);
    });

    it('una rilettura riuscita aggiorna l\'istantanea offline con la lista come letta', async () => {
      const prima = buildLista();
      const dopo: ListaSalvata = {
        ...prima,
        base: [
          { area: 'cereali', voci: [VOCE_RISO, { ...VOCE_PASTA, spuntato: true }], controlli: [] },
          { area: 'dispensa', voci: [], controlli: [CONTROLLO_OLIO] },
        ],
      };
      vi.mocked(leggiListe).mockResolvedValueOnce(prima).mockResolvedValueOnce(dopo);
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');
      expect(leggiIstantaneaLista()?.lista).toEqual(prima);

      simulaVisibilita('visible');

      await waitFor(() => expect(leggiIstantaneaLista()?.lista).toEqual(dopo));
      expect(leggiIstantaneaLista()).toMatchObject({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO' });
    });
  });

  // La rete decide, la copia ripara (spec lista-offline §1): senza risposta
  // dal server si mostra l'ultima lista vista con rete, con la coda sopra e
  // una riga che dice che è una copia; al ritorno della rete si rilegge.
  describe('offline', () => {
    const RIGA_OFFLINE = 'Sei offline: questa è la lista di 24 AGO — 30 AGO salvata l\'ultima volta che l\'hai aperta. Le spunte si sincronizzano appena torna la rete.';
    const VOCE_UOVA = {
      id: 'item-uova', ingredientId: 'ing-uova', nome: 'Uova', area: 'latticini' as const,
      unita: 'pz' as const, fabbisogno: 6, residuo: 0, confezioni: 1, quantitaTotale: 6,
      spuntato: false, origine: 'manuale' as const, mostraDettaglio: false,
    };
    let errore: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      errore.mockRestore();
    });

    function salvaIstantaneaDiProva(lista: ListaSalvata = buildLista()) {
      salvaIstantaneaLista({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', lista });
    }

    it('se la lettura fallisce e c\'è un\'istantanea, mostra quella con la riga "Sei offline"', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      render(<Lista />);

      expect(await screen.findByText('Riso Carnaroli')).toBeInTheDocument();
      expect(screen.getByText('Pasta integrale')).toBeInTheDocument();
      expect(screen.getByText('24 AGO — 30 AGO')).toBeInTheDocument();
      expect(screen.getByText(RIGA_OFFLINE)).toBeInTheDocument();
      expect(screen.queryByText('Non riusciamo a caricare la lista. Riprova più tardi.')).not.toBeInTheDocument();
      expect(errore).toHaveBeenCalledWith('lista: caricamento fallito.', expect.any(Error));
      expect(leggiListe).not.toHaveBeenCalled();
    });

    it('sull\'istantanea si applica la coda: una spunta in attesa risulta spuntata', async () => {
      salvaIstantaneaDiProva();
      accodaSpunta('item-riso', true);
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      render(<Lista />);

      const riso = await screen.findByText('Riso Carnaroli');
      expect(riso.closest('button')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Pasta integrale').closest('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('offline si può spuntare come sempre: la voce va in coda', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      vi.mocked(spunta).mockRejectedValue(new Error('rete assente'));
      render(<Lista />);
      const pasta = await screen.findByText('Pasta integrale');

      fireEvent.click(pasta.closest('button')!);

      expect(pasta.closest('button')).toHaveAttribute('aria-pressed', 'true');
      await waitFor(() => expect(spunta).toHaveBeenCalledWith('item-pasta', true));
      expect(leggiCoda()).toEqual([{ itemId: 'item-pasta', spuntato: true, ts: expect.any(Number) }]);
      // La copia locale non si tocca: la coda è l'unico posto dello stato in attesa.
      expect(leggiIstantaneaLista()?.lista).toEqual(buildLista());
    });

    it('se la lettura fallisce e non c\'è un\'istantanea, mostra l\'errore di sempre', async () => {
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      render(<Lista />);

      expect(await screen.findByText('Non riusciamo a caricare la lista. Riprova più tardi.')).toBeInTheDocument();
      expect(screen.queryByText(/Sei offline/)).not.toBeInTheDocument();
    });

    it('con un\'istantanea malformata si comporta come senza istantanea', async () => {
      localStorage.setItem('spesa:lista', '{"weekId": 1}');
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      render(<Lista />);

      expect(await screen.findByText('Non riusciamo a caricare la lista. Riprova più tardi.')).toBeInTheDocument();
    });

    it('con la rete la riga non c\'è', async () => {
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');

      expect(screen.queryByText(/Sei offline/)).not.toBeInTheDocument();
    });

    it('una lettura riuscita salva l\'istantanea con la lista come letta, senza la coda', async () => {
      // Una spunta ancora in coda (scrittura fallita) si vede sullo schermo
      // ma non entra nell'istantanea: altrimenti verrebbe contata due volte
      // o "disfatta" alla prossima rilettura.
      accodaSpunta('item-riso', true);
      vi.mocked(spunta).mockRejectedValue(new Error('rete'));
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      render(<Lista />);

      const riso = await screen.findByText('Riso Carnaroli');
      expect(riso.closest('button')).toHaveAttribute('aria-pressed', 'true');

      const istantanea = leggiIstantaneaLista();
      expect(istantanea).toMatchObject({ weekId: 'week-1', settimanaLabel: '24 AGO — 30 AGO', salvataIl: expect.any(Number) });
      expect(istantanea?.lista).toEqual(buildLista());
      expect(istantanea?.lista.base[0].voci[0].spuntato).toBe(false);
    });

    it('con settimana ma senza lista (nonTrovata) cancella l\'istantanea', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiListe).mockResolvedValue(null);
      render(<Lista />);

      expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
      expect(leggiIstantaneaLista()).toBeNull();
    });

    it('senza settimana corrente (nonTrovata) cancella l\'istantanea', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
      render(<Lista />);

      expect(await screen.findByText('La lista non c’è ancora')).toBeInTheDocument();
      expect(leggiIstantaneaLista()).toBeNull();
    });

    it('al ritorno della rete rilegge la settimana dell\'istantanea: la riga sparisce e la lista è quella fresca', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      const fresca: ListaSalvata = {
        ...buildLista(),
        base: [
          { area: 'cereali', voci: [VOCE_RISO, { ...VOCE_PASTA, spuntato: true }], controlli: [] },
          { area: 'latticini', voci: [VOCE_UOVA], controlli: [] },
        ],
      };
      vi.mocked(leggiListe).mockResolvedValue(fresca);
      render(<Lista />);
      await screen.findByText(RIGA_OFFLINE);
      expect(screen.queryByText('Uova')).not.toBeInTheDocument();

      window.dispatchEvent(new Event('online'));

      expect(await screen.findByText('Uova')).toBeInTheDocument();
      expect(screen.queryByText(RIGA_OFFLINE)).not.toBeInTheDocument();
      expect(screen.getByText('Pasta integrale').closest('button')).toHaveAttribute('aria-pressed', 'true');
      expect(leggiListe).toHaveBeenCalledTimes(1);
      expect(leggiListe).toHaveBeenCalledWith('week-1');
      // Solo leggiListe, come al ritorno in primo piano: non si rifà il caricamento intero.
      expect(allineaTopUp).not.toHaveBeenCalled();
      // L'istantanea si aggiorna con la lista fresca.
      expect(leggiIstantaneaLista()?.lista).toEqual(fresca);
    });

    it('al ritorno della rete, se la settimana dell\'istantanea non esiste più, la copia resta com\'è', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      vi.mocked(leggiListe).mockResolvedValue(null);
      render(<Lista />);
      await screen.findByText(RIGA_OFFLINE);

      window.dispatchEvent(new Event('online'));

      await waitFor(() => expect(leggiListe).toHaveBeenCalledWith('week-1'));
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByText(RIGA_OFFLINE)).toBeInTheDocument();
      expect(screen.getByText('Riso Carnaroli')).toBeInTheDocument();
      expect(leggiIstantaneaLista()?.lista).toEqual(buildLista());
    });

    it('al ritorno della rete, se la rilettura fallisce, la copia resta e l\'errore va in console', async () => {
      salvaIstantaneaDiProva();
      vi.mocked(leggiSettimanaCorrente).mockRejectedValue(new Error('rete assente'));
      vi.mocked(leggiListe).mockRejectedValue(new Error('ancora niente rete'));
      render(<Lista />);
      await screen.findByText(RIGA_OFFLINE);

      window.dispatchEvent(new Event('online'));

      await waitFor(() => expect(errore).toHaveBeenCalledWith('lista: rilettura al ritorno online fallita.', expect.any(Error)));
      expect(screen.getByText(RIGA_OFFLINE)).toBeInTheDocument();
      expect(screen.getByText('Riso Carnaroli')).toBeInTheDocument();
    });

    it('con la rete, l\'evento online sincronizza la coda ma non rilegge', async () => {
      vi.mocked(leggiListe).mockResolvedValue(buildLista());
      render(<Lista />);
      await screen.findByText('Riso Carnaroli');

      window.dispatchEvent(new Event('online'));

      await new Promise((r) => setTimeout(r, 0));
      expect(leggiListe).toHaveBeenCalledTimes(1);
    });
  });
});
