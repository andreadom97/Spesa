import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
vi.mock('@/data/importa', () => ({
  leggiBozzaImport: vi.fn(),
  salvaBozzaImport: vi.fn(),
  cancellaBozzaImport: vi.fn(),
  eseguiScritture: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
// `getSessionMock` reconfigurabile per test (pattern copiato da NotaDispensa.test.tsx):
// di default risolve una sessione con token 'tok' (vedi beforeEach sotto), e il solo test
// "senza sessione" la sovrascrive per restituire `session: null`.
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('@/data/supabase', () => ({
  client: () => ({ auth: { getSession: getSessionMock } }),
}));
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti } from '@/data/repertorio';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import type { PianoEstratto } from '@/domain/import/types';
import { SlotDockProvider } from '@/components/dock-slot';
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
    expect(screen.queryByRole('heading', { name: 'Importa la dieta' })).not.toBeInTheDocument();
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

  it('il secondo tocco di un doppio tocco sul tondo non esce dalla freccia della testata', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    // `back` emette il `popstate` dentro la chiamata: la fotocamera si chiude e le
    // porte, con la testata, sono già a schermo al tocco successivo.
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    const freccia = screen.getByRole('link', { name: 'Indietro' });
    // `fireEvent.click` restituisce false quando il click è stato annullato.
    expect(fireEvent.click(freccia)).toBe(false);
    // Passata la finestra, lo stesso click non è più annullato.
    passaUnAttimo();
    expect(fireEvent.click(freccia)).toBe(true);
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
    const riprova = await screen.findByRole('button', { name: /riprova/i });
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

  it('bozza esistente: riprendi/ricomincia; ricominciare la cancella', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    rendi();
    expect(await screen.findByText(/import in corso/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ricomincia/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, ricomincia/i }));
    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalled());
  });
});
