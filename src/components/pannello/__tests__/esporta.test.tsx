import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { preparaEsportazione } from '@/data/esporta';
import { salvaFile } from '@/components/salva-file';
import { azzera, montaPannello } from './aiuti';

const FILE = new File(['{"formato":1}'], 'dispesa-25-09-2026.json', { type: 'application/json' });
const TESTO = 'Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.';

// `share` disponibile, non disponibile e `AbortError` sono i test di `salvaFile` (Task 5):
// qui si prova come la sotto-schermata usa i suoi esiti.
describe('Esporta i tuoi dati', () => {
  beforeEach(() => azzera());

  it('all’apertura il testo e PREPARA IL FILE; non parte da solo', async () => {
    montaPannello('esporta');
    expect(await screen.findByText(TESTO)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PREPARA IL FILE' })).toBeEnabled();
    expect(preparaEsportazione).not.toHaveBeenCalled();
  });

  it('mentre prepara: PREPARO IL FILE…, spento, a 0,5, aria-busy', async () => {
    vi.mocked(preparaEsportazione).mockReturnValueOnce(new Promise(() => {}));
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    const tasto = await screen.findByRole('button', { name: 'PREPARO IL FILE…' });
    expect(tasto).toBeDisabled();
    expect(tasto).toHaveAttribute('aria-busy', 'true');
    expect(tasto).toHaveStyle({ opacity: '0.5' });
    expect(preparaEsportazione).toHaveBeenCalledTimes(1);
  });

  it('pronto: dice il nome del file e SALVA IL FILE lo passa a salvaFile', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    vi.mocked(salvaFile).mockResolvedValue('condiviso');
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Il file è pronto: dispesa-25-09-2026.json.');
    fireEvent.click(screen.getByRole('button', { name: 'SALVA IL FILE' }));
    await waitFor(() => expect(salvaFile).toHaveBeenCalledWith(FILE));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeEnabled();
  });

  it('se si annulla la condivisione non è un errore: il tasto resta SALVA IL FILE', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    vi.mocked(salvaFile).mockResolvedValue('annullato');
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SALVA IL FILE' }));
    await waitFor(() => expect(salvaFile).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se la preparazione fallisce lo dice, e RIPROVA riprepara', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(preparaEsportazione).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(FILE);
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a preparare il file. Riprova.');
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(preparaEsportazione).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });

  it('se il salvataggio del file fallisce (non un annullamento) lo dice, e RIPROVA riprepara', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    vi.mocked(salvaFile).mockRejectedValueOnce(new Error('disco pieno'));
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SALVA IL FILE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a preparare il file. Riprova.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeEnabled();
    expect(preparaEsportazione).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });

  it('uscendo dalla sotto-schermata il file preparato si perde', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    await screen.findByRole('button', { name: 'SALVA IL FILE' });
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Esporta i tuoi dati/ }));
    expect(await screen.findByRole('button', { name: 'PREPARA IL FILE' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SALVA IL FILE' })).not.toBeInTheDocument();
    expect(preparaEsportazione).toHaveBeenCalledTimes(1);
  });
});
