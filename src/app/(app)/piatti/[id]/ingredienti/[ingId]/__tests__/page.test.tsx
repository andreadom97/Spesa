import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => {
  class IngredienteInUsoError extends Error {}
  return {
    salvaIngrediente: vi.fn(),
    leggiIngredienti: vi.fn(),
    eliminaIngrediente: vi.fn(),
    haAcquistiRegistrati: vi.fn(),
    IngredienteInUsoError,
  };
});

// La cadenza della nota «a stima» (decisione di Andrea del 26/09): l'editor la legge dalle impostazioni.
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

const push = vi.fn();
const replace = vi.fn();
let paramsId = 'd-1';
let paramsIngId = 'nuovo';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId, ingId: paramsIngId }),
  useRouter: () => ({ push, back: vi.fn(), replace }),
}));

// Come in dispensa/__tests__/nuovo.test.tsx: il finto hook risponde 'fallback' e
// tiene l'`onCodice` che `LettoreCodice` gli passa, per simulare una lettura.
let onCodiceCapturato: ((ean: string) => void) | null = null;
vi.mock('@/components/useLettoreCodici', () => ({
  useLettoreCodici: (onCodice: (ean: string) => void) => {
    onCodiceCapturato = onCodice;
    return { modo: 'fallback', videoRef: { current: null } };
  },
}));

import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, haAcquistiRegistrati, IngredienteInUsoError } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { salvaOrigine } from '@/components/pannello/indirizzi';
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';
import IngredienteEditor from '../page';

// Con un prezzo salvato (2.5): serve a verificare che l'editor lo mostri
// alla lettura, con la virgola italiana, e che lo tolga se il campo si svuota.
const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500, prezzoConfezione: 2.5, ean: null,
};

// Dato "sporco" come quello che la Important 1 della review permetteva di
// creare prima del fix: classe 'intero' salvata con un'unità diversa da PZ.
// Serve a verificare che il guardiano in salva() lo corregga anche quando
// arriva così dal caricamento, non solo quando nasce da un click in pagina.
const ING_INTERO_INCONSISTENTE: Ingredient = {
  id: 'i-2', nome: 'Uova', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};
const EAN_TONNO = '8000000000017';
const EAN_NUOVO = '8000000000062';
const TONNO: Ingredient = {
  id: 'i-tonno', nome: 'Tonno', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile',
  deperibile: false, formatoConfezione: 240, prezzoConfezione: null, ean: EAN_TONNO,
};

function rispostaJson(corpo: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, redirected: false, json: async () => corpo } as unknown as Response;
}
const fetchMock = vi.fn<typeof fetch>();

// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come
// nei test di Importa. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <IngredienteEditor />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

beforeEach(() => {
  vi.clearAllMocks();
  paramsId = 'd-1';
  paramsIngId = 'nuovo';
  onCodiceCapturato = null;
  sessionStorage.clear();
  window.history.replaceState(null, '', '/piatti/d-1/ingredienti/nuovo');
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_INTERO_INCONSISTENTE, TONNO]);
  vi.mocked(haAcquistiRegistrati).mockResolvedValue(false);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
  });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // useIndietroFogli consuma le voci con history.go: qui il popstate arriva dentro la
  // chiamata, come fanno i test di Importa con back.
  vi.spyOn(window.history, 'go').mockImplementation(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
});

