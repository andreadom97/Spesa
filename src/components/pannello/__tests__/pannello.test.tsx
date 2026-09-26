import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => percorso.valore,
  useRouter: () => ({ push, replace }),
}));

vi.mock('@/data/utente', () => ({
  useUtente: () => ({ nome: 'Andrea', email: 'andrea@example.it' }),
  inizialeDi: (nome: string) => (nome.trim() ? nome.trim()[0].toUpperCase() : '·'),
  leggiUtente: vi.fn(async () => ({ nome: 'Andrea', email: 'andrea@example.it' })),
}));
// MIN_PORZIONI e MAX_PORZIONI: dal Task 7 la cima vera li legge al caricamento del modulo
// (CampoPersone), e un mock senza di loro farebbe lanciare Vitest all'import.
vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn(), salvaImpostazioni: vi.fn(), salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => []), MIN_PORZIONI: 1, MAX_PORZIONI: 4,
}));
vi.mock('@/data/casa', async () => {
  const reale = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return { statoCasa: vi.fn(), dimenticaIdCasa: vi.fn(), eRifiutoRls: reale.eRifiutoRls };
});
vi.mock('@/data/risparmio', () => ({ leggiRisparmioTotale: vi.fn() }));
vi.mock('@/data/primo-avvio', () => ({ assicuraDatiIniziali: vi.fn() }));
// Dal Task 9 'ingredienti' monta la vera Ingredienti, che legge da sé: senza questo mock una
// lettura vera (non finta) fallirebbe in console a ogni apertura su quella sotto-schermata.
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(async () => []) }));

// Una sotto-schermata col piede fisso, per provare PiedePannello: le vere arrivano coi Task 8–10.
vi.mock('../schermate', async () => {
  const vero = await vi.importActual<typeof import('../schermate')>('../schermate');
  const { PiedePannello } = await vi.importActual<typeof import('../PiedePannello')>('../PiedePannello');
  return {
    ...vero,
    SCHERMATE: {
      ...vero.SCHERMATE,
      aree: {
        titolo: 'Ordine delle aree',
        Componente: () => <PiedePannello><button type="button">SALVA ORDINE</button></PiedePannello>,
      },
    },
  };
});

import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { statoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { Testata } from '../../Testata';
import { PannelloProvider, usePannello } from '../PannelloProvider';
import { DatiPannelloProvider } from '../DatiPannello';
import { Pannello } from '../Pannello';
import { assicuraDatiIniziali } from '@/data/primo-avvio';
import { PrimoAvvio } from '../../PrimoAvvio';

const ASSENZE = [false, false, false, false, false, false, false];
const PASTI: MealSlotDef[] = [
  { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE },
  { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE },
  { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE },
];
const IMPOSTAZIONI: Impostazioni = {
  moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
};

const conferma = vi.hoisted(() => vi.fn<() => Promise<void>>());

/** I gesti che nel pannello vero fanno le tessere e le righe (Task 7–10). */
function Comandi() {
  const p = usePannello();
  return (
    <div>
      <button type="button" onClick={() => p.entra('cadenza')}>entra in cadenza</button>
      <button type="button" onClick={() => p.entra('aree')}>entra in aree</button>
      <button
        type="button"
        onClick={() => p.mostraDialogo({
          titolo: 'Uscire da Dispesa?',
          testo: 'I tuoi dati restano. Per rientrare ti mandiamo un link a andrea@example.it.',
          azione: 'ESCI',
          tono: 'primario',
          erroreTesto: 'Non siamo riusciti a farti uscire. Riprova.',
          onConferma: conferma,
        })}
      >
        mostra il dialogo
      </button>
      <button type="button" onClick={() => p.vaiA('/piatti?da=impostazioni', { pathname: '/lista', sotto: 'cima' })}>vai a piatti</button>
    </div>
  );
}

const albero = () => (
  <PannelloProvider>
    <Testata titolo="Lista" />
    <Comandi />
    <DatiPannelloProvider><Pannello /></DatiPannelloProvider>
  </PannelloProvider>
);
const monta = () => render(albero());
const menu = () => screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
const pannello = () => document.getElementById('pannello-impostazioni')!;
const tocca = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }));
const titolo = () => screen.getByRole('heading', { level: 2 }).textContent;

