import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';
import type { ReactNode } from 'react';

vi.mock('@/data/repertorio', () => ({
  salvaPiatto: vi.fn(),
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
  eliminaPiatto: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));

const push = vi.fn();
let paramsId = 'nuovo';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { salvaPiatto, leggiRepertorio, leggiIngredienti, eliminaPiatto } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import Piatto from '../page';
import { salvaBozza, riprendiBozza } from '../bozza';
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};
const ING_AVENA: Ingredient = {
  id: 'i-2', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};

const PIATTO_ESISTENTE: Dish = {
  id: 'd-1',
  nome: 'Yogurt e avena',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: null,
  giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
  componenti: [],
};

const PIATTO_CON_COMPONENTI: Dish = {
  ...PIATTO_ESISTENTE,
  id: 'd-2',
  componenti: [
    {
      id: 'c-1',
      nome: 'Pane',
      opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 40, unita: 'g' }] }],
    },
  ],
};

function nessunaSettimana() {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

/** Ciclo spento: la sezione "settimana del giro" non compare, ed è il default di tutti. */
function mockBase(settimaneCiclo = 1) {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_AVENA]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    settimaneCiclo,
    cicloOrigine: settimaneCiclo > 1 ? '2026-08-31' : null,
    giorniControllo: 90,
  });
}

// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come nei test
// dell'editor dell'ingrediente. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Piatto />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  paramsId = 'nuovo';
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  mockBase();
  nessunaSettimana();
});

afterEach(() => {
  slotDock.remove();
  // Toglie le spie di console.error: vi.clearAllMocks non le rimette a posto.
  vi.restoreAllMocks();
});