afterEach(() => {
  slotDock.remove();
  // Toglie le spie di history.go e di console.error: vi.clearAllMocks non le rimette a posto.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function scansiona(ean: string) {
  fireEvent.click(screen.getByRole('button', { name: /SCANSIONA LA CONFEZIONE/ }));
  await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
  onCodiceCapturato!(ean);
}

describe('Ingrediente (editor): i campi', () => {
  it('creazione: il salvataggio è bloccato finché mancano nome, area e formato', async () => {
    rendi();
    expect(await screen.findByPlaceholderText("Dai un nome all'ingrediente")).toBeInTheDocument();
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    expect(salva()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '6' } });
    expect(salva()).toBeEnabled();
  });

  it('scegliendo INTERO l\'unità passa a PZ e il formato si blocca a 1', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '30' } });
    expect(screen.getByRole('button', { name: 'ML' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));

    expect(screen.getByRole('button', { name: 'PZ' })).toHaveAttribute('aria-pressed', 'true');
    const formato = screen.getByLabelText('Formato della confezione') as HTMLInputElement;
    expect(formato.value).toBe('1');
    expect(formato).toBeDisabled();
  });

  it("con INTERO il segmento unità è disabilitato: cliccare G non lo riattiva, PZ resta l'unica scelta", async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    const g = screen.getByRole('button', { name: 'G' });
    const pz = screen.getByRole('button', { name: 'PZ' });
    expect(g).toBeDisabled();
    expect(pz).toBeDisabled();

    fireEvent.click(g);

    // Il click su un bottone disabled non scatena onClick in un browser reale
    // né in jsdom: PZ deve restare l'opzione attiva.
    expect(pz).toHaveAttribute('aria-pressed', 'true');
    expect(g).toHaveAttribute('aria-pressed', 'false');
  });

  it("il segmento unità torna cliccabile appena la classe non è più INTERO", async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    expect(screen.getByRole('button', { name: 'G' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'PORZIONABILE' }));

    expect(screen.getByRole('button', { name: 'G' })).toBeEnabled();
  });

  it('le tre spiegazioni della classe di residuo sono quelle di Ingrediente.dc.html, e «a stima» dice la cadenza', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    expect(
      screen.getByText(
        'La confezione copre più pasti. L’app calcola quanto ne resta dopo ogni porzione e lo riporta alla settimana dopo.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    expect(screen.getByText('Si conta a pezzi e non lascia resti frazionari: sei uova sono sei uova.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(
      await screen.findByText('Non vale la pena contarlo a grammi. Ogni 3 mesi dall’ultimo acquisto la lista ti chiede se ne hai ancora.'),
    ).toBeInTheDocument();
  });

  it('la spiegazione «a stima» dice la cadenza delle impostazioni, di default ogni 3 mesi', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(
      'Non vale la pena contarlo a grammi. Ogni 3 mesi dall’ultimo acquisto la lista ti chiede se ne hai ancora.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/90 giorni/)).toBeNull();
  });

  it.each([
    [30, 'Ogni mese'],
    [60, 'Ogni 2 mesi'],
  ] as const)('con la cadenza a %i giorni la nota «a stima» dice «%s» (decisione di Andrea del 26/09)', async (g, inizio) => {
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: g,
    });
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(
      `Non vale la pena contarlo a grammi. ${inizio} dall’ultimo acquisto la lista ti chiede se ne hai ancora.`,
    )).toBeInTheDocument();
  });

  it('se le impostazioni non si leggono la nota dice ogni 3 mesi, e l\'editor funziona', async () => {
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(/^Non vale la pena contarlo a grammi\. Ogni 3 mesi dall’ultimo acquisto/)).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  it('il guardiano in salva() corregge unità e formato anche per un ingrediente caricato già con la classe INTERO e un\'unità diversa da PZ', async () => {
    paramsIngId = 'i-2';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-2');
    rendi();
    await screen.findByDisplayValue('Uova');
    // SALVA pulito è spento (§F): una modifica qualunque lo accende, e il guardiano
    // deve ricalcolare sui dati sporchi caricati (unità 'g', formato 500), non fidarsi di quelli.
    fireEvent.change(screen.getByDisplayValue('Uova'), { target: { value: 'Uova fresche' } });
    fireEvent.click(salva());
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ unitaBase: 'pz', formatoConfezione: 1 }),
    ));
  });

  // Le due stringhe della sottoriga sono quelle della spec §I dopo la correzione del 22/09:
  // dicono dove la scelta ha effetto, non quanto dura il residuo.
  it('Fresco al posto di Deperibile: SÌ / NO, e la sottoriga segue lo stato', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.queryByText('Deperibile')).toBeNull();
    const fresco = screen.getByRole('group', { name: 'Fresco' });
    expect(within(fresco).getByRole('button', { name: 'SÌ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO')).toBeInTheDocument();
    fireEvent.click(within(fresco).getByRole('button', { name: 'NO' }));
    expect(within(fresco).getByRole('button', { name: 'NO' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('IL RESIDUO NON SCADE')).toBeInTheDocument();
    expect(screen.queryByText('QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO')).toBeNull();
  });

  it('le etichette del frame 12 e la nota di oggi in fondo; ANNULLA non c\'è più', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    for (const e of ['AREA', 'CONFEZIONE', 'COME SI CONSUMA', 'PREZZO DI UNA CONFEZIONE']) expect(screen.getByText(e)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Area' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Unità' })).toBeInTheDocument();
    expect(screen.getByText('Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ANNULLA' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'ANNULLA' })).toBeNull();
  });

  it('salva chiama salvaIngrediente con i valori scelti (fresco di default) e torna al piatto', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-nuovo');
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    fireEvent.click(salva());
    // Senza scansione la chiave `ean` non c'è: l'ultimo codice resta com'è (repertorio.ts).
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith({
      id: undefined, nome: 'Uova', unitaBase: 'pz', area: 'macelleria', classeResiduo: 'intero',
      deperibile: true, formatoConfezione: 1, prezzoConfezione: null,
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  it('modifica: carica le proprietà, e SALVA resta spento finché niente cambia (§F)', async () => {
    paramsIngId = 'i-1';
    rendi();
    expect(await screen.findByDisplayValue('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LATTICINI, UOVA E SALUMI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'A STIMA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO')).toBeInTheDocument();
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '400' } });
    expect(salva()).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '500' } });
    expect(salva()).toBeDisabled();
  });

  it('in volo SALVA dice SALVATAGGIO… a 0,5; se fallisce l\'errore sta sopra il Dock e SALVA torna', async () => {
    paramsIngId = 'i-1';
    let rifiuta!: (e: unknown) => void;
    vi.mocked(salvaIngrediente).mockReturnValue(new Promise((_, r) => { rifiuta = r; }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Prezzo di una confezione'), { target: { value: '3' } });
    fireEvent.click(salva());
    const inVolo = await screen.findByRole('button', { name: 'SALVATAGGIO…' });
    expect(inVolo).toBeDisabled();
    expect(inVolo.style.opacity).toBe('0.5');
    rifiuta(new Error('rete'));
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(await within(dock).findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare l’ingrediente. Riprova.');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toBeEnabled();
  });

  it('la tab bar è nascosta: il Dock ha dock-senza-barra', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.getByRole('region', { name: 'Azione principale' })).toHaveClass('dock-senza-barra');
  });

  it('un ingId sconosciuto mostra un messaggio invece di un modulo vuoto, e niente Dock', async () => {
    paramsIngId = 'i-inesistente';
    rendi();
    expect(await screen.findByText('Ingrediente non trovato.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });
});

describe('Ingrediente (editor): il ritorno (spec fase 5 §F)', () => {
  it('con torna=impostazioni la freccia torna al pannello sugli Ingredienti, non a /piatti/nuovo (il difetto di oggi)', async () => {
    paramsId = 'nuovo';
    paramsIngId = 'i-1';
    window.history.replaceState(null, '', '/piatti/nuovo/ingredienti/i-1?torna=impostazioni');
    salvaOrigine({ pathname: '/dispensa', sotto: 'ingredienti' });
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Torna agli ingredienti' }));
    expect(push).toHaveBeenCalledWith('/dispensa?impostazioni=ingredienti');
    expect(push).not.toHaveBeenCalledWith('/piatti/nuovo');
  });

  it('con torna=impostazioni anche SALVA torna al pannello, e non segnala un ingrediente al piatto', async () => {
    paramsId = 'nuovo';
    paramsIngId = 'i-1';
    window.history.replaceState(null, '', '/piatti/nuovo/ingredienti/i-1?torna=impostazioni');
    salvaOrigine({ pathname: '/piano', sotto: 'ingredienti' });
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '450' } });
    fireEvent.click(salva());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano?impostazioni=ingredienti'));
  });

  it('senza torna la freccia si chiama Torna al piatto e porta al piatto', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(push).toHaveBeenCalledWith('/piatti/d-1');
  });

  it('la freccia perde le modifiche senza chiedere', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(push).toHaveBeenCalledWith('/piatti/d-1');
    expect(salvaIngrediente).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('Ingrediente (editor): la scansione (spec fase 5 §F.1)', () => {
  it('il catalogo dà la confezione: formato e unità si riempiono, il foglio si chiude, SALVA manda l\'ean', async () => {
    paramsIngId = 'i-1';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    fetchMock.mockResolvedValueOnce(rispostaJson({ trovato: true, nome: 'Yogurt', marca: '', quantita: { valore: 400, unita: 'g' } }));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    await waitFor(() => expect(screen.getByLabelText('Formato della confezione')).toHaveValue('400'));
    expect(screen.queryByRole('dialog', { name: 'Scansiona la confezione' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Unità' })).getByRole('button', { name: 'G' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith(`/api/prodotto/${EAN_NUOVO}`);
    expect(salvaIngrediente).not.toHaveBeenCalled(); // niente si scrive fino a SALVA
    fireEvent.click(salva());
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i-1', formatoConfezione: 400, unitaBase: 'g', ean: EAN_NUOVO }),
    ));
  });

  it('prodotto sconosciuto: il messaggio sotto il tasto, e l\'ean resta legato al SALVA', async () => {
    paramsIngId = 'i-1';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    fetchMock.mockResolvedValueOnce(rispostaJson({ trovato: false }));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    expect(await screen.findByText('Non conosciamo questo prodotto: scrivi tu la confezione.')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato della confezione')).toHaveValue('500');
    fireEvent.click(salva()); // l'ean è una modifica: SALVA è acceso
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ ean: EAN_NUOVO, formatoConfezione: 500 })));
  });

  it('un codice che ha già Tonno: «Questo codice è di Tonno.», APRI TONNO apre il suo editor', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_TONNO);
    expect(await screen.findByText('Questo codice è di Tonno.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'APRI TONNO' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1/ingredienti/i-tonno'));
  });

  it('NON È QUESTA toglie l\'esito e riprende la lettura', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_TONNO);
    fireEvent.click(await screen.findByRole('button', { name: 'NON È QUESTA' }));
    expect(screen.queryByText('Questo codice è di Tonno.')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Scansiona la confezione' })).toBeInTheDocument();
  });

  it('la sessione scaduta porta a /entra', async () => {
    paramsIngId = 'i-1';
    fetchMock.mockResolvedValueOnce(rispostaJson({}, 401));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entra'));
  });
});

