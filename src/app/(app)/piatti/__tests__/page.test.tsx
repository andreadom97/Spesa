import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
// Piatti usa useRouter per la pillola indietro (spec fase 5 §G.2): fuori da un App Router
// lancia. vi.hoisted: la stessa `push` a ogni chiamata di useRouter.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));

import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { salvaOrigine } from '@/components/pannello/indirizzi';
import Piatti from '../page';

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/piatti');
  push.mockClear();
});

const ING_LATTE: Ingredient = {
  id: 'i-1', nome: 'Latte', unitaBase: 'ml', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_PANE: Ingredient = {
  id: 'i-2', nome: 'Pane', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};

const PIATTO_COLAZIONE: Dish = {
  id: 'd-1', nome: 'Latte e pane', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-1', quantita: 200, unita: 'ml' },
    { ingredientId: 'i-2', quantita: 50, unita: 'g' },
  ],
  componenti: [],
};
const PIATTO_PRANZO: Dish = {
  id: 'd-2', nome: 'Pasta al pomodoro', slotDefId: 'sd-2', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
  componenti: [],
};
/** Solo alternative, nessun ingrediente fisso: prima mostrava "0 INGR." e nessun pallino. */
const PIATTO_ALTERNATIVE: Dish = {
  id: 'd-3', nome: 'Merenda', slotDefId: 'sd-1', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [{
    id: 'c-1', nome: 'a scelta',
    opzioni: [
      { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 30, unita: 'g' }] },
      { id: 'o-2', righe: [{ ingredientId: 'i-1', quantita: 150, unita: 'ml' }] },
    ],
  }],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorio(piatti: Dish[]) {
  vi.mocked(leggiRepertorio).mockResolvedValue(piatti);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_LATTE, ING_PANE]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
    giorniControllo: 90,
  });
}

describe('Piatti (repertorio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra l'onboarding (le due porte) quando leggiRepertorio torna vuoto", async () => {
    mockRepertorio([]);
    render(<Piatti />);
    expect(await screen.findByText('Da dove partiamo?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IMPORTA LA DIETA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).toBeInTheDocument();
  });

  it('non c\'è più il filtro dei pasti, né la pillola del pasto, e i pasti non si leggono', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(screen.queryByRole('button', { name: 'TUTTI' })).not.toBeInTheDocument();
    expect(screen.queryByText('Colazione')).not.toBeInTheDocument();
    expect(screen.queryByText('Pranzo')).not.toBeInTheDocument();
    expect(leggiSlotDefs).not.toHaveBeenCalled();
  });

  it('l\'aggiungi tratteggiato porta all\'editor completo e sta prima della prima riga', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    const prima = await screen.findByRole('link', { name: 'Apri Latte e pane' });
    const aggiungi = screen.getByRole('link', { name: 'Nuovo piatto' });
    expect(aggiungi).toHaveAttribute('href', '/piatti/nuovo');
    expect(aggiungi.compareDocumentPosition(prima) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('+ NUOVO PIATTO')).not.toBeInTheDocument();
  });

  it('ogni riga è un solo link che apre il piatto', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    expect(await screen.findByRole('link', { name: 'Apri Latte e pane' })).toHaveAttribute('href', '/piatti/d-1');
    expect(screen.getByRole('link', { name: 'Apri Pasta al pomodoro' })).toHaveAttribute('href', '/piatti/d-2');
  });

  it('la sottoriga conta gli ingredienti e dice «dalla dieta» solo sui piatti dell\'import', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    expect(await screen.findByText('2 INGREDIENTI')).toBeInTheDocument();
    expect(screen.getByText('1 INGREDIENTE · DALLA DIETA')).toBeInTheDocument();
    expect(screen.queryByText(/NUTRIZIONISTA|PROPRIO|INGR\./)).not.toBeInTheDocument();
  });

  it('un pallino per area distinta, nell\'ordine dell\'utente', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    const riga = await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(Array.from(riga.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['latticini', 'cereali']);
    const altra = screen.getByRole('link', { name: 'Apri Pasta al pomodoro' });
    expect(Array.from(altra.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['cereali']);
  });

  it('un piatto di sole alternative conta e colora gli ingredienti delle opzioni', async () => {
    mockRepertorio([PIATTO_ALTERNATIVE]);
    render(<Piatti />);
    const riga = await screen.findByRole('link', { name: 'Apri Merenda' });
    expect(screen.getByText('2 INGREDIENTI · DALLA DIETA')).toBeInTheDocument();
    expect(Array.from(riga.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['latticini', 'cereali']);
  });
});

