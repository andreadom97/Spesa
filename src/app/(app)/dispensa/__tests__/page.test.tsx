import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, LottoPronto, MealSlot, PantryState } from '@/domain/types';
import { sommaGiorni } from '@/domain/date';

vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
vi.mock('@/data/dispensa', () => ({ leggiDispensa: vi.fn(), correggiResiduo: vi.fn(), impostaCongelato: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));
vi.mock('@/data/pronti', () => ({
  leggiPronti: vi.fn(),
  correggiLotto: vi.fn(),
  impostaCongelatoLotto: vi.fn(),
  eliminaLotto: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({ leggiSettimanaCorrente: vi.fn() }));

import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiDispensa, correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { leggiImpostazioni } from '@/data/impostazioni';
import { leggiPronti, correggiLotto, impostaCongelatoLotto, eliminaLotto } from '@/data/pronti';
import { leggiSettimanaCorrente } from '@/data/settimana';
import Dispensa from '../page';

const ORDINE = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

const RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000,
};
const BANANE: Ingredient = {
  id: 'i-banane', nome: 'Banane', unitaBase: 'pz', area: 'ortofrutta',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 3,
};

function statoDispensa(righe: Partial<PantryState>[]): PantryState[] {
  return righe.map((r) => ({
    ingredientId: r.ingredientId!, residuo: r.residuo ?? 0,
    ultimoAcquisto: r.ultimoAcquisto ?? null, giorniStimati: 90, ultimoCheck: null,
    congelato: r.congelato ?? false,
  }));
}

function mockBase(dispensa: PantryState[], ingredienti: Ingredient[] = [RISO, BANANE]) {
  vi.mocked(leggiIngredienti).mockResolvedValue(ingredienti);
  vi.mocked(leggiDispensa).mockResolvedValue(dispensa);
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: [...ORDINE], settimaneCiclo: 1, cicloOrigine: null });
  vi.mocked(leggiPronti).mockResolvedValue([]);
  vi.mocked(leggiRepertorio).mockResolvedValue([]);
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

const OGGI = new Date().toISOString().slice(0, 10);

const FARROTTO: Dish = {
  id: 'd-farrotto', nome: 'Farrotto ai funghi', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [], componenti: [],
};

function lottoPronto(overrides: Partial<LottoPronto>): LottoPronto {
  return {
    id: 'lp-1', dishId: FARROTTO.id, porzioni: 2, congelato: false,
    preparataIl: OGGI, mealSlotId: null,
    ...overrides,
  };
}

function slotDaPronti(overrides: Partial<MealSlot>): MealSlot {
  return {
    id: 'ms-1', data: OGGI, slotDefId: 'sd-cena', stato: 'casa', dishId: FARROTTO.id,
    fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: true,
    ...overrides,
  };
}

describe('Dispensa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('separa in casa, finiti e mai comprati', async () => {
    // "Finito" e "mai avuto" non sono la stessa cosa: il primo e' una cosa
    // che usi e si e' esaurita, il secondo e' catalogo. Dopo il seed i
    // secondi sono decine e seppellivano i primi.
    mockBase(statoDispensa([
      { ingredientId: 'i-riso', residuo: 920, ultimoAcquisto: '2026-08-28' },
      { ingredientId: 'i-banane', residuo: 0, ultimoAcquisto: '2026-08-20' },
    ]));

    render(<Dispensa />);

    expect(await screen.findByText('IN CASA')).toBeInTheDocument();
    expect(screen.getByText('FINITI')).toBeInTheDocument();
    expect(screen.queryByText('MAI COMPRATI')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Residuo di Riso')).toHaveValue(920);
    expect(screen.getByLabelText('Residuo di Banane')).toHaveValue(0);
  });

  it('i mai comprati stanno in un gruppo a parte, chiuso di partenza', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920, ultimoAcquisto: '2026-08-28' }]));

    render(<Dispensa />);

    // Banane non ha riga di dispensa: mai comprato.
    const intestazione = await screen.findByRole('button', { name: /MAI COMPRATI/ });
    expect(intestazione).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('FINITI')).not.toBeInTheDocument();

    fireEvent.click(intestazione);
    expect(intestazione).toHaveAttribute('aria-expanded', 'true');
  });

  it('mostra a zero un ingrediente che non ha ancora una riga di dispensa', async () => {
    // Mai comprato: la riga in pantry_state non esiste. Senza questo,
    // l'ingrediente sparirebbe dalla schermata e non sarebbe correggibile
    // proprio nel caso in cui serve — dichiarare che ne hai già in casa.
    mockBase([]);

    render(<Dispensa />);

    expect(await screen.findByLabelText('Residuo di Riso')).toHaveValue(0);
    expect(screen.getAllByText(/MAI COMPRATO/).length).toBe(2);
  });

  it('salva la correzione quando si esce dal campo, non a ogni tasto', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');

    fireEvent.change(campo, { target: { value: '5' } });
    fireEvent.change(campo, { target: { value: '50' } });
    // Ancora niente: scrivendo "500" si passa per 5 e 50, e salvarli
    // scriverebbe valori che l'utente non ha mai voluto.
    expect(correggiResiduo).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: '500' } });
    fireEvent.blur(campo);

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-riso', 500));
    expect(correggiResiduo).toHaveBeenCalledOnce();
  });

  it('non scrive nulla se il valore non e cambiato', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');
    fireEvent.blur(campo);

    expect(correggiResiduo).not.toHaveBeenCalled();
  });

  it('rifiuta un valore vuoto o negativo tornando a quello di prima', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');

    fireEvent.change(campo, { target: { value: '' } });
    fireEvent.blur(campo);
    expect(correggiResiduo).not.toHaveBeenCalled();
    expect(campo).toHaveValue(920);

    fireEvent.change(campo, { target: { value: '-3' } });
    fireEvent.blur(campo);
    expect(correggiResiduo).not.toHaveBeenCalled();
    expect(campo).toHaveValue(920);
  });

  it('se il salvataggio fallisce riporta il valore di prima e lo dice', async () => {
    // Una correzione persa in silenzio e peggio del residuo sbagliato:
    // l'utente crede di aver rimesso le cose a posto e non lo sono.
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(correggiResiduo).mockRejectedValue(new Error('rete'));

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Residuo di Riso');
    fireEvent.change(campo, { target: { value: '500' } });
    fireEvent.blur(campo);

    await waitFor(() =>
      expect(screen.getByText('Non siamo riusciti a salvare la correzione. Riprova.')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Residuo di Riso')).toHaveValue(920);
  });

  it('avverte quando un fresco e troppo vecchio per contare ancora', async () => {
    // Senza questo avviso la schermata direbbe "200 g di pollo" mentre la
    // lista lo richiede lo stesso: due verita' diverse nella stessa app.
    const POLLO: Ingredient = {
      id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300,
    };
    mockBase(statoDispensa([{ ingredientId: 'i-pollo', residuo: 200, ultimoAcquisto: '2020-01-01' }]), [POLLO]);

    render(<Dispensa />);

    expect(await screen.findByText(/Troppo tempo per essere ancora buono/)).toBeInTheDocument();
  });

  it('non avverte se quel fresco e dichiarato in congelatore', async () => {
    const POLLO: Ingredient = {
      id: 'i-pollo', nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria',
      classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300,
    };
    const oggi = new Date().toISOString().slice(0, 10);
    mockBase(statoDispensa([{ ingredientId: 'i-pollo', residuo: 200, ultimoAcquisto: oggi, congelato: true }]), [POLLO]);

    render(<Dispensa />);

    await screen.findByLabelText('Residuo di Petto di pollo');
    expect(screen.queryByText(/Troppo tempo per essere ancora buono/)).not.toBeInTheDocument();
    expect(screen.getByText(/IN CONGELATORE/)).toBeInTheDocument();
  });

  it('il congelatore si accende e si spegne, e non compare sui non deperibili', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-banane', residuo: 3 }]));
    vi.mocked(impostaCongelato).mockResolvedValue(undefined);

    render(<Dispensa />);

    // Riso non e' deperibile: un controllo che non farebbe niente.
    expect(await screen.findByLabelText(/Banane: metti in congelatore/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Riso: metti in congelatore/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Banane: metti in congelatore/));
    await waitFor(() => expect(impostaCongelato).toHaveBeenCalledWith('i-banane', true));
  });

  it('senza ingredienti spiega che la dispensa si riempie da se', async () => {
    mockBase([], []);

    render(<Dispensa />);

    expect(await screen.findByText('Ancora niente in dispensa')).toBeInTheDocument();
  });

  it('la sezione PRONTI mostra i lotti utilizzabili col nome del piatto e gli impegni', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(leggiPronti).mockResolvedValue([
      lottoPronto({ id: 'lp-farrotto', dishId: FARROTTO.id, porzioni: 2, congelato: true, preparataIl: OGGI }),
      // Fresco, preparato 10 giorni fa: oltre i 3 giorni di GIORNI_PRONTO_FRESCO, quindi decaduto.
      lottoPronto({ id: 'lp-scaduto', dishId: FARROTTO.id, porzioni: 1, congelato: false, preparataIl: sommaGiorni(OGGI, -10) }),
    ]);
    vi.mocked(leggiRepertorio).mockResolvedValue([FARROTTO]);
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({
      id: 'w-1', dataInizio: OGGI, stato: 'confermata',
      slots: [slotDaPronti({ id: 'ms-futuro', data: sommaGiorni(OGGI, 2) })],
    });

    render(<Dispensa />);

    expect(await screen.findByText('PRONTI')).toBeInTheDocument();
    expect(screen.getByText('Farrotto ai funghi')).toBeInTheDocument();
    expect(screen.getByLabelText('Porzioni di Farrotto ai funghi')).toHaveValue(2);
    expect(screen.getByText('1 impegnata')).toBeInTheDocument();
    // Il lotto scaduto non ha porzioni utilizzabili: una sola tessera, non due.
    expect(screen.getAllByText('Farrotto ai funghi')).toHaveLength(1);
  });

  it('con due lotti utilizzabili dello stesso piatto, "impegnata" compare una sola volta', async () => {
    // impegniPerPiatto e' per dishId ma il layout resta per lotto: senza
    // deduplica, due tessere dello stesso piatto avrebbero mostrato ognuna
    // "1 impegnata", facendo leggere all'utente il doppio degli impegni veri.
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(leggiPronti).mockResolvedValue([
      lottoPronto({ id: 'lp-fresco', dishId: FARROTTO.id, porzioni: 1, congelato: false, preparataIl: sommaGiorni(OGGI, -1) }),
      lottoPronto({ id: 'lp-freezer', dishId: FARROTTO.id, porzioni: 3, congelato: true, preparataIl: sommaGiorni(OGGI, -20) }),
    ]);
    vi.mocked(leggiRepertorio).mockResolvedValue([FARROTTO]);
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({
      id: 'w-1', dataInizio: OGGI, stato: 'confermata',
      slots: [slotDaPronti({ id: 'ms-futuro', data: sommaGiorni(OGGI, 2) })],
    });

    render(<Dispensa />);

    await screen.findByText('PRONTI');
    expect(screen.getAllByText('Farrotto ai funghi')).toHaveLength(2);
    expect(screen.getAllByText('1 impegnata')).toHaveLength(1);
  });

  it('senza lotti utilizzabili la sezione non compare', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<Dispensa />);

    await screen.findByLabelText('Residuo di Riso');
    expect(screen.queryByText('PRONTI')).not.toBeInTheDocument();
  });

  it('correzione del numero e toggle freezer chiamano il data layer', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));
    vi.mocked(leggiPronti).mockResolvedValue([
      lottoPronto({ id: 'lp-farrotto', dishId: FARROTTO.id, porzioni: 2, congelato: false, preparataIl: OGGI }),
    ]);
    vi.mocked(leggiRepertorio).mockResolvedValue([FARROTTO]);
    vi.mocked(correggiLotto).mockResolvedValue(undefined);
    vi.mocked(impostaCongelatoLotto).mockResolvedValue(undefined);
    vi.mocked(eliminaLotto).mockResolvedValue(undefined);

    render(<Dispensa />);
    const campo = await screen.findByLabelText('Porzioni di Farrotto ai funghi');

    fireEvent.change(campo, { target: { value: '3' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(correggiLotto).toHaveBeenCalledWith('lp-farrotto', 3));

    fireEvent.click(screen.getByLabelText(/Farrotto ai funghi: metti in congelatore/));
    await waitFor(() => expect(impostaCongelatoLotto).toHaveBeenCalledWith('lp-farrotto', true));

    fireEvent.click(screen.getByLabelText('Elimina il lotto di Farrotto ai funghi'));
    await waitFor(() => expect(eliminaLotto).toHaveBeenCalledWith('lp-farrotto'));
  });

  it('mostra prima l\'inventario, poi mai comprati, e la nota AI compressa in fondo', async () => {
    // L'inventario (quello che l'utente e' venuto a controllare) precede la
    // correzione via AI, che e' un ripiego per quando il calcolo non torna:
    // in cima distraeva da cio' che la schermata serve davvero a mostrare.
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    const { container } = render(<Dispensa />);
    await screen.findByText('IN CASA');

    const testo = container.textContent ?? '';
    const posInCasa = testo.indexOf('IN CASA');
    const posMaiComprati = testo.indexOf('MAI COMPRATI');
    const posNota = testo.indexOf('Il conto non torna? Correggi con una nota');
    expect(posInCasa).toBeGreaterThanOrEqual(0);
    expect(posMaiComprati).toBeGreaterThan(posInCasa);
    expect(posNota).toBeGreaterThan(posMaiComprati);

    // Compressa: niente textarea finche' non si tocca la card.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Il conto non torna? Correggi con una nota' }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  // Review finale, finding MINOR: la card si apriva ma non si richiudeva
  // mai (notaAperta senza via di ritorno).
  it('la card di correzione con nota si può richiudere', async () => {
    mockBase(statoDispensa([{ ingredientId: 'i-riso', residuo: 920 }]));

    render(<Dispensa />);
    await screen.findByText('IN CASA');

    fireEvent.click(screen.getByRole('button', { name: 'Il conto non torna? Correggi con una nota' }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi correzione con una nota' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // La card compressa torna disponibile per riaprirla.
    expect(screen.getByRole('button', { name: 'Il conto non torna? Correggi con una nota' })).toBeInTheDocument();
  });
});