describe('Piatto (editor)', () => {
  it('creazione: gli slot vengono dai meal_slot_def reali, non dai quattro cablati nel mock', async () => {
    rendi();

    expect(await screen.findByPlaceholderText('Dai un nome al piatto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pranzo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cena' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spuntino' })).not.toBeInTheDocument();
  });

  it('un piatto nuovo, senza ingredienti, ha il salvataggio bloccato con il copy di VuotoPiatto', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    expect(
      screen.getByText(
        'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.')).toBeInTheDocument();
    // Non in programma: niente striscia dei sette giorni (sarebbe rumore), solo
    // il riquadro muto. 'LUN' resta comunque nei chip "GIORNO FISSO" (Step 5,
    // sempre presenti): si esclude quel testo, sempre dentro un <button>, per
    // isolare la sola striscia (uno <span> nudo).
    const lunNellaStriscia = screen.queryAllByText('LUN').find((el) => el.closest('button') === null);
    expect(lunNellaStriscia).toBeUndefined();

    expect(salva()).toBeDisabled();
  });

  // Corretto in sede di revisione finale (I2): un ingrediente appena
  // aggiunto parte da quantita: 0, e lo schema ha `check (quantita > 0)` —
  // prima di I2 il pulsante si sbloccava comunque, e salvare falliva sempre
  // con "Non siamo riusciti a salvare il piatto. Riprova.", per sempre.
  it('aggiungere un ingrediente dal selettore NON sblocca il salvataggio finché la grammatura è 0; digitarne una valida sì', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));

    // Quantita 0 appena aggiunto: il salvataggio resta bloccato, e la
    // tessera segnala quale ingrediente è il problema.
    expect(salva()).toBeDisabled();
    expect(
      screen.queryByText(
        'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
      ),
    ).not.toBeInTheDocument();
    // getAllByText e non getByText: il nome compare due volte, nella tessera
    // e nella riga che dice quale grammatura manca. La tessera e' quella
    // dentro un elemento con data-quantita-valida.
    const nelleTessere = screen
      .getAllByText('Yogurt greco')
      .map((el) => el.closest('[data-quantita-valida]'))
      .filter((el) => el !== null);
    expect(nelleTessere).toHaveLength(1);
    expect(nelleTessere[0]).toHaveAttribute('data-quantita-valida', 'false');

    // La riga che spiega cosa manca: senza, il salvataggio resta bloccato
    // senza dire perche' e il numero sulla tessera non si legge come campo.
    expect(
      screen.getByText(/tocca il numero sulla tessera e scrivi quanto ne usi/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });

    expect(salva()).toBeEnabled();
    expect(screen.getByText('Yogurt greco').closest('[data-quantita-valida]')).toHaveAttribute(
      'data-quantita-valida',
      'true',
    );
    // Con la grammatura scritta, la riga che la chiedeva sparisce.
    expect(screen.queryByText(/tocca il numero sulla tessera/)).not.toBeInTheDocument();
  });

  it('rimuovere l\'ultimo ingrediente ridisattiva il salvataggio', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    // Niente è cambiato: spento (spec fase 7 §B.5). Cambiato il nome, si accende.
    expect(salva()).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    expect(salva()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(salva()).toBeDisabled();
  });

  it('modifica: carica nome, pasto e ingredienti del piatto esistente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    rendi();

    expect(await screen.findByDisplayValue('Yogurt e avena')).toBeInTheDocument();
    expect(screen.getByText('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'true');
    // Aperto e basta: niente è cambiato, SALVA è spento (spec fase 7 §B.5).
    expect(salva()).toBeDisabled();
  });

  it('la striscia dei sette giorni riflette la settimana reale, non i sei giorni cablati nel mock', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    const settimana: SettimanaCorrente = {
      id: 'w-1',
      dataInizio: '2026-08-24', // lunedì
      stato: 'confermata',
      slots: [
        {
          id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {},
          porzioniPreparate: 0, daPronti: false,
        },
        {
          id: 's-mar', data: '2026-08-25', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {},
          porzioniPreparate: 0, daPronti: false,
        },
        {
          id: 's-mer', data: '2026-08-26', slotDefId: 'sd-1', stato: 'fuori', dishId: 'd-1', fonteStato: 'default', scelte: {},
          porzioniPreparate: 0, daPronti: false,
        },
      ],
    };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByText('In casa due volte questa settimana, fuori una volta. Il piatto entra due volte nella lista.')).toBeInTheDocument();
    // 'LUN' compare due volte ora: nella striscia "in questa settimana" (uno
    // <span> nudo) e nei chip "GIORNO FISSO" (Step 5, stessa etichetta a tre
    // lettere per entrambi, uno <span> dentro un <button>) — si isola quello
    // della striscia escludendo l'altro.
    const chipLun = screen.getAllByText('LUN').find((el) => el.closest('button') === null);
    expect(chipLun).toBeInTheDocument();
  });

  it('un piatto assegnato ma sempre fuori casa non entra nella lista', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    const settimana: SettimanaCorrente = {
      id: 'w-1',
      dataInizio: '2026-08-24',
      stato: 'confermata',
      slots: [
        {
          id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'fuori', dishId: 'd-1', fonteStato: 'default', scelte: {},
          porzioniPreparate: 0, daPronti: false,
        },
      ],
    };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByText('Fuori casa una volta questa settimana: non entra nella lista.')).toBeInTheDocument();
  });

  it('salva chiama salvaPiatto con la grammatura non moltiplicata e torna al repertorio', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');

    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Yogurt e avena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pranzo' }));
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));

    const input = screen.getByLabelText('Grammatura di Yogurt greco');
    fireEvent.change(input, { target: { value: '150' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledWith({
      id: undefined,
      nome: 'Yogurt e avena',
      slotDefId: 'sd-2',
      fonte: 'proprio',
      attivo: true,
      descrizione: null,
      settimanaCiclo: null,
      giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
      componenti: [],
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('su un piatto nuovo ELIMINA non c’è: la freccia torna al repertorio senza chiedere conferma', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(push).toHaveBeenCalledWith('/piatti');
    expect(eliminaPiatto).not.toHaveBeenCalled();
  });

  it('ELIMINA su un piatto esistente chiede conferma, poi elimina (soft delete) e torna al repertorio', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(eliminaPiatto).mockResolvedValue(undefined);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Eliminare questo piatto?' });
    expect(within(dialogo).getByText('Eliminare questo piatto?')).toBeInTheDocument();
    expect(within(dialogo).getByText(
      'Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.',
    )).toBeInTheDocument();
    // Il velo del dialogo non chiude (DESIGN.md §8 Dialogo di conferma).
    fireEvent.click(screen.getAllByTestId('velo-foglio').at(-1)!);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(eliminaPiatto).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(eliminaPiatto).toHaveBeenCalledWith('d-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));

    expect(screen.queryByText('Eliminare questo piatto?')).not.toBeInTheDocument();
    expect(eliminaPiatto).not.toHaveBeenCalled();
  });

  it('riprende il piatto lasciato a metà per andare a creare un ingrediente', async () => {
    // Il percorso obbligato del primo avvio: per aggiungere un ingrediente che
    // non esiste si esce dall'editor, e lo stato del piatto vive solo qui in
    // memoria. Senza la bozza si riscrivono nome e pasto a ogni ingrediente.
    salvaBozza('nuovo', {
      nome: 'Riso condito',
      slotDefId: 'sd-2',
      descrizione: '',
      settimanaCiclo: null,
      giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
      componenti: [],
    });

    rendi();

    expect(await screen.findByDisplayValue('Riso condito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Yogurt greco')).toBeInTheDocument();
  });

  it('la bozza vince sui dati del server: è lavoro più recente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    salvaBozza('d-1', {
      nome: 'Nome cambiato non ancora salvato', slotDefId: 'sd-3',
      descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });

    rendi();

    expect(await screen.findByDisplayValue('Nome cambiato non ancora salvato')).toBeInTheDocument();
  });

  it('mette al riparo la bozza quando si esce a creare un ingrediente', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), {
      target: { value: 'Riso condito' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cena' }));
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ }));

    expect(riprendiBozza('nuovo')).toEqual({
      nome: 'Riso condito', slotDefId: 'sd-3',
      descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });
  });

  it('ogni ingrediente del piatto ha un accesso al proprio editor', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByRole('link', { name: 'Modifica Yogurt greco' })).toHaveAttribute(
      'href',
      '/piatti/d-1/ingredienti/i-1',
    );
  });

  it('salvare il piatto scarta la bozza, così non riappare al rientro', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(salvaPiatto).mockResolvedValue(undefined as never);

    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    salvaBozza('d-1', {
      nome: 'residuo', slotDefId: 'sd-1',
      descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });

    fireEvent.click(salva());

    // Spec fase 7 §B.5: SALVA scrive e torna a /piatti anche su un piatto esistente.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
    expect(riprendiBozza('d-1')).toBeNull();
  });

  it('il selettore ha un campo di ricerca solo quando la lista e lunga', async () => {
    // Con pochi ingredienti scorrere e' piu' veloce che digitare, e il campo
    // sarebbe solo un ostacolo in piu' prima della lista.
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));

    expect(screen.queryByLabelText('Cerca un ingrediente')).not.toBeInTheDocument();
  });

  it('la ricerca filtra per nome, ignorando accenti e maiuscole', async () => {
    const molti: Ingredient[] = Array.from({ length: 12 }, (_, i) => ({
      id: `i-${i}`, nome: `Riempitivo ${i}`, unitaBase: 'g' as const, area: 'dispensa' as const,
      classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 100, prezzoConfezione: null, ean: null,
    }));
    const CAFFE: Ingredient = {
      id: 'i-caffe', nome: 'Caffè', unitaBase: 'g', area: 'dispensa',
      classeResiduo: 'stima', deperibile: false, formatoConfezione: 250, prezzoConfezione: null, ean: null,
    };
    vi.mocked(leggiIngredienti).mockResolvedValue([...molti, CAFFE]);

    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));

    const campo = screen.getByLabelText('Cerca un ingrediente');
    // Senza accento: sulla tastiera del telefono nessuno lo scrive per cercare.
    fireEvent.change(campo, { target: { value: 'caffe' } });

    expect(screen.getByRole('button', { name: 'Caffè' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riempitivo 0' })).not.toBeInTheDocument();
  });

  it('senza risultati suggerisce di crearlo invece di lasciare il vuoto', async () => {
    const molti: Ingredient[] = Array.from({ length: 12 }, (_, i) => ({
      id: `i-${i}`, nome: `Riempitivo ${i}`, unitaBase: 'g' as const, area: 'dispensa' as const,
      classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 100, prezzoConfezione: null, ean: null,
    }));
    vi.mocked(leggiIngredienti).mockResolvedValue(molti);

    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'zafferano' } });

    expect(screen.getByText(/Nessun ingrediente per "zafferano"/)).toBeInTheDocument();
    // Il modo per uscirne resta a portata di mano.
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ })).toBeInTheDocument();
  });

  it('il selettore degli ingredienti è un Foglio dal basso: la X lo chiude senza aggiungere niente', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));

    const foglio = screen.getByRole('dialog', { name: 'Aggiungi ingrediente' });
    expect(within(foglio).getByRole('button', { name: 'Yogurt greco' })).toBeInTheDocument();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi il foglio' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('Grammatura di Yogurt greco')).toBeNull();
  });

  it('un piatto caricato con componenti li mostra', async () => {
    paramsId = 'd-2';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_CON_COMPONENTI]);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByDisplayValue('Pane')).toBeInTheDocument();
    expect(screen.getByText("Fiocchi d'avena")).toBeInTheDocument();
  });

  it("aggiungere un componente con un'opzione e salvare chiama salvaPiatto con la struttura componenti attesa", async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');

    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Panino' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pranzo' }));

    // Un ingrediente fisso valido: senza, il salvataggio resta bloccato a
    // prescindere dai componenti, e questo test verifica solo la struttura
    // di questi ultimi.
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' }));
    fireEvent.change(screen.getByLabelText('Nome del componente 1'), { target: { value: 'Pane' } });

    fireEvent.click(screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 1 del componente 1" }));
    fireEvent.click(await screen.findByText("Fiocchi d'avena"));
    fireEvent.change(screen.getByLabelText("Grammatura di Fiocchi d'avena"), { target: { value: '40' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalled());
    const [chiamata] = vi.mocked(salvaPiatto).mock.calls[0];
    expect(chiamata.componenti).toHaveLength(1);
    const [componente] = chiamata.componenti;
    expect(componente.nome).toBe('Pane');
    // id generato da crypto.randomUUID() lato client (brief): un uuid vero,
    // non l'id fisso di un componente esistente.
    expect(componente.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(componente.opzioni).toHaveLength(1);
    expect(componente.opzioni[0].righe).toEqual([{ ingredientId: 'i-2', quantita: 40, unita: 'g' }]);
  });

  it("un'opzione senza righe blocca il salva", async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    // Piatto altrimenti valido: nome e un ingrediente con grammatura.
    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Panino' } });
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });
    expect(salva()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' }));
    fireEvent.change(screen.getByLabelText('Nome del componente 1'), { target: { value: 'Pane' } });

    // Nome dato, ma l'opzione di default nasce senza righe: il salvataggio si blocca.
    expect(salva()).toBeDisabled();
    expect(screen.getByText(/Ogni opzione deve avere almeno un ingrediente/)).toBeInTheDocument();
  });

  // Review round 1, finding HIGH: BozzaPiatto non includeva `componenti`, e
  // uscire dall'editor (per creare o modificare un ingrediente) e rientrare
  // cancellava silenziosamente i componenti aggiunti fino a quel momento,
  // perché carica() li rileggeva dal server (o da `[]` su un piatto nuovo)
  // sopra una bozza che non li aveva mai salvati. Il giro qui è simulato con
  // unmount + un nuovo render di <Piatto/>, come farebbe una navigazione
  // reale verso l'editor dell'ingrediente e ritorno.
  it("conserva un componente attraverso il giro bozza (uscita verso 'nuovo ingrediente' e rientro)", async () => {
    const { unmount } = rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Panino' } });
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' }));
    fireEvent.change(screen.getByLabelText('Nome del componente 1'), { target: { value: 'Pane' } });
    fireEvent.click(screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 1 del componente 1" }));
    fireEvent.click(await screen.findByText("Fiocchi d'avena"));
    fireEvent.change(screen.getByLabelText("Grammatura di Fiocchi d'avena"), { target: { value: '40' } });

    // Il selettore si è chiuso da solo dopo la scelta: per raggiungere
    // "NUOVO INGREDIENTE" (che chiama riparaBozzaPrimaDiUscire) lo si riapre
    // dal selettore principale — stesso link, ora visibile a prescindere dal
    // target da cui il selettore è stato aperto (era nascosto per le opzioni
    // prima di questo fix).
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ }));

    unmount();
    rendi();

    expect(await screen.findByDisplayValue('Pane')).toBeInTheDocument();
    expect(screen.getByText("Fiocchi d'avena")).toBeInTheDocument();
  });

  // Review round 1, finding MEDIUM: salvare un piatto con componenti già salvati non deve
  // rigenerare gli id di componenti/opzioni (salvaPiatto riusa solo id che sono già uuid:
  // rigenerarli invaliderebbe le meal_slot_choice registrate per quel componente). Dalla
  // fase 7 SALVA è spento finché niente cambia: si cambia il solo nome del piatto.
  it('aprire un piatto con componenti, cambiare solo il nome e salvare conserva gli id originali', async () => {
    paramsId = 'd-2';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_CON_COMPONENTI]);
    vi.mocked(salvaPiatto).mockResolvedValue('d-2');

    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    expect(salva()).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Yogurt e avena col pane' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalled());
    const [chiamata] = vi.mocked(salvaPiatto).mock.calls[0];
    expect(chiamata.nome).toBe('Yogurt e avena col pane');
    expect(chiamata.componenti).toEqual([
      { id: 'c-1', nome: 'Pane', opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 40, unita: 'g' }] }] },
    ]);
  });

  // Review finale, finding IMPORTANT: spec §C sui chip GIORNO FISSO —
  // "tutti visibili senza scroll orizzontale (due righe se serve)". Test
  // strutturale (il jsdom di Vitest non calcola un vero layout, quindi non
  // può verificare l'assenza di scroll): verifica che il contenitore dei
  // chip vada a capo (flexWrap) e non scorra più in orizzontale, mentre i
  // chip di SETTIMANA DEL GIRO — un altro uso dello stesso componente
  // Pillole — restano sul comportamento a scroll di prima.
  it('i chip GIORNO FISSO vanno a capo invece di scorrere in orizzontale; i chip SETTIMANA restano a scroll', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    mockBase(2); // settimaneCiclo > 1: mostra anche la fila SETTIMANA DEL GIRO
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    const libero = screen.getByRole('button', { name: /Giorno fisso: Lo sceglie l.app, ruotando/ });
    const contenitoreGiorno = libero.parentElement;
    expect(contenitoreGiorno).toHaveStyle({ flexWrap: 'wrap' });
    // Il div scrollabile che avvolgeva la fila ('.sc' + overflowX auto) non
    // deve più limitare la larghezza quando va a capo.
    expect(contenitoreGiorno?.parentElement).not.toHaveStyle({ overflowX: 'auto' });

    const tutte = screen.getByRole('button', { name: /Settimana del giro: Va bene in ogni settimana del giro/ });
    const contenitoreSettimana = tutte.parentElement;
    expect(contenitoreSettimana).toHaveStyle({ flexWrap: 'nowrap' });
    expect(contenitoreSettimana?.parentElement).toHaveStyle({ overflowX: 'auto' });
  });
});

