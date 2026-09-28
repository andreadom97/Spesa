import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import type { MealSlotDef } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import { SlotDockProvider } from '@/components/dock-slot';
import { Controlla } from '../Controlla';

const slot = (id: string, nome: string, posizione: number): MealSlotDef => ({ id, nome, posizione, assenzeAbituali: Array(7).fill(false) });
const SLOTS = [slot('s-col', 'Colazione', 0), slot('s-pranzo', 'Pranzo', 3), slot('s-cena', 'Cena', 5)];
const STATO: StatoRevisione = { passo: 'revisione', mappaturaPasti: { colazione: 's-col', cena: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

function cenaConOlive(): PastoEstratto {
  const cena = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  cena.piatti[0].righeFisse[1] = { ...cena.piatti[0].righeFisse[1], quantita: 3, unita: 'pz' };
  return cena;
}
const STATO_PRONTO: StatoRevisione = { ...STATO, mappaturaPasti: { ...STATO.mappaturaPasti, condimenti: 's-cena' }, correzioni: { '1-1-1': cenaConOlive() } };

let slotDock: HTMLElement;
beforeEach(() => {
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  slotDock.remove();
});

function rendi(stato: StatoRevisione = STATO, piano: PianoEstratto = PIANO_MENU_SETTIMANALE) {
  const onStato = vi.fn();
  render(<SlotDockProvider slot={slotDock}><Controlla piano={piano} stato={stato} slotDefs={SLOTS} onStato={onStato} /></SlotDockProvider>);
  return onStato;
}
const conferma = () => within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'CONFERMA I PASTI' });