/**
 * Apre dal Menù utente e aspetta che i dati arrivino (`CARICO…` sparisce): così le letture non
 * aggiornano lo stato dopo la fine del test, fuori da `act`.
 */
async function apri() {
  fireEvent.click(menu());
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
}

/**
 * Lascia arrivare le letture dove `CARICO…` non si vede (una riapertura silenziosa, un'apertura
 * da indirizzo su una sotto-schermata): i mock rispondono subito, basta un giro dentro `act`.
 */
async function assesta() {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

/** Il gesto indietro del telefono, o il popstate che segue un go(). */
function indietro() {
  act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI });
  vi.mocked(leggiSlotDefs).mockResolvedValue(PASTI);
  vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue([]);
  percorso.valore = '/lista';
  window.history.replaceState(null, '', '/lista');
  window.sessionStorage.clear();
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Pannello: aprire e chiudere (spec §A.2, §B.1)', () => {
  it('è chiuso finché il Menù utente non lo apre; aperto: aria-expanded, --ombra-nav, fuoco al pannello, una voce, e i dati si leggono', async () => {
    monta();
    expect(menu()).toHaveAttribute('aria-expanded', 'false');
    expect(menu()).toHaveAttribute('aria-controls', 'pannello-impostazioni');
    expect(screen.queryByRole('dialog', { name: 'Impostazioni' })).not.toBeInTheDocument();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(leggiImpostazioni).not.toHaveBeenCalled();

    await apri();
    const dialogo = screen.getByRole('dialog', { name: 'Impostazioni' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAttribute('data-stato', 'aperto');
    expect(dialogo).not.toHaveAttribute('data-istantaneo');
    expect(menu()).toHaveAttribute('aria-expanded', 'true');
    expect(menu().style.boxShadow).toBe('var(--ombra-nav)');
    expect(dialogo).toHaveFocus();
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(1);
  });

  it('si chiude con la X: un go(-1), e il fuoco torna al Menù utente', async () => {
    monta();
    await apri();
    tocca('Chiudi le impostazioni');
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(screen.queryByRole('dialog', { name: 'Impostazioni' })).not.toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledWith(-1);
    expect(menu()).toHaveAttribute('aria-expanded', 'false');
    expect(menu()).toHaveFocus();
  });

  it('si chiude col velo e col Menù utente', async () => {
    monta();
    await apri();
    fireEvent.click(document.querySelector('.pannello-velo')!);
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    indietro(); // il popstate del go(-1)

    fireEvent.click(menu());
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    await assesta(); // la rilettura silenziosa della riapertura
    fireEvent.click(menu());
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(menu()).toHaveFocus();
  });
});

