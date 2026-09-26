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

import type { Impostazioni } from '@/domain/types';
import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni } from './aiuti';

const tasto = (nome: 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI') => screen.getByRole('button', { name: nome });
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('Cadenza dei controlli', () => {
  beforeEach(() => azzera());

  it('tre segmenti, OGNI 3 MESI di default, e la nota', async () => {
    montaPannello('cadenza');
    expect(await screen.findByRole('button', { name: 'OGNI 3 MESI' })).toHaveAttribute('aria-pressed', 'true');
    expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'false');
    expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText("Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.")).toBeInTheDocument();
  });

  it('il tocco salva la riga intera con i nuovi giorni, e la riga del pannello lo dice', async () => {
    montaPannello('cadenza');
    await screen.findByRole('button', { name: 'OGNI 3 MESI' });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 30 }));
    fireEvent.click(tasto('OGNI MESE'));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledWith(impostazioni({ giorniControllo: 30 })));
    await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Cadenza dei controlli.*OGNI MESE/ })).toBeInTheDocument();
  });

  it('se il salvataggio fallisce torna al valore di prima e lo dice sotto il segmento', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cadenza');
    await screen.findByRole('button', { name: 'OGNI 3 MESI' });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(tasto('OGNI 2 MESI'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    await waitFor(() => expect(tasto('OGNI 3 MESI')).toHaveAttribute('aria-pressed', 'true'));
    errore.mockRestore();
  });

  describe('due tocchi veloci (la coda serializzata del provider)', () => {
    // Migra «due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo».
    it('se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo', async () => {
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const riletture: Array<(i: Impostazioni) => void> = [];
      vi.mocked(leggiImpostazioni).mockImplementation(() => new Promise((resolve) => { riletture.push(resolve); }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      fireEvent.click(tasto('OGNI MESE'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      await waitFor(() => expect(riletture).toHaveLength(2));

      riletture[1](impostazioni({ giorniControllo: 30 }));
      await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
      riletture[0](impostazioni({ giorniControllo: 60 }));
      await tick();
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');
    });

    // Migra «due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore».
    it('se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(() => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }));
      vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 30 }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(tasto('OGNI MESE'));
      await tick();
      expect(salvataggi).toHaveLength(1); // la seconda scrittura aspetta la prima

      salvataggi[0].reject(new Error('rete'));
      await waitFor(() => expect(salvataggi).toHaveLength(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      salvataggi[1].resolve();

      await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
      await tick();
      expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
      errore.mockRestore();
    });

    // Migra «due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server».
    it('se il primo riesce ma la sua rilettura è superata e il secondo fallisce, mostra il valore del server', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(() => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }));
      // Il server ha il valore del primo tocco (60), da qui in poi.
      vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 60 }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(tasto('OGNI MESE'));
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');

      salvataggi[0].resolve();
      await waitFor(() => expect(leggiImpostazioni).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(salvataggi).toHaveLength(2));
      await tick();
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');

      salvataggi[1].reject(new Error('rete'));
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      await waitFor(() => expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'true'));
      expect(leggiImpostazioni).toHaveBeenCalledTimes(3);
      errore.mockRestore();
    });

    // Migra «due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2».
    it('se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono OGNI 2 MESI', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      let sulServer: Impostazioni['giorniControllo'] = 90;
      let confermaPrima: () => void = () => {};
      vi.mocked(salvaImpostazioni)
        .mockImplementationOnce((i) => new Promise<void>((resolve) => {
          confermaPrima = () => { sulServer = i.giorniControllo; resolve(); };
        }))
        .mockRejectedValueOnce(new Error('rete'));
      vi.mocked(leggiImpostazioni).mockImplementation(async () => impostazioni({ giorniControllo: sulServer }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      fireEvent.click(tasto('OGNI MESE'));
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');
      await tick();
      expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();

      confermaPrima();
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      await waitFor(() => expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'true'));
      errore.mockRestore();
    });
  });
});
