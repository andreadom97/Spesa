import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import type { ReactNode } from 'react';
vi.mock('@/data/importa', () => ({
  leggiBozzaImport: vi.fn(),
  salvaBozzaImport: vi.fn(),
  cancellaBozzaImport: vi.fn(),
  eseguiScritture: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
// `getSessionMock` reconfigurabile per test (lo stesso di widget-ai.test.tsx):
// di default risolve una sessione con token 'tok' (vedi beforeEach sotto), e il solo test
// "senza sessione" la sovrascrive per restituire `session: null`.
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('@/data/supabase', () => ({
  client: () => ({ auth: { getSession: getSessionMock } }),
}));
// La Cornice usa useRouter per la pillola indietro (spec fase 5 §G.3): fuori da un App Router
// lancia. vi.hoisted: la stessa `push`/`replace` a ogni chiamata di useRouter.
const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, back: vi.fn() }) }));
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { SlotDockProvider } from '@/components/dock-slot';
import { salvaOrigine } from '@/components/pannello/indirizzi';
import Importa from '../page';

// `FIXTURE_MENU_SETTIMANALE.piano` esiste solo sul ramo `tipo: 'piano'` del tipo unione
// `EsitoEstrazione`: qui si sa (è il fixture giusto) che quel ramo è quello vero, quindi si
// estrae con un cast esplicito invece di un `!` che non basterebbe a zittire TS (la proprietà
// non esiste affatto sull'altro ramo dell'unione, non è solo possibilmente null).
const PIANO = (FIXTURE_MENU_SETTIMANALE as { piano: PianoEstratto }).piano;

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];