describe('Ingrediente (editor): ELIMINA (spec fase 5 §F)', () => {
  it('su un ingrediente nuovo ELIMINA non c\'è: la freccia fa quel lavoro', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.queryByRole('button', { name: 'Elimina ingrediente' })).toBeNull();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('ELIMINA in coda chiede conferma nel dialogo, poi elimina e torna al piatto', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockResolvedValue(undefined);
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByText('Eliminare questo ingrediente?')).toBeInTheDocument();
    // Nessun acquisto registrato (mock di default): niente frase sullo
    // storico, sarebbe rumore su un ingrediente mai comprato.
    expect(within(dialogo).getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Se è ancora usato in un ' +
      'piatto o in una lista della spesa, l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
    // Il velo del dialogo non chiude (DESIGN.md §8, spec §N).
    fireEvent.click(screen.getAllByTestId('velo-foglio').at(-1)!);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ELIMINA' }));
    await waitFor(() => expect(eliminaIngrediente).toHaveBeenCalledWith('i-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  it('un ingrediente con acquisti registrati avvisa che lo storico va perso, per via della on delete cascade su purchase', async () => {
    paramsIngId = 'i-1';
    vi.mocked(haAcquistiRegistrati).mockResolvedValue(true);
    rendi();
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));

    expect(within(screen.getByRole('alertdialog')).getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Sparisce anche lo storico ' +
      'degli acquisti registrati: non si recupera. Se è ancora usato in un piatto o in una lista della spesa, ' +
      'l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
  });

  it('se non si riesce a sapere se ci sono acquisti, il fail-safe assume di sì (Important 3): un errore di rete non fa sparire l\'avviso', async () => {
    paramsIngId = 'i-1';
    vi.mocked(haAcquistiRegistrati).mockRejectedValue(new Error('rete assente'));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));

    expect(within(screen.getByRole('alertdialog')).getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Sparisce anche lo storico ' +
      'degli acquisti registrati: non si recupera. Se è ancora usato in un piatto o in una lista della spesa, ' +
      'l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
  });

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('un ingrediente ancora in uso: il dialogo si chiude e il motivo resta sotto ELIMINA', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockRejectedValue(
      new IngredienteInUsoError('Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.'),
    );
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));
    expect(await screen.findByText(
      'Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.',
    )).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('un errore qualunque resta nel dialogo, che non si chiude', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));
    expect(await within(screen.getByRole('alertdialog')).findByText('Non siamo riusciti a eliminare l’ingrediente. Riprova.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe('Ingrediente (editor): prezzo di una confezione', () => {
  it('modifica: mostra il prezzo esistente con la virgola decimale (2.5 → "2,5")', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');

    expect(screen.getByText('PREZZO DI UNA CONFEZIONE')).toBeInTheDocument();
    expect(screen.getByText('Facoltativo, in euro: serve solo a contare quanto non ricompri')).toBeInTheDocument();
    expect(screen.getByLabelText('Prezzo di una confezione')).toHaveValue('2,5');
  });

  it('campo vuoto: salva prezzoConfezione null, anche su un ingrediente che un prezzo ce l\'aveva', async () => {
    paramsIngId = 'i-1';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    rendi();
    await screen.findByDisplayValue('Yogurt greco');

    fireEvent.change(screen.getByLabelText('Prezzo di una confezione'), { target: { value: '' } });
    fireEvent.click(salva());

    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i-1', prezzoConfezione: null }),
    ));
  });

  it('"2,5" con la virgola si salva come 2.5', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-nuovo');
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");

    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Riso' } });
    fireEvent.click(screen.getByRole('button', { name: 'PASTA, RISO E CEREALI' }));
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Prezzo di una confezione'), { target: { value: '2,5' } });
    fireEvent.click(salva());

    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Riso', formatoConfezione: 1000, prezzoConfezione: 2.5 }),
    ));
  });

  it('un prezzo compilato ma non positivo ("0") o non numerico ("abc") blocca il salvataggio, come il formato non valido', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    const prezzo = screen.getByLabelText('Prezzo di una confezione');
    // SALVA pulito è spento (§F): si accende solo dopo una modifica valida.
    expect(salva()).toBeDisabled();

    fireEvent.change(prezzo, { target: { value: '0' } });
    expect(salva()).toBeDisabled();

    fireEvent.change(prezzo, { target: { value: 'abc' } });
    expect(salva()).toBeDisabled();

    fireEvent.change(prezzo, { target: { value: '3' } });
    expect(salva()).toBeEnabled();

    fireEvent.click(salva());
    expect(salvaIngrediente).toHaveBeenCalledTimes(1);
  });
});
