import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react';

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

import { salvaImpostazioni } from '@/data/impostazioni';
import { creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro, statoCasa } from '@/data/casa';
import { codiceCompitato, messaggioEntrata } from '../Casa';
import { azzera, montaPannello } from './aiuti';

const PROPRIETARIO_DUE = { ruolo: 'proprietario' as const, email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] };
const MEMBRO = { ruolo: 'membro' as const, email: ['a@b.it'], id: ['id-p'] };

describe('Casa condivisa, le funzioni pure', () => {
  it('codiceCompitato separa le lettere con uno spazio', () => {
    expect(codiceCompitato('K7P3QX2M')).toBe('K 7 P 3 Q X 2 M');
  });

  it('messaggioEntrata mostra solo il messaggio di un raise exception (P0001)', () => {
    expect(messaggioEntrata({ code: 'P0001', message: 'codice non valido o scaduto' })).toBe('codice non valido o scaduto');
    expect(messaggioEntrata({ code: 'P0001', message: '' })).toBe('Non siamo riusciti a entrare. Riprova.');
    expect(messaggioEntrata({ code: '23505', message: 'duplicate key' })).toBe('Non siamo riusciti a entrare. Riprova.');
    expect(messaggioEntrata(new Error('rete'))).toBe('Non siamo riusciti a entrare. Riprova.');
    expect(messaggioEntrata(null)).toBe('Non siamo riusciti a entrare. Riprova.');
  });
});

