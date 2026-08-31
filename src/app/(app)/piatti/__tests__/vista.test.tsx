// Il contratto della vista (Task 5): aprire un piatto esistente NON mostra
// l'editor e NON emette scritture (né salvaPiatto né salvaBozza). L'editor si
// accende solo su richiesta esplicita (MODIFICA), e un piatto nuovo — che non
// ha niente da consultare — apre direttamente in modifica.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  salvaPiatto: vi.fn(),
  eliminaPiatto: vi.fn(),
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));

// vi.hoisted: push/back devono essere le STESSE istanze a ogni chiamata di
// useRouter() (il componente lo richiama a ogni render) — dichiarate dentro
// la factory di vi.mock, sarebbero una vi.fn() nuova ogni volta, inutile per
// verificare "e' stata chiamata con...". vi.hoisted le mette al riparo dalla
// TDZ del hoisting di vi.mock.
const { push, back } = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
let paramsId = 'd-1';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push, back, replace: vi.fn() }),
}));

// Modulo mockato per intero (non solo spiato): verifica strutturale che in
// vista non parta nessun salvataggio automatico di bozza — se un effect
// nascosto la richiamasse ad ogni render, questi mock lo intercetterebbero.
vi.mock('../[id]/bozza', () => ({
  raccogliIngredienteCreato: vi.fn(() => null),
  riprendiBozza: vi.fn(() => null),
  salvaBozza: vi.fn(),
  scartaBozza: vi.fn(),
}));

import { salvaPiatto, leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { riprendiBozza, salvaBozza, scartaBozza } from '../[id]/bozza';
import Piatto from '../[id]/page';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_PRANZO: MealSlotDef = { id: 'sd-1', nome: 'Pranzo', posizione: 0, assenzeAbituali: ASSENZE };

const ING_RISO: Ingredient = {
  id: 'i-1', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
};
const ING_FARINA: Ingredient = {
  id: 'i-2', nome: 'Farina', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
};
const ING_PANE_INTEGRALE: Ingredient = {
  id: 'i-3', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 500,
};

const PIATTO_ESISTENTE: Dish = {
  id: 'd-1',
  nome: 'Riso e pane',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: 2,
  giornoCiclo: 3, // Giovedì
  ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
  componenti: [
    {
      id: 'c-1',
      nome: 'Pane',
      opzioni: [
        { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 50, unita: 'g' }] },
        { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 40, unita: 'g' }] },
      ],
    },
  ],
};

function mockBase(settimaneCiclo = 2) {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_PRANZO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RISO, ING_FARINA, ING_PANE_INTEGRALE]);
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    settimaneCiclo,
    cicloOrigine: '2026-08-24',
  });
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

