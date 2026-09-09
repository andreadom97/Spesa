import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MealSlotDef } from '@/domain/types';

// pastiDiDefault non è nella lista solo per pigrizia: la pagina reale la usa
// quando leggiSlotDefs() torna vuoto (C3), quindi il mock deve fornirla —
// altrimenti la pagina la chiamerebbe come undefined e il caricamento
// fallirebbe in modo silenzioso, mascherando il test come un bug diverso.
const ASSENZE_VUOTE_MODULO = [false, false, false, false, false, false, false];
vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
  leggiSlotDefs: vi.fn(),
  salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => [
    { id: 'default-colazione', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE_MODULO },
    { id: 'default-spuntino', nome: 'Spuntino', posizione: 1, assenzeAbituali: [false, false, false, false, false, true, true] },
    { id: 'default-pranzo', nome: 'Pranzo', posizione: 2, assenzeAbituali: [true, true, true, true, true, false, false] },
    { id: 'default-cena', nome: 'Cena', posizione: 3, assenzeAbituali: ASSENZE_VUOTE_MODULO },
  ]),
}));

vi.mock('@/data/casa', () => ({
  statoCasa: vi.fn(),
  creaInvito: vi.fn(),
  entraInCasa: vi.fn(),
  esciDallaCasa: vi.fn(),
  rimuoviMembro: vi.fn(),
  dimenticaIdCasa: vi.fn(),
}));

const back = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back, replace: vi.fn() }),
}));

import { leggiImpostazioni, salvaImpostazioni, leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import { statoCasa, creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro } from '@/data/casa';
import { lunediDi } from '@/domain/date';
import Impostazioni from '../page';

const ASSENZE_VUOTE = [false, false, false, false, false, false, false];

// Tre pasti (non i quattro cablati nell'artboard): verifica che la schermata
// legga davvero da leggiSlotDefs() e non da un mock interno.
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE_VUOTE };

const ORDINE_AREE_TEST = ['dispensa', 'latticini', 'ortofrutta', 'surgelati', 'cereali', 'macelleria'] as const;

