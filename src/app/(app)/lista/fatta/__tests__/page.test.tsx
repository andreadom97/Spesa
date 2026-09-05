import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ListaSalvata } from '@/data/lista';
import type { VoceEvitata } from '@/domain/list-builder';

vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));
vi.mock('@/data/lista', () => ({
  leggiListe: vi.fn(),
  chiudiSpesa: vi.fn(),
}));
vi.mock('@/data/risparmio', () => ({
  leggiRisparmioSettimana: vi.fn(),
}));

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
}));

import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, chiudiSpesa } from '@/data/lista';
import { leggiRisparmioSettimana } from '@/data/risparmio';
import ListaFatta from '../page';

const SETTIMANA = { id: 'week-1', dataInizio: '2026-08-24', stato: 'confermata' as const, slots: [] };

/** Una lista davvero finita: ogni voce spuntata, nessun controllo in sospeso. */
function listaFinita(): ListaSalvata {
  return {
    base: [
      {
        area: 'cereali',
        voci: [{
          id: 'item-riso', ingredientId: 'ing-riso', nome: 'Riso', area: 'cereali', unita: 'g',
          fabbisogno: 820, residuo: 0, confezioni: 1, quantitaTotale: 1000,
          spuntato: true, origine: 'piano', mostraDettaglio: true,
        }],
        controlli: [],
      },
    ],
    topup: [],
    baseListaId: 'lista-base-1',
    topupListaId: 'lista-topup-1',
  };
}

function voce(overrides: Partial<VoceEvitata>): VoceEvitata {
  return {
    ingredientId: 'ing-x', nome: 'X', unita: 'g', fabbisogno: 500,
    confezioniIngenue: 1, confezioniReali: 0, confezioniEvitate: 1, quantitaEvitata: 500,
    prezzoConfezione: null,
    ...overrides,
  };
}

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
  vi.mocked(leggiSettimanaCorrente).mockReset().mockResolvedValue(SETTIMANA);
  vi.mocked(leggiListe).mockReset().mockResolvedValue(listaFinita());
  vi.mocked(chiudiSpesa).mockReset().mockResolvedValue(undefined);
  vi.mocked(leggiRisparmioSettimana).mockReset().mockResolvedValue([]);
});

describe('Lista fatta — NON RICOMPRATO QUESTA SETTIMANA', () => {
  it('con evitate > 0 e prezzi su tutti mostra confezioni, quantità ed euro, senza riga secondaria', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: 3 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400, prezzoConfezione: 5.4 }),
    ]);

    render(<ListaFatta />);

    expect(await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA')).toBeInTheDocument();
    expect(screen.getByText('3 confezioni · 1,4 kg · circa 11 €')).toBeInTheDocument();
    expect(screen.queryByText(/ingredienti con prezzo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/metti un prezzo/)).not.toBeInTheDocument();
    expect(leggiRisparmioSettimana).toHaveBeenCalledWith('week-1');
  });

  it('la scheda sta sopra "CHIUDENDO LA SPESA"', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([voce({ prezzoConfezione: 2 })]);

    const { container } = render(<ListaFatta />);
    await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA');

    const testo = container.textContent ?? '';
    const posRicomprato = testo.indexOf('NON RICOMPRATO QUESTA SETTIMANA');
    const posChiudendo = testo.indexOf('CHIUDENDO LA SPESA');
    expect(posRicomprato).toBeGreaterThanOrEqual(0);
    expect(posChiudendo).toBeGreaterThan(posRicomprato);
  });

  it('senza nessun prezzo la riga principale non ha gli euro e invita a metterli', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400 }),
    ]);

    render(<ListaFatta />);

    expect(await screen.findByText('3 confezioni · 1,4 kg')).toBeInTheDocument();
    expect(screen.getByText('metti un prezzo agli ingredienti per vederlo in euro')).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('con prezzi solo su una parte dice su quanti ingredienti è calcolato', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ ingredientId: 'ing-riso', nome: 'Riso', confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: 3 }),
      voce({ ingredientId: 'ing-olio', nome: 'Olio', unita: 'ml', confezioniEvitate: 1, quantitaEvitata: 750, prezzoConfezione: 6 }),
      voce({ ingredientId: 'ing-pasta', nome: 'Pasta', confezioniEvitate: 1, quantitaEvitata: 400 }),
    ]);

    render(<ListaFatta />);

    expect(await screen.findByText('4 confezioni · 1,4 kg · 750 ml · circa 12 €')).toBeInTheDocument();
    expect(screen.getByText('su 2 ingredienti con prezzo')).toBeInTheDocument();
    expect(screen.queryByText(/metti un prezzo/)).not.toBeInTheDocument();
  });

  it('con una sola confezione usa il singolare', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ unita: 'pz', confezioniEvitate: 1, quantitaEvitata: 6, prezzoConfezione: 0.5 }),
    ]);

    render(<ListaFatta />);

    expect(await screen.findByText('1 confezione · 6 pz · meno di 1 €')).toBeInTheDocument();
  });

  it('con evitate = 0 ma ingredienti nel denominatore dice che il residuo si costruisce', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([
      voce({ confezioniIngenue: 1, confezioniReali: 1, confezioniEvitate: 0, quantitaEvitata: 0, prezzoConfezione: 3 }),
    ]);

    render(<ListaFatta />);

    expect(await screen.findByText('NON RICOMPRATO QUESTA SETTIMANA')).toBeInTheDocument();
    expect(screen.getByText('Niente, questa settimana: il residuo si costruisce spesa dopo spesa')).toBeInTheDocument();
    expect(screen.queryByText(/confezion/)).not.toBeInTheDocument();
  });

  it('senza righe la scheda non compare', async () => {
    vi.mocked(leggiRisparmioSettimana).mockResolvedValue([]);

    render(<ListaFatta />);

    expect(await screen.findByText('CHIUDENDO LA SPESA')).toBeInTheDocument();
    expect(screen.queryByText('NON RICOMPRATO QUESTA SETTIMANA')).not.toBeInTheDocument();
  });

  it('se la lettura del risparmio fallisce la pagina resta usabile e si chiude lo stesso', async () => {
    // Il contatore è un di più: non deve mai bloccare "Hai preso tutto" né la chiusura.
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiRisparmioSettimana).mockRejectedValue(new Error('rete'));

    render(<ListaFatta />);

    expect(await screen.findByText('Hai preso tutto')).toBeInTheDocument();
    expect(screen.queryByText('NON RICOMPRATO QUESTA SETTIMANA')).not.toBeInTheDocument();
    expect(errore).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'CHIUDI LA SPESA' }));
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledWith('week-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/settimana'));

    errore.mockRestore();
  });
});
