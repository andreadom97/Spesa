import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ListaSalvata } from '@/data/lista';
import type { VoceEvitata } from '@/domain/list-builder';

vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
  chiudiSpesa: vi.fn(),
}));
vi.mock('@/data/risparmio', () => ({
  leggiRisparmioSettimana: vi.fn(),
}));
vi.mock('../guardia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../guardia')>()),
  adesso: vi.fn(),
}));

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
}));

import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, chiudiSpesa } from '@/data/lista';
import { leggiRisparmioSettimana } from '@/data/risparmio';
import { SlotDockProvider } from '@/components/dock-slot';
import { adesso } from '../guardia';
import ListaFatta from '../page';

const SETTIMANA = { id: 'week-1', dataInizio: '2026-08-24', stato: 'confermata' as const, slots: [] };

/** Una lista davvero finita: ogni voce spuntata, nessun controllo in sospeso. */
function listaFinita(): ListaSalvata {
  return {
    base: [
      {
        area: 'cereali',
        voci: [{
          id: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', area: 'cereali', unita: 'g',
          fabbisogno: 820, residuo: 0, confezioni: 1, quantitaTotale: 1000,
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

function voce(overrides: Partial<VoceEvitata>): VoceEvitata {
  return {
    ingredientId: 'ing-x', nome: 'X', unita: 'g', fabbisogno: 500,
    confezioniIngenue: 1, confezioniReali: 0, confezioniEvitate: 1, quantitaEvitata: 500,
    prezzoConfezione: null,
    ...overrides,
  };
}

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  vi.mocked(leggiSettimanaCorrente).mockReset().mockResolvedValue(SETTIMANA);
  vi.mocked(leggiListe).mockReset().mockResolvedValue(listaFinita());
  vi.mocked(chiudiSpesa).mockReset().mockResolvedValue(undefined);
  vi.mocked(leggiRisparmioSettimana).mockReset().mockResolvedValue([]);
  orologio = 0;
  vi.mocked(adesso).mockReset().mockImplementation(() => orologio);
});

/** L'orologio della guardia: fermo a 0 quando il tasto compare, poi lo si sposta a mano. */
let orologio = 0;

/**
 * La pagina con uno slot vero per il Dock, come nel Guscio. Lo slot si attacca al body
 * dopo il render: così nel documento viene dopo il corpo della pagina, come nell'app.
 */
function monta() {
  const slot = document.createElement('div');
  const esito = render(<SlotDockProvider slot={slot}><ListaFatta /></SlotDockProvider>);
  document.body.appendChild(slot);
  return esito;
}

/** Il primo tocco utile: la guardia è passata. */
function oltreLaGuardia() {
  orologio = 10_000;
}

/** Una lista a metà: una voce non spuntata, il traguardo non è raggiungibile. */
function listaAMeta(): ListaSalvata {
  const l = listaFinita();
  l.base[0].voci[0].spuntato = false;
  return l;
}

describe('Lista fatta — accesso', () => {
  it('a settimana chiusa rimanda a /piano senza leggere le liste', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({ ...SETTIMANA, stato: 'chiusa' });

    monta();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
    expect(leggiListe).not.toHaveBeenCalled();
    expect(leggiRisparmioSettimana).not.toHaveBeenCalled();
    expect(screen.queryByText('Hai preso tutto')).not.toBeInTheDocument();
  });

  it('senza settimana rimanda a /lista senza leggere le liste, senza Dock', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);

    monta();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/lista'));
    expect(leggiListe).not.toHaveBeenCalled();
    expect(leggiRisparmioSettimana).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
  });

  it('con la lista non finita rimanda a /lista, senza Dock', async () => {
    vi.mocked(leggiListe).mockResolvedValue(listaAMeta());

    monta();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/lista'));
    expect(leggiRisparmioSettimana).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
  });
});

describe('Lista fatta — CONFEZIONI DIVERSE? SCANSIONA', () => {
  it('il link alle confezioni sta prima di CHIUDI LA SPESA e porta a /lista/confezioni', async () => {
    monta();

    const link = await screen.findByRole('link', { name: 'CONFEZIONI DIVERSE? SCANSIONA' });
    expect(link).toHaveAttribute('href', '/lista/confezioni');
    const chiudi = screen.getByRole('button', { name: 'CHIUDI LA SPESA' });
    expect(link.compareDocumentPosition(chiudi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.style.minHeight).toBe('44px');
  });
});

describe('Lista fatta — NON RICOMPRATO QUESTA SETTIMANA', () => {
  it('con evitate > 0 e prezzi su tutti mostra confezioni, quantità ed euro, senza riga secondaria', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: 3 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400, prezzoConfezione: 5.4 }),
    ]);

    monta();

    expect(await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA')).toBeInTheDocument();
    expect(screen.getByText('3 confezioni · 1,4 kg · circa 11 €')).toBeInTheDocument();
    expect(screen.queryByText(/ingredienti con prezzo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/metti un prezzo/)).not.toBeInTheDocument();
    expect(leggiRisparmioSettimana).toHaveBeenCalledWith('week-1');
  });

  it('la scheda sta sopra "CHIUDENDO LA SPESA"', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([voce({ prezzoConfezione: 2 })]);

    const { container } = monta();
    await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA');

    const testo = container.textContent ?? '';
    const posRicomprato = testo.indexOf('NON RICOMPRATO QUESTA SETTIMANA');
    const posChiudendo = testo.indexOf('CHIUDENDO LA SPESA');
    expect(posRicomprato).toBeGreaterThanOrEqual(0);
    expect(posChiudendo).toBeGreaterThan(posRicomprato);
  });

  it('senza nessun prezzo la riga principale non ha gli euro e invita a metterli', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400 }),
    ]);

    monta();

    expect(await screen.findByText('3 confezioni · 1,4 kg')).toBeInTheDocument();
    expect(screen.getByText('metti un prezzo agli ingredienti per vederlo in euro')).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('con prezzi solo su una parte dice su quanti ingredienti è calcolato', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: 3 }),
      voce({ ingredientId: 'ing-olio', nome: 'Olio', unita: 'ml', confezioniEvitate: 1, quantitaEvitata: 750, prezzoConfezione: 6 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400 }),
    ]);

    monta();

    expect(await screen.findByText('4 confezioni · 1,4 kg · 750 ml · circa 12 €')).toBeInTheDocument();
    expect(screen.getByText('su 2 ingredienti con prezzo')).toBeInTheDocument();
    expect(screen.queryByText(/metti un prezzo/)).not.toBeInTheDocument();
  });

  it('con una sola confezione usa il singolare', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ unita: 'pz', confezioniEvitate: 1, quantitaEvitata: 6, prezzoConfezione: 0.5 }),
    ]);

    monta();

    expect(await screen.findByText('1 confezione · 6 pz · meno di 1 €')).toBeInTheDocument();
  });

  it('con evitate = 0 ma ingredienti nel denominatore dice che il residuo si costruisce', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ confezioniIngenue: 1, confezioniReali: 1, confezioniEvitate: 0, quantitaEvitata: 0, prezzoConfezione: 3 }),
    ]);

    monta();

    expect(await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA')).toBeInTheDocument();
    expect(screen.getByText('Niente, questa settimana: il residuo si costruisce spesa dopo spesa')).toBeInTheDocument();
    expect(screen.queryByText(/confezion/)).not.toBeInTheDocument();
  });

  it('senza righe la scheda non compare', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([]);

    monta();

    expect(await screen.findByText('CHIUDENDO LA SPESA')).toBeInTheDocument();
    expect(screen.queryByText('NON RICOMPRATO QUESTA SETTIMANA')).not.toBeInTheDocument();
  });

  it('se la lettura del risparmio fallisce la pagina resta usabile e si chiude lo stesso', async () => {
    // Il contatore è un di più: non deve mai bloccare "Hai preso tutto" né la chiusura.
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiRisparmioSettimana).mockRejectedValue(new Error('rete'));

    monta();

    expect(await screen.findByText('Hai preso tutto')).toBeInTheDocument();
    expect(screen.queryByText('NON RICOMPRATO QUESTA SETTIMANA')).not.toBeInTheDocument();
    expect(errore).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    oltreLaGuardia();
    fireEvent.click(screen.getByRole('button', { name: 'CHIUDI LA SPESA' }));
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledWith('week-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano'));

    errore.mockRestore();
  });
});