function mockDati(overrides?: { porzioni?: number; pasti?: MealSlotDef[] }) {
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: overrides?.porzioni ?? 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
  vi.mocked(leggiSlotDefs).mockResolvedValue(overrides?.pasti ?? [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
  // Da solo per default: la scheda CASA c'è ma non tocca i test sui pasti.
  vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
}

describe('Impostazioni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard', async () => {
    mockDati();
    render(<Impostazioni />);

    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    expect(screen.getByText('3 DI 6')).toBeInTheDocument();
  });

  // Tolto dall'interfaccia il 28/08/2026 (un moltiplicatore unico presuppone
  // che tutti a tavola mangino la stessa porzione), rimesso il 06/09 a livello
  // di casa con quell'assunzione dichiarata nel copy: spec casa condivisa §6.
  describe('Per quante persone cucini', () => {
    it('sta nella sezione CASA, dichiara l’assunzione e parte da 1 con il − spento', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);

      await screen.findByDisplayValue('Colazione');
      expect(screen.getByText('CASA')).toBeInTheDocument();
      expect(screen.getByText('Per quante persone cucini')).toBeInTheDocument();
      expect(
        screen.getByText('Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('1');
      expect(screen.getByLabelText('Diminuisci porzioni')).toBeDisabled();
      expect(screen.getByLabelText('Diminuisci porzioni')).toHaveStyle({ opacity: '0.35' });
      expect(screen.getByLabelText('Aumenta porzioni')).toBeEnabled();
      // A 1 la lista non moltiplica niente: la riga sotto lo stepper non c'è.
      expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
      expect(salvaImpostazioni).not.toHaveBeenCalled();
    });

    it('+ salva subito le impostazioni intere con 2, mostra 2 e dice per quanti compra la lista', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);

      await screen.findByDisplayValue('Colazione');
      // Dopo la scrittura la pagina rilegge dal server (come per il ciclo):
      // il mock deve restituire il valore appena salvato, o l'ottimismo
      // verrebbe sovrascritto dall'1 di partenza.
      vi.mocked(leggiImpostazioni).mockResolvedValue({
        moltiplicatorePorzioni: 2,
        ordineAree: [...ORDINE_AREE_TEST],
        settimaneCiclo: 1,
        cicloOrigine: null,
      });
      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));

      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      expect(vi.mocked(salvaImpostazioni).mock.calls[0][0]).toEqual({
        moltiplicatorePorzioni: 2,
        ordineAree: [...ORDINE_AREE_TEST],
        settimaneCiclo: 1,
        cicloOrigine: null,
      });
      await waitFor(() => expect(screen.getByLabelText('Porzioni')).toHaveTextContent('2'));
      expect(screen.getByText('La lista compra per 2. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
      expect(screen.getByLabelText('Diminuisci porzioni')).toBeEnabled();
    });

    it('a 4 il + è spento e non salva', async () => {
      mockDati({ porzioni: 4 });
      render(<Impostazioni />);

      await screen.findByDisplayValue('Colazione');
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('4');
      const piu = screen.getByLabelText('Aumenta porzioni');
      expect(piu).toBeDisabled();
      expect(piu).toHaveStyle({ opacity: '0.35' });
      fireEvent.click(piu);
      expect(salvaImpostazioni).not.toHaveBeenCalled();
      expect(screen.getByText('La lista compra per 4. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
    });

    it('− scende di uno e salva', async () => {
      mockDati({ porzioni: 3 });
      render(<Impostazioni />);

      await screen.findByDisplayValue('Colazione');
      vi.mocked(leggiImpostazioni).mockResolvedValue({
        moltiplicatorePorzioni: 2,
        ordineAree: [...ORDINE_AREE_TEST],
        settimaneCiclo: 1,
        cicloOrigine: null,
      });
      fireEvent.click(screen.getByLabelText('Diminuisci porzioni'));

      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].moltiplicatorePorzioni).toBe(2);
      await waitFor(() => expect(screen.getByLabelText('Porzioni')).toHaveTextContent('2'));
    });

    // F4 della review: due tap veloci sono due salvataggi con due riletture,
    // e la rilettura del primo può arrivare dopo quella del secondo. Senza
    // un contatore di richiesta, la rilettura vecchia sovrascriverebbe il
    // valore nuovo a schermo (e il punto di rollback).
    it('due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);
      await screen.findByDisplayValue('Colazione');

      const impostazioni = (porzioni: number) => ({
        moltiplicatorePorzioni: porzioni, ordineAree: [...ORDINE_AREE_TEST], settimaneCiclo: 1, cicloOrigine: null,
      });
      const riletture: Array<(i: ReturnType<typeof impostazioni>) => void> = [];
      vi.mocked(leggiImpostazioni).mockImplementation(
        () => new Promise((resolve) => { riletture.push(resolve); }),
      );

      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].moltiplicatorePorzioni).toBe(3);
      await waitFor(() => expect(riletture).toHaveLength(2));

      // La seconda rilettura torna per prima: 3.
      riletture[1](impostazioni(3));
      await waitFor(() => expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3'));

      // Poi la prima, stantia: 2. Non deve toccare lo schermo.
      riletture[0](impostazioni(2));
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3');
      expect(screen.getByText('La lista compra per 3. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
    });

    it('due tap veloci: se il primo salvataggio fallisce dopo che il secondo è riuscito, resta il valore del secondo senza errore', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);
      await screen.findByDisplayValue('Colazione');
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});

      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(
        () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
      );
      vi.mocked(leggiImpostazioni).mockResolvedValue({
        moltiplicatorePorzioni: 3, ordineAree: [...ORDINE_AREE_TEST], settimaneCiclo: 1, cicloOrigine: null,
      });

      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvataggi).toHaveLength(2));

      salvataggi[1].resolve();
      await waitFor(() => expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3'));

      salvataggi[0].reject(new Error('rete'));
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3');
      expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
      errore.mockRestore();
    });

    // B1 della review di correttezza: il punto di rollback (il ref) si
    // aggiorna solo con la rilettura dell'ultima richiesta. Con due tap
    // veloci, se il primo salvataggio riesce ma la sua rilettura è superata
    // dal secondo tap, e il secondo salvataggio fallisce, il ref è ancora al
    // valore di prima di entrambi i tap mentre sul server c'è quello del
    // primo: il rollback deve rileggere dal server, non tornare al ref.
    it('due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);
      await screen.findByDisplayValue('Colazione');
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});

      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(
        () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
      );
      // Il server ha il valore del primo tap (2), da qui in poi.
      vi.mocked(leggiImpostazioni).mockResolvedValue({
        moltiplicatorePorzioni: 2, ordineAree: [...ORDINE_AREE_TEST], settimaneCiclo: 1, cicloOrigine: null,
      });

      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));
      await waitFor(() => expect(salvataggi).toHaveLength(2));
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3');

      // Il primo riesce: la sua rilettura (2) è superata dal secondo tap e si ignora.
      salvataggi[0].resolve();
      await waitFor(() => expect(leggiImpostazioni).toHaveBeenCalledTimes(2));
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('3');

      // Il secondo fallisce: si rilegge dal server, che dice 2 — non 1, il valore del ref.
      salvataggi[1].reject(new Error('rete'));
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText('Porzioni')).toHaveTextContent('2'));
      expect(leggiImpostazioni).toHaveBeenCalledTimes(3);
      expect(screen.getByText('La lista compra per 2. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
      errore.mockRestore();
    });

    it('se il salvataggio fallisce e anche la rilettura fallisce, torna all’ultimo valore confermato e lo dice', async () => {
      mockDati({ porzioni: 1 });
      render(<Impostazioni />);
      await screen.findByDisplayValue('Colazione');
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
      vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));

      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));

      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('1');
      expect(errore).toHaveBeenCalledWith('impostazioni: rilettura dopo il salvataggio fallito non riuscita.', expect.any(Error));
      errore.mockRestore();
    });

    it('se il salvataggio fallisce torna al valore del server e lo dice', async () => {
      mockDati({ porzioni: 1 });
      vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<Impostazioni />);

      await screen.findByDisplayValue('Colazione');
      fireEvent.click(screen.getByLabelText('Aumenta porzioni'));

      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      expect(screen.getByLabelText('Porzioni')).toHaveTextContent('1');
      // Il valore a cui tornare si rilegge dal server: una per il caricamento, una per il rollback.
      expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Diminuisci porzioni')).toBeDisabled();
      errore.mockRestore();
    });
  });

  it('porta all elenco degli ingredienti', async () => {
    // Era l'unica parte del repertorio senza un elenco: un ingrediente non
    // usato in nessun piatto non si raggiungeva da nessuna parte.
    mockDati({ porzioni: 1 });
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    expect(screen.getByRole('link', { name: /Ingredienti/ })).toHaveAttribute(
      'href',
      '/impostazioni/ingredienti',
    );
  });

  it('sotto il minimo di 3 pasti il pulsante di rimozione è disattivato', async () => {
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA] });
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    expect(screen.getByLabelText('Rimuovi Colazione')).toBeDisabled();
    expect(screen.getByLabelText('Rimuovi Pranzo')).toBeDisabled();
    expect(screen.getByLabelText('Rimuovi Cena')).toBeDisabled();
  });

  it('sopra il minimo la rimozione funziona e salva l’insieme aggiornato', async () => {
    const SLOT_SPUNTINO: MealSlotDef = { id: 'sd-4', nome: 'Spuntino', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA, SLOT_SPUNTINO] });
    render(<Impostazioni />);

    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));

    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, posizione: 0 },
      { ...SLOT_PRANZO, posizione: 1 },
      { ...SLOT_CENA, posizione: 2 },
    ]);
  });

  it('al massimo di 6 pasti il pulsante di aggiunta è disattivato', async () => {
    // Sei è il numero che serve al piano di Andrea: colazione, due spuntini
    // distinti, pranzo, cena, dopocena.
    const pasti: MealSlotDef[] = [
      SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA,
      { id: 'sd-4', nome: 'Spuntino mattina', posizione: 3, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-5', nome: 'Spuntino pomeriggio', posizione: 4, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-6', nome: 'Dopocena', posizione: 5, assenzeAbituali: ASSENZE_VUOTE },
    ];
    mockDati({ pasti });
    render(<Impostazioni />);

    await screen.findByText('6 DI 6');
    const aggiungi = screen.getByText('AGGIUNGI PASTO').closest('button');
    expect(aggiungi).toBeDisabled();
    fireEvent.click(aggiungi!);
    expect(salvaSlotDefs).not.toHaveBeenCalled();
  });

  it('aggiunge un pasto sotto il massimo e lo salva con un id generato', async () => {
    mockDati();
    render(<Impostazioni />);

    await screen.findByText('3 DI 6');
    fireEvent.click(screen.getByText('AGGIUNGI PASTO').closest('button')!);

    await waitFor(() => expect(screen.getByText('4 DI 6')).toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato).toHaveLength(4);
    expect(salvato[3].nome).toBe('Nuovo pasto');
    expect(typeof salvato[3].id).toBe('string');
    expect(salvato[3].id.length).toBeGreaterThan(0);
  });

  it('la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva', async () => {
    mockDati();
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    const suColazione = screen.getByLabelText('Sposta Colazione in alto');
    const giuCena = screen.getByLabelText('Sposta Cena in basso');
    expect(suColazione).toBeDisabled();
    expect(giuCena).toBeDisabled();
    // Stesso trattamento visivo delle frecce dell'ordine reparti: dimming al
    // 35% ai limiti, non solo l'attributo disabled — altrimenti lo stesso
    // gesto (freccia su/giù) avrebbe due resti diversi a un tap di distanza.
    expect(suColazione).toHaveStyle({ opacity: '0.35' });
    expect(giuCena).toHaveStyle({ opacity: '0.35' });
    expect(screen.getByLabelText('Sposta Colazione in basso')).toHaveStyle({ opacity: '1' });
    expect(screen.getByLabelText('Sposta Cena in alto')).toHaveStyle({ opacity: '1' });

    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_PRANZO, posizione: 0 },
      { ...SLOT_COLAZIONE, posizione: 1 },
      { ...SLOT_CENA, posizione: 2 },
    ]));
  });

  it('la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px', async () => {
    mockDati();
    render(<Impostazioni />);

    const inputColazione = await screen.findByDisplayValue('Colazione');
    const rigaColazione = inputColazione.closest('div[style*="overflow: hidden"]') as HTMLElement;
    const lunedi = within(rigaColazione).getByLabelText('Lunedì, abitualmente fuori casa');
    expect(lunedi).toHaveStyle({ height: '44px' });
    const pillola = lunedi.firstElementChild as HTMLElement;
    expect(pillola).toHaveStyle({ height: '36px' });
  });

  it('accende una pastiglia del giorno e salva le assenze abituali aggiornate', async () => {
    mockDati();
    render(<Impostazioni />);

    const inputColazione = await screen.findByDisplayValue('Colazione');
    const rigaColazione = inputColazione.closest('div[style*="overflow: hidden"]') as HTMLElement;
    fireEvent.click(within(rigaColazione).getByLabelText('Lunedì, abitualmente fuori casa'));

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, assenzeAbituali: [true, false, false, false, false, false, false] },
      SLOT_PRANZO,
      SLOT_CENA,
    ]));
  });

  it('rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato', async () => {
    mockDati();
    render(<Impostazioni />);

    const input = await screen.findByDisplayValue('Colazione');
    fireEvent.change(input, { target: { value: 'Brunch' } });
    expect(salvaSlotDefs).not.toHaveBeenCalled();

    fireEvent.blur(input);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...SLOT_COLAZIONE, nome: 'Brunch' },
      SLOT_PRANZO,
      SLOT_CENA,
    ]));
  });

  // Regressione su C3: un utente nuovo, mai passato da seed.sql, ha
  // leggiSlotDefs() vuoto. Senza un seed automatico qui, il primo "+" in
  // AGGIUNGI PASTO produrrebbe una sola riga, rifiutata dal minimo di 3 di
  // salvaSlotDefs — un vicolo cieco.
  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server', async () => {
    mockDati({ pasti: [] });
    render(<Impostazioni />);

    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.getByText('4 DI 6')).toBeInTheDocument();

    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato.map((p) => p.nome)).toEqual(['Colazione', 'Spuntino', 'Pranzo', 'Cena']);
    // Spuntino fuori sabato e domenica, Pranzo fuori lunedì-venerdì: gli
    // stessi valori di supabase/seed.sql, non inventati qui.
    expect(salvato[1].assenzeAbituali).toEqual([false, false, false, false, false, true, true]);
    expect(salvato[2].assenzeAbituali).toEqual([true, true, true, true, true, false, false]);
  });

  it('il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso', async () => {
    mockDati();
    render(<Impostazioni />);

    const link = await screen.findByRole('link', { name: /Ordine dei reparti/ });
    expect(link).toHaveAttribute('href', '/impostazioni/reparti');
    expect(
      within(link).getByText('DISPENSA E CONSERVE · LATTICINI, UOVA E SALUMI · ORTOFRUTTA · SURGELATI · PASTA, RISO E CEREALI · MACELLERIA E PESCHERIA'),
    ).toBeInTheDocument();
  });

  it('con il ciclo spento la rotazione si può accendere e dice cosa cambia', async () => {
    mockDati();
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    expect(screen.getByText('ROTAZIONE DEL PIANO')).toBeInTheDocument();
    // Senza giro non ha senso dire a che punto del giro siamo.
    expect(screen.queryByText(/ORA SEI ALLA/)).not.toBeInTheDocument();

    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2026-08-31',
    });
    fireEvent.click(screen.getByRole('button', { name: '2 SETT.' }));

    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].settimaneCiclo).toBe(2);
    // L'ordine dei reparti viaggia invariato: salvaImpostazioni riscrive la
    // riga intera, e questa schermata non deve azzerare quello che non mostra.
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].ordineAree).toEqual([...ORDINE_AREE_TEST]);
    await waitFor(() => expect(screen.getByText(/ORA SEI ALLA/)).toBeInTheDocument());
  });

  it('se il salvataggio del ciclo fallisce torna al valore di prima e lo dice', async () => {
    mockDati();
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    render(<Impostazioni />);

    await screen.findByDisplayValue('Colazione');
    fireEvent.click(screen.getByRole('button', { name: '3 SETT.' }));

    await waitFor(() =>
      expect(screen.getByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'NESSUNA' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('il copy del giro con origine futura dice "comincia"', async () => {
    mockDati();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2099-03-09', // nel futuro rispetto a qualunque "oggi" reale
    });
    render(<Impostazioni />);

    expect(await screen.findByText(/^Il giro comincia lunedì 9 marzo\b/)).toBeInTheDocument();
  });

  it('il copy del giro con origine passata (o oggi) dice "è cominciato"', async () => {
    mockDati();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2000-01-03', // nel passato rispetto a qualunque "oggi" reale
    });
    render(<Impostazioni />);

    expect(await screen.findByText(/^Il giro è cominciato lunedì 3 gennaio\b/)).toBeInTheDocument();
  });

  it('RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero', async () => {
    mockDati();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2000-01-03', // lontano dal lunedì corrente: il bottone è attivo
    });
    render(<Impostazioni />);

    const bottone = await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' });
    fireEvent.click(bottone);

    // Primo tap: solo l'armamento, nessuna scrittura.
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'SICURO? RIPARTI DA LUNEDÌ' })).toBeInTheDocument();

    // Secondo tap sullo stesso bottone: ora esegue persistiImpostazioni davvero.
    fireEvent.click(screen.getByRole('button', { name: 'SICURO? RIPARTI DA LUNEDÌ' }));

    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    const salvato = vi.mocked(salvaImpostazioni).mock.calls[0][0];
    expect(salvato.cicloOrigine).toBe(lunediDi(new Date().toISOString().slice(0, 10)));
  });

  it('RIPARTI armato: un tap fuori dal bottone annulla senza salvare', async () => {
    mockDati();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2000-01-03',
    });
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    expect(screen.getByRole('button', { name: 'SICURO? RIPARTI DA LUNEDÌ' })).toBeInTheDocument();

    fireEvent.click(document.body);

    expect(screen.getByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).toBeInTheDocument();
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma', async () => {
    mockDati();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 2,
      cicloOrigine: '2000-01-03',
    });
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    expect(screen.getByRole('button', { name: 'SICURO? RIPARTI DA LUNEDÌ' })).toBeInTheDocument();

    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: [...ORDINE_AREE_TEST],
      settimaneCiclo: 3,
      cicloOrigine: '2000-01-03',
    });
    fireEvent.click(screen.getByRole('button', { name: '3 SETT.' }));

    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).toBeInTheDocument();
  });
});