describe('Casa condivisa', () => {
  // `window.location.assign` in jsdom non si spia: si sostituisce `location`
  // con una copia che ha un assign finto, e si ripristina alla fine.
  const locationOriginale = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    azzera();
    assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...locationOriginale, assign }, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: locationOriginale, writable: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    vi.useRealTimers();
  });

  // Migra «da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare».
  it('da solo: invita, spiega cosa vuol dire, offre il codice e il campo per entrare', async () => {
    montaPannello('casa');
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.getByText('Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.getByText('HO UN CODICE')).toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toHaveAttribute('placeholder', 'Ho un codice');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
  });

  // Migra «CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata».
  it('CREA UN CODICE mostra il codice, compitato per lo screen reader, con la sua durata', async () => {
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    // Come lo vede lo screen reader: un'immagine col nome compitato, non il testo «K7P3QX2M»
    // (su un div senza ruolo l'aria-label non vale: il ruolo generic non ammette un nome).
    const codice = await screen.findByRole('img', { name: 'Codice della casa: K 7 P 3 Q X 2 M' });
    expect(codice).toHaveTextContent('K7P3QX2M');
    expect(creaInvito).toHaveBeenCalledTimes(1);
    // L'etichetta dal disegno (frame 15), confermata da Andrea il 26/09.
    expect(screen.getByText('CODICE DELLA CASA')).toBeInTheDocument();
    expect(screen.getByText('Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.')).toBeInTheDocument();
    // Il codice prende il posto di CREA UN CODICE.
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
  });

  // Migra «se creaInvito fallisce lo dice senza rompere la scheda».
  it('se creaInvito fallisce lo dice e CREA UN CODICE resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(creaInvito).mockRejectedValue(new Error('rete'));
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    expect(await screen.findByText('Non siamo riusciti a creare il codice. Riprova.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeEnabled();
    errore.mockRestore();
  });

  it('COPIA copia il codice e dice COPIATO per 2 secondi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(await screen.findByRole('button', { name: 'COPIATO' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('K7P3QX2M');
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('button', { name: 'COPIA' })).toBeInTheDocument();
  });

  it('se la copia fallisce, o la clipboard non c’è, dice di dettarlo a voce', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    // La scrittura rifiutata (permesso negato).
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('negato')) }, configurable: true });
    const { unmount } = montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a copiarlo. Dettalo a voce.');
    unmount();
    // Nessuna clipboard (contesto non sicuro, browser vecchio): vale come un fallimento.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a copiarlo. Dettalo a voce.');
    errore.mockRestore();
  });

  it('se Casa si smonta mentre la copia è in volo, nessun timer di COPIATO nasce dopo', async () => {
    let finisci: () => void = () => {};
    const writeText = vi.fn(() => new Promise<void>((r) => { finisci = r; }));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    const { unmount } = montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(writeText).toHaveBeenCalledTimes(1);
    unmount();
    const timeout = vi.spyOn(window, 'setTimeout');
    try {
      await act(async () => { finisci(); });
      expect(timeout.mock.calls.filter(([, ms]) => ms === 2000)).toHaveLength(0);
    } finally {
      timeout.mockRestore();
    }
  });

  it('dopo un’ora il codice sparisce e torna CREA UN CODICE (controllo al minuto)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    await screen.findByLabelText(/^Codice della casa/);
    await act(async () => { vi.advanceTimersByTime(59 * 60_000); });
    expect(screen.getByLabelText(/^Codice della casa/)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2 * 60_000); });
    expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
  });

  it('al ritorno in primo piano, se l’ora è passata, il codice sparisce subito', async () => {
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    await screen.findByLabelText(/^Codice della casa/);
    const adesso = Date.now();
    const ora = vi.spyOn(Date, 'now').mockReturnValue(adesso + 61 * 60_000);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    try {
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    } finally {
      ora.mockRestore();
      delete (document as unknown as Record<string, unknown>).visibilityState;
    }
  });

  // Migra «ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista».
  it('ENTRA maiuscola il codice, si accende a 8 caratteri, chiama entraInCasa e ricarica su /lista', async () => {
    vi.mocked(entraInCasa).mockResolvedValue(undefined);
    montaPannello('casa');
    const campo = await screen.findByLabelText('Ho un codice');
    fireEvent.change(campo, { target: { value: 'k7p3' } });
    expect(campo).toHaveValue('K7P3');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    // Sei caratteri erano il formato vecchio: non bastano più.
    fireEvent.change(campo, { target: { value: 'k7p3qx' } });
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    fireEvent.change(campo, { target: { value: 'k7p3qx2m' } });
    expect(campo).toHaveValue('K7P3QX2M');
    expect(campo).toHaveAttribute('maxlength', '8');
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    await waitFor(() => expect(entraInCasa).toHaveBeenCalledWith('K7P3QX2M'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista'));
  });

  // Migra «con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è».
  it('con un codice sbagliato mostra il messaggio della funzione SQL così com’è', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(new Error('codice non valido o scaduto'), { code: 'P0001' }));
    montaPannello('casa');
    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('codice non valido o scaduto');
    expect(assign).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  // Migra «un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres».
  it('un errore che non è della funzione non mostra il messaggio grezzo, e si può riprovare', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(new Error('duplicate key value violates unique constraint "casa_membro_pkey"'), { code: '23505' }));
    montaPannello('casa');
    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    expect(await screen.findByText('Non siamo riusciti a entrare. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ho un codice')).toHaveValue('AAAAAAAA');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeEnabled();
    errore.mockRestore();
  });

  // Migra «da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI».
  it('da proprietario: tu per primo con TU, poi i membri con TOGLI, la nota e un altro codice; niente ESCI né HO UN CODICE', async () => {
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    expect(await screen.findByText('LA TUA CASA')).toBeInTheDocument();
    expect(screen.getByText('andrea@esempio.it')).toBeInTheDocument();
    expect(screen.getByText('TU')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    // Tu per primo: la tua email viene prima di quelle dei membri.
    const io = screen.getByText('andrea@esempio.it');
    expect(io.compareDocumentPosition(screen.getByText('a@b.it')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Togli a@b.it dalla casa' })).toHaveTextContent('TOGLI');
    expect(screen.getByRole('button', { name: 'Togli c@d.it dalla casa' })).toBeInTheDocument();
    expect(screen.getByText('Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ho un codice')).not.toBeInTheDocument();
  });

  it('da proprietario: il codice creato compare dentro il blocco, sotto la nota', async () => {
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    const codice = await screen.findByRole('img', { name: 'Codice della casa: K 7 P 3 Q X 2 M' });
    const nota = screen.getByText('Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.');
    expect(nota.compareDocumentPosition(codice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('LA TUA CASA').closest('section')).toContainElement(codice);
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
  });

  // Migra «da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa».
  it('da proprietario: TOGLI apre il dialogo; TOGLI nel dialogo toglie per id e rilegge la casa', async () => {
    vi.mocked(statoCasa)
      .mockResolvedValueOnce(PROPRIETARIO_DUE)
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['c@d.it'], id: ['id-2'] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    expect(rimuoviMembro).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Togliere a@b.it dalla casa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    // L'id, non l'email: accoppiati per indice da stato_casa.
    await waitFor(() => expect(rimuoviMembro).toHaveBeenCalledWith('id-1'));
    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getByText('LA TUA CASA')).toBeInTheDocument();
    // Nessun reload: l'id di chi chiama non è cambiato.
    expect(assign).not.toHaveBeenCalled();
  });

  // Migra «da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo».
  it('da proprietario: tolto l’ultimo membro si torna allo stato da solo', async () => {
    const uno = { ruolo: 'proprietario' as const, email: ['a@b.it'], id: ['id-1'] };
    vi.mocked(statoCasa).mockResolvedValueOnce(uno).mockResolvedValueOnce({ ruolo: 'solo', email: [], id: [] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: uno });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'TOGLI' }));
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.queryByText('LA TUA CASA')).not.toBeInTheDocument();
    expect(screen.queryByText('a@b.it')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  // Migra «da proprietario: TOGLI armato, un tap fuori disarma senza togliere»: SICURO? è tolto (decisione 8).
  it('da proprietario: ANNULLA chiude il dialogo senza togliere', async () => {
    montaPannello('casa', { casa: { ruolo: 'proprietario', email: ['a@b.it'], id: ['id-1'] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(rimuoviMembro).not.toHaveBeenCalled();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
  });

  // Migra «se togliere fallisce lo dice e il membro resta in elenco».
  it('se togliere fallisce il dialogo lo dice e il membro resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(rimuoviMembro).mockRejectedValue(new Error('nessun membro con questo id nella tua casa'));
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a togliere. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    // L'errore è quello di oggi, non l'avviso della casa cambiata.
    expect(screen.queryByText('La casa è cambiata: dati ricaricati. Riprova.')).not.toBeInTheDocument();
    // Nessuna rilettura: la casa non è cambiata.
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  // Migra «se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti».
  it('se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(statoCasa).mockResolvedValueOnce(PROPRIETARIO_DUE).mockRejectedValueOnce(new Error('rete'));
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'TOGLI' }));
    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a togliere. Riprova.')).not.toBeInTheDocument();
    expect(screen.queryByText('Non riusciamo a leggere la casa. Riprova più tardi.')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo».
  it('da membro: dice di chi è la casa; ESCI DALLA CASA apre il dialogo e l’uscita riapre il pannello su Casa', async () => {
    vi.mocked(esciDallaCasa).mockResolvedValue(undefined);
    montaPannello('casa', { casa: MEMBRO });
    expect(await screen.findByText('Sei nella casa di a@b.it')).toBeInTheDocument();
    expect(screen.getByText('Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ho un codice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(esciDallaCasa).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Uscire dalla casa di a@b.it?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI DALLA CASA' }));
    await waitFor(() => expect(esciDallaCasa).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista?impostazioni=casa'));
  });

  // Migra «da membro: ESCI armato, un tap fuori disarma senza uscire».
  it('da membro: ANNULLA chiude il dialogo senza uscire', async () => {
    montaPannello('casa', { casa: MEMBRO });
    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(esciDallaCasa).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ESCI DALLA CASA' })).toBeInTheDocument();
  });

  // Migra «se uscire fallisce lo dice e resta nella casa».
  it('se uscire fallisce il dialogo lo dice e si resta nella casa', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(esciDallaCasa).mockRejectedValue(new Error('rete'));
    montaPannello('casa', { casa: MEMBRO });
    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a uscire. Riprova.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByText('Sei nella casa di a@b.it')).toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile».
  it('se statoCasa fallisce: la sotto-schermata ha solo l’errore, la tessera nessun valore, la cima resta usabile', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('casa', { casa: new Error('rete') });
    expect(await screen.findByText('Non riusciamo a leggere la casa. Riprova più tardi.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RIPROVA' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fai la spesa con qualcuno?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Gestione dei pasti.*3 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Casa condivisa/ })).not.toHaveTextContent(/SOLO TU|PERSONE|NELLA CASA/);
    errore.mockRestore();
  });

  it('frame 26B: dopo un rifiuto RLS altrove, Casa mostra l’avviso sopra la casa ricaricata', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { casa: MEMBRO });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' });
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
    const campo = screen.getByLabelText('Per quante persone cucini, da 1 a 4');
    fireEvent.change(campo, { target: { value: '2' } });
    fireEvent.blur(campo);
    await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.');
    fireEvent.click(screen.getByRole('button', { name: /^Casa condivisa/ }));
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.getByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    errore.mockRestore();
  });
});
