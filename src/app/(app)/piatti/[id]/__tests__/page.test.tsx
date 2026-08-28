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
import { leggiSlotDefs } from '@/data/impostazioni';
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
  ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
};

function nessunaSettimana() {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

function mockBase() {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_AVENA]);
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
    // Non in programma: niente striscia dei sette giorni (sarebbe rumore), solo il riquadro muto.
    expect(screen.queryByText('LUN')).not.toBeInTheDocument();

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
    await screen.findByDisplayValue('Yogurt e avena');
    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(screen.getByRole('button', { name: 'SALVA PIATTO' })).toBeDisabled();
  });

  it('modifica: carica nome, pasto e ingredienti del piatto esistente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    render(<Piatto />);

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
        { id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default' },
        { id: 's-mar', data: '2026-08-25', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default' },
        { id: 's-mer', data: '2026-08-26', slotDefId: 'sd-1', stato: 'fuori', dishId: 'd-1', fonteStato: 'default' },
      ],
    };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);

    render(<Piatto />);
    await screen.findByDisplayValue('Yogurt e avena');

    expect(screen.getByText('In casa due volte questa settimana, fuori una volta. Il piatto entra due volte nella lista.')).toBeInTheDocument();
    expect(screen.getByText('LUN')).toBeInTheDocument();
  });

  it('un piatto assegnato ma sempre fuori casa non entra nella lista', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    const settimana: SettimanaCorrente = {
      id: 'w-1',
      dataInizio: '2026-08-24',
      stato: 'confermata',
      slots: [
        { id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'fuori', dishId: 'd-1', fonteStato: 'default' },
      ],
    };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);

    render(<Piatto />);
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
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
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
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
    });

    render(<Piatto />);

    expect(await screen.findByDisplayValue('Riso condito')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Yogurt greco')).toBeInTheDocument();
  });

  it('la bozza vince sui dati del server: è lavoro più recente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    salvaBozza('d-1', { nome: 'Nome cambiato non ancora salvato', slotDefId: 'sd-3', ingredienti: [] });

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

    expect(riprendiBozza('nuovo')).toEqual({ nome: 'Riso condito', slotDefId: 'sd-3', ingredienti: [] });
  });

  it('ogni ingrediente del piatto ha un accesso al proprio editor', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    render(<Piatto />);
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
    await screen.findByDisplayValue('Yogurt e avena');
    salvaBozza('d-1', { nome: 'residuo', slotDefId: 'sd-1', ingredienti: [] });

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
    expect(riprendiBozza('d-1')).toBeNull();
  });
});