describe('Piatto (editor): un modo solo, SALVA nel Dock ed ELIMINA (spec fase 7 §B)', () => {
  it('la testata è quella di modifica: la freccia «Torna ai piatti» e il nome come campo a 32', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();

    const nome = await screen.findByDisplayValue('Yogurt e avena');
    expect(nome.tagName).toBe('TEXTAREA');
    expect(nome).toHaveAttribute('placeholder', 'Dai un nome al piatto');
    expect(nome.style.fontSize).toBe('32px');
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));
    expect(push).toHaveBeenCalledWith('/piatti');
    // L'intestazione di oggi non c'è più.
    expect(screen.queryByText('PIATTO')).toBeNull();
  });

  it('SALVA sta nel Dock, senza tab bar, ed è spento finché niente cambia', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');

    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(dock).toHaveClass('dock-senza-barra');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toHaveClass('dock-primario');
    expect(salva()).toBeDisabled();

    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    expect(salva()).toBeEnabled();
    // Rimesso com'era, non è cambiato niente.
    fireEvent.change(nome, { target: { value: 'Yogurt e avena' } });
    expect(salva()).toBeDisabled();

    // Anche una grammatura è un cambiamento, e tornare al valore di prima lo annulla.
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '160' } });
    expect(salva()).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });
    expect(salva()).toBeDisabled();

    // Il pasto, il giorno fisso, il procedimento: ognuno accende SALVA.
    fireEvent.click(screen.getByRole('button', { name: 'Cena' }));
    expect(salva()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }));
    expect(salva()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Giorno fisso: Martedì' }));
    expect(salva()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Giorno fisso: Lo sceglie l.app, ruotando/ }));
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Procedimento del piatto'), { target: { value: 'Mescola.' } });
    expect(salva()).toBeEnabled();
  });

  it('un modulo cambiato ma non valido tiene SALVA spento, e la ragione resta scritta nel modulo come Nota', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(salva()).toBeDisabled();
    const ragione = screen.getByText(
      'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
    );
    // Una Nota, non un errore: spiega perché SALVA è spento (DESIGN.md §8 Messaggi).
    expect(ragione.style.color).toBe('var(--testo-2)');
    expect(ragione.style.fontSize).toBe('12.5px');
    expect(ragione.closest('[role="region"]')).toBeNull(); // nel modulo, non sopra il Dock
  });

  it('su un piatto nuovo la ragione di SALVA spento non è rossa dalla prima apertura', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    expect(salva()).toBeDisabled();
    const ragione = screen.getByText(
      'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
    );
    expect(ragione.style.color).toBe('var(--testo-2)');
  });

  it('una grammatura mancante è un dato scritto male: il messaggio è in --errore', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI INGREDIENTE' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Aggiungi ingrediente' })).getByRole('button', { name: 'Yogurt greco' }));

    const messaggio = screen.getByText(/tocca il numero sulla tessera e scrivi quanto ne usi/);
    expect(messaggio.style.color).toBe('var(--errore)');
  });

  it('SALVA su un piatto esistente scrive e torna a /piatti', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt, avena e miele' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledWith({
      id: 'd-1',
      nome: 'Yogurt, avena e miele',
      slotDefId: 'sd-1',
      fonte: 'proprio',
      attivo: true,
      descrizione: null,
      settimanaCiclo: null,
      giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
      componenti: [],
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('in volo SALVA è spento con lo stato del sistema, non con l’opacità; se fallisce l’errore sta sopra il Dock', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    let rifiuta!: (e: unknown) => void;
    vi.mocked(salvaPiatto).mockReturnValue(new Promise((_, r) => { rifiuta = r; }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt e avena bis' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salva()).toBeDisabled());
    expect(salva()).toHaveTextContent('SALVA');
    expect(salva()).toHaveAttribute('aria-busy', 'true');
    expect(salva().style.opacity).toBe('');
    await act(async () => { rifiuta(new Error('rete')); });
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(within(dock).getByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare il piatto. Riprova.');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('AGGIUNGI INGREDIENTE è l’Aggiungi tratteggiato sotto le tessere, e apre il selettore in un Foglio dal basso', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    const aggiungi = screen.getByRole('button', { name: 'AGGIUNGI INGREDIENTE' });
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Aggiungi ingrediente' })).getByRole('button', { name: 'Yogurt greco' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Grammatura di Yogurt greco')).toBeInTheDocument();
  });

  it('se l’eliminazione fallisce l’errore resta nel dialogo, che non si chiude', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(eliminaPiatto).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));

    expect(await within(screen.getByRole('alertdialog')).findByText('Non siamo riusciti a eliminare il piatto. Riprova.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('il dialogo di eliminazione sta al livello 1 (z 50): sotto non c’è un altro foglio (review finale, M7)', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));

    const veli = screen.getAllByTestId('velo-foglio');
    expect(veli).toHaveLength(1);
    expect(veli[0].style.zIndex).toBe('50');
  });

  it('con SALVA in volo ELIMINA è spento: l’upsert di SALVA resusciterebbe il piatto eliminato (review finale)', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    let risolvi!: (v: string) => void;
    vi.mocked(salvaPiatto).mockReturnValue(new Promise((r) => { risolvi = r; }));
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt e avena bis' } });
    expect(screen.getByRole('button', { name: 'Elimina piatto' })).toBeEnabled();

    fireEvent.click(salva());

    await waitFor(() => expect(salva()).toBeDisabled());
    const elimina = screen.getByRole('button', { name: 'Elimina piatto' });
    expect(elimina).toBeDisabled();
    fireEvent.click(elimina);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await act(async () => { risolvi('d-1'); });
  });

  it('ELIMINA è un tasto secondario in --errore, in coda', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    const elimina = screen.getByRole('button', { name: 'Elimina piatto' });
    expect(elimina).toHaveTextContent('ELIMINA');
    expect(elimina.style.color).toBe('var(--errore)');
    expect(elimina.style.height).toBe('54px');
  });

  it('un piatto non trovato: il messaggio, la freccia, niente Dock', async () => {
    paramsId = 'd-inesistente';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();

    expect(await screen.findByText('Piatto non trovato.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna ai piatti' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
  });

  it('un caricamento fallito: il messaggio in --errore, niente Dock', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiIngredienti).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();

    const messaggio = await screen.findByRole('alert');
    expect(messaggio).toHaveTextContent('Non riusciamo a caricare il piatto. Riprova più tardi.');
    expect(messaggio.style.color).toBe('var(--errore)');
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });

  // Il cambio voluto di §B.7: prima della fase 7 su /piatti/nuovo l'editor si mostrava lo
  // stesso anche a caricamento fallito, e SALVA poteva scrivere un piatto con slot_def_id ''.
  it('un caricamento fallito su /piatti/nuovo: solo il messaggio e la freccia, niente modulo, niente Dock né SALVA', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiIngredienti).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();

    const messaggio = await screen.findByRole('alert');
    expect(messaggio).toHaveTextContent('Non riusciamo a caricare il piatto. Riprova più tardi.');
    expect(screen.getByRole('button', { name: 'Torna ai piatti' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Dai un nome al piatto')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'SALVA' })).toBeNull();
    expect(salvaPiatto).not.toHaveBeenCalled();
  });

  // Review di correttezza del Task 6 (R1): la freccia prende il posto di ANNULLA, che esisteva
  // solo a editor caricato. Durante il caricamento o dopo un caricamento fallito c'era solo il
  // Link della vecchia intestazione, che la bozza non la toccava: una bozza messa al riparo
  // uscendo verso l'editor di un ingrediente non deve sparire perché al rientro la rete è caduta.
  const BOZZA_PENDENTE = {
    nome: 'Yogurt e avena, a metà', slotDefId: 'sd-1',
    descrizione: '', settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' as const }], componenti: [],
  };

  it('dopo un caricamento fallito la freccia torna a /piatti senza scartare la bozza pendente', async () => {
    paramsId = 'd-1';
    salvaBozza('d-1', BOZZA_PENDENTE);
    vi.mocked(leggiIngredienti).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(riprendiBozza('d-1')).toEqual(BOZZA_PENDENTE);
  });

  it('durante il caricamento la freccia torna a /piatti senza scartare la bozza pendente', async () => {
    paramsId = 'd-1';
    salvaBozza('d-1', BOZZA_PENDENTE);
    vi.mocked(leggiSlotDefs).mockReturnValue(new Promise(() => {}));
    rendi();
    await screen.findByText('CARICO…');

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(riprendiBozza('d-1')).toEqual(BOZZA_PENDENTE);
  });

  it('le pillole di una cifra della settimana del giro sono larghe almeno 44, come il bersaglio', async () => {
    mockBase(2);
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    const uno = screen.getByRole('button', { name: 'Settimana del giro: Settimana 1 del giro' });
    expect(uno.style.height).toBe('44px');
    const pillola = within(uno).getByText('1');
    expect(pillola.style.minWidth).toBe('44px');
  });

  it('in caricamento: la testata e CARICO…, niente Dock', async () => {
    vi.mocked(leggiSlotDefs).mockReturnValue(new Promise(() => {}));
    rendi();

    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna ai piatti' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });

  it('la striscia dei giorni usa i token: il giorno in programma pieno in --ink, il testo in --superficie', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({
      id: 'w-1', dataInizio: '2026-08-24', stato: 'confermata',
      slots: [{
        id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {},
        porzioniPreparate: 0, daPronti: false,
      }],
    });
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    const lun = screen.getAllByText('LUN').find((el) => el.closest('button') === null)!;
    expect(lun.style.background).toBe('var(--ink)');
    expect(lun.style.color).toBe('var(--superficie)');
    const mar = screen.getAllByText('MAR').find((el) => el.closest('button') === null)!;
    expect(mar.style.background).toBe('var(--spento)');
  });
});

