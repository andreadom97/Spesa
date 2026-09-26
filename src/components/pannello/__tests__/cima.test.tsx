import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Step 1), identico in ogni test del pannello.
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

import { leggiImpostazioni } from '@/data/impostazioni';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '@/data/dispensa';
import { esci } from '@/data/sessione';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { usePannello } from '../PannelloProvider';
import { azzera, montaPannello, impostazioni, voce, COLAZIONE, CENA } from './aiuti';
import { auth, percorso, router, UTENTE } from './finti';

/** L'indirizzo verso cui il pannello ha navigato: push o replace, come ha deciso il Task 6 dopo la sonda. */
function navigatoA(): string[] {
  return [...router.push.mock.calls, ...router.replace.mock.calls].map((c) => String(c[0]));
}

describe('La cima del pannello', () => {
  beforeEach(() => azzera());
  afterEach(() => vi.useRealTimers());

  it('durante il caricamento le tessere ci sono e si toccano; al posto dei blocchi CARICO…', async () => {
    vi.mocked(leggiImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    montaPannello('cima');
    expect(await screen.findByRole('status')).toHaveTextContent('CARICO…');
    for (const nome of ['Piatti', 'Importa un piano', 'Casa condivisa', 'Esporta i tuoi dati']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${nome}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('SI CAMBIANO DI RADO')).toBeInTheDocument();
    expect(screen.queryByText('La settimana di base')).not.toBeInTheDocument();
  });

  it('se il caricamento fallisce le tessere restano, e RIPROVA rilegge', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    expect(await screen.findByText('Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Piatti/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByText('La settimana di base')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('i cinque blocchi, coi valori veri nelle righe, e la versione in fondo', async () => {
    montaPannello('cima');
    expect(await screen.findByText('La settimana di base')).toBeInTheDocument();
    for (const t of ['Come calcolo la lista', 'Come la vedi in corsia', 'I tuoi dati', 'Account']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    // PRANZO è fuori il lunedì: una cella fuori casa.
    expect(screen.getByRole('button', { name: /Pasti a casa.*1 FUORI CASA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gestione dei pasti.*3 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotazione del piano.*NESSUNA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadenza dei controlli.*OGNI 3 MESI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ })).toBeInTheDocument();
    expect(screen.getByText('Andrea')).toBeInTheDocument();
    expect(screen.getByText('andrea@esempio.it')).toBeInTheDocument();
    expect(screen.getByText(/^Versione /)).toBeInTheDocument();
  });

  it('nessuna cella fuori casa, due settimane e l’ordine di base', async () => {
    montaPannello('cima', {
      pasti: [COLAZIONE, CENA, { ...COLAZIONE, id: 'sd-9', nome: 'Merenda', posizione: 2 }],
      impostazioni: { settimaneCiclo: 2, cicloOrigine: '2026-09-21', ordineAree: [...ORDINE_AREE_DEFAULT], giorniControllo: 30 },
    });
    expect(await screen.findByRole('button', { name: /Pasti a casa.*NESSUNO FUORI CASA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotazione del piano.*2 SETT\./ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ordine delle aree.*DI BASE/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadenza dei controlli.*OGNI MESE/ })).toBeInTheDocument();
  });

  it('la tessera Casa dice lo stato della casa, e niente se la lettura fallisce', async () => {
    const { unmount } = montaPannello('cima', { casa: { ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['1', '2'] } });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*CON 3 PERSONE/ })).toBeInTheDocument();
    unmount();

    const secondo = montaPannello('cima', { casa: { ruolo: 'membro', email: ['luca@esempio.it'], id: ['p'] } });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*NELLA CASA DI LUCA/ })).toBeInTheDocument();
    secondo.unmount();

    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { casa: new Error('rete') });
    await screen.findByText('La settimana di base');
    expect(screen.getByRole('button', { name: /^Casa condivisa/ })).not.toHaveTextContent(/SOLO TU|PERSONE|NELLA CASA/);
    errore.mockRestore();
  });

  it('Piatti e Importa lasciano il pannello e salvano l’origine: la pagina sotto e la cima', async () => {
    percorso.valore = '/dispensa';
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Piatti/ }));
    await waitFor(() => expect(navigatoA()).toContain('/piatti?da=impostazioni'));
    expect(JSON.parse(sessionStorage.getItem('spesa:origine-pannello') ?? 'null')).toEqual({ pathname: '/dispensa', sotto: 'cima' });
  });

  it('Importa un piano porta a /importa', async () => {
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Importa un piano/ }));
    await waitFor(() => expect(navigatoA()).toContain('/importa'));
  });

  it('Casa ed Esporta aprono la loro sotto-schermata', async () => {
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Casa condivisa/ }));
    expect(await screen.findByRole('heading', { name: 'Casa condivisa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Esporta i tuoi dati/ }));
    expect(await screen.findByRole('heading', { name: 'Esporta i tuoi dati' })).toBeInTheDocument();
  });

  // Migra «porta all elenco degli ingredienti»: l'elenco resta raggiungibile, ora dalla riga.
  it('la riga Ingredienti apre la sotto-schermata degli ingredienti', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Ingredienti/ }));
    expect(await screen.findByRole('heading', { name: 'Ingredienti' })).toBeInTheDocument();
  });

  // Migra «il link ordine dei reparti mostra l'anteprima e il riepilogo nell'ordine reale»:
  // l'anteprima è tolta (log §4.4); la riga dice PERSONALIZZATO / DI BASE e apre le aree.
  it('la riga Ordine delle aree dice se l’ordine è di base e apre la sotto-schermata', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ }));
    expect(await screen.findByRole('heading', { name: 'Ordine delle aree' })).toBeInTheDocument();
  });

  it('la nota del non ricomprato c’è solo con qualcosa da dire', async () => {
    const { unmount } = montaPannello('cima', { risparmio: [] });
    await screen.findByText('I tuoi dati');
    expect(screen.queryByText(/^Da quando usi Dispesa/)).not.toBeInTheDocument();
    unmount();
    montaPannello('cima', { risparmio: [voce({ confezioniEvitate: 1, quantitaEvitata: 500 })] });
    expect(await screen.findByText('Da quando usi Dispesa: 1 confezione non ricomprata · 500 g')).toBeInTheDocument();
  });

  it('Cancella la dispensa chiede conferma; ANNULLA non cancella niente', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Cancellare la dispensa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(cancellaDispensa).not.toHaveBeenCalled();
  });

  it('CANCELLA cancella, avvisa la Dispensa e scrive quando nella nota della riga', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 25, 10, 14));
    const ascolta = vi.fn();
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'CANCELLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(cancellaDispensa).toHaveBeenCalledTimes(1);
    expect(ascolta).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Cancellata il 25/09 alle 10:14.')).toBeInTheDocument();
    window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
  });

  it('se la cancellazione fallisce il dialogo resta aperto con l’errore', async () => {
    vi.mocked(cancellaDispensa).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'CANCELLA' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a cancellare la dispensa. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/^Cancellata il/)).not.toBeInTheDocument();
  });

  it('Esci chiede conferma con l’email, col tasto primario; ESCI chiama esci()', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Esci/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Uscire da Dispesa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('I tuoi dati restano. Per rientrare ti mandiamo un link a andrea@esempio.it.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI' }));
    await waitFor(() => expect(esci).toHaveBeenCalledTimes(1));
  });

  it('se esci() fallisce il dialogo lo dice e resta aperto', async () => {
    vi.mocked(esci).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Esci/ }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a farti uscire. Riprova.')).toBeInTheDocument();
  });

  // Decisione del controller del 26/09: leggiUtente non lancia, e senza email il testo di §D
  // direbbe «un link a .».
  it('senza email letta il dialogo di Esci dice «via email», non «a .»', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { ...UTENTE, email: '' } }, error: null });
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Esci/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('I tuoi dati restano. Per rientrare ti mandiamo un link via email.')).toBeInTheDocument();
    expect(within(dialogo).queryByText(/link a /)).not.toBeInTheDocument();
  });

  it('senza nome né email la riga informativa dell’Account non c’è, la riga Esci sì', async () => {
    // Nessun utente: leggiUtente torna nome ed email vuoti.
    auth.getUser.mockImplementationOnce(async () => ({ data: { user: null as unknown as typeof UTENTE }, error: null }));
    montaPannello('cima');
    const esciRiga = await screen.findByRole('button', { name: /^Esci/ });
    const account = screen.getByText('Account').closest('section')!;
    expect(screen.queryByText('Andrea')).not.toBeInTheDocument();
    // Il blocco ha il titolo e una riga sola, Esci: nessun figlio vuoto sopra, col suo filetto.
    expect(within(account).getAllByRole('button')).toEqual([esciRiga]);
    expect(account.children).toHaveLength(2);
    expect(account.children[1]).toContainElement(esciRiga);
  });

  it('la nota Cancellata dura fino alla chiusura del pannello, anche passando da una sotto-schermata (§D)', async () => {
    function Riapri() {
      const { apri } = usePannello();
      return <button type="button" onClick={() => apri()}>riapri</button>;
    }
    montaPannello('cima', undefined, <Riapri />);
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'CANCELLA' }));
    expect(await screen.findByText(/^Cancellata il /)).toBeInTheDocument();
    // La cima si smonta entrando in una sotto-schermata: la nota vive nel provider.
    fireEvent.click(screen.getByRole('button', { name: /^Esporta i tuoi dati/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByText(/^Cancellata il /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi le impostazioni' }));
    fireEvent.click(screen.getByRole('button', { name: 'riapri' }));
    expect(await screen.findByText('Svuota quello che hai in casa. I piatti e il piano restano.')).toBeInTheDocument();
    expect(screen.queryByText(/^Cancellata il /)).not.toBeInTheDocument();
  });

  it('la riga Esci ha il nome in --errore (§B.4)', async () => {
    montaPannello('cima', { impostazioni: impostazioni() });
    const esciRiga = await screen.findByRole('button', { name: /^Esci/ });
    expect(within(esciRiga).getByText('Esci')).toHaveStyle({ color: 'var(--errore)' });
  });
});
