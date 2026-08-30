import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/data/dispensa', () => ({ correggiResiduo: vi.fn(), impostaCongelato: vi.fn() }));
vi.mock('@/data/supabase', () => ({
  client: () => ({ auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } }),
}));

import { correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { NotaDispensa } from '../NotaDispensa';

const CONTESTO = [
  { id: 'i-riso', nome: 'Riso', unitaBase: 'g' as const, formatoConfezione: 1000, residuo: 400, congelato: false },
];

function rispostaOk(esito: unknown) {
  return { ok: true, status: 200, json: async () => esito };
}

describe('NotaDispensa', () => {
  const onDatiCambiati = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(correggiResiduo).mockResolvedValue(undefined);
    vi.mocked(impostaCongelato).mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  function invia(nota: string) {
    render(<NotaDispensa contesto={CONTESTO} onDatiCambiati={onDatiCambiati} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: nota } });
    fireEvent.click(screen.getByRole('button', { name: 'Correggi' }));
  }

  it('una proposta sopra soglia si applica subito e finisce fra le APPLICATE con Annulla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({
      proposte: [{ ingredientId: 'i-riso', campo: 'residuo', valoreNuovo: 0, valoreAttuale: 400, confidence: 0.95, motivazione: '«finito il riso» → 0 g' }],
      nonRiconosciuti: [],
    })));

    invia('finito il riso');

    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-riso', 0));
    expect(onDatiCambiati).toHaveBeenCalled();
    expect(screen.getByText('APPLICATE')).toBeInTheDocument();
    expect(screen.getByText(/Riso/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-riso', 400));
  });

  it('una proposta sotto soglia NON si applica finché non la confermi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({
      proposte: [{ ingredientId: 'i-riso', campo: 'residuo', valoreNuovo: 500, valoreAttuale: 400, confidence: 0.7, motivazione: '«il riso è a metà» → 500 g' }],
      nonRiconosciuti: [],
    })));

    invia('il riso è a metà');

    await screen.findByText('DA CONFERMARE');
    expect(correggiResiduo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));
    await waitFor(() => expect(correggiResiduo).toHaveBeenCalledWith('i-riso', 500));
  });

  it('i non riconosciuti sono elencati', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaOk({ proposte: [], nonRiconosciuti: ['la quinoa'] })));
    invia('ho comprato la quinoa');
    await screen.findByText('NON RICONOSCIUTI');
    expect(screen.getByText(/la quinoa/)).toBeInTheDocument();
  });

  it('503 → messaggio dedicato e nota preservata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'correzione non disponibile' }) }));
    invia('finito il riso');
    await screen.findByText('La correzione non è disponibile.');
    expect(screen.getByRole('textbox')).toHaveValue('finito il riso');
  });

  it('la fetch porta il Bearer della sessione', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rispostaOk({ proposte: [], nonRiconosciuti: [] }));
    vi.stubGlobal('fetch', fetchMock);
    invia('x');
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('senza SpeechRecognition il microfono non c\'è', () => {
    render(<NotaDispensa contesto={CONTESTO} onDatiCambiati={onDatiCambiati} />);
    expect(screen.queryByRole('button', { name: 'Detta la nota' })).not.toBeInTheDocument();
  });
});
