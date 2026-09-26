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
// I tetti (FORMATO_MAX, CONFEZIONI_MAX) restano quelli veri: la pagina li
// condivide col data layer, e il test deve provare gli stessi limiti.
vi.mock('@/data/confezioni', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/confezioni')>()),
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

function listaAMeta(): ListaSalvata {
  const l = listaFinita();
  l.base[0].voci[0].spuntato = false;
  return l;
}

/** Pasta: fabbisogno 820 g, residuo 0, formato assunto 1000 → 1 confezione. */
function voce(overrides: Partial<VoceComprata>): VoceComprata {
  return {
    itemId: 'item-pasta', ingredientId: 'ing-pasta', nome: 'Pasta', unita: 'g', classeResiduo: 'porzionabile',
    fabbisogno: 820, residuo: 0, confezioni: 1, formato: 1000, quantitaTotale: 1000, ean: null,
    ...overrides,
  };
}

function vociMiste(): VoceComprata[] {
  return [
    voce({}),
    voce({ itemId: 'item-uova', ingredientId: 'ing-uova', nome: 'Uova', unita: 'pz', classeResiduo: 'intero', fabbisogno: 1, confezioni: 1, formato: 1, quantitaTotale: 1 }),
    voce({ itemId: 'item-insalata', ingredientId: 'ing-insalata', nome: 'Insalata', classeResiduo: 'stima', fabbisogno: 200, confezioni: 1, formato: 200, quantitaTotale: 200 }),
  ];
}

function rispostaJson(corpo: unknown, ok = true, status = 200, redirected = false): Response {
  return { ok, status, redirected, json: async () => corpo } as unknown as Response;
}

const OFF_500G = { trovato: true, nome: 'Spaghetti n. 5', marca: 'Barilla', quantita: { valore: 500, unita: 'g' } };

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

/** Apre il foglio sulla voce, digita il codice (in jsdom la fotocamera non c'è) e preme CERCA IL CODICE. */
async function scansiona(codice = EAN, nome = 'Pasta') {
  fireEvent.click(await screen.findByRole('button', { name: `Scansiona ${nome}` }));
  const campo = await screen.findByLabelText('Codice a barre');
  fireEvent.change(campo, { target: { value: codice } });
  fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));
}

