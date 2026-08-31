import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';

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

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500,
};
const ING_AVENA: Ingredient = {
  id: 'i-2', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 1000,
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

/**
 * Da Task 5: un piatto esistente apre in 'vista', non nell'editor. I test
 * che qui sotto esercitano l'editor su un piatto esistente devono prima
 * passare da MODIFICA — un piatto nuovo invece apre già in 'modifica' e non
 * ne ha bisogno.
 */
async function entraInModifica() {
  fireEvent.click(await screen.findByRole('button', { name: 'MODIFICA' }));
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
  });
}

describe('Piatto (editor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    paramsId = 'nuovo';
    mockBase();
    nessunaSettimana();
  });

  it('creazione: gli slot vengono dai meal_slot_def reali, non dai quattro cablati nel mock', async () => {
    render(<Piatto />);

    expect(await screen.findByPlaceholderText('Dai un nome al piatto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pranzo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cena' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Spuntino' })).not.toBeInTheDocument();
  });

  it('un piatto nuovo, senza ingredienti, ha il salvataggio bloccato con il copy di VuotoPiatto', async () => {
    render(<Piatto />);
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

    const salva = screen.getByRole('button', { name: 'SALVA PIATTO' });
    expect(salva).toBeDisabled();
  });

  // Corretto in sede di revisione finale (I2): un ingrediente appena
  // aggiunto parte da quantita: 0, e lo schema ha `check (quantita > 0)` —
  // prima di I2 il pulsante si sbloccava comunque, e salvare falliva sempre
  // con "Non siamo riusciti a salvare il piatto. Riprova.", per sempre.
  it('aggiungere un ingrediente dal selettore NON sblocca il salvataggio finché la grammatura è 0; digitarne una valida sì', async () => {
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));

    // Quantita 0 appena aggiunto: il salvataggio resta bloccato, e la
    // tessera segnala quale ingrediente è il problema.
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeDisabled();
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

    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeEnabled();
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
    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeDisabled();
  });

  it('modifica: carica nome, pasto e ingredienti del piatto esistente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    render(<Piatto />);
    await entraInModifica();

    expect(await screen.findByDisplayValue('Yogurt e avena')).toBeInTheDocument();
    expect(screen.getByText('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeEnabled();
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

    render(<Piatto />);
    await entraInModifica();
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

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByText('Fuori casa una volta questa settimana: non entra nella lista.')).toBeInTheDocument();
  });

  it('salva chiama salvaPiatto con la grammatura non moltiplicata e torna al repertorio', async () => {
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');
    vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');

    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Yogurt e avena' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pranzo' }));
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));

    const input = screen.getByLabelText('Grammatura di Yogurt greco');
    fireEvent.change(input, { target: { value: '150' } });

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

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

  it('il cestino su un piatto nuovo torna al repertorio senza chiedere conferma', async () => {
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));

    expect(screen.queryByText('Eliminare questo piatto?')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/piatti');
    expect(eliminaPiatto).not.toHaveBeenCalled();
  });

  it('il cestino su un piatto esistente chiede conferma, poi elimina (soft delete) e torna al repertorio', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(eliminaPiatto).mockResolvedValue(undefined);

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    expect(screen.getByText('Eliminare questo piatto?')).toBeInTheDocument();
    expect(eliminaPiatto).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(eliminaPiatto).toHaveBeenCalledWith('d-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));

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

    render(<Piatto />);

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

    render(<Piatto />);

    expect(await screen.findByDisplayValue('Nome cambiato non ancora salvato')).toBeInTheDocument();
  });

  it('mette al riparo la bozza quando si esce a creare un ingrediente', async () => {
    render(<Piatto />);
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

    render(<Piatto />);
    await entraInModifica();
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

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');
    salvaBozza('d-1', {
      nome: 'residuo', slotDefId: 'sd-1',
      descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

    // Spec §C: su un piatto esistente SALVA salva e torna alla vista, non
    // naviga più via — il ritorno a /piatti resta solo per il piatto nuovo.
    await waitFor(() => expect(screen.getByRole('button', { name: 'MODIFICA' })).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
    expect(riprendiBozza('d-1')).toBeNull();
  });

  it('il selettore ha un campo di ricerca solo quando la lista e lunga', async () => {
    // Con pochi ingredienti scorrere e' piu' veloce che digitare, e il campo
    // sarebbe solo un ostacolo in piu' prima della lista.
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));

    expect(screen.queryByLabelText('Cerca un ingrediente')).not.toBeInTheDocument();
  });

  it('la ricerca filtra per nome, ignorando accenti e maiuscole', async () => {
    const molti: Ingredient[] = Array.from({ length: 12 }, (_, i) => ({
      id: `i-${i}`, nome: `Riempitivo ${i}`, unitaBase: 'g' as const, area: 'dispensa' as const,
      classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 100,
    }));
    const CAFFE: Ingredient = {
      id: 'i-caffe', nome: 'Caffè', unitaBase: 'g', area: 'dispensa',
      classeResiduo: 'stima', deperibile: false, formatoConfezione: 250,
    };
    vi.mocked(leggiIngredienti).mockResolvedValue([...molti, CAFFE]);

    render(<Piatto />);
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
      classeResiduo: 'porzionabile' as const, deperibile: false, formatoConfezione: 100,
    }));
    vi.mocked(leggiIngredienti).mockResolvedValue(molti);

    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'zafferano' } });

    expect(screen.getByText(/Nessun ingrediente per "zafferano"/)).toBeInTheDocument();
    // Il modo per uscirne resta a portata di mano.
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ })).toBeInTheDocument();
  });

  it('un piatto caricato con componenti li mostra', async () => {
    paramsId = 'd-2';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_CON_COMPONENTI]);

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByDisplayValue('Pane')).toBeInTheDocument();
    expect(screen.getByText("Fiocchi d'avena")).toBeInTheDocument();
  });

  it("aggiungere un componente con un'opzione e salvare chiama salvaPiatto con la struttura componenti attesa", async () => {
    render(<Piatto />);
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

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

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
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');

    // Piatto altrimenti valido: nome e un ingrediente con grammatura.
    fireEvent.change(screen.getByPlaceholderText('Dai un nome al piatto'), { target: { value: 'Panino' } });
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));
    fireEvent.click(await screen.findByText('Yogurt greco'));
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' }));
    fireEvent.change(screen.getByLabelText('Nome del componente 1'), { target: { value: 'Pane' } });

    // Nome dato, ma l'opzione di default nasce senza righe: il salvataggio si blocca.
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeDisabled();
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
    const { unmount } = render(<Piatto />);
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
    render(<Piatto />);

    expect(await screen.findByDisplayValue('Pane')).toBeInTheDocument();
    expect(screen.getByText("Fiocchi d'avena")).toBeInTheDocument();
  });

  // Review round 1, finding MEDIUM: il flusso critico della nota cross-task
  // del Task 1 — aprire un piatto con componenti già salvati e premere SALVA
  // senza toccare nulla non deve rigenerare gli id di componenti/opzioni
  // (salvaPiatto, Task 7, riusa solo id che sono già uuid: rigenerarli qui
  // invaliderebbe le meal_slot_choice registrate per quel componente).
  it('aprire un piatto con componenti e salvare senza toccare nulla conserva gli id originali', async () => {
    paramsId = 'd-2';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_CON_COMPONENTI]);
    vi.mocked(salvaPiatto).mockResolvedValue('d-2');

    render(<Piatto />);
    await entraInModifica();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalled());
    const [chiamata] = vi.mocked(salvaPiatto).mock.calls[0];
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
    render(<Piatto />);
    await entraInModifica();
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
