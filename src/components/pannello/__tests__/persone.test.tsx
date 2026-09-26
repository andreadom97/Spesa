import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Step 1).
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

import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni } from '@/data/impostazioni';
import { dimenticaIdCasa, statoCasa } from '@/data/casa';
import { azzera, montaPannello, impostazioni, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

const NOTA = 'Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.';
const campo = () => screen.getByLabelText('Per quante persone cucini, da 1 a 4');

async function scrivi(valore: string, come: 'blur' | 'invio' = 'blur') {
  fireEvent.change(campo(), { target: { value: valore } });
  if (come === 'invio') fireEvent.keyDown(campo(), { key: 'Enter' });
  else fireEvent.blur(campo());
}

describe('Per quante persone cucini', () => {
  beforeEach(() => azzera());

  it('sta in Come calcolo la lista, dichiara l’assunzione e parte da 1 senza la seconda nota', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    expect(await screen.findByText('Per quante persone cucini')).toBeInTheDocument();
    expect(screen.getByText(NOTA)).toBeInTheDocument();
    expect(campo()).toHaveValue('1');
    expect(campo()).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByText('PERS')).toBeInTheDocument();
    expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /porzioni/ })).not.toBeInTheDocument();
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('scritto 2 e uscito dal campo salva le impostazioni intere, mostra 2 e dice per quanti compra la lista', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 2 }));
    await scrivi('2');
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0]).toEqual(impostazioni({ moltiplicatorePorzioni: 2 }));
    await waitFor(() => expect(campo()).toHaveValue('2'));
    expect(screen.getByText('La lista compra per 2. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
  });

  it('con Invio salva senza uscire dal campo: da 3 a 2', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 3 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 2 }));
    await scrivi('2', 'invio');
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].moltiplicatorePorzioni).toBe(2);
    await waitFor(() => expect(campo()).toHaveValue('2'));
  });

  it('5, 0, 2,5 e abc non si salvano: torna al valore di prima e chiede un numero da 1 a 4', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 4 } });
    await screen.findByText('Per quante persone cucini');
    for (const sbagliato of ['5', '0', '2,5', 'abc']) {
      await scrivi(sbagliato);
      expect(campo()).toHaveValue('4');
      expect(screen.getByRole('alert')).toHaveTextContent('Scrivi un numero da 1 a 4.');
    }
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(screen.getByText('La lista compra per 4. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
  });

  it('l’errore sparisce al gesto successivo', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    await scrivi('9');
    expect(screen.getByText('Scrivi un numero da 1 a 4.')).toBeInTheDocument();
    fireEvent.change(campo(), { target: { value: '2' } });
    expect(screen.queryByText('Scrivi un numero da 1 a 4.')).not.toBeInTheDocument();
  });

  it('lo stesso valore non si salva', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 2 } });
    await screen.findByText('Per quante persone cucini');
    await scrivi(' 2 ');
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mentre salva il campo è spento a 0,5', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    await scrivi('2');
    await waitFor(() => expect(campo()).toBeDisabled());
    expect(campo().closest('label')).toHaveStyle({ opacity: '0.5' });
  });

  it('se il salvataggio fallisce torna al valore del server e lo dice sotto la riga', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    await scrivi('2');
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(campo()).toHaveValue('1');
    // Una lettura al caricamento, una per il ritorno a prima.
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
    // Un errore qualsiasi non è un cambio di casa: la memoria dell'id resta.
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(1);
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('se falliscono salvataggio e rilettura, torna all’ultimo valore confermato e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));
    await scrivi('2');
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(campo()).toHaveValue('1');
    errore.mockRestore();
  });

  // Prova del 15/09, ora nel pannello: il membro tolto dal proprietario scrive
  // con l'id vecchio e la RLS rifiuta. Si scarta l'id, si ricarica tutto, e lo
  // dice l'avviso sopra i blocchi, non l'errore della riga.
  it('se la RLS rifiuta (la casa è cambiata) scarta l’id, ricarica tutto e lo dice sopra i blocchi', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', {
      impostazioni: { moltiplicatorePorzioni: 1 },
      casa: { ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] },
    });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*NELLA CASA DI A/ })).toBeInTheDocument();
    vi.mocked(salvaImpostazioni).mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy for table "settings"' });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 3 }));
    vi.mocked(leggiSlotDefs).mockResolvedValue([
      COLAZIONE,
      { id: 'sd-4', nome: 'Merenda', posizione: 1, assenzeAbituali: ASSENZE_VUOTE },
      { ...PRANZO, posizione: 2 },
      { ...CENA, posizione: 3 },
    ]);
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });

    await scrivi('2');

    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    expect(statoCasa).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(campo()).toHaveValue('3'));
    expect(screen.getByRole('button', { name: /Gestione dei pasti.*4 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Casa condivisa.*SOLO TU/ })).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('un rifiuto RLS riconosciuto dal solo messaggio ricarica allo stesso modo', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('new row violates row-level security policy'));
    await scrivi('2');
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(campo()).toHaveValue('1'));
    errore.mockRestore();
  });
});