describe('Confezioni — accesso ed elenco', () => {
  it('mostra solo le voci porzionabili, con N × formato esatto e SCANSIONA', async () => {
    render(<Confezioni />);

    expect(await screen.findByText('Pasta')).toBeInTheDocument();
    // La quantità esatta, non "1,0 kg": qui si confrontano formati.
    expect(screen.getByText('1 × 1000 g')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scansiona Pasta' })).toBeInTheDocument();
    expect(screen.queryByText('Uova')).not.toBeInTheDocument();
    expect(screen.queryByText('Insalata')).not.toBeInTheDocument();
    expect(leggiVociComprate).toHaveBeenCalledWith('week-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Confezioni' })).toBeInTheDocument();
    expect(screen.queryByText('Le confezioni vere')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TORNA A HAI PRESO TUTTO' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna a fine spesa' }));
    expect(push).toHaveBeenCalledWith('/lista/fatta');
    expect(replace).not.toHaveBeenCalled();
  });

  it('un formato non tondo si mostra com\'è (1250 g, non 1,3 kg)', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([voce({ confezioni: 2, formato: 1250, quantitaTotale: 2500 })]);

    render(<Confezioni />);

    expect(await screen.findByText('2 × 1250 g')).toBeInTheDocument();
  });

  it('senza voci porzionabili lo dice', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue(vociMiste().filter((v) => v.classeResiduo !== 'porzionabile'));

    render(<Confezioni />);

    expect(await screen.findByText('Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Scansiona / })).not.toBeInTheDocument();
  });

  it('senza settimana rimanda a /lista', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);

    render(<Confezioni />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/lista'));
    expect(leggiVociComprate).not.toHaveBeenCalled();
  });

  it('a settimana chiusa rimanda a /piano senza leggere le liste', async () => {
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({ ...SETTIMANA, stato: 'chiusa' });

    render(<Confezioni />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
    expect(leggiListe).not.toHaveBeenCalled();
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
  it('quantità diversa: propone le confezioni necessarie col formato nuovo e chiede quante se ne sono comprate', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));

    render(<Confezioni />);
    await scansiona();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/prodotto/${EAN}`));
    expect(await screen.findByText('Barilla · Spaghetti n. 5 · 500 g')).toBeInTheDocument();
    expect(screen.getByText('La confezione è 500 g, nel formato avevi 1000 g. Aggiorno per questa settimana e per le prossime?')).toBeInTheDocument();
    // 820 g con confezioni da 500 → ceil(820/500) = 2; la lista ne chiedeva 1 da 1000.
    expect(screen.getByText('Con confezioni da 500 g ne bastano 2 (la lista ne chiedeva 1). Quante ne hai comprate?')).toBeInTheDocument();
    const campo = screen.getByLabelText('Confezioni comprate');
    expect(campo).toHaveAttribute('inputmode', 'numeric');
    expect(campo).toHaveValue('2');
    // Il lettore è stato smontato: niente campo del codice.
    expect(screen.queryByLabelText('Codice a barre')).not.toBeInTheDocument();

    fireEvent.change(campo, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: EAN, confezioni: 3,
      }),
    );
    expect(await screen.findByText('3 × 500 g · AGGIORNATO')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('senza toccare il campo AGGIORNA scrive le confezioni proposte', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith(expect.objectContaining({ formato: 500, confezioni: 2 })),
    );
    expect(await screen.findByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
  });

  it('lo scenario della review: 800 g, formato assunto 500 → 2; il pacco è da 1 kg e se ne prende 1', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([voce({ fabbisogno: 800, confezioni: 2, formato: 500, quantitaTotale: 1000 })]);
    fetchMock.mockResolvedValue(rispostaJson({ ...OFF_500G, quantita: { valore: 1000, unita: 'g' } }));

    render(<Confezioni />);
    expect(await screen.findByText('2 × 500 g')).toBeInTheDocument();
    await scansiona();

    expect(await screen.findByText('Con confezioni da 1000 g ne bastano 1 (la lista ne chiedeva 2). Quante ne hai comprate?')).toBeInTheDocument();
    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('1');
    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    // Non 2 × 1000 = 2000 (che gonfierebbe il residuo di un chilo): 1 × 1000.
    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith(expect.objectContaining({ formato: 1000, confezioni: 1 })),
    );
    expect(await screen.findByText('1 × 1000 g · AGGIORNATO')).toBeInTheDocument();
  });

  it.each(['-1', '1,5', '1.5', '1001', 'due', ''])('confezioni "%s" non valide: AGGIORNA disabilitato', async (valore) => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));

    render(<Confezioni />);
    await scansiona();
    const campo = await screen.findByLabelText('Confezioni comprate');
    const aggiorna = screen.getByRole('button', { name: 'AGGIORNA' });
    expect(aggiorna).toBeEnabled();

    fireEvent.change(campo, { target: { value: valore } });

    expect(aggiorna).toBeDisabled();
  });

  it('confezioni 0 ("non l\'ho preso") è ammesso e si scrive', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));

    render(<Confezioni />);
    await scansiona();
    fireEvent.change(await screen.findByLabelText('Confezioni comprate'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith(expect.objectContaining({ formato: 500, confezioni: 0 })),
    );
    expect(await screen.findByText('0 × 500 g · AGGIORNATO')).toBeInTheDocument();
  });

  it('quantità uguale al formato: nessuna domanda, memorizza il codice con le confezioni della lista e poi dice "confermato"', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: true, nome: 'Pasta', marca: 'X', quantita: { valore: 1000, unita: 'g' } }));
    let risolvi: () => void = () => {};
    vi.mocked(aggiornaFormatoDaScansione).mockReturnValue(new Promise<void>((r) => { risolvi = r; }));

    render(<Confezioni />);
    await scansiona();

    // Finché la scrittura è in corso non si dice "confermato".
    expect(await screen.findByText('Formato 1000 g, come in lista. Memorizzo il codice…')).toBeInTheDocument();
    expect(screen.queryByText(/Formato confermato/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Confezioni comprate')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
      ingredientId: 'ing-pasta', weekId: 'week-1', formato: 1000, ean: EAN, confezioni: 1,
    });

    risolvi();

    expect(await screen.findByText('Formato confermato: 1000 g.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(screen.queryByText(/AGGIORNATO/)).not.toBeInTheDocument();
    expect(screen.getByText('1 × 1000 g')).toBeInTheDocument();
  });

  it('formato uguale ma scrittura fallita: niente "confermato", messaggio e RIPROVA che riscrive', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(rispostaJson({ trovato: true, nome: 'Pasta', marca: 'X', quantita: { valore: 1000, unita: 'g' } }));
    vi.mocked(aggiornaFormatoDaScansione).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(undefined);

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Non siamo riusciti ad aggiornare. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/Formato confermato/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));

    expect(await screen.findByText('Formato confermato: 1000 g.')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledTimes(2);
    expect(vi.mocked(aggiornaFormatoDaScansione).mock.calls[1][0]).toEqual({
      ingredientId: 'ing-pasta', weekId: 'week-1', formato: 1000, ean: EAN, confezioni: 1,
    });
    expect(screen.queryByRole('button', { name: 'RIPROVA' })).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('unità diversa: messaggio e nessuna scrittura', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: true, nome: 'Latte', marca: 'Y', quantita: { valore: 1000, unita: 'ml' } }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Unità diversa (ml contro g): non aggiorno. Correggi il formato a mano se serve.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Formato a mano')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('prodotto non trovato: campo a mano, la domanda sulle confezioni segue il formato scritto, AGGIORNA scrive senza ean', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: false }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Prodotto non trovato: puoi scrivere il formato a mano.')).toBeInTheDocument();
    const campo = screen.getByLabelText('Formato a mano');
    // Intero: sotto il grammo/millilitro non c'è confezione, e "1.000" (le
    // migliaia all'italiana) non deve passare per un grammo.
    expect(campo).toHaveAttribute('inputmode', 'numeric');
    const aggiorna = screen.getByRole('button', { name: 'AGGIORNA' });
    expect(aggiorna).toBeDisabled();
    // Senza un formato valido non c'è niente su cui chiedere le confezioni.
    expect(screen.queryByLabelText('Confezioni comprate')).not.toBeInTheDocument();

    fireEvent.change(campo, { target: { value: '750' } });
    expect(screen.getByText('Con confezioni da 750 g ne bastano 2 (la lista ne chiedeva 1). Quante ne hai comprate?')).toBeInTheDocument();
    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('2');
    expect(aggiorna).toBeEnabled();

    // Il proposto segue il formato finché il campo non si tocca.
    fireEvent.change(campo, { target: { value: '1500' } });
    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('1');
    fireEvent.change(campo, { target: { value: '750' } });
    fireEvent.change(screen.getByLabelText('Confezioni comprate'), { target: { value: '1' } });
    fireEvent.click(aggiorna);

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 750, ean: null, confezioni: 1,
      }),
    );
    expect(await screen.findByText('1 × 750 g · AGGIORNATO')).toBeInTheDocument();
  });

  it.each(['0,5', '0', '-3', '-5', '100001', 'abc', '1.000', '1,5', '1e3', '0x10', ''])('formato a mano "%s" non è un intero nel tetto: AGGIORNA resta disabilitato e niente domanda', async (valore) => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: false }));

    render(<Confezioni />);
    await scansiona();
    fireEvent.change(await screen.findByLabelText('Formato a mano'), { target: { value: valore } });

    expect(screen.getByRole('button', { name: 'AGGIORNA' })).toBeDisabled();
    expect(screen.queryByLabelText('Confezioni comprate')).not.toBeInTheDocument();
  });

  it.each(['1', '1000', '100000'])('formato a mano "%s" è un intero nel tetto', async (valore) => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: false }));

    render(<Confezioni />);
    await scansiona();
    fireEvent.change(await screen.findByLabelText('Formato a mano'), { target: { value: valore } });

    expect(screen.getByRole('button', { name: 'AGGIORNA' })).toBeEnabled();
  });

  it('correggere il formato a mano azzera le confezioni digitate: la proposta torna a seguire il formato', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: false }));

    render(<Confezioni />);
    await scansiona();
    const formato = await screen.findByLabelText('Formato a mano');
    fireEvent.change(formato, { target: { value: '500' } });
    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('2');
    fireEvent.change(screen.getByLabelText('Confezioni comprate'), { target: { value: '3' } });
    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('3');

    // Con confezioni da 1000 g ne basta 1: il "3" era per un altro formato.
    fireEvent.change(formato, { target: { value: '1000' } });

    expect(screen.getByLabelText('Confezioni comprate')).toHaveValue('1');
  });

  it('trovato ma senza quantità: campo a mano con nome e marca, il codice si memorizza', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ trovato: true, nome: 'Fusilli', marca: 'Z', quantita: null }));

    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText('Prodotto non trovato: puoi scrivere il formato a mano.')).toBeInTheDocument();
    expect(screen.getByText('Z · Fusilli')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Formato a mano'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() =>
      expect(aggiornaFormatoDaScansione).toHaveBeenCalledWith({
        ingredientId: 'ing-pasta', weekId: 'week-1', formato: 500, ean: EAN, confezioni: 2,
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
    // Il log del catalogo non raggiungibile è ora di cercaProdotto (dispensa),
    // non di questa pagina: qui si verifica solo che sia stato chiamato.
    expect(errore).toHaveBeenCalled();
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

  it('401 dalla route: sessione scaduta, si va a /entra e non si propone il campo a mano', async () => {
    fetchMock.mockResolvedValue(rispostaJson({ errore: 'non autenticato' }, false, 401));

    render(<Confezioni />);
    await scansiona();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entra'));
    expect(screen.queryByLabelText('Formato a mano')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('fetch seguita da un redirect (il proxy verso /entra): si va a /entra', async () => {
    fetchMock.mockResolvedValue(rispostaJson('<html>', true, 200, true));

    render(<Confezioni />);
    await scansiona();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entra'));
    expect(screen.queryByLabelText('Formato a mano')).not.toBeInTheDocument();
  });

  it('errore "spesa già chiusa" in scrittura rimanda a /piano', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    vi.mocked(aggiornaFormatoDaScansione).mockRejectedValue(new Error('spesa già chiusa'));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/piano'));
  });

  it('altro errore in scrittura: messaggio e si può riprovare', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    vi.mocked(aggiornaFormatoDaScansione).mockRejectedValue(new Error('rete'));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    const messaggio = await screen.findByRole('alert');
    expect(messaggio).toHaveTextContent('Non siamo riusciti ad aggiornare. Riprova.');
    expect(screen.getByRole('button', { name: 'AGGIORNA' })).toBeEnabled();
    expect(screen.getByText('1 × 1000 g')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  it('LASCIA chiude il riquadro senza scrivere', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'LASCIA' }));

    expect(screen.queryByText(/La confezione è/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scansiona Pasta' })).toBeInTheDocument();
    expect(screen.getByText('1 × 1000 g')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('il ✕ chiude il foglio senza cercare niente', async () => {
    render(<Confezioni />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));
    await screen.findByLabelText('Codice a barre');

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scansiona Pasta' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con due voci lo scanner si apre su una sola alla volta', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([
      voce({}),
      voce({ itemId: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', formato: 1000 }),
    ]);

    render(<Confezioni />);
    const bottoni = await screen.findAllByRole('button', { name: /^Scansiona / });
    expect(bottoni).toHaveLength(2);
    fireEvent.click(bottoni[0]);

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    const foglio = screen.getByRole('dialog', { name: 'Confezione di Pasta' });
    expect(await within(foglio).findByLabelText('Codice a barre')).toBeInTheDocument();
  });

  it('una scrittura in volo su una voce non chiude lo scanner aperto intanto su un\'altra', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([
      voce({}),
      voce({ itemId: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', formato: 1000 }),
    ]);
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    let risolvi: () => void = () => {};
    vi.mocked(aggiornaFormatoDaScansione).mockReturnValueOnce(new Promise<void>((r) => { risolvi = r; }));

    render(<Confezioni />);
    // Pasta: si scansiona, si preme AGGIORNA, la scrittura resta in sospeso.
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledTimes(1);

    // Un foglio alla volta: si chiude col ✕ prima di aprire il riso.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));

    // Intanto si apre lo scanner sul riso.
    fireEvent.click(screen.getByRole('button', { name: 'Scansiona Riso' }));
    const foglioRiso = screen.getByRole('dialog', { name: 'Confezione di Riso' });
    expect(await within(foglioRiso).findByLabelText('Codice a barre')).toBeInTheDocument();

    // La scrittura della pasta si risolve: la pasta è aggiornata, lo scanner del riso resta.
    risolvi();
    expect(await screen.findByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Confezione di Riso' })).toBeInTheDocument();
    expect(within(foglioRiso).getByLabelText('Codice a barre')).toBeInTheDocument();
  });

  it('una scrittura in volo su una voce non blocca il "formato uguale" di un\'altra', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([
      voce({}),
      voce({ itemId: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', formato: 1000 }),
    ]);
    fetchMock
      .mockResolvedValueOnce(rispostaJson(OFF_500G))
      .mockResolvedValueOnce(rispostaJson({ trovato: true, nome: 'Riso', marca: 'R', quantita: { valore: 1000, unita: 'g' } }));
    let risolviPasta: () => void = () => {};
    vi.mocked(aggiornaFormatoDaScansione)
      .mockReturnValueOnce(new Promise<void>((r) => { risolviPasta = r; }))
      .mockResolvedValueOnce(undefined);

    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    // Un foglio alla volta: si chiude col ✕ prima di aprire il riso.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));

    // Riso: formato uguale → il codice si memorizza anche se la pasta è ancora in volo.
    await scansiona('80768001', 'Riso');

    const foglioRiso = screen.getByRole('dialog', { name: 'Confezione di Riso' });
    expect(await within(foglioRiso).findByText('Formato confermato: 1000 g.')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledTimes(2);
    expect(vi.mocked(aggiornaFormatoDaScansione).mock.calls[1][0]).toEqual({
      ingredientId: 'ing-riso', weekId: 'week-1', formato: 1000, ean: '80768001', confezioni: 1,
    });

    risolviPasta();
    expect(await screen.findByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
    // Il riso resta sulla sua conferma: la pasta non chiude la scheda di un'altra voce.
    expect(within(foglioRiso).getByText('Formato confermato: 1000 g.')).toBeInTheDocument();
  });

  it('la risposta in ritardo di una voce non copre lo scanner aperto su un\'altra', async () => {
    vi.mocked(leggiVociComprate).mockResolvedValue([
      voce({}),
      voce({ itemId: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', formato: 1000 }),
    ]);
    let rispondi: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => { rispondi = r; }));

    render(<Confezioni />);
    // Pasta (la prima): si scansiona, la fetch resta in sospeso.
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));
    fireEvent.change(await screen.findByLabelText('Codice a barre'), { target: { value: EAN } });
    fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));
    expect(await screen.findByText('Cerco nel catalogo…')).toBeInTheDocument();

    // Un foglio alla volta: si chiude col ✕ prima di aprire il riso.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));

    // Intanto si apre lo scanner sul riso.
    fireEvent.click(screen.getByRole('button', { name: 'Scansiona Riso' }));
    const foglioRiso = screen.getByRole('dialog', { name: 'Confezione di Riso' });
    expect(await within(foglioRiso).findByLabelText('Codice a barre')).toBeInTheDocument();
    expect(screen.queryByText('Cerco nel catalogo…')).not.toBeInTheDocument();

    // Arriva la risposta della pasta: lo scanner del riso resta, nessuna proposta.
    rispondi(rispostaJson(OFF_500G));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));

    expect(within(foglioRiso).getByLabelText('Codice a barre')).toBeInTheDocument();
    expect(screen.queryByText(/La confezione è/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AGGIORNA' })).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('due letture sulla stessa voce, la prima in ritardo: la risposta vecchia non copre il foglio della seconda né scrive (rilievo I2)', async () => {
    const E1 = '1111111111111';
    const E2 = '2222222222222';
    let rispondiE1: (r: Response) => void = () => {};
    fetchMock
      .mockReturnValueOnce(new Promise<Response>((r) => { rispondiE1 = r; }))
      // Formato uguale (1000 g come in lista): il ramo "confermo" scrive subito.
      .mockResolvedValueOnce(rispostaJson({ trovato: true, nome: 'Pasta', marca: 'X', quantita: { valore: 1000, unita: 'g' } }));

    render(<Confezioni />);
    // Prima lettura (E1) sulla Pasta: la fetch resta in sospeso.
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));
    fireEvent.change(await screen.findByLabelText('Codice a barre'), { target: { value: E1 } });
    fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));
    expect(await screen.findByText('Cerco nel catalogo…')).toBeInTheDocument();

    // Si chiude (✕) e si riapre la stessa voce.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));

    // Seconda lettura (E2), sempre sulla Pasta: torna subito, formato uguale → si conferma e si scrive.
    fireEvent.change(await screen.findByLabelText('Codice a barre'), { target: { value: E2 } });
    fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));

    expect(await screen.findByText(`CODICE ${E2}`)).toBeInTheDocument();
    expect(await screen.findByText('Formato confermato: 1000 g.')).toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledTimes(1);
    expect(vi.mocked(aggiornaFormatoDaScansione).mock.calls[0][0]).toEqual({
      ingredientId: 'ing-pasta', weekId: 'week-1', formato: 1000, ean: E2, confezioni: 1,
    });

    // Ora arriva la risposta lenta di E1 (formato diverso, 500 g): non deve coprire il foglio di E2 né scrivere.
    rispondiE1(rispostaJson(OFF_500G));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText(`CODICE ${E2}`)).toBeInTheDocument();
    expect(screen.queryByText('Barilla · Spaghetti n. 5 · 500 g')).not.toBeInTheDocument();
    expect(screen.queryByText(/La confezione è/)).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).toHaveBeenCalledTimes(1);
  });

  it('la risposta in ritardo di un codice vecchio con formato uguale non scrive', async () => {
    const E1 = '1111111111111';
    const E2 = '2222222222222';
    let rispondiE1: (r: Response) => void = () => {};
    fetchMock
      // Prima lettura (E1) sulla Pasta: resta in sospeso. Quando arriverà,
      // il formato sarà uguale a quello in lista (1000 g) → ramo "confermo",
      // che scriverebbe da solo se non fosse per la guardia sul codice.
      .mockReturnValueOnce(new Promise<Response>((r) => { rispondiE1 = r; }))
      // Seconda lettura (E2), sempre sulla Pasta: risponde subito con un
      // formato diverso (500 g) → è una proposta, non scrive da sola.
      .mockResolvedValueOnce(rispostaJson(OFF_500G));

    render(<Confezioni />);
    // Prima lettura (E1) sulla Pasta: la fetch resta in sospeso.
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));
    fireEvent.change(await screen.findByLabelText('Codice a barre'), { target: { value: E1 } });
    fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));
    expect(await screen.findByText('Cerco nel catalogo…')).toBeInTheDocument();

    // Si chiude (✕) e si riapre la stessa voce.
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scansione' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));

    // Seconda lettura (E2): torna subito, formato diverso → proposta, in attesa di AGGIORNA.
    fireEvent.change(await screen.findByLabelText('Codice a barre'), { target: { value: E2 } });
    fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));

    expect(await screen.findByText(`CODICE ${E2}`)).toBeInTheDocument();
    expect(await screen.findByText('Barilla · Spaghetti n. 5 · 500 g')).toBeInTheDocument();

    // Ora arriva la risposta lenta di E1, con formato uguale (1000 g): non deve
    // scrivere da sola sopra la proposta di E2 ancora in sospeso.
    rispondiE1(rispostaJson({ trovato: true, nome: 'Pasta', marca: 'X', quantita: { valore: 1000, unita: 'g' } }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByText(`CODICE ${E2}`)).toBeInTheDocument();
    expect(screen.getByText('Barilla · Spaghetti n. 5 · 500 g')).toBeInTheDocument();
    expect(screen.queryByText(/Formato confermato/)).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });
});

describe('Confezioni — il foglio (spec fase 6 §B.4)', () => {
  it('SCANSIONA apre un dialogo col nome della voce, e LettoreCodice dentro', async () => {
    render(<Confezioni />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));

    const foglio = screen.getByRole('dialog', { name: 'Confezione di Pasta' });
    expect(await within(foglio).findByLabelText('Codice a barre')).toBeInTheDocument();
  });

  it('dopo la lettura il riquadro dice il codice letto', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText(`CODICE ${EAN}`)).toBeInTheDocument();
  });

  it('AGGIORNA scrive e chiude il foglio; la riga dice AGGIORNATO', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
  });

  it('LASCIA chiude il foglio senza scrivere', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'LASCIA' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('la pillola SCANSIONA è alta almeno 44 e ha il nome della voce', async () => {
    render(<Confezioni />);
    const pillola = await screen.findByRole('button', { name: 'Scansiona Pasta' });
    expect(pillola).toHaveTextContent('SCANSIONA');
    expect(pillola.style.minHeight).toBe('44px');
  });

  it('in caricamento: CARICO…', async () => {
    vi.mocked(leggiVociComprate).mockReturnValue(new Promise(() => {}));
    render(<Confezioni />);
    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
  });
});
