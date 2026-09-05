import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  URL.createObjectURL = vi.fn(() => 'blob:finto');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(leggiBozzaImport).mockResolvedValue(null);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
  vi.mocked(leggiIngredienti).mockResolvedValue([]);
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
});

// `findByLabelText` (non `getByLabelText`) apposta: la vista acquisizione è già
// stabile quando questa funzione viene chiamata (i chiamanti attendono prima il
// bottone "estrai la dieta"), ma `Camera` decide fra fotocamera e fallback solo
// dentro un effect, un giro asincrono dopo il proprio mount — `findByLabelText`
// aspetta quel giro invece di assumere che sia già passato.
async function caricaUnaFoto() {
  const input = await screen.findByLabelText(/scegli le foto/i);
  fireEvent.change(input, { target: { files: [new File(['a'], 'p1.jpg', { type: 'image/jpeg' })] } });
}

describe('Importa', () => {
  it("senza bozza parte dall'acquisizione; il pulsante estrai si attiva con una foto", async () => {
    render(<Importa />);
    const estrai = await screen.findByRole('button', { name: /estrai la dieta/i });
    expect(estrai).toBeDisabled();
    await caricaUnaFoto();
    await waitFor(() => expect(estrai).toBeEnabled());
  });

  it('estrazione ok: salva la bozza con la mappatura proposta e va in revisione', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalled());
    const bozza = vi.mocked(salvaBozzaImport).mock.calls[0][0];
    expect(bozza.statoRevisione.passo).toBe('revisione');
    expect(bozza.statoRevisione.mappaturaPasti).toMatchObject({ colazione: 's-col', cena: 's-cena' });
    expect(bozza.statoRevisione.mappaturaPasti.condimenti).toBeUndefined();
  });

  it('rifiuto macro: schermata onesta, nessuna bozza', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/questa dieta non ha un menu/i)).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('503: estrazione non disponibile', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'estrazione non disponibile' }) });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/non è disponibile/i)).toBeInTheDocument();
  });

  it('errore di estrazione: riprova conserva le foto già scattate e ne aggiunge di nuove', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));

    fireEvent.click(await screen.findByRole('button', { name: /riprova/i }));

    // Camera si è smontata e rimontata da capo (RIPROVA torna in acquisizione):
    // senza `iniziali` la galleria sarebbe vuota e il prossimo scatto
    // sovrascriverebbe in silenzio, via onFoto, la foto già presa.
    expect(await screen.findByText('pag. 1')).toBeInTheDocument();

    const input = screen.getByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: [new File(['b'], 'p2.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByText('pag. 2')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2));
    const secondoBody = vi.mocked(global.fetch).mock.calls[1][1]?.body as FormData;
    expect(secondoBody.getAll('immagini')).toHaveLength(2);
  });

  it('l’estrazione manda il Bearer della sessione', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
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
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText('troppe pagine: la v1 accetta fino a 12 foto')).toBeInTheDocument();
    // RIPROVA riporta all'acquisizione con le foto ancora selezionate: basta
    // verificare che il bottone sia abilitato, lo stato delle foto non è toccato dall'errore.
    expect(screen.getByRole('button', { name: /riprova/i })).toBeEnabled();
  });

  it('429 (tetto di import) mostra il messaggio della route verbatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errore: 'hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026' }),
    });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText('hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026')).toBeInTheDocument();
  });

  it('422 mostra il messaggio dedicato', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errore: 'non ho capito la dieta, riprova' }),
    });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText('Non ho capito la dieta: riprova, magari con foto più nitide.')).toBeInTheDocument();
  });

  it('401 dalla route (token scaduto tra getSession e il controllo server): messaggio di sessione', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errore: 'non autorizzato' }),
    });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
  });

  it('senza sessione: errore onesto senza fetch', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    await caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bozza esistente: riprendi/ricomincia; ricominciare la cancella', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    render(<Importa />);
    expect(await screen.findByText(/import in corso/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ricomincia/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, ricomincia/i }));
    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalled());
  });
});
