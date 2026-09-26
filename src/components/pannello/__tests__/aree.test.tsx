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

import type { AreaId } from '@/domain/types';
import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni } from './aiuti';

// L'ordine di base (ORDINE_AREE_DEFAULT): la riga del pannello dice DI BASE.
const DI_BASE: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'];

/** L'ordine a schermo, letto dagli aria-label dei tondi «in alto». */
function ordineAschermo(): string[] {
  return screen.getAllByLabelText(/^Sposta .+ in alto$/).map((b) => b.getAttribute('aria-label')!.replace(/^Sposta | in alto$/g, ''));
}

describe('Ordine delle aree', () => {
  beforeEach(() => azzera());

  // Migra «mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità».
  it('sei righe nell’ordine salvato; su spento sulla prima, giù spento sull’ultima', async () => {
    montaPannello('aree', { impostazioni: { moltiplicatorePorzioni: 2, ordineAree: DI_BASE } });
    expect(await screen.findByText('Ortofrutta')).toBeInTheDocument();
    expect(screen.getByText('Latticini, uova e salumi')).toBeInTheDocument();
    expect(ordineAschermo()).toEqual(['ORTOFRUTTA', 'MACELLERIA E PESCHERIA', 'LATTICINI, UOVA E SALUMI', 'PASTA, RISO E CEREALI', 'DISPENSA E CONSERVE', 'SURGELATI']);
    expect(screen.getByLabelText('Sposta ORTOFRUTTA in alto')).toBeDisabled();
    expect(screen.getByLabelText('Sposta SURGELATI in basso')).toBeDisabled();
    expect(screen.getByLabelText('Sposta ORTOFRUTTA in basso')).toBeEnabled();
  });

  it('in testa la nota di oggi; l’anteprima della lista non c’è più', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    expect(await screen.findByText(/^Mettili nell’ordine in cui li incontri camminando nel tuo supermercato\./)).toBeInTheDocument();
    expect(screen.queryByText('ANTEPRIMA DELLA LISTA')).not.toBeInTheDocument();
  });

  // Migra «riordinare con le frecce non salva finché non si preme SALVA ORDINE».
  it('le frecce riordinano senza salvare; SALVA ORDINE è spento finché l’ordine è quello salvato', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    const salva = screen.getByRole('button', { name: 'SALVA ORDINE' });
    expect(salva).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Sposta MACELLERIA E PESCHERIA in alto'));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(ordineAschermo().slice(0, 2)).toEqual(['MACELLERIA E PESCHERIA', 'ORTOFRUTTA']);
    expect(salva).toBeEnabled();
    // Rimesso com'era, torna spento.
    fireEvent.click(screen.getByLabelText('Sposta ORTOFRUTTA in alto'));
    expect(salva).toBeDisabled();
  });

  // Migra «SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni»:
  // ora resta sulla sotto-schermata (§C.5), e la riga del pannello dice PERSONALIZZATO al ritorno.
  it('SALVA ORDINE scrive il nuovo ordine con tutto il resto intatto e resta qui', async () => {
    montaPannello('aree', { impostazioni: { moltiplicatorePorzioni: 3, ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    const nuovo: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'surgelati', 'cereali', 'dispensa'];
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 3, ordineAree: nuovo }));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledWith(impostazioni({ moltiplicatorePorzioni: 3, ordineAree: nuovo })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeDisabled());
    expect(screen.getByRole('heading', { name: 'Ordine delle aree' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ })).toBeInTheDocument();
  });

  it('mentre salva il tasto dice SALVATAGGIO… a 0,5', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    const inVolo = await screen.findByRole('button', { name: 'SALVATAGGIO…' });
    expect(inVolo).toBeDisabled();
    expect(inVolo).toHaveStyle({ opacity: '0.5' });
  });

  // Migra «se il salvataggio fallisce, mostra un errore e resta sulla pagina».
  it('se il salvataggio fallisce l’errore sta sopra il tasto, che si riaccende, e si resta qui', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Non siamo riusciti a salvare l'ordine. Riprova.");
    await waitFor(() => expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeEnabled());
    expect(ordineAschermo()[4]).toBe('SURGELATI');
    errore.mockRestore();
  });

  // Migra «il link indietro torna alla pagina statica /impostazioni»: la freccia è
  // del pannello (Task 6) e torna in cima; uscire senza salvare perde l'ordine (§C.5).
  it('la freccia torna in cima senza salvare, e l’ordine non salvato si perde', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ordine delle aree.*DI BASE/ }));
    await screen.findByText('Ortofrutta');
    expect(ordineAschermo()[5]).toBe('SURGELATI');
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('se il caricamento fallisce lo dice col testo delle aree', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    montaPannello('aree');
    expect(await screen.findByText("Non riusciamo a caricare l'ordine delle aree. Riprova più tardi.")).toBeInTheDocument();
    errore.mockRestore();
  });
});
