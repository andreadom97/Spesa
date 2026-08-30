import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlot, MealSlotDef } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';
import { lunediDi, giorniDellaSettimana } from '@/domain/date';

vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
  leggiSettimana: vi.fn(),
  creaSettimana: vi.fn(),
  aggiornaSlot: vi.fn(),
  confermaSettimana: vi.fn(),
}));
vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  generaListe: vi.fn(),
}));
vi.mock('@/data/pronti', () => ({
  leggiPronti: vi.fn(),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import {
  leggiSettimanaCorrente,
  leggiSettimana,
  creaSettimana,
  aggiornaSlot,
  confermaSettimana,
} from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { generaListe } from '@/data/lista';
import { leggiPronti } from '@/data/pronti';
import { sommaGiorni } from '@/domain/date';
import Settimana from '../page';

// "Oggi" reale: evita di mockare l'orologio di sistema, che confligge con i
// timer interni di React Testing Library. La settimana di test è costruita
// intorno alla data vera del momento in cui gira il test.
const OGGI = new Date().toISOString().slice(0, 10);
const LUNEDI = lunediDi(OGGI);
const GIORNI = giorniDellaSettimana(LUNEDI);
const INDICE_OGGI = GIORNI.indexOf(OGGI);

const ASSENZE = [false, false, false, false, false, false, false];
// Solo tre meal_slot_def: la trappola dell'artboard ne ha quattro cablati
// (col/spu/pra/cen). Se l'implementazione li leggesse dal mock invece che da
// leggiSlotDefs(), "Spuntino" comparirebbe qui e i test sotto fallirebbero.
const SD_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SD_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };
const SD_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };
const SLOT_DEFS = [SD_COLAZIONE, SD_PRANZO, SD_CENA];

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500,
};
const ING_POLLO: Ingredient = {
  id: 'i-2', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000,
};
const ING_UOVA: Ingredient = {
  id: 'i-3', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 1,
};
const ING_PASSATA: Ingredient = {
  id: 'i-4', nome: 'Passata di pomodoro', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 700,
};

const DISH_COLAZIONE: Dish = {
  id: 'd-1', nome: 'Yogurt e frutta', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
  componenti: [],
};
const DISH_CENA: Dish = {
  id: 'd-2', nome: 'Pollo e riso', slotDefId: 'sd-3', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 200, unita: 'g' }],
  componenti: [],
};
/** Piatto a componenti: farcitura con due opzioni, yogurt (default) o uova+passata. */
const DISH_WRAP: Dish = {
  id: 'd-3', nome: 'Wrap', slotDefId: 'sd-2', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 50, unita: 'g' }],
  componenti: [{
    id: 'farcitura', nome: 'farcitura',
    opzioni: [
      { id: 'farcitura-yogurt', righe: [{ ingredientId: 'i-1', quantita: 100, unita: 'g' }] },
      { id: 'farcitura-uova', righe: [
        { ingredientId: 'i-3', quantita: 2, unita: 'pz' },
        { ingredientId: 'i-4', quantita: 50, unita: 'g' },
      ] },
    ],
  }],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

/** Oggi: colazione a casa con piatto, pranzo fuori, cena a casa con piatto. Gli altri sei giorni: tutti a casa coi due piatti assegnati. */
function buildSlots(): MealSlot[] {
  const slots: MealSlot[] = [];
  for (const data of GIORNI) {
    for (const def of SLOT_DEFS) {
      let stato: MealSlot['stato'] = 'casa';
      let dishId: string | null = null;
      if (def.id === 'sd-1') dishId = DISH_COLAZIONE.id;
      if (def.id === 'sd-3') dishId = DISH_CENA.id;
      if (data === OGGI && def.id === 'sd-2') stato = 'fuori';
      slots.push({
        id: `${data}:${def.id}`, data, slotDefId: def.id, stato, dishId, fonteStato: 'default', scelte: {},
        porzioniPreparate: 0, daPronti: false,
      });
    }
  }
  return slots;
}

const SETTIMANA_BASE: SettimanaCorrente = { id: 'week-1', dataInizio: LUNEDI, stato: 'bozza', slots: buildSlots() };

function mockCarico(settimana: SettimanaCorrente = SETTIMANA_BASE) {
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiPronti).mockResolvedValue([]);
}

