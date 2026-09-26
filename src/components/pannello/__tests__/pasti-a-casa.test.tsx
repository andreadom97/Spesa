import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { salvaSlotDefs } from '@/data/impostazioni';
import { riepilogoMatrice } from '../PastiACasa';
import { azzera, montaPannello, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

describe('Pasti a casa', () => {
  beforeEach(() => azzera());

  it('una riga per pasto col nome, sette celle, le sigle dei giorni una volta sola e ferme', async () => {
    montaPannello('pasti-a-casa');
    const colazione = await screen.findByRole('group', { name: 'Colazione' });
    expect(within(colazione).getAllByRole('button')).toHaveLength(7);
    expect(screen.getByRole('group', { name: 'Pranzo' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cena' })).toBeInTheDocument();
    expect(screen.getAllByTestId('sigle-giorni')).toHaveLength(1);
    expect(screen.getByTestId('sigle-giorni')).toHaveStyle({ position: 'sticky' });
  });

  // Migra «la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px».
  it('ogni cella è alta 44 e divide la larghezza con le altre (flex: 1)', async () => {
    montaPannello('pasti-a-casa');
    const cella = await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa');
    expect(cella).toHaveStyle({ height: '44px', flex: '1' });
  });

  it('a casa: premuta, con la casetta; fuori: non premuta, vuota; l’aria-label dice cosa fa il tocco', async () => {
    montaPannello('pasti-a-casa');
    const aCasa = await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa');
    expect(aCasa).toHaveAttribute('aria-pressed', 'true');
    expect(aCasa.querySelector('svg')).not.toBeNull();
    const fuori = screen.getByLabelText('Lunedì Pranzo: di base fuori casa, tocca per mettere a casa');
    expect(fuori).toHaveAttribute('aria-pressed', 'false');
    expect(fuori.querySelector('svg')).toBeNull();
  });

  // Migra «accende una pastiglia del giorno e salva le assenze abituali aggiornate».
  it('un tocco mette Colazione fuori casa il lunedì e salva le assenze aggiornate', async () => {
    montaPannello('pasti-a-casa');
    fireEvent.click(await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...COLAZIONE, assenzeAbituali: [true, false, false, false, false, false, false] },
      PRANZO,
      CENA,
    ], { soloTolti: [] }));
    expect(await screen.findByLabelText('Lunedì Colazione: di base fuori casa, tocca per mettere a casa')).toHaveAttribute('aria-pressed', 'false');
  });

  it('se il salvataggio fallisce la cella torna com’era e sotto la matrice c’è l’errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('pasti-a-casa');
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.getByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa')).toHaveAttribute('aria-pressed', 'true');
    errore.mockRestore();
  });

  it('la nota e il riepilogo, che si ricalcola al tocco', async () => {
    montaPannello('pasti-a-casa');
    expect(await screen.findByText('La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.')).toBeInTheDocument();
    const riepilogo = screen.getByRole('status');
    expect(riepilogo).toHaveTextContent("Di base sei a casa per 20 pasti su 21. La Lista conta solo quelli: l'unico fuori casa non entra nella spesa.");
    fireEvent.click(screen.getByLabelText('Martedì Cena: di base a casa, tocca per mettere fuori casa'));
    await waitFor(() => expect(riepilogo).toHaveTextContent('Di base sei a casa per 19 pasti su 21. La Lista conta solo quelli: i 2 fuori casa non entrano nella spesa.'));
  });

  it('sei pasti: sei righe di sette celle', async () => {
    const sei = Array.from({ length: 6 }, (_, i) => ({ id: `sd-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: ASSENZE_VUOTE }));
    montaPannello('pasti-a-casa', { pasti: sei });
    expect(await screen.findAllByRole('group')).toHaveLength(6);
  });
});

describe('riepilogoMatrice', () => {
  it('nessun pasto fuori casa', () => {
    expect(riepilogoMatrice([COLAZIONE, CENA, { ...CENA, id: 'x' }])).toBe('Di base sei a casa per tutti i 21 pasti.');
  });
});
