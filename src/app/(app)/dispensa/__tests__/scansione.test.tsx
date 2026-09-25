import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';
import { ScansioneConfezione } from '../ScansioneConfezione';

const OGGI = '2026-09-25';
const EAN_POLLO = '8076800195057';
const EAN_TONNO = '8000000000017';
const EAN_IGNOTO_1 = '8000000000024';
const EAN_IGNOTO_2 = '8000000000031';
const EAN_IGNOTO_3 = '8000000000048';
const EAN_IGNOTO_4 = '8000000000055';

const POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile',
  deperibile: true, formatoConfezione: 300, prezzoConfezione: null, ean: EAN_POLLO,
};
const TONNO: Ingredient = {
  id: 'i-tonno', nome: 'Tonno', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile',
  deperibile: false, formatoConfezione: 240, prezzoConfezione: null, ean: EAN_TONNO,
};

// Il finto hook di lettura: risponde sempre 'fallback' (niente fotocamera in
// jsdom) e salva l'`onCodice` che `Anteprima` gli passa, così i test possono
// chiamarlo a mano per simulare una lettura, senza passare dal campo.
let onCodiceCapturato: ((ean: string) => void) | null = null;
vi.mock('@/components/useLettoreCodici', () => ({
  useLettoreCodici: (onCodice: (ean: string) => void) => {
    onCodiceCapturato = onCodice;
    return { modo: 'fallback', videoRef: { current: null } };
  },
}));

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
}));

function rispostaJson(corpo: unknown, status = 200, redirected = false): Response {
  return { ok: status >= 200 && status < 300, status, redirected, json: async () => corpo } as unknown as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  onCodiceCapturato = null;
  replace.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function propsBase(overrides: Partial<Parameters<typeof ScansioneConfezione>[0]> = {}) {
  return {
    ingrediente: POLLO,
    congelato: false,
    ingredienti: [POLLO, TONNO],
    oggi: OGGI,
    onIndietro: vi.fn(),
    onChiudi: vi.fn(),
    onAggiungi: vi.fn().mockResolvedValue(undefined),
    onApri: vi.fn(),
    ...overrides,
  };
}

/** Simula la lettura di un codice attraverso il finto hook. */
async function leggi(ean: string) {
  await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
  onCodiceCapturato!(ean);
}

describe('ScansioneConfezione', () => {
  it('il codice è l\'ean dell\'ingrediente aperto: "Confezione da 300 g", niente fetch, AGGIUNGI chiama onAggiungi(300, ean)', async () => {
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_POLLO);

    expect(await screen.findByText('Confezione da 300 g')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI' }));
    await waitFor(() => expect(props.onAggiungi).toHaveBeenCalledWith(300, EAN_POLLO));
  });

  it('il codice è di un altro ingrediente: "Questo codice è di Tonno.", APRI TONNO chiama onApri con Tonno', async () => {
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_TONNO);

    expect(await screen.findByText('Questo codice è di Tonno.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APRI TONNO' }));
    expect(props.onApri).toHaveBeenCalledWith(TONNO);
  });

  it('catalogo con 450 g: "Confezione da 450 g" e, deperibile, la stima "Scade il 28/09, ..."', async () => {
    fetchMock.mockResolvedValueOnce(
      rispostaJson({ trovato: true, nome: 'Petto di pollo Amadori', marca: 'Amadori', quantita: { valore: 450, unita: 'g' } }),
    );
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_IGNOTO_1);

    expect(await screen.findByText('Confezione da 450 g')).toBeInTheDocument();
    expect(screen.getByText('Scade il 28/09, stima: la correggi dopo, qui nel dettaglio.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI' }));
    await waitFor(() => expect(props.onAggiungi).toHaveBeenCalledWith(450, EAN_IGNOTO_1));
  });

  it('catalogo trovato: false: il messaggio, AGGIUNGI spento finché il formato è vuoto, poi 450 → onAggiungi(450, ean)', async () => {
    fetchMock.mockResolvedValueOnce(rispostaJson({ trovato: false }));
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_IGNOTO_2);

    expect(await screen.findByText('Prodotto non trovato: puoi scrivere il formato a mano.')).toBeInTheDocument();
    const aggiungi = screen.getByRole('button', { name: 'AGGIUNGI' });
    expect(aggiungi).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Formato della confezione di Petto di pollo'), { target: { value: '450' } });
    expect(aggiungi).toBeEnabled();
    fireEvent.click(aggiungi);
    await waitFor(() => expect(props.onAggiungi).toHaveBeenCalledWith(450, EAN_IGNOTO_2));
  });

  it('unità diversa: "Unità diversa (ml contro g): scrivi il formato a mano."', async () => {
    fetchMock.mockResolvedValueOnce(
      rispostaJson({ trovato: true, nome: 'Brodo', marca: 'Star', quantita: { valore: 500, unita: 'ml' } }),
    );
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_IGNOTO_3);

    expect(await screen.findByText('Unità diversa (ml contro g): scrivi il formato a mano.')).toBeInTheDocument();
  });

  it('fetch che rigetta: "Non riusciamo a interrogare il catalogo. ..."', async () => {
    fetchMock.mockRejectedValueOnce(new Error('rete giù'));
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_IGNOTO_4);

    expect(await screen.findByText('Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.')).toBeInTheDocument();
  });

  it('401: router.replace(\'/entra\')', async () => {
    fetchMock.mockResolvedValueOnce(rispostaJson({}, 401));
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_IGNOTO_1);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entra'));
  });

  it('NON È QUESTA torna alla lettura', async () => {
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_POLLO);
    expect(await screen.findByText('Confezione da 300 g')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NON È QUESTA' }));
    await waitFor(() => expect(screen.getByLabelText('Codice a barre')).toBeInTheDocument());
  });

  it('onAggiungi che rigetta: "Non siamo riusciti a salvare. Riprova."', async () => {
    const props = propsBase({ onAggiungi: vi.fn().mockRejectedValue(new Error('no')) });
    render(<ScansioneConfezione {...props} />);
    await leggi(EAN_POLLO);
    expect(await screen.findByText('Confezione da 300 g')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
  });

  it('senza fotocamera: il messaggio del ripiego, niente USA LA FOTOCAMERA, CERCA IL CODICE spento a vuoto, un codice digitato e Invio arrivano a letto', async () => {
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);

    expect(await screen.findByText('La fotocamera non è disponibile: digita il codice sotto la confezione.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'USA LA FOTOCAMERA' })).not.toBeInTheDocument();
    const cerca = screen.getByRole('button', { name: 'CERCA IL CODICE' });
    expect(cerca).toBeDisabled();

    const campo = screen.getByLabelText('Codice a barre');
    fireEvent.change(campo, { target: { value: EAN_POLLO } });
    expect(cerca).toBeEnabled();
    fireEvent.submit(campo.closest('form')!);

    expect(await screen.findByText('Confezione da 300 g')).toBeInTheDocument();
  });

  it('la freccia "Torna a Petto di pollo" chiama onIndietro', () => {
    const props = propsBase();
    render(<ScansioneConfezione {...props} />);
    fireEvent.click(screen.getByLabelText('Torna a Petto di pollo'));
    expect(props.onIndietro).toHaveBeenCalledTimes(1);
  });
});
