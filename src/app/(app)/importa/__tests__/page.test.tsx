import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('@/data/importa', () => ({ leggiBozzaImport: vi.fn(), salvaBozzaImport: vi.fn(), cancellaBozzaImport: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
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
});

function caricaUnaFoto() {
  const input = screen.getByLabelText(/scegli le foto/i);
  fireEvent.change(input, { target: { files: [new File(['a'], 'p1.jpg', { type: 'image/jpeg' })] } });
}

describe('Importa', () => {
  it("senza bozza parte dall'acquisizione; il pulsante estrai si attiva con una foto", async () => {
    render(<Importa />);
    const estrai = await screen.findByRole('button', { name: /estrai la dieta/i });
    expect(estrai).toBeDisabled();
    caricaUnaFoto();
    await waitFor(() => expect(estrai).toBeEnabled());
  });

  it('estrazione ok: salva la bozza con la mappatura proposta e va in revisione', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    caricaUnaFoto();
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
    caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/questa dieta non ha un menu/i)).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('503: estrazione non disponibile', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'estrazione non disponibile' }) });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/non è disponibile/i)).toBeInTheDocument();
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