describe('Lista fatta — CHIUDENDO LA SPESA dice la cadenza (decisione di Andrea del 26/09)', () => {
  it.each([
    [30, 'fra un mese'],
    [60, 'fra 2 mesi'],
    [90, 'fra 3 mesi'],
  ] as const)('con la cadenza a %i giorni dice «%s»', async (g, pezzo) => {
    vi.mocked(leggiListe).mockResolvedValue({ ...listaFinita(), giorniControllo: g });
    monta();
    expect(await screen.findByText(
      `L’app registra cosa hai comprato e quando. Serve solo a ricordarti ${pezzo} che l’olio sta per finire: non lo vedi da nessuna parte finché non serve.`,
    )).toBeInTheDocument();
  });

  it('una lista senza cadenza (istantanea offline di prima della fase 5) dice fra 3 mesi', async () => {
    monta();
    expect(await screen.findByText(/ricordarti fra 3 mesi che l’olio/)).toBeInTheDocument();
    expect(screen.queryByText(/90 giorni/)).not.toBeInTheDocument();
  });
});

describe('Lista fatta — Testata, Dock e guardia (spec fase 6 §A)', () => {
  it('titolo Fine spesa, pillola Torna alla lista e pillola settimana', async () => {
    monta();

    expect(await screen.findByRole('heading', { level: 1, name: 'Fine spesa' })).toBeInTheDocument();
    expect(screen.getByText('Settimana del 24 agosto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla lista' }));
    expect(push).toHaveBeenCalledWith('/lista');
    expect(screen.queryByRole('link', { name: 'TORNA ALLA LISTA' })).not.toBeInTheDocument();
  });

  it('CHIUDI LA SPESA sta nel Dock, la regione Azione principale', async () => {
    monta();

    const regione = await screen.findByRole('region', { name: 'Azione principale' });
    expect(within(regione).getByRole('button', { name: 'CHIUDI LA SPESA' })).toHaveClass('dock-primario');
  });

  it('in caricamento: CARICO… e niente Dock', async () => {
    vi.mocked(leggiListe).mockReturnValue(new Promise(() => {}));
    monta();

    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
  });

  it('errore di caricamento: il messaggio in --errore e niente Dock', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiListe).mockRejectedValue(new Error('rete'));
    monta();

    const msg = await screen.findByText('Non riusciamo a caricare la spesa. Riprova più tardi.');
    expect(msg.style.color).toBe('var(--errore)');
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('la guardia: un tocco entro 400 ms dalla comparsa si ignora, quello a 400 chiude', async () => {
    monta();
    const chiudi = await screen.findByRole('button', { name: 'CHIUDI LA SPESA' });

    orologio = 399;
    fireEvent.click(chiudi);
    expect(chiudiSpesa).not.toHaveBeenCalled();

    orologio = 400;
    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledWith('week-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano'));
  });

  // Il test sotto era intermittente: l'istante di comparsa del tasto si segnava in un
  // useEffect, un task dopo il commit. Se l'orologio andava oltre la guardia in quel frattempo,
  // la comparsa risultava «adesso» e il tocco successivo veniva ignorato. Qui l'orologio si
  // sposta proprio lì: la comparsa deve essere già segnata col valore del commit.
  it('la guardia conta dal commit in cui il tasto compare, non da un frame dopo', async () => {
    const osservatore = new MutationObserver(() => {
      if (!screen.queryByRole('button', { name: 'CHIUDI LA SPESA' })) return;
      osservatore.disconnect();
      oltreLaGuardia();
    });
    osservatore.observe(document.body, { childList: true, subtree: true });
    monta();
    const chiudi = await screen.findByRole('button', { name: 'CHIUDI LA SPESA' });
    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledWith('week-1'));
  });

  it('in volo il tasto è disabled; se la chiusura fallisce, il messaggio e si riprova', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rifiuta: (e: Error) => void = () => {};
    vi.mocked(chiudiSpesa).mockReturnValueOnce(new Promise((_, r) => { rifiuta = r; }));
    monta();
    const chiudi = await screen.findByRole('button', { name: 'CHIUDI LA SPESA' });
    oltreLaGuardia();

    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudi).toBeDisabled());
    rifiuta(new Error('rete'));

    const msg = await screen.findByRole('alert');
    expect(msg).toHaveTextContent('Non siamo riusciti a chiudere la spesa. Riprova.');
    expect(chiudi).not.toBeDisabled();
    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledTimes(2));
    errore.mockRestore();
  });

  it('il Marchio è pieno, lato 20, e il testo che informa è in --testo-2', async () => {
    const { container } = monta();

    await screen.findByText('Hai preso tutto');
    const caselle = container.querySelectorAll('[data-area]');
    expect(caselle).toHaveLength(6);
    caselle.forEach((c) => {
      expect(c).toHaveAttribute('data-stato', 'pieno');
      expect((c as HTMLElement).style.width).toBe('20px');
    });
    expect(screen.getByText(/voci su 1, 6 aree finite/).style.color).toBe('var(--testo-2)');
  });

  it('lo scroller usa "safe center": a contenuto più alto dello spazio la prima scheda resta raggiungibile (rilievo I1)', async () => {
    monta();

    await screen.findByText('Hai preso tutto');
    const scroller = document.querySelector('.scroll-app.con-dock') as HTMLElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.style.justifyContent).toBe('safe center');
  });
});