describe('Piatto (editor): aperto dal Piano torna al Piano (review finale, I1)', () => {
  const CHIAVE_RITORNO = 'spesa:piatto-ritorno:d-1';

  beforeEach(() => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    window.history.replaceState(null, '', '/piatti/d-1?da=piano');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('con ?da=piano la freccia dice «Torna al piano» e porta a /piano, e il ritorno si dimentica', async () => {
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.queryByRole('button', { name: 'Torna ai piatti' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piano' }));

    expect(push).toHaveBeenCalledWith('/piano');
    expect(push).not.toHaveBeenCalledWith('/piatti');
    expect(sessionStorage.getItem(CHIAVE_RITORNO)).toBeNull();
  });

  it('dopo il giro verso l’editor dell’ingrediente (rientro senza ?da) il ritorno è ancora /piano', async () => {
    const { unmount } = rendi();
    await screen.findByDisplayValue('Yogurt e avena');
    fireEvent.click(screen.getByRole('link', { name: 'Modifica Yogurt greco' }));
    unmount();

    // L'editor dell'ingrediente torna a /piatti/{id} senza parametri.
    window.history.replaceState(null, '', '/piatti/d-1');
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Torna al piano' }));
    expect(push).toHaveBeenCalledWith('/piano');
  });

  it('SALVA aperto dal Piano torna a /piano, e il ritorno si dimentica', async () => {
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt e avena bis' } });

    fireEvent.click(salva());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano'));
    expect(push).not.toHaveBeenCalledWith('/piatti');
    expect(sessionStorage.getItem(CHIAVE_RITORNO)).toBeNull();
  });

  it('ELIMINA riuscito aperto dal Piano torna a /piano, e il ritorno si dimentica', async () => {
    vi.mocked(eliminaPiatto).mockResolvedValue(undefined);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(eliminaPiatto).toHaveBeenCalledWith('d-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano'));
    expect(push).not.toHaveBeenCalledWith('/piatti');
    expect(sessionStorage.getItem(CHIAVE_RITORNO)).toBeNull();
  });

  it('senza ?da e senza ritorno memorizzato resta tutto com’era: «Torna ai piatti» e /piatti', async () => {
    window.history.replaceState(null, '', '/piatti/d-1');
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.queryByRole('button', { name: 'Torna al piano' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));
    expect(push).toHaveBeenCalledWith('/piatti');
  });
});

describe('Piatto (editor): aperto da Piatti ripulisce il ritorno al Piano rimasto in sospeso', () => {
  const CHIAVE_RITORNO = 'spesa:piatto-ritorno:d-1';

  beforeEach(() => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    // La chiave orfana: un'uscita di sistema (indietro Android, chiusura
    // dell'app a metà) l'ha lasciata scritta senza passare da freccia, SALVA
    // o ELIMINA, che l'avrebbero dimenticata.
    sessionStorage.setItem(CHIAVE_RITORNO, 'piano');
    window.history.replaceState(null, '', '/piatti/d-1?da=piatti');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('con ?da=piatti e la chiave orfana la freccia dice «Torna ai piatti», porta a /piatti, e la chiave non c’è più', async () => {
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(sessionStorage.getItem(CHIAVE_RITORNO)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Torna al piano' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(push).not.toHaveBeenCalledWith('/piano');
  });
});