describe('Controlla', () => {
  it('la frase, i due dubbi in cima e il Dock spento', () => {
    rendi();
    expect(screen.getByText('Ho letto 2 settimane, 3 giorni e 6 pasti. Ti chiedo solo quello che non so.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Da sistemare 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Condimenti/ })).toHaveTextContent('Scegli');
    expect(screen.getByText('Sett. 1 · Martedì · cena · Merluzzo')).toBeInTheDocument();
    expect(screen.getByText("Sul foglio non c'è un peso: scrivi quanto ne usi e in che unità.")).toBeInTheDocument();
    expect(conferma()).toBeDisabled();
  });

  it('abbinare i condimenti scrive la mappatura', () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: /Condimenti/ }));
    const foglio = screen.getByRole('dialog', { name: 'Condimenti: in quale pasto li usi?' });
    fireEvent.click(within(foglio).getByRole('radio', { name: 'Cena' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    expect(onStato.mock.calls[0][0].mappaturaPasti).toEqual({ colazione: 's-col', cena: 's-cena', condimenti: 's-cena' });
  });

  it('le olive: il numero e poi la pillola scrivono la correzione', () => {
    const onStato = rendi();
    const campo = screen.getByRole('textbox', { name: 'Quantità di olive taggiasche' });
    fireEvent.change(campo, { target: { value: '3' } });
    fireEvent.blur(campo);
    expect(onStato).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Unità di olive taggiasche' })).getByRole('button', { name: 'PZ' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(stato.correzioni['1-1-1'].piatti[0].righeFisse[1]).toMatchObject({ quantita: 3, unita: 'pz', quantitaInferita: false });
  });

  it('tutto a posto: la frase cambia, il contatore dice FATTO, un tocco conferma tutto', () => {
    const onStato = rendi(STATO_PRONTO);
    expect(screen.getByText('Niente più da sistemare. Confermo i 6 pasti così: puoi sempre aprire un giorno e correggerlo.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Da sistemare Fatto' })).toBeInTheDocument();
    fireEvent.click(conferma());
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(stato.passo).toBe('formati');
    expect(stato.pastiConfermati).toHaveLength(6);
  });

  it('dove vanno i pasti, e i giorni per settimana', () => {
    rendi();
    expect(screen.getByRole('heading', { name: 'Dove vanno i pasti 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Colazione/ })).toHaveTextContent('Colazione');
    expect(screen.getByRole('heading', { name: 'Settimana 1 5' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settimana 2 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apri Martedì, settimana 1' })).toHaveTextContent('Porridge · Merluzzo o Tonno in insalata');
  });

  it('il foglio del giorno: la modifica risale una volta sola, alla chiusura', () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì, settimana 1' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì, settimana 1' });
    const tacchino = within(foglio).getByRole('textbox', { name: 'Quantità di fesa di tacchino' });
    fireEvent.change(tacchino, { target: { value: '150' } });
    fireEvent.blur(tacchino);
    expect(onStato).not.toHaveBeenCalled();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi Lunedì, settimana 1' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    expect((onStato.mock.calls[0][0] as StatoRevisione).correzioni['1-0-1'].piatti[0].righeFisse[0].quantita).toBe(150);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('il foglio del giorno: un pasto già vuoto non compare, uno svuotato ora dice «Pasto tolto»', () => {
    rendi({ ...STATO, correzioni: { '1-0-2': { nomeOriginale: 'condimenti', piatti: [] } } });
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì, settimana 1' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì, settimana 1' });
    expect(within(foglio).queryByRole('heading', { name: 'Condimenti' })).toBeNull();
    expect(within(foglio).queryByText('Pasto tolto: nessun piatto da creare per questo giorno.')).toBeNull();
    fireEvent.click(within(foglio).getByRole('button', { name: "Togli fiocchi d'avena" }));
    fireEvent.click(within(foglio).getByRole('button', { name: 'Togli latte parzialmente scremato' }));
    expect(within(foglio).getByText('Pasto tolto: nessun piatto da creare per questo giorno.')).toBeInTheDocument();
  });

  it("l'indietro di Android chiude il foglio del giorno e salva", () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì, settimana 1' }));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    const foglio = screen.getByRole('dialog', { name: 'Lunedì, settimana 1' });
    fireEvent.click(within(foglio).getByRole('button', { name: 'Togli pane di segale' }));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onStato).toHaveBeenCalledTimes(1);
    expect((onStato.mock.calls[0][0] as StatoRevisione).correzioni['1-0-1'].piatti[0].componenti[0].opzioni).toHaveLength(1);
  });

  it('togliere un dubbio in più pasti passa dal dialogo', async () => {
    const giorno = (g: number) => ({
      giorno: g, titolo: null,
      pasti: [
        { nomeOriginale: 'pranzo', piatti: [{ nome: 'Insalata', descrizione: null, componenti: [], righeFisse: [{ alimento: 'lattuga', quantita: 80, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'lattuga 80g' }] }] },
        { nomeOriginale: 'condimenti', piatti: [{ nome: 'Condimenti', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olio q.b.' }] }] },
      ],
    });
    const piano: PianoEstratto = { archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [], settimane: [{ numero: 1, giorni: [0, 1, 2].map(giorno) }] };
    const onStato = rendi({ ...STATO, mappaturaPasti: { pranzo: 's-pranzo', condimenti: 's-pranzo' } }, piano);
    expect(screen.getByText('In 3 pasti')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Togli olio' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Togliere olio da 3 pasti?' });
    await act(async () => { fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' })); });
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(Object.values(stato.correzioni).every((p) => p.piatti.length === 0)).toBe(true);
  });

  it('una quantità proposta dall\'AI sta in «Da controllare» e non blocca', () => {
    const piano = structuredClone(PIANO_MENU_SETTIMANALE);
    piano.settimane[0].giorni[1].pasti[1].piatti[0].righeFisse[1] = { alimento: 'olive taggiasche', quantita: 3, unita: 'pz', quantitaInferita: true, testoOriginale: '2-3 olive taggiasche' };
    rendi({ ...STATO, mappaturaPasti: { ...STATO.mappaturaPasti, condimenti: 's-cena' } }, piano);
    expect(screen.getByRole('heading', { name: 'Da controllare 1' })).toBeInTheDocument();
    expect(screen.getByText('Sul foglio: «2-3 olive taggiasche» · quantità proposta da me')).toBeInTheDocument();
    expect(conferma()).toBeEnabled();
  });

  // --- Correzioni giro 1 ---

  it("l'indietro con la tastiera aperta: il numero non salvato risale nell'unico onStato, e non resta indietro", () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì, settimana 1' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì, settimana 1' });
    const tacchino = within(foglio).getByRole('textbox', { name: 'Quantità di fesa di tacchino' });
    act(() => { tacchino.focus(); });
    fireEvent.change(tacchino, { target: { value: '150' } });
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onStato).toHaveBeenCalledTimes(1);
    expect((onStato.mock.calls[0][0] as StatoRevisione).correzioni['1-0-1'].piatti[0].righeFisse[0].quantita).toBe(150);
    // Il giorno dopo si apre e si chiude senza modifiche: niente valori rimasti in sospeso.
    fireEvent.click(screen.getByRole('button', { name: 'Apri Martedì, settimana 1' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Martedì, settimana 1' })).getByRole('button', { name: 'Chiudi Martedì, settimana 1' }));
    expect(onStato).toHaveBeenCalledTimes(1);
  });

  it('con un pasto solo la frase dice «il pasto»', () => {
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Pesce', descrizione: null, componenti: [], righeFisse: [{ alimento: 'orata', quantita: 150, unita: 'g', quantitaInferita: false, testoOriginale: 'orata 150g' }] }] }] }] }],
    };
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' } }, piano);
    expect(screen.getByText('Niente più da sistemare. Confermo il pasto così: puoi sempre aprire un giorno e correggerlo.')).toBeInTheDocument();
    expect(conferma()).toBeEnabled();
  });

  it('tutti i pasti tolti: la frase lo dice e CONFERMA I PASTI resta spento', () => {
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Pesce', descrizione: null, componenti: [], righeFisse: [{ alimento: 'orata', quantita: 150, unita: 'g', quantitaInferita: false, testoOriginale: 'orata 150g' }] }] }] }] }],
    };
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': { nomeOriginale: 'cena', piatti: [] } } }, piano);
    expect(screen.getByText("Hai tolto tutti i pasti: non c'è niente da confermare. Se vuoi ripartire, ricomincia l'import.")).toBeInTheDocument();
    expect(conferma()).toBeDisabled();
  });

  it('scegliere lo slot già scelto non scrive niente', () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: /Colazione/ }));
    const foglio = screen.getByRole('dialog', { name: 'Colazione: a quale pasto corrisponde?' });
    fireEvent.click(within(foglio).getByRole('radio', { name: 'Colazione' }));
    expect(onStato).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con un livello aperto, aprirne un altro non fa niente', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: /Condimenti/ }));
    expect(screen.getByRole('dialog', { name: 'Condimenti: in quale pasto li usi?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì, settimana 1' }));
    expect(screen.queryByRole('dialog', { name: 'Lunedì, settimana 1' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Condimenti: in quale pasto li usi?' })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
  });

  it('una bozza vecchia al passo revisione, con conferme parziali e correzioni della Revisione di prima, si apre e si conferma', () => {
    const cena = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
    cena.piatti[0].nome = 'Merluzzo al forno';
    cena.piatti[0].righeFisse[1] = { ...cena.piatti[0].righeFisse[1], quantita: 3, unita: 'pz' };
    const vecchia: StatoRevisione = {
      passo: 'revisione',
      mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
      pastiConfermati: ['1-0-0', '1-0-1'],
      correzioni: { '1-1-1': cena },
      ingredientiNuovi: [],
    };
    const onStato = rendi(vecchia);
    expect(screen.getByRole('button', { name: 'Apri Martedì, settimana 1' })).toHaveTextContent('Porridge · Merluzzo al forno o Tonno in insalata');
    fireEvent.click(conferma());
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(stato.passo).toBe('formati');
    expect([...stato.pastiConfermati].sort()).toEqual(['1-0-0', '1-0-1', '1-0-2', '1-1-0', '1-1-1', '2-0-0']);
    expect(stato.correzioni['1-1-1'].piatti[0].nome).toBe('Merluzzo al forno');
  });

  // --- Correzioni della review finale ---

  it('I1: una riga di «Da controllare» con valori diversi nei giorni ha l\'unità, e il numero salva', () => {
    const piano = pianoConSale();
    const lunedi = structuredClone(piano.settimane[0].giorni[0].pasti[0]);
    lunedi.piatti[0].righeFisse[0] = { ...lunedi.piatti[0].righeFisse[0], quantita: 3, quantitaInferita: false };
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': lunedi } }, piano);
    expect(screen.getByText('Sul foglio: «sale q.b.» · quantità proposta da me · valori diversi nei giorni')).toBeInTheDocument();
    const campo = screen.getByRole('textbox', { name: 'Quantità di sale' });
    expect(campo).toHaveValue('');
    fireEvent.change(campo, { target: { value: '4' } });
    fireEvent.blur(campo);
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(Object.values(stato.correzioni).map((p) => p.piatti[0].righeFisse[0])).toEqual([
      expect.objectContaining({ quantita: 4, unita: 'g' }),
      expect.objectContaining({ quantita: 4, unita: 'g' }),
    ]);
  });
});

/** Una settimana di `giorni` giorni: ogni giorno una cena con la Zuppa e «sale q.b.», 2 g proposti dall'AI. */
function pianoConSale(giorni = 2): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: Array.from({ length: giorni }, (_, g) => ({
        giorno: g,
        titolo: null,
        pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: 2, unita: 'g' as const, quantitaInferita: true, testoOriginale: 'sale q.b.' }] }] }],
      })),
    }],
  };
}