// Il Dock si monta con un portale nello slot che il `Guscio` renderizza: qui la
// pagina è montata da sola, e lo slot glielo dà `rendi()` (stesso schema dei test
// di Lista e Piano). Con `render` nudo `ESTRAI LA DIETA` non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Importa />) {
  return render(<SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  push.mockClear();
  replace.mockClear();
  sessionStorage.clear();
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:finto-${++n}`);
  URL.revokeObjectURL = vi.fn();
  // Camera ricomprime ogni foto scelta (createImageBitmap → canvas → jpeg):
  // jsdom non sa fare nessuno dei tre passaggi, senza questi mock i file
  // sarebbero scartati come illeggibili e nessuna foto arriverebbe alla pagina.
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) {
    cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
  });
  // La cronologia (spec §G): `pushState` resta quello di jsdom, osservato; `back`
  // emette subito il `popstate` che il browser emetterebbe tornando indietro,
  // così i test non dipendono dai tempi della navigazione di jsdom.
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  // L'orologio della pagina: quello vero più uno scarto che `passaUnAttimo` sposta avanti.
  avanti = 0;
  const vero = performance.now.bind(performance);
  vi.spyOn(performance, 'now').mockImplementation(() => vero() + avanti);
  vi.mocked(leggiBozzaImport).mockResolvedValue(null);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
  vi.mocked(leggiIngredienti).mockResolvedValue([]);
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
});

afterEach(() => {
  vi.mocked(performance.now).mockRestore();
  vi.mocked(window.history.back).mockRestore();
  vi.mocked(window.history.pushState).mockRestore();
  slotDock.remove();
});

let avanti = 0;

/**
 * Chiusa la fotocamera, la pagina scarta i click per qualche centinaio di ms: è la difesa
 * dal doppio tocco sul tondo indietro. Qui i click arrivano a pochi ms l'uno dall'altro,
 * quindi un test che simula un tocco nuovo, non il secondo di un doppio tocco, prima
 * sposta avanti di un secondo l'orologio della pagina.
 */
function passaUnAttimo() {
  avanti += 1000;
}

/** Apre la fotocamera dalle porte e prende un foglio dalla galleria. */
async function apriEPrendiUnFoglio(nome = 'p1.jpg') {
  fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
  const input = await screen.findByLabelText(/scegli le foto/i);
  fireEvent.change(input, { target: { files: [new File(['a'], nome, { type: 'image/jpeg' })] } });
  await screen.findByRole('button', { name: 'Ho finito' });
}

/** Un foglio e `Ho finito`: il percorso di invio delle foto. */
async function inviaUnaFoto() {
  await apriEPrendiUnFoglio();
  fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
}

function sceglieUnPdf() {
  const input = screen.getByLabelText('scegli il PDF della dieta');
  const file = new File(['%PDF'], 'dieta-settembre.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('Importa: la scelta', () => {
  it('senza bozza parte dalle due porte: niente selettore, niente Dock', async () => {
    rendi();
    expect(await screen.findByText('Fotografa i fogli')).toBeInTheDocument();
    expect(screen.getByText('Carica il PDF')).toBeInTheDocument();
    expect(screen.getByText('Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli da lì.')).toBeInTheDocument();
    expect(screen.getByText("Se la dieta ti è arrivata in PDF, caricalo così com'è.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'FOTO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /estrai la dieta/i })).not.toBeInTheDocument();
  });

  it('APRI LA FOTOCAMERA aggiunge una voce alla cronologia e apre la fotocamera senza testata', async () => {
    rendi();
    fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Fotografa il piano' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Importa' })).not.toBeInTheDocument();
  });

  it('il tondo indietro torna alle porte passando dalla cronologia, e i fogli restano', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
    passaUnAttimo();
    fireEvent.click(screen.getByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();
  });

  it('il gesto indietro del telefono (un popstate) chiude la fotocamera', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fotografa il piano' })).not.toBeInTheDocument();
  });

  it('un doppio tocco sul tondo indietro consuma una voce sola', async () => {
    // Nel browser il `popstate` arriva dopo `back()`, non dentro: qui `back` non lo
    // emette, così fra i due tocchi la fotocamera resta montata come sul telefono.
    vi.mocked(window.history.back).mockImplementation(() => {});
    rendi();
    await apriEPrendiUnFoglio();
    const indietro = screen.getByRole('button', { name: 'Indietro' });
    fireEvent.click(indietro);
    fireEvent.click(indietro);
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it('il secondo tocco di un doppio tocco sul tondo non esce dalla pillola della testata', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    // `back` emette il `popstate` dentro la chiamata: la fotocamera si chiude e le
    // porte, con la testata, sono già a schermo al tocco successivo.
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    const pillola = screen.getByRole('button', { name: 'Torna alle impostazioni' });
    // `fireEvent.click` restituisce false quando il click è stato annullato.
    expect(fireEvent.click(pillola)).toBe(false);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    // Passata la finestra, lo stesso click non è più annullato ed esce.
    passaUnAttimo();
    expect(fireEvent.click(pillola)).toBe(true);
    expect(replace).toHaveBeenCalledWith('/lista?impostazioni=cima');
  });

  it('la pillola IMPOSTAZIONI riapre il pannello sopra la pagina d\'origine (spec fase 5 §G.3)', async () => {
    salvaOrigine({ pathname: '/piano', sotto: 'cima' });
    rendi();
    const pillola = await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(pillola).toHaveTextContent('IMPOSTAZIONI');
    fireEvent.click(pillola);
    expect(replace).toHaveBeenCalledWith('/piano?impostazioni=cima');
  });

  it('i fogli presi con la fotocamera non accendono il Dock, senza un PDF', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });

  it('scelto un PDF: il nome del file, Cambia file, e ESTRAI LA DIETA nel Dock', async () => {
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    expect(await screen.findByText('dieta-settembre.pdf')).toBeInTheDocument();
    expect(screen.getByText('Cambia file')).toBeInTheDocument();
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(dock).toContainElement(screen.getByRole('button', { name: 'ESTRAI LA DIETA' }));
  });

  it('le porte: titolo «Importa» e la pillola del passo 1', async () => {
    rendi();
    expect(await screen.findByRole('heading', { name: 'Importa', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Passo 1 di 4 · I fogli')).toBeInTheDocument();
  });

  it('la ripresa non ha la pillola del passo; ripresa la bozza, Controlla ha quella del passo 2', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    rendi();
    expect(await screen.findByRole('heading', { name: 'Hai un import in corso' })).toBeInTheDocument();
    expect(screen.queryByText(/^Passo /)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'RIPRENDI' }));
    expect(await screen.findByText('Passo 2 di 4 · Controlla')).toBeInTheDocument();
  });
});

describe('Importa: l\'invio', () => {
  it('Ho finito: estrae, salva la bozza con la mappatura proposta e consuma la voce di cronologia', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    rendi();
    await inviaUnaFoto();
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalled());
    expect(window.history.back).toHaveBeenCalledTimes(1);
    const bozza = vi.mocked(salvaBozzaImport).mock.calls[0][0];
    expect(bozza.statoRevisione.passo).toBe('revisione');
    expect(bozza.statoRevisione.mappaturaPasti).toMatchObject({ colazione: 's-col', cena: 's-cena' });
    expect(bozza.statoRevisione.mappaturaPasti.condimenti).toBeUndefined();
  });

  it('un doppio tocco su Ho finito parte una volta sola: un invio, una voce consumata', async () => {
    // Come per il tondo indietro, il `popstate` qui non arriva dentro `back()`: la sola
    // cosa che può togliere di mezzo `Ho finito` fra i due tocchi è il cambio di vista.
    vi.mocked(window.history.back).mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    rendi();
    await apriEPrendiUnFoglio();
    const hoFinito = screen.getByRole('button', { name: 'Ho finito' });
    fireEvent.click(hoFinito);
    fireEvent.click(hoFinito);
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it('Ho finito manda solo le immagini, anche con un PDF già scelto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    await inviaUnaFoto();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.getAll('immagini')).toHaveLength(1);
    expect(body.get('documento')).toBeNull();
  });

  it('ESTRAI LA DIETA manda solo il PDF, anche con dei fogli già presi', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await apriEPrendiUnFoglio();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    passaUnAttimo();
    fireEvent.click(await screen.findByRole('button', { name: 'ESTRAI LA DIETA' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    // Il nome e non l'identità: il FormData di jsdom può restituire un File nuovo.
    expect((body.get('documento') as File | null)?.name).toBe('dieta-settembre.pdf');
    expect(body.getAll('immagini')).toHaveLength(0);
  });

  it('rifiuto macro: schermata onesta, nessuna bozza', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText(/questa dieta non ha un menu/i)).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('rifiuto macro: PROVA UN ALTRO FILE nel Dock torna alle porte, senza PDF né fogli', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    rendi();
    await inviaUnaFoto();
    await screen.findByRole('heading', { name: 'Questa dieta non ha un menu' });
    expect(screen.queryByRole('button', { name: 'TORNA A IMPOSTAZIONI' })).toBeNull();
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    passaUnAttimo();
    fireEvent.click(within(dock).getByRole('button', { name: 'PROVA UN ALTRO FILE' }));
    // Le porte, e i fogli presi non ci sono più: la fotocamera riparte vuota.
    fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(screen.queryByRole('button', { name: /Rivedi/ })).toBeNull();
  });

  it('rifiuto dopo un PDF: PROVA UN ALTRO FILE torna alle porte senza il file scelto', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    await screen.findByText('dieta-settembre.pdf');
    fireEvent.click(within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'ESTRAI LA DIETA' }));
    await screen.findByRole('heading', { name: 'Questa dieta non ha un menu' });

    fireEvent.click(within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'PROVA UN ALTRO FILE' }));
    expect(await screen.findByText('Carica il PDF')).toBeInTheDocument();
    expect(screen.queryByText('dieta-settembre.pdf')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ESTRAI LA DIETA' })).toBeNull();
  });

  it('errore dopo un PDF: RIPROVA torna alle porte col file ancora scelto', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    await screen.findByText('dieta-settembre.pdf');
    fireEvent.click(within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'ESTRAI LA DIETA' }));
    await screen.findByRole('heading', { name: 'La lettura si è fermata' });

    fireEvent.click(within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByText('dieta-settembre.pdf')).toBeInTheDocument();
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(dock).toContainElement(screen.getByRole('button', { name: 'ESTRAI LA DIETA' }));
  });

  it('503: estrazione non disponibile', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'estrazione non disponibile' }) });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText(/non è disponibile/i)).toBeInTheDocument();
  });

  it('errore di estrazione: riprova torna alle porte, e i fogli già presi restano e se ne aggiungono', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    rendi();
    await inviaUnaFoto();

    // Anche `Ho finito` chiude la fotocamera: nel telefono l'estrazione dura secondi.
    await screen.findByRole('heading', { name: 'La lettura si è fermata' });
    const riprova = within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'RIPROVA' });
    passaUnAttimo();
    fireEvent.click(riprova);

    // RIPROVA torna alle porte, con la fotocamera chiusa. Riaprendola, Camera
    // si rimonta da capo: senza `iniziali` la galleria sarebbe vuota e il
    // prossimo foglio sovrascriverebbe in silenzio, via onFoto, quello già preso.
    fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();

    const input = screen.getByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: [new File(['b'], 'p2.jpg', { type: 'image/jpeg' })] } });
    await screen.findByRole('button', { name: 'Rivedi i 2 fogli presi' });

    fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2));
    const secondoBody = vi.mocked(global.fetch).mock.calls[1][1]?.body as FormData;
    expect(secondoBody.getAll('immagini')).toHaveLength(2);
  });

  it('l’estrazione manda il Bearer della sessione', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await inviaUnaFoto();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('bozzaSalvata dal server: il telefono non la riscrive, e si apre Controlla (spec 8c §E)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...FIXTURE_MENU_SETTIMANALE, bozzaSalvata: true }) });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Passo 2 di 4 · Controlla')).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('bozzaSalvata false: il telefono salva come prima', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...FIXTURE_MENU_SETTIMANALE, bozzaSalvata: false }) });
    rendi();
    await inviaUnaFoto();
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalledTimes(1));
  });

  it('la risposta si perde ma la bozza è sul server: si apre la ripresa (spec 8c §K.1)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.mocked(leggiBozzaImport).mockResolvedValueOnce(null).mockResolvedValueOnce({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByRole('heading', { name: 'Hai un import in corso' })).toBeInTheDocument();
    vi.mocked(console.error).mockRestore();
  });

  it('413 mostra il messaggio della route e non perde le foto', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ errore: 'troppe pagine: la v1 accetta fino a 12 foto' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('troppe pagine: la v1 accetta fino a 12 foto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /riprova/i })).toBeEnabled();
  });

  it('429 (tetto di import) mostra il messaggio della route verbatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errore: 'hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026')).toBeInTheDocument();
  });

  it('400 col messaggio della route (PDF illeggibile) lo mostra verbatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ errore: 'il PDF non si apre: prova con le foto' }),
    });
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    fireEvent.click(await screen.findByRole('button', { name: 'ESTRAI LA DIETA' }));
    expect(await screen.findByText('il PDF non si apre: prova con le foto')).toBeInTheDocument();
  });

  it('400 senza corpo leggibile: messaggio generico', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => { throw new Error('non JSON'); } });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Non siamo riusciti a leggere la dieta. Riprova.')).toBeInTheDocument();
  });

  it('422 mostra il messaggio dedicato', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errore: 'non ho capito la dieta, riprova' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Non ho capito la dieta: riprova, magari con foto più nitide.')).toBeInTheDocument();
  });

  it('401 dalla route (token scaduto tra getSession e il controllo server): messaggio di sessione', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errore: 'non autorizzato' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
  });

  it('senza sessione: errore onesto senza fetch', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bozza esistente: RIPRENDI nel Dock, RICOMINCIA nella scheda; ricominciare passa dal dialogo', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    vi.mocked(cancellaBozzaImport).mockResolvedValue(undefined);
    rendi();
    expect(await screen.findByRole('heading', { name: 'Hai un import in corso' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'RIPRENDI' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RICOMINCIA' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Ricominciare da capo?' });
    expect(window.history.pushState).toHaveBeenCalled(); // la voce del dialogo
    expect(cancellaBozzaImport).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'RICOMINCIA' }));
    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
  });

  it('confermato RICOMINCIA, mentre la cancellazione è in volo RIPRENDI non c\'è più', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    // La cancellazione resta in sospeso finché il test non la risolve: un RIPRENDI toccato in
    // questa finestra riaprirebbe una bozza che sta per sparire.
    let finisciCancellazione: () => void = () => {};
    vi.mocked(cancellaBozzaImport).mockReturnValue(new Promise<void>((r) => { finisciCancellazione = r; }));
    rendi();
    fireEvent.click(await screen.findByRole('button', { name: 'RICOMINCIA' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Ricominciare da capo?' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RICOMINCIA' }));

    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'RIPRENDI' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Hai un import in corso' })).toBeNull();

    finisciCancellazione();
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
  });

  it('ANNULLA chiude il dialogo di Ricominciare senza cancellare, e il tocco dopo non si perde', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    rendi();
    fireEvent.click(await screen.findByRole('button', { name: 'RICOMINCIA' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Ricominciare da capo?' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    // Il go(-1) dell'hook: in jsdom il popstate va mandato a mano.
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(cancellaBozzaImport).not.toHaveBeenCalled();

    // Niente `passaUnAttimo()`: con la fotocamera chiusa il popstate non scarta i tocchi.
    fireEvent.click(screen.getByRole('button', { name: 'RIPRENDI' }));
    // Controlla si è aperto: CONFERMA I PASTI nel Dock.
    expect(await screen.findByRole('button', { name: 'CONFERMA I PASTI' })).toBeInTheDocument();
  });

  it('attesa: il titolo luccica, dice che chiudere l\'app perde la lettura, niente Dock', async () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    rendi();
    await inviaUnaFoto();
    const stato = await screen.findByRole('status');
    expect(within(stato).getByRole('heading', { name: 'Sto leggendo la dieta…' })).toHaveClass('anim-luce-testo');
    expect(within(stato).getByText('Se chiudi l\'app prima che abbia finito, la lettura si perde.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });
});

describe('Importa: l\'indietro per passi (spec 8c §F)', () => {
  const STATO_REVISIONE: StatoRevisione = {
    passo: 'revisione', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
  };
  const indietro = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });

  beforeEach(() => {
    // Il browser manda il popstate di un go(); qui subito, così i tempi non contano.
    vi.spyOn(window.history, 'go').mockImplementation(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    // aggiornaStatoRevisione fa `salvaBozzaImport(…).catch(…)`: serve una promessa.
    vi.mocked(salvaBozzaImport).mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.mocked(window.history.go).mockRestore();
  });

  async function riprendi(stato: StatoRevisione, piano: PianoEstratto = PIANO) {
    vi.mocked(leggiBozzaImport).mockResolvedValue({ piano, statoRevisione: stato });
    rendi();
    fireEvent.click(await screen.findByRole('button', { name: 'RIPRENDI' }));
  }

  it('Controlla ha la sua voce: l\'indietro apre «Esci dall\'import?», RESTA lo chiude e si resta in Controlla', async () => {
    await riprendi(STATO_REVISIONE);
    await screen.findByText('Passo 2 di 4 · Controlla');
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    indietro();
    const dialogo = await screen.findByRole('alertdialog', { name: "Esci dall'import?" });
    expect(within(dialogo).getByText("Lo ritrovi com'è: riprendi quando vuoi.")).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'ESCI' }).style.background).toBe('var(--ink)');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RESTA' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText('Passo 2 di 4 · Controlla')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  // Correzione 8c-bis (prove dal telefono del 03/10): su Chrome Android i `pushState` fatti dentro
  // la reazione a un `popstate`, senza un tocco dell'utente, marcano le voci «da saltare» e l'indietro
  // successivo esce dall'app. Col dialogo aperto da un indietro la profondità chiesta è 0: i push
  // partono solo al tocco su RESTA.
  it("l'indietro che apre «Esci dall'import?» non spinge voci; RESTA ne spinge una sola, e l'indietro dopo riapre il dialogo", async () => {
    await riprendi(STATO_REVISIONE);
    await screen.findByText('Passo 2 di 4 · Controlla');
    expect(window.history.pushState).toHaveBeenCalledTimes(1); // la voce del passo
    indietro();
    const dialogo = await screen.findByRole('alertdialog', { name: "Esci dall'import?" });
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RESTA' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(window.history.pushState).toHaveBeenCalledTimes(2); // la voce del passo che torna
    expect(window.history.go).not.toHaveBeenCalled();
    indietro();
    expect(await screen.findByRole('alertdialog', { name: "Esci dall'import?" })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('ESCI torna alla pagina di provenienza: col dialogo aperto non ci sono voci da consumare', async () => {
    await riprendi(STATO_REVISIONE);
    await screen.findByText('Passo 2 di 4 · Controlla');
    indietro();
    fireEvent.click(within(await screen.findByRole('alertdialog', { name: "Esci dall'import?" })).getByRole('button', { name: 'ESCI' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(window.history.go).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('la pillola della testata, senza dialogo, consuma la voce del passo e poi esce', async () => {
    await riprendi(STATO_REVISIONE);
    await screen.findByText('Passo 2 di 4 · Controlla');
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(window.history.go).toHaveBeenCalledWith(-1);
  });

  it('da Ingredienti l\'indietro torna a Controlla e salva lo stato', async () => {
    await riprendi({ ...STATO_REVISIONE, passo: 'formati' });
    await screen.findByText('Passo 3 di 4 · Ingredienti');
    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    indietro();
    expect(await screen.findByText('Passo 2 di 4 · Controlla')).toBeInTheDocument();
    expect(vi.mocked(salvaBozzaImport).mock.calls.at(-1)![0].statoRevisione.passo).toBe('revisione');
  });

  it('da Riepilogo l\'indietro torna a Ingredienti', async () => {
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    await riprendi({ ...STATO_REVISIONE, passo: 'riepilogo' });
    await screen.findByText('Passo 4 di 4 · Riepilogo');
    expect(window.history.pushState).toHaveBeenCalledTimes(3);
    indietro();
    expect(await screen.findByText('Passo 3 di 4 · Ingredienti')).toBeInTheDocument();
  });

  it('KO 7: dopo TOGLI l\'indietro resta in Importa e apre «Esci dall\'import?»', async () => {
    const giorno = (g: number) => ({
      giorno: g, titolo: null,
      pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Insalata', descrizione: null, componenti: [], righeFisse: [
        { alimento: 'tonno al naturale', quantita: 80, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'tonno 80g' },
        { alimento: 'olive taggiasche', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olive' },
      ] }] }],
    });
    const piano: PianoEstratto = { archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [], settimane: [{ numero: 1, giorni: [0, 1, 2].map(giorno) }] };
    await riprendi({ ...STATO_REVISIONE, mappaturaPasti: { cena: 's-cena' } }, piano);
    fireEvent.click(await screen.findByRole('button', { name: 'Togli olive taggiasche' }));
    const togli = await screen.findByRole('alertdialog', { name: 'Togliere olive taggiasche da 3 pasti?' });
    fireEvent.click(within(togli).getByRole('button', { name: 'TOGLI' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    indietro();
    expect(await screen.findByRole('alertdialog', { name: "Esci dall'import?" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
