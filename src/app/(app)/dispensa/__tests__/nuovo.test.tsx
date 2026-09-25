import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Ingredient } from '@/domain/types';
import { NuovoIngrediente } from '../NuovoIngrediente';

const EAN_TONNO = '8000000000017';
const EAN_ZENZERO = '8000000000062';

const PARMIGIANO: Ingredient = {
  id: 'i-parm', nome: 'Parmigiano', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile',
  deperibile: true, formatoConfezione: 200, prezzoConfezione: null, ean: null,
};
const TONNO: Ingredient = {
  id: 'i-tonno', nome: 'Tonno', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile',
  deperibile: false, formatoConfezione: 240, prezzoConfezione: null, ean: EAN_TONNO,
};

// Come in scansione.test.tsx: il finto hook risponde sempre 'fallback' e salva
// l'`onCodice` che `Anteprima` gli passa, per simulare una lettura a mano.
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

function rispostaJson(corpo: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, redirected: false, json: async () => corpo } as unknown as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  onCodiceCapturato = null;
  replace.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function propsBase(overrides: Partial<Parameters<typeof NuovoIngrediente>[0]> = {}) {
  return {
    nomeIniziale: 'Zenzero',
    ingredienti: [PARMIGIANO, TONNO],
    onCrea: vi.fn().mockResolvedValue(undefined),
    onApri: vi.fn(),
    onChiudi: vi.fn(),
    ...overrides,
  };
}

async function scansiona(ean: string) {
  fireEvent.click(screen.getByRole('button', { name: /SCANSIONA LA CONFEZIONE/ }));
  await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
  onCodiceCapturato!(ean);
}

describe('NuovoIngrediente', () => {
  it('nome iniziale "Zenzero": nessun reparto premuto, CREA spento; scelto ORTOFRUTTA si accende e Deperibile SÌ è premuto', () => {
    render(<NuovoIngrediente {...propsBase()} />);

    for (const nome of ['ORTOFRUTTA', 'MACELLERIA E PESCHERIA', 'LATTICINI, UOVA E SALUMI', 'PASTA, RISO E CEREALI', 'DISPENSA E CONSERVE', 'SURGELATI']) {
      expect(screen.getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByRole('button', { name: "CREA L'INGREDIENTE" })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'ORTOFRUTTA' }));
    expect(screen.getByRole('button', { name: 'ORTOFRUTTA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'SÌ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: "CREA L'INGREDIENTE" })).toBeEnabled();
  });

  it('nome iniziale "banane": ORTOFRUTTA e pz già premuti', () => {
    render(<NuovoIngrediente {...propsBase({ nomeIniziale: 'banane' })} />);
    expect(screen.getByRole('button', { name: 'ORTOFRUTTA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'pz' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('nome duplicato (Parmigiano fra gli ingredienti, nome "parmigiano"): l\'errore, onCrea non chiamato', async () => {
    const props = propsBase({ nomeIniziale: 'parmigiano' });
    render(<NuovoIngrediente {...props} />);
    // "parmigiano" è fra INGREDIENTI_BASE: reparto e deperibile già decisi, il tasto è acceso.
    expect(screen.getByRole('button', { name: "CREA L'INGREDIENTE" })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: "CREA L'INGREDIENTE" }));
    expect(await screen.findByText("C'è già un ingrediente che si chiama così.")).toBeInTheDocument();
    expect(props.onCrea).not.toHaveBeenCalled();
  });

  it('creazione con 80 g: onCrea riceve i dati attesi', async () => {
    const props = propsBase();
    render(<NuovoIngrediente {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'ORTOFRUTTA' }));
    fireEvent.change(screen.getByLabelText('Residuo di Zenzero'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: "CREA L'INGREDIENTE" }));
    await waitFor(() => expect(props.onCrea).toHaveBeenCalledWith({
      ingrediente: {
        nome: 'Zenzero', unitaBase: 'g', area: 'ortofrutta', deperibile: true,
        classeResiduo: 'porzionabile', formatoConfezione: 500, ean: null,
      },
      quantita: 80,
    }));
  });

  it('onCrea che rigetta: l\'errore e il tasto torna acceso', async () => {
    const props = propsBase({ onCrea: vi.fn().mockRejectedValue(new Error('no')) });
    render(<NuovoIngrediente {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'ORTOFRUTTA' }));
    fireEvent.change(screen.getByLabelText('Residuo di Zenzero'), { target: { value: '80' } });

    const crea = screen.getByRole('button', { name: "CREA L'INGREDIENTE" });
    fireEvent.click(crea);
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(crea).toBeEnabled();
  });

  it('scansione con catalogo { valore: 80, unita: "g" }: tornati al modulo, il campo vale 80, g premuto, e alla creazione formatoConfezione: 80 ed ean quello letto', async () => {
    fetchMock.mockResolvedValueOnce(
      rispostaJson({ trovato: true, nome: 'Radice di zenzero', marca: '', quantita: { valore: 80, unita: 'g' } }),
    );
    const props = propsBase();
    render(<NuovoIngrediente {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'ORTOFRUTTA' }));

    await scansiona(EAN_ZENZERO);

    expect(await screen.findByLabelText('Residuo di Zenzero')).toHaveValue('80');
    expect(screen.getByRole('button', { name: 'g' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: "CREA L'INGREDIENTE" }));
    await waitFor(() => expect(props.onCrea).toHaveBeenCalledWith({
      ingrediente: {
        nome: 'Zenzero', unitaBase: 'g', area: 'ortofrutta', deperibile: true,
        classeResiduo: 'porzionabile', formatoConfezione: 80, ean: EAN_ZENZERO,
      },
      quantita: 80,
    }));
  });

  it('scansione di un codice che ha già Tonno: "Questo codice è di Tonno.", APRI TONNO chiama onApri', async () => {
    const props = propsBase();
    render(<NuovoIngrediente {...props} />);

    await scansiona(EAN_TONNO);

    expect(await screen.findByText('Questo codice è di Tonno.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APRI TONNO' }));
    expect(props.onApri).toHaveBeenCalledWith(TONNO);
  });

  it('la X "Chiudi senza creare" chiama onChiudi', () => {
    const props = propsBase();
    render(<NuovoIngrediente {...props} />);
    fireEvent.click(screen.getByLabelText('Chiudi senza creare'));
    expect(props.onChiudi).toHaveBeenCalledTimes(1);
  });
});