describe('Settimana (piano alimentare)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('i pasti sono i tre meal_slot_def reali, non i quattro cablati nel mock', async () => {
    mockCarico();
    render(<Settimana />);

    expect(await screen.findByText('Yogurt e frutta')).toBeInTheDocument();
    expect(screen.getByText('Pollo e riso')).toBeInTheDocument();
    expect(screen.getByText('Fuori casa')).toBeInTheDocument(); // il pranzo di oggi
    expect(screen.queryByText('Spuntino'.toUpperCase())).not.toBeInTheDocument();
  });

  it('al primo accesso, senza settimana esistente, la crea con creaSettimana e poi la ricarica', async () => {
    vi.mocked(leggiSettimanaCorrente)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(SETTIMANA_BASE);
    vi.mocked(creaSettimana).mockResolvedValue('week-1');
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<Settimana />);

    await waitFor(() => expect(creaSettimana).toHaveBeenCalledWith(LUNEDI));
    expect(await screen.findByText('Yogurt e frutta')).toBeInTheDocument();
    expect(leggiSettimanaCorrente).toHaveBeenCalledTimes(2);
  });

  it('la striscia mostra sette giorni con tre pallini ciascuno, e il bordo di oggi resta anche selezionando un altro giorno', async () => {
    mockCarico();
    const { container } = render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    const cellaOggi = container.querySelector(`[data-giorno="${OGGI}"]`) as HTMLElement;
    expect(cellaOggi).toBeTruthy();
    // jsdom normalizza i colori esadecimali in rgb(): la forma nota già dal Task 8.
    expect(cellaOggi.style.border).toBe('3px solid rgb(20, 22, 58)');
    expect(cellaOggi.querySelectorAll('span[style*="border-radius: 999px"]')).toHaveLength(3); // 3 pallini, non 4

    // Seleziono un altro giorno (quello successivo a oggi nella striscia).
    const altraData = GIORNI[(INDICE_OGGI + 1) % 7];
    const cellaAltra = container.querySelector(`[data-giorno="${altraData}"]`) as HTMLElement;
    fireEvent.click(cellaAltra);

    await waitFor(() => expect(cellaAltra.getAttribute('aria-pressed')).toBe('true'));
    // Il bordo di oggi non dipende dalla selezione.
    expect(cellaOggi.style.border).toBe('3px solid rgb(20, 22, 58)');
    expect(cellaOggi.getAttribute('aria-pressed')).toBe('false');
  });

  it('zona casa: un tap solo spegne il pasto, chiamando applicaStato via aggiornaSlot con fonte checkin', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByLabelText('Colazione: a casa, tocca per segnare fuori'));

    await waitFor(() =>
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-1`, { stato: 'fuori' }, 'checkin'),
    );
    // Un tap solo: subito "Fuori casa" senza bisogno di un secondo tap o conferma.
    expect(await screen.findByLabelText('Colazione: fuori casa, tocca per segnare a casa')).toBeInTheDocument();
  });

  it('check-in fallito: mostra un errore inline senza rimpiazzare la schermata (striscia, righe, pulsante restano)', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockRejectedValue(new Error('rete assente'));
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByLabelText('Colazione: a casa, tocca per segnare fuori'));

    expect(await screen.findByText('Non siamo riusciti a salvare il cambiamento. Riprova.')).toBeInTheDocument();
    // L'errore di check-in non è il gate di caricamento: il resto della
    // schermata deve restare in piedi, non sparire dietro un paragrafo solo.
    expect(screen.getByLabelText('Colazione: a casa, tocca per segnare fuori')).toBeInTheDocument(); // stato ripristinato
    expect(screen.getByText('Pollo e riso')).toBeInTheDocument();
    expect(screen.getByText('CONFERMA E CREA LA LISTA')).toBeInTheDocument();
    expect(screen.getByLabelText('Giorno precedente')).toBeInTheDocument();
  });

  it('un secondo check-in riuscito pulisce il messaggio d\'errore del precedente', async () => {
    mockCarico();
    vi.mocked(aggiornaSlot).mockRejectedValueOnce(new Error('rete assente')).mockResolvedValueOnce(undefined);
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByLabelText('Colazione: a casa, tocca per segnare fuori'));
    expect(await screen.findByText('Non siamo riusciti a salvare il cambiamento. Riprova.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Colazione: a casa, tocca per segnare fuori'));
    await waitFor(() =>
      expect(screen.queryByText('Non siamo riusciti a salvare il cambiamento. Riprova.')).not.toBeInTheDocument(),
    );
  });

  it('React Strict Mode monta l\'effetto due volte, ma creaSettimana viene chiamata una sola volta', async () => {
    let creazioneCompletata = false;
    let risolviCreazione!: (id: string) => void;
    const creazionePendente = new Promise<string>((resolve) => {
      risolviCreazione = (id: string) => {
        creazioneCompletata = true;
        resolve(id);
      };
    });

    // Finché la creazione non si è risolta, leggiSettimanaCorrente continua a
    // tornare null: simula la finestra in cui la seconda esecuzione
    // dell'effetto (il remount di Strict Mode) troverebbe ancora "nessuna
    // settimana" e sarebbe tentata di chiamare creaSettimana una seconda volta.
    vi.mocked(leggiSettimanaCorrente).mockImplementation(async () =>
      creazioneCompletata ? SETTIMANA_BASE : null,
    );
    vi.mocked(creaSettimana).mockReturnValue(creazionePendente);
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(
      <StrictMode>
        <Settimana />
      </StrictMode>,
    );

    await waitFor(() => expect(creaSettimana).toHaveBeenCalled());
    risolviCreazione('week-1');

    expect(await screen.findByText('Yogurt e frutta')).toBeInTheDocument();
    // Le due esecuzioni dell'effetto (mount + Strict Mode remount) condividono
    // la stessa creazione in corso: una sola chiamata reale, non due.
    expect(creaSettimana).toHaveBeenCalledTimes(1);
  });

  it('zona corpo: il tap apre il dettaglio del piatto, non lo stato', async () => {
    mockCarico();
    render(<Settimana />);
    const nome = await screen.findByText('Yogurt e frutta');

    fireEvent.click(nome);

    expect(push).toHaveBeenCalledWith('/piatti/d-1');
    // Tap sul corpo non deve aver toccato lo stato.
    expect(aggiornaSlot).not.toHaveBeenCalled();
  });

  it('zona freccia: apre "Scegli il piatto" per quel pasto specifico', async () => {
    mockCarico();
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    const freccia = screen.getByLabelText('Scegli il piatto per Colazione');
    expect(freccia).toHaveAttribute('href', `/settimana/${OGGI}/sd-1/scegli`);
  });

  it('il contatore conta solo i pasti a casa con un piatto assegnato', async () => {
    mockCarico();
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    // 7 giorni × 2 pasti con piatto (colazione, cena) sempre a casa = 14.
    // Il pranzo non ha mai un piatto assegnato in questa fixture: non conta mai.
    expect(screen.getByText('14 PASTI A CASA IN SETTIMANA')).toBeInTheDocument();
  });

  it('il pulsante finale conferma la settimana, genera la lista e naviga a /lista', async () => {
    mockCarico();
    vi.mocked(confermaSettimana).mockResolvedValue(undefined);
    vi.mocked(generaListe).mockResolvedValue(undefined);
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByText('CONFERMA E CREA LA LISTA'));

    await waitFor(() => expect(confermaSettimana).toHaveBeenCalledWith('week-1'));
    expect(generaListe).toHaveBeenCalledWith('week-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/lista'));
  });

  it('se generaListe fallisce, mostra un errore e non naviga', async () => {
    mockCarico();
    vi.mocked(confermaSettimana).mockResolvedValue(undefined);
    vi.mocked(generaListe).mockRejectedValue(new Error('non ancora implementato'));
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByText('CONFERMA E CREA LA LISTA'));

    expect(await screen.findByText('Non siamo riusciti a confermare la settimana. Riprova.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalledWith('/lista');
  });

  // Regressione su C4: riconfermare una settimana già confermata (o chiusa)
  // cancellava e reinseriva la lista, perdendo ogni spunta e risposta ai
  // controlli, e su una settimana chiusa riportava lo stato a 'confermata',
  // disarmando il guard di idempotenza di chiudiSpesa.
  it('su una settimana già confermata il pulsante diventa "VAI ALLA LISTA" e naviga soltanto, senza toccare il server', async () => {
    mockCarico({ ...SETTIMANA_BASE, stato: 'confermata' });
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    expect(screen.queryByText('CONFERMA E CREA LA LISTA')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('VAI ALLA LISTA'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/lista'));
    expect(confermaSettimana).not.toHaveBeenCalled();
    expect(generaListe).not.toHaveBeenCalled();
  });

  it('su una settimana già chiusa il pulsante diventa "VAI ALLA LISTA" e naviga soltanto, senza toccare il server', async () => {
    mockCarico({ ...SETTIMANA_BASE, stato: 'chiusa' });
    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByText('VAI ALLA LISTA'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/lista'));
    expect(confermaSettimana).not.toHaveBeenCalled();
    expect(generaListe).not.toHaveBeenCalled();
  });

  it('sottotitolo: un piatto a componenti con scelta registrata mostra l\'opzione, un piatto senza componenti resta senza sottotitolo', async () => {
    const slots = buildSlots().map((s) =>
      s.data === OGGI && s.slotDefId === 'sd-2'
        ? { ...s, dishId: DISH_WRAP.id, stato: 'casa' as const, scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' as const } } }
        : s,
    );
    mockCarico({ ...SETTIMANA_BASE, slots });
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_WRAP, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO, ING_UOVA, ING_PASSATA]);

    render(<Settimana />);
    await screen.findByText('Wrap');

    // Piatto a componenti con scelta registrata: il nome dell'opzione compare come sottotitolo.
    expect(screen.getByText('Uova + Passata di pomodoro')).toBeInTheDocument();

    // Piatto senza componenti (colazione): nessun sottotitolo, la riga resta identica a prima.
    const rigaColazione = (await screen.findByText('Yogurt e frutta')).closest('button');
    expect(rigaColazione?.textContent).not.toMatch(/\+|·/);
  });
});

describe('spunta pasti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a settimana confermata la zona destra di oggi apre il foglio e "Saltato" spunta lo slot', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Saltato' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'saltato' }, 'checkin');
    });
    expect(screen.getByText('Saltato')).toBeInTheDocument();
  });

  it('a settimana bozza la zona destra resta il link a Scegli', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'bozza', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    expect(screen.queryByRole('button', { name: 'Azioni per Cena' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scegli il piatto per Cena' })).toBeInTheDocument();
  });

  it.skipIf(INDICE_OGGI === 6)('a settimana confermata il foglio si apre anche sui giorni futuri, senza spunte', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    mockCarico(settimana);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    // GIORNI è una settimana consecutiva e INDICE_OGGI < 6 (altrimenti il
    // test è saltato): un solo "Giorno successivo" basta per finire su un
    // giorno futuro.
    fireEvent.click(screen.getByLabelText('Giorno successivo'));

    fireEvent.click(await screen.findByRole('button', { name: 'Azioni per Cena' }));

    expect(await screen.findByText('Cambia piatto')).toBeInTheDocument();
    expect(screen.getByText('Ne preparo di più')).toBeInTheDocument();
    expect(screen.queryByText('Saltato')).not.toBeInTheDocument();
  });

  it('"Ne preparo di più" salva porzioni e congelato via aggiornaSlot', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    mockCarico(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByLabelText('Aggiungi una porzione'));
    fireEvent.click(screen.getByRole('button', { name: 'Freezer' }));
    fireEvent.click(screen.getByLabelText('Salva porzioni'));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { porzioniPreparate: 1, prontiCongelato: true }, 'checkin');
    });
  });

  it('"Uso una porzione pronta" manda daPronti e stato casa; il sottotitolo mostra "Porzione pronta"', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    mockCarico(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    vi.mocked(leggiPronti).mockResolvedValue([
      { id: 'l-1', dishId: DISH_CENA.id, porzioni: 2, congelato: true, preparataIl: sommaGiorni(OGGI, -1), mealSlotId: null },
    ]);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Uso una porzione pronta (2 pronte)' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { daPronti: true, stato: 'casa' }, 'checkin');
    });
    await screen.findByText(/Porzione pronta/);
  });

  it('"Cucinato ma non mangiato" manda saltato + una porzione in più', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    mockCarico(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cucinato ma non mangiato' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'saltato', porzioniPreparate: 1 }, 'checkin');
    });
  });

  it('"Torna al piano" azzera anche daPronti', async () => {
    const slots = buildSlots().map((s) =>
      s.data === OGGI && s.slotDefId === 'sd-3' ? { ...s, stato: 'saltato' as const } : s,
    );
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots };
    mockCarico(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Torna al piano' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'casa', daPronti: false }, 'checkin');
    });
  });

  // I1 (review Task 7): la ricarica dei lotti dopo un gesto prep riuscito
  // viveva DENTRO il try del salvataggio — se falliva solo leggiPronti, il
  // catch revertiva uno slot già scritto sul server e mostrava l'errore di
  // salvataggio, falso perché il DB aveva già scritto.
  it('un fallimento della sola ricarica dei lotti non reverte il salvataggio riuscito né mostra l\'errore di salvataggio', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    mockCarico(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    // Primo leggiPronti (caricamento iniziale della pagina): ok.
    // Secondo leggiPronti (ricarica dopo il gesto): fallisce.
    vi.mocked(leggiPronti).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('rete assente'));

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cucinato ma non mangiato' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'saltato', porzioniPreparate: 1 }, 'checkin');
    });
    // Lo slot resta aggiornato (niente revert): la riga mostra "Saltato".
    await waitFor(() => {
      expect(screen.getByText('Saltato')).toBeInTheDocument();
    });
    // E non compare il messaggio d'errore di salvataggio: aggiornaSlot è
    // andato a buon fine, solo la ricarica dei lotti è fallita.
    expect(screen.queryByText('Non siamo riusciti a salvare il cambiamento. Riprova.')).not.toBeInTheDocument();
  });

  // I2 (review Task 7): il sottotitolo era renderizzato solo con aCasa, quindi
  // dopo "Cucinato ma non mangiato" (stato saltato + porzioniPreparate ≥ 1) le
  // porzioni sparivano dalla riga pur continuando a consumare (fattoreConsumo
  // le conta a prescindere dallo stato, spec meal-prepping §6).
  it('slot spento con porzioni preparate mostra sia l\'etichetta di stato che "+N porzioni"', async () => {
    const slots = buildSlots().map((s) =>
      s.data === OGGI && s.slotDefId === 'sd-3' ? { ...s, stato: 'saltato' as const, porzioniPreparate: 1 } : s,
    );
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots };
    mockCarico(settimana);

    render(<Settimana />);
    await screen.findByText('Yogurt e frutta');

    expect(screen.getByText('Saltato')).toBeInTheDocument();
    expect(screen.getByText('+1 porzione')).toBeInTheDocument();
  });
});

describe('settimana precedente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const LUNEDI_PREC = sommaGiorni(LUNEDI, -7);
  const GIORNI_PREC = giorniDellaSettimana(LUNEDI_PREC);

  function slotsPrecedenti(): MealSlot[] {
    return GIORNI_PREC.map((data) => ({
      id: `${data}:sd-1`, data, slotDefId: 'sd-1', stato: 'casa' as const,
      dishId: DISH_COLAZIONE.id, fonteStato: 'default' as const, scelte: {},
      porzioniPreparate: 0, daPronti: false,
    }));
  }

  it('il link carica la settimana di sette giorni fa, senza bottone di conferma', async () => {
    const corrente: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    const precedente: SettimanaCorrente = { id: 'w-0', dataInizio: LUNEDI_PREC, stato: 'chiusa', slots: slotsPrecedenti() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(corrente);
    vi.mocked(leggiSettimana).mockResolvedValue(precedente);
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: '‹ SETTIMANA SCORSA' }));

    await waitFor(() => expect(leggiSettimana).toHaveBeenCalledWith(LUNEDI_PREC));
    await screen.findByRole('button', { name: 'SETTIMANA CORRENTE ›' });
    expect(screen.queryByText('CONFERMA E CREA LA LISTA')).not.toBeInTheDocument();
    expect(screen.queryByText('VAI ALLA LISTA')).not.toBeInTheDocument();
    // Tutti i giorni della precedente sono passati: la zona destra è ad azioni.
    expect(screen.getAllByRole('button', { name: 'Azioni per Colazione' }).length).toBeGreaterThan(0);
  });

  it('precedente mai creata: stato vuoto, nessuna creaSettimana', async () => {
    const corrente: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(corrente);
    vi.mocked(leggiSettimana).mockResolvedValue(null);
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: '‹ SETTIMANA SCORSA' }));

    await screen.findByText('Questa settimana non è mai stata creata: non c’è nulla da correggere.');
    expect(creaSettimana).not.toHaveBeenCalled();
  });

  it('leggiSettimana fallita sulla precedente: errore col bottone di ritorno, che riporta alla corrente', async () => {
    const corrente: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(corrente);
    vi.mocked(leggiSettimana).mockRejectedValue(new Error('rete assente'));
    vi.mocked(leggiSlotDefs).mockResolvedValue(SLOT_DEFS);
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_COLAZIONE, DISH_CENA]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_POLLO]);
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 1,
      cicloOrigine: null,
    });
    vi.mocked(leggiPronti).mockResolvedValue([]);

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: '‹ SETTIMANA SCORSA' }));

    await screen.findByText('Non riusciamo a caricare la settimana. Riprova più tardi.');
    const bottoneRitorno = screen.getByRole('button', { name: 'SETTIMANA CORRENTE ›' });

    fireEvent.click(bottoneRitorno);

    expect(await screen.findByText('Yogurt e frutta')).toBeInTheDocument();
  });
});