describe('Pannello: sotto-schermate e dialogo (spec §A.4, §B.1, §B.2, §D)', () => {
  it('entra e torna: la freccia a sinistra al posto della X, e il titolo della sotto-schermata', async () => {
    monta();
    await apri();
    tocca('entra in cadenza');
    expect(titolo()).toBe('Cadenza dei controlli');
    expect(screen.getByRole('dialog', { name: 'Cadenza dei controlli' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chiudi le impostazioni' })).not.toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(2);

    tocca('Torna alle impostazioni');
    expect(titolo()).toBe('Impostazioni');
    expect(screen.getByRole('button', { name: 'Chiudi le impostazioni' })).toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledWith(-1);
  });

  it('la sotto-schermata entra da destra, ed esce restando a schermo per la durata dell\'uscita', async () => {
    monta();
    await apri();
    const corpo = () => pannello().querySelector('.pannello-corpo')!;
    tocca('entra in aree');
    expect(corpo()).toHaveClass('anim-sotto-entra');
    expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeInTheDocument();

    tocca('Torna alle impostazioni');
    expect(corpo()).toHaveClass('anim-sotto-esce');
    expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'SALVA ORDINE' })).not.toBeInTheDocument());
    expect(corpo()).not.toHaveClass('anim-sotto-esce');
  });

  it('PiedePannello porta il primario nel piede fisso, fuori dallo scorrimento; in cima il piede è vuoto', async () => {
    monta();
    await apri();
    expect(pannello().querySelector('.pannello-piede')!.childElementCount).toBe(0);
    tocca('entra in aree');
    const salva = screen.getByRole('button', { name: 'SALVA ORDINE' });
    expect(salva.closest('.pannello-piede')).not.toBeNull();
    expect(salva.closest('.pannello-corpo')).toBeNull();
  });

  it('il gesto indietro scende di un livello: dialogo → sotto-schermata → cima → chiuso, senza go()', async () => {
    monta();
    await apri();
    tocca('entra in cadenza');
    tocca('mostra il dialogo');
    expect(screen.getByRole('alertdialog', { name: 'Uscire da Dispesa?' })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(3);

    indietro();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(titolo()).toBe('Cadenza dei controlli');
    indietro();
    expect(titolo()).toBe('Impostazioni');
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    indietro();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('il dialogo: ANNULLA lo chiude; una conferma fallita mostra l\'errore e resta; una riuscita lo chiude', async () => {
    monta();
    await apri();
    tocca('mostra il dialogo');
    tocca('ANNULLA');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(window.history.go).toHaveBeenLastCalledWith(-1);
    indietro(); // il popstate di quel go(-1)

    conferma.mockRejectedValueOnce(new Error('rete'));
    tocca('mostra il dialogo');
    tocca('ESCI');
    expect(await screen.findByText('Non siamo riusciti a farti uscire. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog', { name: 'Uscire da Dispesa?' })).toBeInTheDocument();

    conferma.mockResolvedValueOnce(undefined);
    tocca('ESCI');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
  });
});

describe('Pannello: aprire da un indirizzo (spec §A.3, §A.4)', () => {
  it('?impostazioni=ingredienti apre sulla sotto-schermata senza animazione, toglie il parametro e ripristina lo scorrimento', async () => {
    // jsdom non fa layout: qui scrollTop si ricorda e basta, come in un corpo abbastanza lungo.
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get(this: HTMLElement & { _scroll?: number }) { return this._scroll ?? 0; },
      set(this: HTMLElement & { _scroll?: number }, v: number) { this._scroll = v; },
    });
    try {
      window.history.replaceState(null, '', '/lista?impostazioni=ingredienti');
      window.sessionStorage.setItem('spesa:pannello-scroll:ingredienti', '420');
      monta();
      await assesta();
      expect(pannello()).toHaveAttribute('data-stato', 'aperto');
      expect(pannello()).toHaveAttribute('data-istantaneo');
      expect(titolo()).toBe('Ingredienti');
      expect(window.location.pathname + window.location.search).toBe('/lista');
      expect(window.history.pushState).toHaveBeenCalledTimes(2);
      const corpo = pannello().querySelector('.pannello-corpo') as HTMLElement;
      expect(corpo).not.toHaveClass('anim-sotto-entra');
      expect(corpo.scrollTop).toBe(420);
      expect(window.sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).toBeNull();

      // Il limite noto della spec §A.4: il primo indietro porta in cima, il secondo chiude.
      indietro();
      expect(titolo()).toBe('Impostazioni');
      indietro();
      expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
    }
  });

  it('un valore sconosciuto apre in cima; senza parametro non apre niente', async () => {
    const { unmount } = monta();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    unmount();
    window.history.replaceState(null, '', '/lista?impostazioni=boh');
    monta();
    await assesta();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(titolo()).toBe('Impostazioni');
  });

  // Regola B′ della sonda del Task 2: con null la voce perde `__NA` di Next, e il primo
  // indietro ricarica la pagina.
  it('il parametro si toglie conservando lo stato di Next nella voce, non con null', async () => {
    const statoNext = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: 'albero' };
    window.history.replaceState(statoNext, '', '/lista?impostazioni=cima');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    monta();
    await assesta();
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(statoNext, '', '/lista');
  });

  // Review finale M7: si toglie solo ?impostazioni=, gli altri parametri e l'ancora restano.
  it('togliendo il parametro gli altri parametri dell\'indirizzo restano, con lo stato di Next', async () => {
    const statoNext = { __NA: true };
    window.history.replaceState(statoNext, '', '/lista?da=piatti&impostazioni=cima&x=1#sotto');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    monta();
    await assesta();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(replaceState).toHaveBeenCalledWith(statoNext, '', '/lista?da=piatti&x=1#sotto');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/lista?da=piatti&x=1#sotto');
  });

  // Review finale M2: un utente nuovo che entra da un vecchio segnalibro /impostazioni non deve
  // far seminare i pasti al pannello mentre il primo avvio li sta seminando (8 pasti, oltre 6).
  it('nel Guscio, da indirizzo il pannello si apre solo quando il primo avvio ha finito', async () => {
    let finisci: () => void = () => {};
    vi.mocked(assicuraDatiIniziali).mockReturnValue(new Promise((r) => { finisci = () => r({ pasti: true, ingredienti: true }); }));
    window.history.replaceState(null, '', '/lista?impostazioni=cadenza');
    render(
      <PannelloProvider attendiPrimoAvvio>
        <DatiPannelloProvider><Pannello /></DatiPannelloProvider>
        <PrimoAvvio><p>la pagina</p></PrimoAvvio>
      </PannelloProvider>,
    );
    await assesta();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(leggiSlotDefs).not.toHaveBeenCalled();
    // Il parametro resta finché il pannello non si apre.
    expect(window.location.search).toBe('?impostazioni=cadenza');

    await act(async () => { finisci(); });
    await assesta();
    expect(screen.getByText('la pagina')).toBeInTheDocument();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(titolo()).toBe('Cadenza dei controlli');
    expect(window.location.search).toBe('');
    expect(leggiSlotDefs).toHaveBeenCalled();
  });

  it('senza PrimoAvvio (il pannello fuori dal Guscio) da indirizzo si apre subito, come prima', async () => {
    window.history.replaceState(null, '', '/lista?impostazioni=cima');
    monta();
    await assesta();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(assicuraDatiIniziali).not.toHaveBeenCalled();
  });

  it('il parametro si rilegge a ogni cambio di pathname', async () => {
    percorso.valore = '/piatti';
    window.history.replaceState(null, '', '/piatti');
    const { rerender } = monta();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');

    window.history.replaceState(null, '', '/dispensa?impostazioni=cima');
    percorso.valore = '/dispensa';
    rerender(albero());
    await assesta();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(window.location.pathname + window.location.search).toBe('/dispensa');
  });
});

