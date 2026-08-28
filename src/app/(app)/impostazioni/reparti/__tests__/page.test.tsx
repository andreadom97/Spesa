import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import OrdineReparti from '../page';

const ORDINE_DEFAULT = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockDati(porzioni = 2) {
  vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: porzioni, ordineAree: [...ORDINE_DEFAULT] });
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
}

describe('Ordine dei reparti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.mockClear();
  });

  it('mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità', async () => {
    mockDati();
    render(<OrdineReparti />);

    expect(await screen.findByText('ORTOFRUTTA')).toBeInTheDocument();
    expect(screen.getByText('SURGELATI')).toBeInTheDocument();

    const su1 = screen.getByLabelText('Sposta ORTOFRUTTA in alto');
    expect(su1).toBeDisabled();
    expect(su1).toHaveStyle({ opacity: '0.35' });

    const giuUltimo = screen.getByLabelText('Sposta SURGELATI in basso');
    expect(giuUltimo).toBeDisabled();
    expect(giuUltimo).toHaveStyle({ opacity: '0.35' });
  });

  it('riordinare con le frecce non salva finché non si preme SALVA ORDINE', async () => {
    mockDati();
    render(<OrdineReparti />);

    await screen.findByText('ORTOFRUTTA');
    fireEvent.click(screen.getByLabelText('Sposta MACELLERIA E PESCHERIA in alto'));

    expect(salvaImpostazioni).not.toHaveBeenCalled();

    // Ora ORTOFRUTTA e MACELLERIA hanno scambiato posto: la prima riga è MACELLERIA.
    const righe = screen.getAllByText(/^\d$/);
    expect(righe[0]).toHaveTextContent('1');
  });

  it('SALVA ORDINE persiste il nuovo ordine mantenendo invariato il moltiplicatore porzioni, poi torna a Impostazioni', async () => {
    mockDati(3);
    render(<OrdineReparti />);

    await screen.findByText('ORTOFRUTTA');
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));

    fireEvent.click(screen.getByText('SALVA ORDINE'));

    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledWith({
      moltiplicatorePorzioni: 3,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'surgelati', 'cereali', 'dispensa'],
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/impostazioni'));
  });

  it('se il salvataggio fallisce, mostra un errore e resta sulla pagina', async () => {
    mockDati();
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    render(<OrdineReparti />);

    await screen.findByText('ORTOFRUTTA');
    fireEvent.click(screen.getByText('SALVA ORDINE'));

    await waitFor(() => expect(screen.getByText('Non siamo riusciti a salvare l’ordine. Riprova.')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it('il link indietro torna alla pagina statica /impostazioni', async () => {
    mockDati();
    render(<OrdineReparti />);

    await screen.findByText('ORTOFRUTTA');
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', '/impostazioni');
  });
});