describe('Casa', () => {
  // `window.location.assign` in jsdom non si può spiare (la proprietà non è
  // ridefinibile): si sostituisce l'intero `location` con una copia che ha
  // un assign finto, e si ripristina alla fine.
  const locationOriginale = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    assign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...locationOriginale, assign },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: locationOriginale, writable: true, configurable: true });
  });

  it('da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare', async () => {
    mockDati();
    render(<Impostazioni />);

    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.getByText('CASA')).toBeInTheDocument();
    // Consenso informato: chi invita deve sapere che l'altro può anche cancellare.
    expect(screen.getByText(
      'Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toHaveAttribute('placeholder', 'Ho un codice');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
  });

  it('CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata', async () => {
    mockDati();
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));

    expect(await screen.findByLabelText('Codice della casa')).toHaveTextContent('K7P3QX2M');
    expect(creaInvito).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.')).toBeInTheDocument();
  });

  it('se creaInvito fallisce lo dice senza rompere la scheda', async () => {
    mockDati();
    vi.mocked(creaInvito).mockRejectedValue(new Error('rete'));
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));

    expect(await screen.findByText('Non siamo riusciti a creare il codice. Riprova.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Codice della casa')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
  });

  it('ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista', async () => {
    mockDati();
    vi.mocked(entraInCasa).mockResolvedValue(undefined);
    render(<Impostazioni />);

    const campo = await screen.findByLabelText('Ho un codice');
    fireEvent.change(campo, { target: { value: 'k7p3' } });
    expect(campo).toHaveValue('K7P3');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();

    // Sei caratteri erano il formato vecchio (migrazione 0012, prima della
    // revisione di sicurezza): non bastano più.
    fireEvent.change(campo, { target: { value: 'k7p3qx' } });
    expect(campo).toHaveValue('K7P3QX');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();

    fireEvent.change(campo, { target: { value: 'k7p3qx2m' } });
    expect(campo).toHaveValue('K7P3QX2M');
    expect(campo).toHaveAttribute('maxlength', '8');
    const entra = screen.getByRole('button', { name: 'ENTRA' });
    expect(entra).toBeEnabled();
    fireEvent.click(entra);

    await waitFor(() => expect(entraInCasa).toHaveBeenCalledWith('K7P3QX2M'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista'));
  });

  it('con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è', async () => {
    mockDati();
    // Un `raise exception` di entra_in_casa arriva come PostgrestError con
    // SQLSTATE P0001: è l'unico caso in cui il messaggio è scritto per l'utente.
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(new Error('codice non valido o scaduto'), { code: 'P0001' }));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Impostazioni />);

    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));

    expect(await screen.findByText('codice non valido o scaduto')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  it('un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres', async () => {
    mockDati();
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(
      new Error('duplicate key value violates unique constraint "casa_membro_pkey"'),
      { code: '23505' },
    ));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Impostazioni />);

    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));

    expect(await screen.findByText('Non siamo riusciti a entrare. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    // Il campo resta com'era e ENTRA torna attivo: si può riprovare.
    expect(screen.getByLabelText('Ho un codice')).toHaveValue('AAAAAAAA');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeEnabled();
    errore.mockRestore();
  });

  it('da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] });
    render(<Impostazioni />);

    expect(await screen.findByText('La tua casa')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getByText('Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ho un codice')).not.toBeInTheDocument();
  });

  it('da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa', async () => {
    mockDati();
    vi.mocked(statoCasa)
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] })
      // La rilettura dopo la rimozione: resta il secondo.
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['c@d.it'], id: ['id-2'] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    render(<Impostazioni />);

    await screen.findByText('a@b.it');
    const togli = screen.getAllByRole('button', { name: 'TOGLI' });
    expect(togli).toHaveLength(2);

    fireEvent.click(togli[0]);
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();
    expect(rimuoviMembro).not.toHaveBeenCalled();
    // L'altro TOGLI non si è armato.
    expect(screen.getAllByRole('button', { name: 'TOGLI' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    // L'id, non l'email: accoppiati per indice da stato_casa.
    await waitFor(() => expect(rimuoviMembro).toHaveBeenCalledWith('id-1'));
    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'TOGLI' })).toHaveLength(1);
    expect(screen.getByText('La tua casa')).toBeInTheDocument();
    // Nessun reload: l'id di chi chiama non è cambiato.
    expect(assign).not.toHaveBeenCalled();
  });

  it('da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo', async () => {
    mockDati();
    vi.mocked(statoCasa)
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['a@b.it'], id: ['id-1'] })
      .mockResolvedValueOnce({ ruolo: 'solo', email: [], id: [] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'TOGLI' }));
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.queryByText('La tua casa')).not.toBeInTheDocument();
    expect(screen.queryByText('a@b.it')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toBeInTheDocument();
  });

  it('da proprietario: TOGLI armato, un tap fuori disarma senza togliere', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'proprietario', email: ['a@b.it'], id: ['id-1'] });
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'TOGLI' }));
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();

    fireEvent.click(document.body);

    expect(screen.getByRole('button', { name: 'TOGLI' })).toBeInTheDocument();
    expect(rimuoviMembro).not.toHaveBeenCalled();
  });

  it('se togliere fallisce lo dice e il membro resta in elenco', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] });
    vi.mocked(rimuoviMembro).mockRejectedValue(new Error('nessun membro con questo id nella tua casa'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Impostazioni />);

    await screen.findByText('a@b.it');
    fireEvent.click(screen.getAllByRole('button', { name: 'TOGLI' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(await screen.findByText('Non siamo riusciti a togliere. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'TOGLI' })).toHaveLength(2);
    // Nessuna rilettura: la scheda non è cambiata.
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti', async () => {
    mockDati();
    vi.mocked(statoCasa)
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] })
      .mockRejectedValueOnce(new Error('rete'));
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Impostazioni />);

    await screen.findByText('a@b.it');
    fireEvent.click(screen.getAllByRole('button', { name: 'TOGLI' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a togliere. Riprova.')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] });
    vi.mocked(esciDallaCasa).mockResolvedValue(undefined);
    render(<Impostazioni />);

    expect(await screen.findByText('Sei nella casa di a@b.it')).toBeInTheDocument();
    expect(screen.getByText('Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(esciDallaCasa).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    await waitFor(() => expect(esciDallaCasa).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista'));
  });

  it('da membro: ESCI armato, un tap fuori disarma senza uscire', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] });
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(screen.getByRole('button', { name: 'SICURO?' })).toBeInTheDocument();

    fireEvent.click(document.body);

    expect(screen.getByRole('button', { name: 'ESCI DALLA CASA' })).toBeInTheDocument();
    expect(esciDallaCasa).not.toHaveBeenCalled();
  });

  it('se uscire fallisce lo dice e resta nella casa', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] });
    vi.mocked(esciDallaCasa).mockRejectedValue(new Error('rete'));
    render(<Impostazioni />);

    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    fireEvent.click(screen.getByRole('button', { name: 'SICURO?' }));

    expect(await screen.findByText('Non siamo riusciti a uscire. Riprova.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ESCI DALLA CASA' })).toBeInTheDocument();
  });

  it('se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile', async () => {
    mockDati();
    vi.mocked(statoCasa).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Impostazioni />);

    expect(await screen.findByText('Non riusciamo a leggere la casa. Riprova più tardi.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByText('3 DI 6')).toBeInTheDocument();
    expect(screen.queryByText('Fai la spesa con qualcuno?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
    errore.mockRestore();
  });
});