describe('dettaglio piatto: vista prima, modifica su richiesta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsId = 'd-1';
    vi.mocked(riprendiBozza).mockReturnValue(null);
    mockBase();
  });

  it('apre in vista: niente input, niente SALVA, c’è MODIFICA', async () => {
    render(<Piatto />);

    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /SALVA PIATTO/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(salvaBozza).not.toHaveBeenCalled();
  });

  it('MODIFICA accende l’editor attuale', async () => {
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();
    expect(await screen.findByRole('button', { name: /SALVA PIATTO/ })).toBeInTheDocument();
  });

  it('la vista mostra nome, pasto, settimana e giorno del ciclo', async () => {
    render(<Piatto />);

    expect(await screen.findByText('Riso e pane')).toBeInTheDocument();
    // Riga meta: pasto · settimana del giro · giorno, in maiuscolo, con lo
    // stesso lessico "Settimana N del giro" dell'editor.
    expect(screen.getByText('PRANZO · SETTIMANA 2 DEL GIRO · GIOVEDÌ')).toBeInTheDocument();
  });

  it('la vista compone le righe dagli ingredienti fissi e dai componenti a scelta, con "oppure" fra le opzioni', async () => {
    render(<Piatto />);
    await screen.findByText('Riso e pane');

    // Spec §C: "quantità + nome + area", più la label "per 1 porzione".
    expect(screen.getByText('80 g · Riso · PASTA, RISO E CEREALI')).toBeInTheDocument();
    expect(screen.getByText('Pane: 50 g · Farina · DISPENSA E CONSERVE')).toBeInTheDocument();
    expect(screen.getByText('oppure')).toBeInTheDocument();
    expect(screen.getByText('40 g · Pane integrale · PASTA, RISO E CEREALI')).toBeInTheDocument();
    expect(screen.getByText('PER 1 PORZIONE')).toBeInTheDocument();
  });

  it('un piatto nuovo (id assente) apre direttamente in modifica: non c’è niente da consultare', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiRepertorio).mockResolvedValue([]);

    render(<Piatto />);

    expect(await screen.findByPlaceholderText('Dai un nome al piatto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MODIFICA' })).not.toBeInTheDocument();
  });

  it('una bozza pendente per un piatto esistente apre direttamente in modifica: è lavoro non finito', async () => {
    vi.mocked(riprendiBozza).mockReturnValue({
      nome: 'Riso e pane, modifica in corso',
      slotDefId: 'sd-1',
      descrizione: '',
      settimanaCiclo: 2,
      giornoCiclo: 3,
      ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
      componenti: [],
    });

    render(<Piatto />);

    expect(await screen.findByDisplayValue('Riso e pane, modifica in corso')).toBeInTheDocument();
  });

  it('ANNULLA dopo MODIFICA ripristina il piatto originale e torna in vista, senza navigare via', async () => {
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();

    const nomeInput = await screen.findByDisplayValue('Riso e pane');
    fireEvent.change(nomeInput, { target: { value: 'Nome cambiato per sbaglio' } });

    fireEvent.click(screen.getByRole('button', { name: 'Annulla modifiche' }));

    // Di nuovo in vista, col nome originale: la modifica non salvata è stata scartata.
    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();
    expect(screen.getByText('Riso e pane')).toBeInTheDocument();
    expect(screen.queryByText('Nome cambiato per sbaglio')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(scartaBozza).toHaveBeenCalledWith('d-1');
  });

  // Review Task 5, finding media: un salvataggio fallito scrive `errore` per
  // l'editor corrente; senza azzerarlo, ANNULLA lo lascia appeso allo stato e
  // ricompare come fantasma al prossimo MODIFICA, senza che sia successo
  // niente di nuovo.
  it('un salvataggio fallito non lascia un errore fantasma: ANNULLA lo azzera, anche rientrando in modifica', async () => {
    vi.mocked(salvaPiatto).mockRejectedValue(new Error('boom'));
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();
    await screen.findByDisplayValue('Riso e pane');

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));
    expect(await screen.findByText('Non siamo riusciti a salvare il piatto. Riprova.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annulla modifiche' }));

    // Di nuovo in vista: l'errore del salvataggio fallito non c'è più.
    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a salvare il piatto. Riprova.')).not.toBeInTheDocument();

    // E non riappare nemmeno rientrando in modifica: non è successo niente
    // di nuovo da quando è stato scartato.
    fireEvent.click(screen.getByRole('button', { name: 'MODIFICA' }));
    await screen.findByDisplayValue('Riso e pane');
    expect(screen.queryByText('Non siamo riusciti a salvare il piatto. Riprova.')).not.toBeInTheDocument();
  });

  // Spec §C: "SALVA salva e torna alla vista" — su un piatto esistente il
  // salvataggio riuscito non naviga più via, resta sulla stessa pagina.
  it('SALVA su piatto esistente torna alla vista senza navigare', async () => {
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();
    await screen.findByDisplayValue('Riso e pane');

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalled());
    // Di nuovo in vista (MODIFICA riappare, niente più SALVA PIATTO), senza
    // essere mai usciti dalla pagina.
    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /SALVA PIATTO/ })).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  // Review finale (finding critico): `salvando` non si azzerava sul ramo
  // successo di un piatto ESISTENTE (solo il ramo `nuovo` naviga via e
  // smonta la pagina; questo resta). Senza il fix il secondo SALVA
  // resterebbe disabled per sempre — bottone disabled + guardia in salva().
  it('SALVA→MODIFICA→SALVA: il secondo salvataggio parte e riesce', async () => {
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();
    await screen.findByDisplayValue('Riso e pane');

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));
    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'MODIFICA' }));
    const nomeInput = await screen.findByDisplayValue('Riso e pane');
    fireEvent.change(nomeInput, { target: { value: 'Riso e pane, seconda modifica' } });

    // Se `salvando` fosse rimasto true dal primo giro, questo bottone
    // sarebbe ancora disabled e il click sotto non partirebbe.
    const salvaBtn = screen.getByRole('button', { name: 'SALVA PIATTO' });
    expect(salvaBtn).toBeEnabled();
    fireEvent.click(salvaBtn);

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'MODIFICA' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /SALVA PIATTO/ })).not.toBeInTheDocument();
  });

  it('SALVA→MODIFICA→ANNULLA ripristina dallo stato appena salvato, non da quello precedente', async () => {
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    render(<Piatto />);
    (await screen.findByRole('button', { name: 'MODIFICA' })).click();
    const nomeInput = await screen.findByDisplayValue('Riso e pane');
    fireEvent.change(nomeInput, { target: { value: 'Riso e pane aggiornato' } });

    fireEvent.click(screen.getByRole('button', { name: 'SALVA PIATTO' }));
    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Riso e pane aggiornato')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'MODIFICA' }));
    const nomeInput2 = await screen.findByDisplayValue('Riso e pane aggiornato');
    fireEvent.change(nomeInput2, { target: { value: 'Modifica scartata' } });

    fireEvent.click(screen.getByRole('button', { name: 'Annulla modifiche' }));

    // ANNULLA riporta al piatto salvato appena prima, non a quello di
    // prima del primo SALVA: `piattoOriginale` deve seguire il salvataggio.
    expect(await screen.findByText('Riso e pane aggiornato')).toBeInTheDocument();
    expect(screen.queryByText('Modifica scartata')).not.toBeInTheDocument();
  });

  it('Indietro nella vista chiama router.back(), non push', async () => {
    render(<Piatto />);
    fireEvent.click(await screen.findByRole('button', { name: 'Indietro' }));

    expect(back).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
