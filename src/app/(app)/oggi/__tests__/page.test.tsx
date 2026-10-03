import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, PantryState } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';

vi.mock('@/data/apertura', () => ({ apriSettimanaCorrente: vi.fn() }));
vi.mock('@/data/settimana', () => ({ aggiornaSlot: vi.fn(), leggiSettimana: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn(), leggiImpostazioni: vi.fn() }));
vi.mock('@/data/pronti', () => ({ leggiPronti: vi.fn() }));
vi.mock('@/data/dispensa', () => ({ leggiDispensa: vi.fn(), leggiUltimaChiusura: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { apriSettimanaCorrente } from '@/data/apertura';
import { aggiornaSlot, leggiSettimana } from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiPronti } from '@/data/pronti';
import { leggiDispensa, leggiUltimaChiusura } from '@/data/dispensa';
import Oggi from '../page';

// Sabato 3 ottobre 2026, 18:10, ora locale. Si finge solo Date: i timer restano veri
// (React Testing Library li usa per waitFor).
const ADESSO = new Date(2026, 9, 3, 18, 10);
const OGGI = '2026-10-03';
const A = [false, false, false, false, false, false, false];
const DEFS: MealSlotDef[] = [
  { id: 'pra', nome: 'Pranzo', posizione: 0, assenzeAbituali: A },
  { id: 'cen', nome: 'Cena', posizione: 1, assenzeAbituali: A },
  { id: 'dop', nome: 'Dopocena', posizione: 2, assenzeAbituali: A },
];
const ing = (id: string, nome: string, unitaBase: 'g' | 'pz'): Ingredient => ({
  id, nome, unitaBase, area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: false,
  formatoConfezione: 100, prezzoConfezione: null, ean: null,
});
const PATATA = ing('patata', 'Patata', 'g');
const UOVO = ing('uovo', 'Uovo', 'pz');
const CECI = ing('ceci', 'Ceci', 'g');
const SPINACI: Ingredient = { ...ing('spinaci', 'Spinaci', 'g'), deperibile: true };
const piatto = (id: string, nome: string, slotDefId: string, righe: [Ingredient, number][]): Dish => ({
  id, nome, slotDefId, fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: righe.map(([i, q]) => ({ ingredientId: i.id, quantita: q, unita: i.unitaBase })), componenti: [],
});
const POLPETTE = piatto('d-polpette', 'Polpette di ceci', 'cen', [[CECI, 150]]);
const FRITTATA = piatto('d-frittata', 'Frittata di patate', 'cen', [[PATATA, 200], [UOVO, 2]]);
const FONDENTE = piatto('d-fondente', 'Due quadretti di fondente', 'dop', []);
const PASTA = piatto('d-pasta', 'Pasta e ceci', 'pra', [[CECI, 80]]);

const slot = (id: string, data: string, slotDefId: string, dishId: string | null): MealSlot => ({
  id, data, slotDefId, stato: 'casa', dishId, fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false,
});
function settimana(stato: SettimanaCorrente['stato'], cena = 'd-polpette'): SettimanaCorrente {
  return {
    id: 'w', dataInizio: '2026-09-28', stato,
    slots: [
      slot('s-pra', OGGI, 'pra', 'd-pasta'), slot('s-cen', OGGI, 'cen', cena), slot('s-dop', OGGI, 'dop', 'd-fondente'),
      slot('d-pra', '2026-10-04', 'pra', 'd-pasta'),
    ],
  };
}
const PANTRY: PantryState[] = [PATATA, UOVO].map((i) => ({
  ingredientId: i.id, residuo: 500, ultimoAcquisto: '2026-10-01', giorniStimati: 90, congelato: false,
  scadenzaManuale: null, ultimoCheck: null,
}));

// Domenica 4 ottobre 2026, 22:00: i pasti di oggi sono finiti, domani (lunedì 5) cade nella settimana dopo.
const DOMENICA = new Date(2026, 9, 4, 22, 0);
const LUNEDI = '2026-10-05';
/** La settimana che inizia lunedì 5 ottobre, con un solo pasto: il pranzo di lunedì. */
const settimanaDiLunedi = (stato: SettimanaCorrente['stato']): SettimanaCorrente => ({
  id: 'w2', dataInizio: LUNEDI, stato, slots: [slot('m-pra', LUNEDI, 'pra', 'd-pasta')],
});
/**
 * `apriSettimanaCorrente` risponde per argomento: la data di lunedì dà la settimana di domani (o un
 * errore), ogni altra data la settimana di oggi.
 */
function apriPerData(diOggi: SettimanaCorrente, diLunedi: SettimanaCorrente | Error) {
  vi.mocked(apriSettimanaCorrente).mockImplementation(async (d) => {
    if (d !== LUNEDI) return diOggi;
    if (diLunedi instanceof Error) throw diLunedi;
    return diLunedi;
  });
}

/** Gli href delle tessere che portano in Dispensa o al Piano, nell'ordine della pagina. */
const hrefDelleTessere = () =>
  [...document.querySelectorAll('a')]
    .map((a) => a.getAttribute('href') ?? '')
    .filter((h) => h.startsWith('/dispensa') || h === '/piano');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(ADESSO);
  window.sessionStorage.clear();
  vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata'));
  vi.mocked(leggiSettimana).mockResolvedValue(null);
  vi.mocked(leggiSlotDefs).mockResolvedValue(DEFS);
  vi.mocked(leggiRepertorio).mockResolvedValue([POLPETTE, FRITTATA, FONDENTE, PASTA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([PATATA, UOVO, CECI]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: [], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90 });
  vi.mocked(leggiPronti).mockResolvedValue([]);
  vi.mocked(leggiDispensa).mockResolvedValue(PANTRY);
  vi.mocked(leggiUltimaChiusura).mockResolvedValue(null);
  vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('Oggi (spec 2026-10-03)', () => {
  it('alle 18:10 il poster è la cena, con CAMBIA verso Scegli da Oggi, e «Poi» è il dopocena', async () => {
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(screen.getByText('Sabato · Cena')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambia' })).toHaveAttribute('href', `/piano/${OGGI}/cen/scegli?da=oggi`);
    expect(screen.getByText('Poi · Dopocena')).toBeInTheDocument();
    expect(screen.getByText('Due quadretti di fondente')).toBeInTheDocument();
  });

  it('senza spese chiuse: tessera tratteggiata, niente alternative', async () => {
    render(<Oggi />);
    expect(await screen.findByText(/Chiudi la prima spesa nell'app/)).toBeInTheDocument();
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
  });

  it('con la dispensa aggiornata: la Frittata, SCAMBIA scrive come Scegli, poi RIMETTI', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    render(<Oggi />);
    const scambia = await screen.findByRole('button', { name: 'Scambia con Frittata di patate' });
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata', 'd-frittata'));
    fireEvent.click(scambia);
    await waitFor(() => expect(aggiornaSlot).toHaveBeenCalledWith('s-cen', { dishId: 'd-frittata' }, 'correzione'));
    const rimetti = await screen.findByRole('button', { name: 'Rimetti quello del piano' });
    expect(screen.getByRole('heading', { name: 'Frittata di patate' })).toBeInTheDocument();
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata'));
    fireEvent.click(rimetti);
    await waitFor(() => expect(aggiornaSlot).toHaveBeenLastCalledWith('s-cen', { dishId: 'd-polpette', scelte: {} }, 'correzione'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Rimetti quello del piano' })).toBeNull());
  });

  it('SCAMBIA fallito: il messaggio sotto il poster, niente RIMETTI', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    vi.mocked(aggiornaSlot).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scambia con Frittata di patate' }));
    expect(await screen.findByText('Non siamo riusciti a scambiare il piatto. Riprova.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rimetti quello del piano' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
  });

  it('in bozza non c\'è COM\'È ANDATA', async () => {
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('bozza'));
    render(<Oggi />);
    await screen.findByRole('heading', { name: 'Polpette di ceci' });
    expect(screen.queryByRole('button', { name: "Com'è andata" })).toBeNull();
  });

  it('COM\'È ANDATA apre il foglio, e Saltato scrive come il Piano', async () => {
    render(<Oggi />);
    fireEvent.click(await screen.findByRole('button', { name: "Com'è andata" }));
    const foglio = await screen.findByRole('dialog', { name: "Com'è andata: Cena" });
    fireEvent.click(within(foglio).getByText('Saltato'));
    await waitFor(() => expect(aggiornaSlot).toHaveBeenCalledWith('s-cen', { stato: 'saltato' }, 'checkin'));
  });

  it('errore di caricamento: messaggio, RIPROVA e la Lista', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(apriSettimanaCorrente).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    expect(await screen.findByText('Non riusciamo a caricare la giornata.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri la lista' })).toHaveAttribute('href', '/lista');
    expect(log).toHaveBeenCalled();
  });

  // ── Oltre al piano: i punti che la bozza del piano non provava ────────────────────────────

  it('RIPROVA rilegge, e la giornata compare', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(apriSettimanaCorrente).mockRejectedValueOnce(new Error('rete'));
    render(<Oggi />);
    fireEvent.click(await screen.findByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
  });

  it('in caricamento: la Testata e CARICO…', async () => {
    vi.mocked(apriSettimanaCorrente).mockReturnValue(new Promise(() => {}));
    render(<Oggi />);
    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });

  it('con la banda delle alternative il poster non ha un\'icona sua; senza banda sì (ruling 1)', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    const { unmount } = render(<Oggi />);
    const conBanda = await screen.findByRole('region', { name: 'Prossimo pasto' });
    await screen.findByRole('button', { name: 'Scambia con Frittata di patate' });
    expect(conBanda.querySelector(':scope > svg[data-icona]')).toBeNull();
    // La carta della Frittata, dentro la banda, ha la sua.
    expect(conBanda.querySelector('li svg[data-icona]')).not.toBeNull();
    unmount();

    vi.mocked(leggiUltimaChiusura).mockResolvedValue(null);
    render(<Oggi />);
    const senzaBanda = await screen.findByRole('region', { name: 'Prossimo pasto' });
    expect(senzaBanda.querySelector(':scope > svg[data-icona]')).not.toBeNull();
  });

  it('un pasto il cui piatto non è più nel repertorio vale come senza piatto: il poster lo salta', async () => {
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata', 'd-eliminato'));
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Due quadretti di fondente' })).toBeInTheDocument();
    expect(screen.getByText('Sabato · Dopocena')).toBeInTheDocument();
  });

  it('con la dispensa aggiornata: Scade, Pronti e poi «Poi», in questo ordine, con i loro tocchi', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    vi.mocked(leggiIngredienti).mockResolvedValue([PATATA, UOVO, CECI, SPINACI]);
    vi.mocked(leggiDispensa).mockResolvedValue([
      ...PANTRY,
      { ingredientId: 'spinaci', residuo: 200, ultimoAcquisto: '2026-10-01', giorniStimati: 90, congelato: false, scadenzaManuale: '2026-10-04', ultimoCheck: null },
    ]);
    const lotto: LottoPronto = { id: 'l1', dishId: 'd-polpette', porzioni: 2, congelato: false, preparataIl: '2026-10-02', mealSlotId: null };
    vi.mocked(leggiPronti).mockResolvedValue([lotto]);
    render(<Oggi />);
    await screen.findByText('Scade domani');
    expect(screen.getByText('Nessun pasto lo usa')).toBeInTheDocument();
    expect(screen.getByText('2 pronti')).toBeInTheDocument();
    expect(screen.getByText('In frigo')).toBeInTheDocument();
    expect(hrefDelleTessere()).toEqual(['/dispensa?ingrediente=spinaci', '/dispensa?lotto=l1', '/piano']);
    // La dispensa è aggiornata: niente tessera tratteggiata.
    expect(screen.queryByText(/Chiudi la prima spesa/)).toBeNull();
  });

  it('una tessera dispari in coda prende due colonne compatte (spec §D); due tessere no', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    const { unmount } = render(<Oggi />);
    const sola = (await screen.findByText('Due quadretti di fondente')).closest('a')!;
    expect(sola.style.gridColumn).toBe('span 2');
    expect(sola.style.minHeight).toBe('64px');
    unmount();

    // Dispensa ferma: «Poi» e «Domani» sono due, in una riga.
    vi.mocked(leggiUltimaChiusura).mockResolvedValue(null);
    render(<Oggi />);
    const poi = (await screen.findByText('Due quadretti di fondente')).closest('a')!;
    const domani = screen.getByText('Domani · Pranzo').closest('a')!;
    for (const t of [poi, domani]) {
      expect(t.style.gridColumn).toBe('');
      expect(t.style.minHeight).toBe('104px');
    }
  });

  // ── La domenica: Oggi apre anche la settimana di domani (decisione di Andrea, 03/10, opzione a) ──

  it('domenica sera, la settimana di lunedì non esisteva e Oggi la apre: il poster è il suo primo pasto («Domani · Pranzo»), e COM\'È ANDATA segue la sua bozza', async () => {
    vi.setSystemTime(DOMENICA);
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    // Un secondo pranzo tutto in casa: se la banda ci fosse, lo proporrebbe.
    vi.mocked(leggiRepertorio).mockResolvedValue([POLPETTE, FRITTATA, FONDENTE, PASTA, piatto('d-riso', 'Riso e patate', 'pra', [[PATATA, 100]])]);
    // L'apertura la crea se manca: Oggi riceve comunque una settimana, appena nata, in bozza.
    apriPerData(settimana('confermata'), settimanaDiLunedi('bozza'));
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Pasta e ceci' })).toBeInTheDocument();
    expect(apriSettimanaCorrente).toHaveBeenCalledWith(LUNEDI);
    // Si apre, non si legge soltanto: `leggiSettimana` non crea, e la domenica sera finirebbe in un vicolo cieco.
    expect(leggiSettimana).not.toHaveBeenCalled();
    expect(screen.getByText('Domani · Pranzo')).toBeInTheDocument();
    expect(screen.queryByText("Il piano di domani non c'è ancora.")).toBeNull();
    expect(screen.getByRole('link', { name: 'Cambia' })).toHaveAttribute('href', '/piano/2026-10-05/pra/scegli?da=oggi');
    expect(screen.queryByRole('button', { name: "Com'è andata" })).toBeNull();
    // Per domani si cambia dal Piano: niente banda, anche con la dispensa aggiornata.
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
  });

  it('domenica sera, l\'apertura della settimana di domani fallisce: la home regge coi dati di oggi e il poster dice che il piano non c\'è', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.setSystemTime(DOMENICA);
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    vi.mocked(leggiIngredienti).mockResolvedValue([PATATA, UOVO, CECI, SPINACI]);
    vi.mocked(leggiDispensa).mockResolvedValue([
      ...PANTRY,
      { ingredientId: 'spinaci', residuo: 200, ultimoAcquisto: '2026-10-01', giorniStimati: 90, congelato: false, scadenzaManuale: '2026-10-05', ultimoCheck: null },
    ]);
    apriPerData(settimana('confermata'), new Error('rete'));
    render(<Oggi />);
    expect(await screen.findByText("Il piano di domani non c'è ancora.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri il piano' })).toHaveAttribute('href', '/piano');
    // La pagina non va in errore: le tessere di oggi (qui, Scade) ci sono.
    expect(screen.queryByText('Non riusciamo a caricare la giornata.')).toBeNull();
    expect(screen.getByText('Scade domani')).toBeInTheDocument();
    expect(apriSettimanaCorrente).toHaveBeenCalledWith(LUNEDI);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('settimana di domani'), expect.objectContaining({ message: 'rete' }));
  });

  it('domenica sera, con la dispensa aggiornata: i pasti di lunedì (altra settimana) contano per «Scongela»', async () => {
    vi.setSystemTime(DOMENICA);
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    vi.mocked(leggiDispensa).mockResolvedValue([
      ...PANTRY,
      { ingredientId: 'ceci', residuo: 300, ultimoAcquisto: '2026-10-01', giorniStimati: 90, congelato: true, scadenzaManuale: null, ultimoCheck: null },
    ]);
    apriPerData(settimana('confermata'), settimanaDiLunedi('confermata'));
    render(<Oggi />);
    await screen.findByText('Scongela');
    expect(screen.getByText('Per pranzo di domani')).toBeInTheDocument();
    expect(hrefDelleTessere()).toEqual(['/dispensa?ingrediente=ceci']);
  });

  it('la domenica la settimana di domani parte insieme alle altre letture: una settimana lenta non la ritarda', async () => {
    vi.setSystemTime(DOMENICA);
    vi.mocked(apriSettimanaCorrente).mockReturnValue(new Promise(() => {}));
    render(<Oggi />);
    await screen.findByText('CARICO…');
    expect(apriSettimanaCorrente).toHaveBeenCalledTimes(2);
    expect(apriSettimanaCorrente).toHaveBeenCalledWith('2026-10-04');
    expect(apriSettimanaCorrente).toHaveBeenCalledWith(LUNEDI);
  });

  it('domenica, falliscono sia la settimana di oggi sia quella di domani: l\'errore di caricamento, e la seconda non resta una rejection non gestita', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.setSystemTime(DOMENICA);
    vi.mocked(apriSettimanaCorrente).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    expect(await screen.findByText('Non riusciamo a caricare la giornata.')).toBeInTheDocument();
    // Lascia girare la coda dei microtask: una rejection non gestita farebbe fallire la corsa di vitest.
    await act(async () => { await new Promise((fine) => setTimeout(fine, 0)); });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('settimana di domani'), expect.anything());
  });

  it.each([
    ['mercoledì', new Date(2026, 8, 30, 18, 10), '2026-09-30'],
    ['sabato (domani, domenica, è ancora la stessa settimana)', ADESSO, OGGI],
  ])('%s: la settimana si apre una volta sola, con oggi', async (_giorno, adesso, data) => {
    vi.setSystemTime(adesso);
    vi.mocked(apriSettimanaCorrente).mockResolvedValue({
      id: 'w', dataInizio: '2026-09-28', stato: 'confermata', slots: [slot('x-cen', data, 'cen', 'd-polpette')],
    });
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(apriSettimanaCorrente).toHaveBeenCalledTimes(1);
    expect(apriSettimanaCorrente).toHaveBeenCalledWith(data);
    expect(leggiSettimana).not.toHaveBeenCalled();
  });

  it('tornando in primo piano la home si rilegge', async () => {
    render(<Oggi />);
    await screen.findByRole('heading', { name: 'Polpette di ceci' });
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata', 'd-frittata'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(await screen.findByRole('heading', { name: 'Frittata di patate' })).toBeInTheDocument();
  });

  it('al ritorno in primo piano una rilettura fallita lascia la giornata a schermo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Oggi />);
    await screen.findByRole('heading', { name: 'Polpette di ceci' });
    vi.mocked(apriSettimanaCorrente).mockRejectedValue(new Error('rete'));
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(log).toHaveBeenCalled());
    await new Promise((fine) => setTimeout(fine, 0));
    expect(screen.queryByText('Non riusciamo a caricare la giornata.')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
  });

  it('primo caricamento in volo, ritorno in primo piano che fallisce: l\'errore con RIPROVA, non CARICO… per sempre', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(apriSettimanaCorrente).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(apriSettimanaCorrente).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    await screen.findByText('CARICO…');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(await screen.findByText('Non riusciamo a caricare la giornata.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri la lista' })).toHaveAttribute('href', '/lista');
  });

  it('dopo uno scambio, la rilettura è superata da un ritorno in primo piano che fallisce: l\'errore, non il poster di prima', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    render(<Oggi />);
    const scambia = await screen.findByRole('button', { name: 'Scambia con Frittata di patate' });
    // La rilettura dopo lo scambio non risponde mai; quella del ritorno in primo piano la supera e fallisce.
    vi.mocked(apriSettimanaCorrente).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(apriSettimanaCorrente).mockRejectedValue(new Error('rete'));
    fireEvent.click(scambia);
    await waitFor(() => expect(apriSettimanaCorrente).toHaveBeenCalledTimes(2));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(await screen.findByText('Non riusciamo a caricare la giornata.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scambia con Frittata di patate' })).toBeNull();
  });

  it('durante una scrittura del foglio, SCAMBIA e COM\'È ANDATA sono spenti; a scrittura finita si riaccendono', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    let finisci!: () => void;
    vi.mocked(aggiornaSlot).mockReturnValueOnce(new Promise<void>((ok) => { finisci = ok; }));
    render(<Oggi />);
    fireEvent.click(await screen.findByRole('button', { name: "Com'è andata" }));
    const foglio = await screen.findByRole('dialog', { name: "Com'è andata: Cena" });
    fireEvent.click(within(foglio).getByText('Saltato'));
    await waitFor(() => expect(aggiornaSlot).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Scambia con Frittata di patate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Com'è andata" })).toBeDisabled();
    finisci();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scambia con Frittata di patate' })).toBeEnabled());
    expect(screen.getByRole('button', { name: "Com'è andata" })).toBeEnabled();
  });

  it('scrittura del foglio fallita: il messaggio sotto il poster, e SCAMBIA torna acceso', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    vi.mocked(aggiornaSlot).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    fireEvent.click(await screen.findByRole('button', { name: "Com'è andata" }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: "Com'è andata: Cena" })).getByText('Saltato'));
    expect(await screen.findByText('Non siamo riusciti a salvare il cambiamento. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scambia con Frittata di patate' })).toBeEnabled();
    expect(screen.getByRole('button', { name: "Com'è andata" })).toBeEnabled();
  });

  it('l\'annullo sopravvive a una nuova apertura della home (sessionStorage), non a un altro pasto', async () => {
    window.sessionStorage.setItem('spesa:oggi-piano-prima', JSON.stringify({ slotId: 's-cen', dishId: 'd-polpette', scelte: {} }));
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(settimana('confermata', 'd-frittata'));
    const { unmount } = render(<Oggi />);
    expect(await screen.findByRole('button', { name: 'Rimetti quello del piano' })).toBeInTheDocument();
    unmount();

    // La cena è finita: il poster passa al dopocena e l'annotazione della cena si cancella.
    vi.setSystemTime(new Date(2026, 9, 3, 21, 45));
    render(<Oggi />);
    await screen.findByRole('heading', { name: 'Due quadretti di fondente' });
    expect(screen.queryByRole('button', { name: 'Rimetti quello del piano' })).toBeNull();
    expect(window.sessionStorage.getItem('spesa:oggi-piano-prima')).toBeNull();
  });

  it('se il piatto del poster è già quello annotato, niente RIMETTI e l\'annotazione si cancella', async () => {
    window.sessionStorage.setItem('spesa:oggi-piano-prima', JSON.stringify({ slotId: 's-cen', dishId: 'd-polpette', scelte: {} }));
    render(<Oggi />);
    await screen.findByRole('heading', { name: 'Polpette di ceci' });
    expect(screen.queryByRole('button', { name: 'Rimetti quello del piano' })).toBeNull();
    expect(window.sessionStorage.getItem('spesa:oggi-piano-prima')).toBeNull();
  });

  // ── Review finale ─────────────────────────────────────────────────────────────────────────

  it('uno slot con porzioni da preparare: niente banda, perché lo scambio cancellerebbe il meal prep (I1)', async () => {
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    // Controprova: stessa giornata senza porzioni da preparare, la banda c'è.
    const { unmount } = render(<Oggi />);
    expect(await screen.findByText('Oppure, con quello che hai')).toBeInTheDocument();
    unmount();

    const conPorzioni = settimana('confermata');
    conPorzioni.slots = conPorzioni.slots.map((s) => (s.id === 's-cen' ? { ...s, porzioniPreparate: 1 } : s));
    vi.mocked(apriSettimanaCorrente).mockResolvedValue(conPorzioni);
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Scambia con/ })).toBeNull();
    // Il cambio deliberato resta: CAMBIA porta a Scegli.
    expect(screen.getByRole('link', { name: 'Cambia' })).toHaveAttribute('href', `/piano/${OGGI}/cen/scegli?da=oggi`);
  });

  it('l\'ultima chiusura che non si legge: niente tessera tratteggiata (il suo testo sarebbe falso), niente banda (M1)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiUltimaChiusura).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(screen.queryByText(/Chiudi la prima spesa/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Apri la lista' })).toBeNull();
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
    // Il resto della giornata regge: la tessera «Poi» c'è.
    expect(screen.getByText('Due quadretti di fondente')).toBeInTheDocument();
    expect(log).toHaveBeenCalled();
  });

  it('la dispensa che non si legge con una chiusura recente: niente banda calcolata su una dispensa vuota (M1)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiUltimaChiusura).mockResolvedValue('2026-10-01');
    // Con la dispensa letta male (vuota) le patate al forno «mancherebbero» la patata: una proposta falsa.
    const patate = piatto('d-patate', 'Patate al forno', 'cen', [[PATATA, 200]]);
    vi.mocked(leggiRepertorio).mockResolvedValue([POLPETTE, FRITTATA, FONDENTE, PASTA, patate]);
    vi.mocked(leggiDispensa).mockRejectedValue(new Error('rete'));
    render(<Oggi />);
    expect(await screen.findByRole('heading', { name: 'Polpette di ceci' })).toBeInTheDocument();
    expect(screen.queryByText('Oppure, con quello che hai')).toBeNull();
    expect(screen.queryByText(/Chiudi la prima spesa/)).toBeNull();
    expect(log).toHaveBeenCalled();
  });

  it('la settimana e le altre letture partono insieme: una settimana lenta non ritarda le altre (M5)', async () => {
    vi.mocked(apriSettimanaCorrente).mockReturnValue(new Promise(() => {}));
    render(<Oggi />);
    await screen.findByText('CARICO…');
    for (const lettura of [leggiSlotDefs, leggiRepertorio, leggiIngredienti, leggiImpostazioni, leggiPronti, leggiDispensa, leggiUltimaChiusura]) {
      expect(lettura).toHaveBeenCalled();
    }
  });
});
