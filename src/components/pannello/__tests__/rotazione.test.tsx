import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

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

import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni, ORDINE_TEST } from './aiuti';

// Venerdì 25/09/2026: il lunedì corrente è il 21 settembre.
function fissaOggi() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
}

describe('Rotazione del piano', () => {
  beforeEach(() => azzera());
  afterEach(() => vi.useRealTimers());

  // Migra «con il ciclo spento la rotazione si può accendere e dice cosa cambia».
  it('con NESSUNA dice la nota di oggi; 2 SETT. salva le impostazioni intere e compare il contatore', async () => {
    montaPannello('rotazione');
    expect(await screen.findByText('OGNI QUANTE SETTIMANE SI RIPETE')).toBeInTheDocument();
    expect(screen.getByText(/^I piatti ruotano uno dopo l’altro, senza giro fisso\./)).toBeInTheDocument();
    expect(screen.queryByText(/^SETTIMANA /)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).not.toBeInTheDocument();

    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ settimaneCiclo: 2, cicloOrigine: '2026-08-31' }));
    fireEvent.click(screen.getByRole('button', { name: '2 SETT.' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].settimaneCiclo).toBe(2);
    // L'ordine delle aree viaggia invariato: salvaImpostazioni riscrive la riga intera.
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].ordineAree).toEqual(ORDINE_TEST);
    expect(await screen.findByText(/^SETTIMANA \d DI 2$/)).toBeInTheDocument();
  });

  // Migra «se il salvataggio del ciclo fallisce torna al valore di prima e lo dice».
  it('se il salvataggio fallisce il segmento torna a NESSUNA e sotto c’è l’errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('rotazione');
    await screen.findByText('OGNI QUANTE SETTIMANE SI RIPETE');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(screen.getByRole('button', { name: '3 SETT.' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.getByRole('button', { name: 'NESSUNA' })).toHaveAttribute('aria-pressed', 'true');
    errore.mockRestore();
  });

  // Migra «il copy del giro con origine futura dice "comincia"».
  it('con l’origine futura la nota dice «comincia»', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2099-03-09' } });
    expect(await screen.findByText(/^Il giro comincia lunedì 9 marzo\b/)).toBeInTheDocument();
  });

  // Migra «il copy del giro con origine passata (o oggi) dice "è cominciato"».
  it('con l’origine passata la nota dice «è cominciato»', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    expect(await screen.findByText(/^Il giro è cominciato lunedì 3 gennaio\b/)).toBeInTheDocument();
  });

  it('il contatore dice SETTIMANA {k} DI {n}', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 3, cicloOrigine: '2026-09-14' } });
    expect(await screen.findByText('SETTIMANA 2 DI 3')).toBeInTheDocument();
    expect(screen.queryByText(/ORA SEI ALLA/)).not.toBeInTheDocument();
  });

  // Migra «RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero».
  it('RIPARTI apre il dialogo, e RIPARTI DA LUNEDÌ salva l’origine al lunedì corrente', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 3, cicloOrigine: '2026-09-14' } });
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Ripartire dalla settimana 1?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Da lunedì 21 settembre il piano riparte dalla settimana 1 di 3. Le settimane già create non cambiano.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RIPARTI DA LUNEDÌ' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].cicloOrigine).toBe('2026-09-21');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  // Migra «RIPARTI armato: un tap fuori dal bottone annulla senza salvare»:
  // SICURO? è tolto (decisione 8); si esce da ANNULLA, e il velo del dialogo non chiude (§D, §N).
  it('ANNULLA chiude il dialogo senza salvare; il velo non chiude', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    const dialogo = await screen.findByRole('alertdialog');
    const velo = screen.getAllByTestId('velo-foglio').at(-1)!;
    fireEvent.click(velo);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('se ripartire fallisce il dialogo resta aperto con il suo errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RIPARTI DA LUNEDÌ' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a ripartire. Riprova.')).toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma»:
  // senza armamento non c'è niente da disarmare. Il comportamento che resta da
  // proteggere è la regola di oggi che il disegno non mostra (§C.3, §N).
  it('RIPARTI è spento se l’origine è già il lunedì corrente', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2026-09-21' } });
    expect(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).toBeDisabled();
  });

  it('il tocco sul segmento già premuto non salva', async () => {
    montaPannello('rotazione');
    fireEvent.click(await screen.findByRole('button', { name: 'NESSUNA' }));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });
});
