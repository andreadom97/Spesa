import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';

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

import type { Dish, MealSlotDef } from '@/domain/types';
import { leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import { leggiRepertorio } from '@/data/repertorio';
import { azzera, montaPannello, piatto, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

const SPUNTINO: MealSlotDef = { id: 'sd-4', nome: 'Spuntino', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
const QUATTRO = [COLAZIONE, PRANZO, CENA, SPUNTINO];

describe('Gestione dei pasti', () => {
  beforeEach(() => azzera());

  // Migra «mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard».
  it('mostra i pasti letti da leggiSlotDefs e il contatore', async () => {
    montaPannello('gestione-pasti');
    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    expect(screen.getByText('I TUOI PASTI')).toBeInTheDocument();
    expect(screen.getByText('3 DI 6')).toBeInTheDocument();
  });

  // Migra «sotto il minimo di 3 pasti il pulsante di rimozione è disattivato».
  it('a tre pasti le ✕ sono spente e la nota dice il minimo', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    for (const nome of ['Colazione', 'Pranzo', 'Cena']) expect(screen.getByLabelText(`Rimuovi ${nome}`)).toBeDisabled();
    expect(screen.getByText('Tre pasti sono il minimo.')).toBeInTheDocument();
  });

  // Migra «sopra il minimo la rimozione funziona e salva l’insieme aggiornato».
  it('un pasto senza piatti si toglie al tocco e salva l’insieme aggiornato', async () => {
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-1' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    // Dal pannello si cancella solo il pasto tolto (review finale I4).
    expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...COLAZIONE, posizione: 0 },
      { ...PRANZO, posizione: 1 },
      { ...CENA, posizione: 2 },
    ], { soloTolti: ['sd-4'] });
  });

  it('un pasto con piatti chiede il dialogo; ANNULLA non tocca niente', async () => {
    montaPannello('gestione-pasti', {
      pasti: QUATTRO,
      piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' }), piatto({ id: 'd-2', slotDefId: 'sd-4' }), piatto({ id: 'd-3', slotDefId: 'sd-1' })],
    });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Togliere Spuntino?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Se ne vanno anche i suoi 2 piatti, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
  });

  it('TOGLI nel dialogo toglie il pasto e chiude il dialogo', async () => {
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(vi.mocked(salvaSlotDefs).mock.calls[0][0].map((p) => p.id)).toEqual(['sd-1', 'sd-2', 'sd-3']);
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
  });

  it('se TOGLI non riesce il dialogo resta aperto con l’errore e il pasto resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    errore.mockRestore();
  });

  // salvaSlotDefs non è atomico: il delete può essere passato quando l'upsert fallisce (Task 6, decisione del 26/09).
  it('se il salvataggio fallisce dopo che il pasto è stato cancellato, lo schermo segue il server e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('upsert fallito'));
    vi.mocked(leggiSlotDefs).mockResolvedValue([COLAZIONE, PRANZO, CENA]);
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('con il repertorio non ancora letto, la ✕ lo rilegge e poi decide', async () => {
    vi.mocked(leggiRepertorio).mockReturnValueOnce(new Promise(() => {})); // la lettura al montaggio non arriva
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // Durante la rilettura le altre righe restano toccabili: la rimozione parte dai pasti di adesso,
  // non da quelli del tocco, altrimenti riscriverebbe il riordino fatto nel frattempo.
  it('un riordino fatto mentre la ✕ rilegge il repertorio non si perde', async () => {
    let rispondi: (piatti: Dish[]) => void = () => {};
    vi.mocked(leggiRepertorio)
      .mockReturnValueOnce(new Promise(() => {}))
      .mockReturnValueOnce(new Promise((r) => { rispondi = r; }));
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    rispondi([]);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(2));
    expect(vi.mocked(salvaSlotDefs).mock.calls[1][0]).toEqual([
      { ...PRANZO, posizione: 0 },
      { ...COLAZIONE, posizione: 1 },
      { ...CENA, posizione: 2 },
    ]);
    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
  });

  // Review di correttezza, minor 1: due ✕ veloci mentre il conteggio manca. Senza guardia le due
  // riletture finiscono insieme, e la seconda salva dai pasti di prima della prima rimozione:
  // ricreerebbe vuoto il pasto appena cancellato (coi suoi piatti andati a cascata).
  it('una seconda ✕ mentre la prima rimozione è in corso non parte', async () => {
    const MERENDA: MealSlotDef = { id: 'sd-5', nome: 'Merenda', posizione: 4, assenzeAbituali: ASSENZE_VUOTE };
    montaPannello('gestione-pasti', { pasti: [...QUATTRO, MERENDA], piatti: [] });
    // Ogni lettura del repertorio resta in sospeso finché il test non risponde (anche quella al montaggio).
    const risposte: ((piatti: Dish[]) => void)[] = [];
    vi.mocked(leggiRepertorio).mockImplementation(() => new Promise((r) => { risposte.push(r); }));
    await screen.findByDisplayValue('Merenda');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    fireEvent.click(screen.getByLabelText('Rimuovi Merenda'));
    await waitFor(() => expect(risposte.length).toBeGreaterThanOrEqual(2));
    // Nello stesso giro: tutte le riletture partite dai tocchi rispondono insieme.
    for (const r of risposte.slice(1)) r([]);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
    // Nessun salvataggio rimette Spuntino, appena cancellato.
    for (const [salvati] of vi.mocked(salvaSlotDefs).mock.calls) expect(salvati.map((p) => p.id)).not.toContain('sd-4');
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(vi.mocked(salvaSlotDefs).mock.calls[0][0].map((p) => p.id)).toEqual(['sd-1', 'sd-2', 'sd-3', 'sd-5']);
    expect(leggiRepertorio).toHaveBeenCalledTimes(2);
    expect(screen.getByDisplayValue('Merenda')).toBeInTheDocument();
    // Finita la prima, la ✕ riparte (col conteggio ormai letto, senza rilettura).
    fireEvent.click(screen.getByLabelText('Rimuovi Merenda'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(2));
    expect(leggiRepertorio).toHaveBeenCalledTimes(2);
    expect(vi.mocked(salvaSlotDefs).mock.calls[1][0].map((p) => p.id)).toEqual(['sd-1', 'sd-2', 'sd-3']);
  });

  // Review di correttezza, minor 2: la lettura al montaggio che arriva dopo un rifiuto RLS è della
  // casa di prima, e non deve rimettere il conteggio appena scartato.
  it('la lettura del repertorio al montaggio che arriva dopo un rifiuto RLS non rimette il conteggio vecchio', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rispondiMontaggio: (piatti: Dish[]) => void = () => {};
    vi.mocked(leggiRepertorio).mockReturnValueOnce(new Promise((r) => { rispondiMontaggio = r; }));
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    const campo = await screen.findByDisplayValue('Colazione');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    const MERENDA: MealSlotDef = { id: 'sd-9', nome: 'Merenda', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
    vi.mocked(leggiSlotDefs).mockResolvedValue([COLAZIONE, PRANZO, CENA, MERENDA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto({ id: 'd-9', slotDefId: 'sd-9' })]);
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce({ code: '42501', message: 'new row violates row-level security policy' });
    fireEvent.change(campo, { target: { value: 'Brunch' } });
    fireEvent.blur(campo);
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    // Arriva ora la lettura partita al montaggio, con la casa di prima: nessun piatto.
    await act(async () => { rispondiMontaggio([]); });
    fireEvent.click(await screen.findByLabelText('Rimuovi Merenda'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  // Lo stesso caso per la rilettura partita dalla ✕: se risponde dopo un rifiuto RLS è della casa di
  // prima, e la rimozione che l'aspettava (su un pasto della casa di prima) non va avanti.
  it('la rilettura della ✕ che arriva dopo un rifiuto RLS non rimette il conteggio vecchio', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rispondiTocco: (piatti: Dish[]) => void = () => {};
    vi.mocked(leggiRepertorio)
      .mockReturnValueOnce(new Promise(() => {}))
      .mockReturnValueOnce(new Promise((r) => { rispondiTocco = r; }));
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    const campo = await screen.findByDisplayValue('Colazione');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(2));
    const MERENDA: MealSlotDef = { id: 'sd-9', nome: 'Merenda', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
    vi.mocked(leggiSlotDefs).mockResolvedValue([COLAZIONE, PRANZO, CENA, MERENDA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto({ id: 'd-9', slotDefId: 'sd-9' })]);
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce({ code: '42501', message: 'new row violates row-level security policy' });
    fireEvent.change(campo, { target: { value: 'Brunch' } });
    fireEvent.blur(campo);
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    await act(async () => { rispondiTocco([]); });
    fireEvent.click(await screen.findByLabelText('Rimuovi Merenda'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('se anche la rilettura del repertorio fallisce non toglie niente e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiRepertorio).mockRejectedValueOnce(new Error('rete')).mockRejectedValueOnce(new Error('rete'));
    montaPannello('gestione-pasti', { pasti: QUATTRO });
    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «al massimo di 6 pasti il pulsante di aggiunta è disattivato»: ora non c'è proprio (frame 07).
  it('a sei pasti AGGIUNGI PASTO non c’è e la nota dice il massimo', async () => {
    const sei: MealSlotDef[] = [
      COLAZIONE, PRANZO, CENA,
      { id: 'sd-4', nome: 'Spuntino mattina', posizione: 3, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-5', nome: 'Spuntino pomeriggio', posizione: 4, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-6', nome: 'Dopocena', posizione: 5, assenzeAbituali: ASSENZE_VUOTE },
    ];
    montaPannello('gestione-pasti', { pasti: sei });
    await screen.findByText('6 DI 6');
    expect(screen.queryByText('AGGIUNGI PASTO')).not.toBeInTheDocument();
    expect(screen.getByText('Sei pasti sono il massimo.')).toBeInTheDocument();
    for (const d of sei) expect(screen.getByLabelText(`Rimuovi ${d.nome}`)).toBeEnabled();
  });

  // Migra «aggiunge un pasto sotto il massimo e lo salva con un id generato».
  it('AGGIUNGI PASTO crea Nuovo pasto in fondo, a casa tutti i giorni, col campo a fuoco', async () => {
    montaPannello('gestione-pasti');
    await screen.findByText('3 DI 6');
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI PASTO' }));
    await waitFor(() => expect(screen.getByText('4 DI 6')).toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato).toHaveLength(4);
    expect(salvato[3]).toMatchObject({ nome: 'Nuovo pasto', posizione: 3, assenzeAbituali: ASSENZE_VUOTE });
    expect(typeof salvato[3].id).toBe('string');
    expect(salvato[3].id.length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Nuovo pasto')).toHaveFocus();
  });

  // Migra «la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva».
  it('su spento sul primo, giù spento sull’ultimo; riordinare aggiorna le posizioni e salva', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    expect(screen.getByLabelText('Sposta Colazione in alto')).toBeDisabled();
    expect(screen.getByLabelText('Sposta Cena in basso')).toBeDisabled();
    expect(screen.getByLabelText('Sposta Colazione in basso')).toBeEnabled();
    expect(screen.getByLabelText('Sposta Cena in alto')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...PRANZO, posizione: 0 },
      { ...COLAZIONE, posizione: 1 },
      { ...CENA, posizione: 2 },
    ], { soloTolti: [] }));
  });

  // Migra «rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato».
  it('il nome si salva all’uscita dal campo, non a ogni carattere', async () => {
    montaPannello('gestione-pasti');
    const campo = await screen.findByDisplayValue('Colazione');
    fireEvent.change(campo, { target: { value: 'Brunch' } });
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    fireEvent.blur(campo);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([{ ...COLAZIONE, nome: 'Brunch' }, PRANZO, CENA], { soloTolti: [] }));
  });

  it('un nome vuoto diventa Pasto', async () => {
    montaPannello('gestione-pasti');
    const campo = await screen.findByDisplayValue('Colazione');
    fireEvent.change(campo, { target: { value: '   ' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([{ ...COLAZIONE, nome: 'Pasto' }, PRANZO, CENA], { soloTolti: [] }));
  });

  it('mentre salva la riga è a 0,5', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    vi.mocked(salvaSlotDefs).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));
    await waitFor(() => expect(screen.getByTestId('riga-pasto-sd-2')).toHaveStyle({ opacity: '0.5' }));
  });

  // Migra «con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server» (C3).
  // La semina sta nel provider (Task 6): qui si guarda che arrivi fino alla sotto-schermata.
  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva sul server', async () => {
    montaPannello('gestione-pasti', { pasti: [] });
    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.getByText('4 DI 6')).toBeInTheDocument();
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato.map((p) => p.nome)).toEqual(['Colazione', 'Spuntino', 'Pranzo', 'Cena']);
    expect(salvato[1].assenzeAbituali).toEqual([false, false, false, false, false, true, true]);
    expect(salvato[2].assenzeAbituali).toEqual([true, true, true, true, true, false, false]);
  });

  // Review di correttezza, punto 3: un pasto creato in questa sessione non è nel conteggio, e vale 0.
  it('un pasto appena aggiunto si toglie al tocco, senza dialogo', async () => {
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' })] });
    await screen.findByText('4 DI 6');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI PASTO' }));
    const campo = await screen.findByDisplayValue('Nuovo pasto');
    fireEvent.blur(campo);
    fireEvent.click(screen.getByLabelText('Rimuovi Nuovo pasto'));
    await waitFor(() => expect(screen.queryByDisplayValue('Nuovo pasto')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledTimes(2);
    expect(vi.mocked(salvaSlotDefs).mock.calls[1][0].map((p) => p.id)).toEqual(['sd-1', 'sd-2', 'sd-3', 'sd-4']);
    expect(leggiRepertorio).toHaveBeenCalledTimes(1);
  });

  // Dopo un rifiuto RLS i pasti a schermo sono di un'altra casa: il conteggio letto al montaggio
  // non li conosce, e senza scartarlo un pasto con piatti si toglierebbe al tocco.
  it('dopo un rifiuto RLS (la casa è cambiata) la ✕ rilegge il repertorio e chiede il dialogo', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    const campo = await screen.findByDisplayValue('Colazione');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    const MERENDA: MealSlotDef = { id: 'sd-9', nome: 'Merenda', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
    vi.mocked(leggiSlotDefs).mockResolvedValue([COLAZIONE, PRANZO, CENA, MERENDA]);
    vi.mocked(leggiRepertorio).mockResolvedValue([piatto({ id: 'd-9', slotDefId: 'sd-9' })]);
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce({ code: '42501', message: 'new row violates row-level security policy' });
    fireEvent.change(campo, { target: { value: 'Brunch' } });
    fireEvent.blur(campo);
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText('Rimuovi Merenda'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    expect(leggiRepertorio).toHaveBeenCalledTimes(2);
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('la nota di oggi dice «nel Piano»', async () => {
    montaPannello('gestione-pasti');
    expect(await screen.findByText(/nel Piano correggi solo le eccezioni/)).toBeInTheDocument();
    expect(screen.queryByText(/nella Settimana/)).not.toBeInTheDocument();
  });
});