describe('Pannello: lasciarlo per una pagina piena (spec §A.5)', () => {
  // Ramo A: la sonda del Task 2 regge con la fn differita di un giro (registro, «Sonda del Task 2»).
  it('vaiA salva l\'origine, chiude, e naviga un giro dopo il popstate che consuma le voci', async () => {
    monta();
    await apri();
    tocca('vai a piatti');
    expect(JSON.parse(window.sessionStorage.getItem('spesa:origine-pannello')!)).toEqual({ pathname: '/lista', sotto: 'cima' });
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(window.history.go).toHaveBeenCalledWith(-1);
    expect(push).not.toHaveBeenCalled();

    indietro(); // il popstate del go(-1)
    // Non dentro il popstate: la traversata di Next scarterebbe la push (useIndietroFogli).
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/piatti?da=impostazioni');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('Pannello: stati dei dati (spec §B.5)', () => {
  it('CARICO… con role status finché i dati non arrivano', () => {
    vi.mocked(leggiImpostazioni).mockReturnValue(new Promise(() => {}));
    monta();
    fireEvent.click(menu());
    expect(screen.getByRole('status')).toHaveTextContent('CARICO…');
  });

  it('se il caricamento fallisce: l\'errore con RIPROVA, che rilegge', async () => {
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    monta();
    fireEvent.click(menu());
    expect(await screen.findByText('Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.')).toBeInTheDocument();

    tocca('RIPROVA');
    expect(screen.getByRole('status')).toHaveTextContent('CARICO…');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByText(/Non riusciamo a caricare le impostazioni/)).not.toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });
});