describe('Le due porte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('titolo e sottotitolo della schermata', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    expect(await screen.findByText('Da dove partiamo?')).toBeInTheDocument();
    expect(
      screen.getByText('Dispesa costruisce la lista dai piatti che mangi. Ce li dici una volta sola, in uno di questi due modi.'),
    ).toBeInTheDocument();
  });

  it('la porta della dieta porta a /importa', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByText('Ho una dieta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IMPORTA LA DIETA' })).toHaveAttribute('href', '/importa');
  });

  it('la porta di chi cucina sempre le stesse cose porta a /piatti/veloce', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByText('Cucino sempre le stesse cose')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).toHaveAttribute('href', '/piatti/veloce');
  });

  it("il link all'editor completo porta a /piatti/nuovo", async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByRole('link', { name: "Crea un piatto dall'editor completo" })).toHaveAttribute('href', '/piatti/nuovo');
  });

  it('il vecchio bottone unico non c\'è più', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.queryByText('CREA IL PRIMO PIATTO')).not.toBeInTheDocument();
  });

  it('con il repertorio pieno le porte non compaiono', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(screen.queryByText('Da dove partiamo?')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'IMPORTA LA DIETA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).not.toBeInTheDocument();
  });
});

describe('la pillola indietro (spec fase 5 §G.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('da impostazioni: IMPOSTAZIONI riapre il pannello sopra l\'origine', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    window.history.replaceState(null, '', '/piatti?da=impostazioni');
    salvaOrigine({ pathname: '/dispensa', sotto: 'cima' });
    render(<Piatti />);
    const pillola = await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(pillola).toHaveTextContent('IMPOSTAZIONI');
    fireEvent.click(pillola);
    expect(push).toHaveBeenCalledWith('/dispensa?impostazioni=cima');
  });

  it('senza origine salvata IMPOSTAZIONI apre il pannello sopra la Lista', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    render(<Piatti />);
    fireEvent.click(await screen.findByRole('button', { name: 'Torna alle impostazioni' }));
    expect(push).toHaveBeenCalledWith('/lista?impostazioni=cima');
  });

  it('da lista: LISTA torna a /lista, e il valore resta per il ritorno dall\'editor', async () => {
    mockRepertorio([]);
    window.history.replaceState(null, '', '/piatti?da=lista');
    render(<Piatti />);
    // Lo stato vuoto rimonta la Cornice (VuotoPiatti è un altro componente): si prende la
    // pillola dopo che è arrivato, non quella del render di caricamento.
    await screen.findByText('Da dove partiamo?');
    const pillola = screen.getByRole('button', { name: 'Torna alla lista' });
    expect(pillola).toHaveTextContent('LISTA');
    fireEvent.click(pillola);
    expect(push).toHaveBeenCalledWith('/lista');
    expect(sessionStorage.getItem('spesa:piatti-da')).toBe('lista');
  });

  it('dall\'editor del piatto (nessun parametro) la pillola è quella salvata: PIANO', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    sessionStorage.setItem('spesa:piatti-da', 'piano');
    render(<Piatti />);
    fireEvent.click(await screen.findByRole('button', { name: 'Torna al piano' }));
    expect(push).toHaveBeenCalledWith('/piano');
  });

  it('niente Menù utente su Piatti', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).toBeNull();
  });
});
