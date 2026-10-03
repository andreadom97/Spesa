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

  it('il foglio del giorno: una riga a cucchiai non precompila il numero dei cucchiai come quantità (spec 8c §C)', () => {
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'pranzo', piatti: [{ nome: 'Insalata', descrizione: null, componenti: [], righeFisse: [
        { alimento: 'olio', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di olio' },
      ] }] }] }] }],
    };
    const onStato = rendi({ ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì' });
    // Il campo è vuoto (non «1»): un tocco su «ml» non salva «1 cucchiaio» come 1 ml.
    expect(within(foglio).getByRole('textbox', { name: 'Quantità di olio' })).toHaveValue('');
    expect(within(foglio).getByText('Sul foglio: «1 cucchiaio di olio»')).toBeInTheDocument();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi Lunedì' }));
    expect(onStato).not.toHaveBeenCalled();
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
        { nomeOriginale: 'condimenti', piatti: [{ nome: 'Condimenti', descrizione: null, componenti: [], righeFisse: [{ alimento: 'olio', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olio a filo' }] }] },
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
    expect(screen.getByText('Sul foglio: «sale fino» · quantità proposta da me · valori diversi nei giorni')).toBeInTheDocument();
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

  it('I2: lo stesso gruppo con unità diverse nei giorni ha la proposta dell\'unità più frequente, non blocca, e una risposta col solo numero vale per tutti', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': conOlive(piano, 0, 0, 3, 'pz'), '1-1-0': conOlive(piano, 1, 0, 20, 'g') } }, piano);
    expect(screen.getByRole('heading', { name: 'Da sistemare Fatto' })).toBeInTheDocument();
    expect(screen.queryByText('Nei giorni ci sono unità diverse: scegline una per tutti.')).toBeNull();
    expect(screen.getByText("Sul foglio: «2-3 olive taggiasche» · l'unità più usata, proposta da me")).toBeInTheDocument();
    expect(conferma()).toBeEnabled();
    // Le pillole spariscono: la proposta ha già l'unità (3 pz, a pari merito quella della prima riga).
    expect(screen.queryByRole('group', { name: 'Unità di olive taggiasche' })).toBeNull();
    const campo = screen.getByRole('textbox', { name: 'Quantità di olive taggiasche' });
    expect(campo).toHaveValue('3');
    fireEvent.change(campo, { target: { value: '4' } });
    fireEvent.blur(campo);
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect([stato.correzioni['1-0-0'], stato.correzioni['1-1-0']].map((p) => p.piatti[0].righeFisse[1])).toEqual([
      expect.objectContaining({ quantita: 4, unita: 'pz' }),
      expect.objectContaining({ quantita: 4, unita: 'pz' }),
    ]);
  });

  it('I2: nel foglio del giorno la riga irrisolta prende l\'unità da una riga già risolta dello stesso gruppo', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': conOlive(piano, 0, 0, 3, 'pz') } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Martedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Martedì' });
    expect(within(foglio).getByRole('textbox', { name: 'Quantità di olive taggiasche' })).toHaveValue('');
    expect(within(foglio).queryByRole('group', { name: 'Unità di olive taggiasche' })).toBeNull();
    expect(within(foglio).getByText("Sul foglio non c'è un peso: scrivi quanto ne usi.")).toBeInTheDocument();
  });

  it('I2: nello stesso foglio, risposta la prima occorrenza, la seconda non ha più le pillole', () => {
    const piano = pianoConOlive([['pranzo', 'cena']]);
    const onStato = rendi({ ...STATO, mappaturaPasti: { pranzo: 's-pranzo', cena: 's-cena' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì' });
    expect(within(foglio).getAllByRole('group', { name: 'Unità di olive taggiasche' })).toHaveLength(2);
    const [pranzo] = within(foglio).getAllByRole('textbox', { name: 'Quantità di olive taggiasche' });
    fireEvent.change(pranzo, { target: { value: '3' } });
    fireEvent.blur(pranzo);
    fireEvent.click(within(within(foglio).getAllByRole('group', { name: 'Unità di olive taggiasche' })[0]).getByRole('button', { name: 'PZ' }));
    // Il pranzo tiene le pillole (l'unità si cambia finché è l'unica risposta); la cena prende PZ.
    expect(within(foglio).getAllByRole('group', { name: 'Unità di olive taggiasche' })).toHaveLength(1);
    const cena = within(foglio).getAllByRole('textbox', { name: 'Quantità di olive taggiasche' })[1];
    fireEvent.change(cena, { target: { value: '4' } });
    fireEvent.blur(cena);
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi Lunedì' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect([stato.correzioni['1-0-0'], stato.correzioni['1-0-1']].map((p) => p.piatti[0].righeFisse[1])).toEqual([
      expect.objectContaining({ quantita: 3, unita: 'pz' }),
      expect.objectContaining({ quantita: 4, unita: 'pz' }),
    ]);
  });

  it("I3: un gruppo unico in un piatto unico: la X apre il dialogo con la cascata, e TOGLI svuota il pasto", async () => {
    const piano = pianoConOlive([['cena'], ['pranzo']]);
    piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse.splice(0, 1);
    piano.settimane[0].giorni[1].pasti[0].piatti[0].righeFisse.splice(1, 1);
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena', pranzo: 's-pranzo' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Togli olive taggiasche' }));
    expect(onStato).not.toHaveBeenCalled();
    const dialogo = screen.getByRole('alertdialog', { name: 'Togliere olive taggiasche?' });
    expect(within(dialogo).getByText('Le righe spariscono da tutti i pasti in cui compaiono. Sparisce anche 1 piatto rimasto senza ingredienti.')).toBeInTheDocument();
    expect(within(dialogo).queryByText(/editor del piatto/)).toBeNull();
    await act(async () => { fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' })); });
    expect(onStato).toHaveBeenCalledTimes(1);
    expect((onStato.mock.calls[0][0] as StatoRevisione).correzioni['1-0-0']).toEqual({ nomeOriginale: 'cena', piatti: [] });
  });

  it('I3: più piatti spariti lo dicono al plurale, e il titolo conta i pasti effettivi (M2)', () => {
    const piano = pianoConOlive([['cena'], ['cena'], ['cena']]);
    for (const g of piano.settimane[0].giorni) g.pasti[0].piatti[0].righeFisse.splice(0, 1);
    // Il lunedì ha già perso il suo piatto dal foglio del giorno: restano due pasti.
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-0-0': { nomeOriginale: 'cena', piatti: [] } } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Togli olive taggiasche' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Togliere olive taggiasche da 2 pasti?' });
    expect(within(dialogo).getByText('Le righe spariscono da tutti i pasti in cui compaiono. Spariscono anche 2 piatti rimasti senza ingredienti.')).toBeInTheDocument();
  });

  it('I3: più pasti senza cascata: il dialogo promette l\'editor del piatto', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Togli olive taggiasche' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Togliere olive taggiasche da 2 pasti?' });
    expect(within(dialogo).getByText("Le righe spariscono da tutti i pasti in cui compaiono. Puoi rimetterle dall'editor del piatto, a piano creato.")).toBeInTheDocument();
  });

  it('I3: un pasto solo e niente cascata: la X toglie subito, senza dialogo', () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli olive taggiasche' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onStato).toHaveBeenCalledTimes(1);
    expect((onStato.mock.calls[0][0] as StatoRevisione).correzioni['1-1-1'].piatti[0].righeFisse.map((r) => r.alimento)).toEqual(['filetto di merluzzo']);
  });

  it('un giorno senza pasti non si apre: «Nessun pasto» e nessun tasto', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' }, correzioni: { '1-1-0': { nomeOriginale: 'cena', piatti: [] } } }, piano);
    expect(screen.getByText('Nessun pasto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apri Martedì' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Apri Lunedì' })).toBeInTheDocument();
  });

  it('le proposte compilate stanno in «Da controllare» e non bloccano; il q.b. non si chiede (spec 8c §B, §C, §D)', () => {
    const piano: PianoEstratto = {
      archetipo: 'giornata_unica', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'pranzo', piatti: [{
        nome: 'Pasta', descrizione: null, componenti: [], righeFisse: [
          { alimento: 'pasta di semola', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'pasta' },
          { alimento: 'olio extravergine di oliva', quantita: 1, unita: 'cucchiaio', quantitaInferita: false, testoOriginale: '1 cucchiaio di olio' },
          { alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'sale q.b.' },
        ],
      }] }] }] }],
    };
    const onStato = rendi({ ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } }, piano);
    expect(screen.getByText('Sul foglio: «pasta» · porzione tipica, proposta da me')).toBeInTheDocument();
    expect(screen.getByText('Sul foglio: «1 cucchiaio di olio» · 1 cucchiaio, quindi 15 ml, proposta da me')).toBeInTheDocument();
    expect(screen.queryByText(/sale q\.b\./)).toBeNull();
    expect(screen.queryByRole('heading', { name: /Da sistemare/ })).toBeNull();
    const conferma = within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'CONFERMA I PASTI' });
    expect(conferma).toBeEnabled();
    fireEvent.click(conferma);
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse).toEqual([
      { alimento: 'pasta di semola', quantita: 80, unita: 'g', quantitaInferita: true, testoOriginale: 'pasta' },
      { alimento: 'olio extravergine di oliva', quantita: 15, unita: 'ml', quantitaInferita: true, testoOriginale: '1 cucchiaio di olio' },
      { alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'sale q.b.' },
    ]);
  });

  it('nel foglio del giorno una riga q.b. si corregge con le pillole, e la stima del lettore non dà l\'unità (review I2, M1)', () => {
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'cena', piatti: [{
        nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [
          { alimento: 'sale', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'sale q.b.' },
          { alimento: 'pepe', quantita: 1, unita: 'g', quantitaInferita: true, testoOriginale: 'pepe q.b.' },
        ],
      }] }] }] }],
    };
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì' });
    // Il q.b. non è un dubbio: niente avviso, ma le pillole sì, perché nessuna riga dice un'unità.
    expect(within(foglio).queryByText(/Sul foglio non c'è un peso/)).toBeNull();
    expect(within(foglio).getByRole('group', { name: 'Unità di sale' })).toBeInTheDocument();
    // Il pepe: la stima (1 g) non è nel campo e non fissa l'unità (S1).
    expect(within(foglio).getByRole('textbox', { name: 'Quantità di pepe' })).toHaveValue('');
    expect(within(foglio).getByRole('group', { name: 'Unità di pepe' })).toBeInTheDocument();
    const sale = within(foglio).getByRole('textbox', { name: 'Quantità di sale' });
    fireEvent.change(sale, { target: { value: '2' } });
    fireEvent.blur(sale);
    fireEvent.click(within(within(foglio).getByRole('group', { name: 'Unità di sale' })).getByRole('button', { name: 'G' }));
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi Lunedì' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse).toEqual([
      { alimento: 'sale', quantita: 2, unita: 'g', quantitaInferita: false, testoOriginale: 'sale q.b.' },
      { alimento: 'pepe', quantita: 1, unita: 'g', quantitaInferita: true, testoOriginale: 'pepe q.b.' },
    ]);
  });

  it('nel foglio del giorno una riga con una proposta compilata non è un dubbio (correzione D4)', () => {
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [{ giorno: 0, titolo: null, pasti: [{ nomeOriginale: 'pranzo', piatti: [{
        nome: 'Pasta', descrizione: null, componenti: [], righeFisse: [
          { alimento: 'pasta di semola', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'pasta' },
          { alimento: 'olive taggiasche', quantita: null, unita: null, quantitaInferita: false, testoOriginale: 'olive' },
        ],
      }] }] }] }],
    };
    rendi({ ...STATO, mappaturaPasti: { pranzo: 's-pranzo' } }, piano);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Lunedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Lunedì' });
    // La pasta ha la porzione tipica: niente avviso. Le olive no (fuori da PORZIONE_TIPICA): il loro avviso resta.
    expect(within(foglio).getAllByText("Sul foglio non c'è un peso: scrivi quanto ne usi e in che unità.")).toHaveLength(1);
  });

  it('Task 12b: lo stesso alimento senza quantità in testi diversi è una domanda sola, con la porzione per categoria', () => {
    const cena = (testoOriginale: string) => [{ nomeOriginale: 'cena', piatti: [{ nome: 'Contorno', descrizione: null, componenti: [], righeFisse: [
      { alimento: 'zucchine', quantita: null, unita: null, quantitaInferita: false, testoOriginale },
    ] }] }];
    const piano: PianoEstratto = {
      archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
      settimane: [{ numero: 1, giorni: [
        { giorno: 0, titolo: null, pasti: cena('zucchine grigliate') },
        { giorno: 1, titolo: null, pasti: cena('zucchine al vapore') },
      ] }],
    };
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' } }, piano);
    expect(screen.getAllByRole('textbox', { name: 'Quantità di zucchine' })).toHaveLength(1);
    expect(screen.getByText('In 2 pasti')).toBeInTheDocument();
    expect(screen.getByText('Sul foglio: «zucchine grigliate» · porzione tipica, proposta da me')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Da sistemare/ })).toBeNull();
    // Nel foglio del martedì, l'altro testo: la riga ha la proposta del gruppo e non è un dubbio.
    fireEvent.click(screen.getByRole('button', { name: 'Apri Martedì' }));
    const foglio = screen.getByRole('dialog', { name: 'Martedì' });
    expect(within(foglio).queryByText(/Sul foglio non c'è un peso/)).toBeNull();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi Martedì' }));
    fireEvent.click(conferma());
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[0]).toMatchObject({ quantita: 200, unita: 'g', quantitaInferita: true });
    expect(stato.correzioni['1-1-0'].piatti[0].righeFisse[0]).toMatchObject({ quantita: 200, unita: 'g', quantitaInferita: true });
  });

  it('Task 12b: senza proposta, una risposta sola vale per tutti i testi dello stesso alimento', () => {
    const piano = pianoConOlive([['cena'], ['cena']]);
    piano.settimane[0].giorni[1].pasti[0].piatti[0].righeFisse[1] = { ...OLIVE, testoOriginale: 'olive nere' };
    const onStato = rendi({ ...STATO, mappaturaPasti: { cena: 's-cena' } }, piano);
    expect(screen.getByRole('heading', { name: 'Da sistemare 1' })).toBeInTheDocument();
    const campo = screen.getByRole('textbox', { name: 'Quantità di olive taggiasche' });
    fireEvent.change(campo, { target: { value: '3' } });
    fireEvent.blur(campo);
    fireEvent.click(within(screen.getByRole('group', { name: 'Unità di olive taggiasche' })).getByRole('button', { name: 'PZ' }));
    expect(onStato).toHaveBeenCalledTimes(1);
    const stato = onStato.mock.calls[0][0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[1]).toMatchObject({ quantita: 3, unita: 'pz', testoOriginale: '2-3 olive taggiasche' });
    expect(stato.correzioni['1-1-0'].piatti[0].righeFisse[1]).toMatchObject({ quantita: 3, unita: 'pz', testoOriginale: 'olive nere' });
  });
});

const OLIVE = { alimento: 'olive taggiasche', quantita: null, unita: null, quantitaInferita: false, testoOriginale: '2-3 olive taggiasche' };

/** Una settimana: per ogni giorno i pasti indicati, ognuno col Merluzzo («filetto di merluzzo» e le olive senza quantità). */
function pianoConOlive(pasti: string[][]): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: pasti.map((nomi, g) => ({
        giorno: g,
        titolo: null,
        pasti: nomi.map((nomeOriginale) => ({
          nomeOriginale,
          piatti: [{ nome: 'Merluzzo', descrizione: null, componenti: [], righeFisse: [
            { alimento: 'filetto di merluzzo', quantita: 120, unita: 'g' as const, quantitaInferita: false, testoOriginale: 'Filetto di merluzzo (120g)' },
            { ...OLIVE },
          ] }],
        })),
      })),
    }],
  };
}

/** Il pasto `indice` del giorno `giorno` di `pianoConOlive`, con le olive risolte. */
function conOlive(piano: PianoEstratto, giorno: number, indice: number, quantita: number, unita: 'g' | 'ml' | 'pz'): PastoEstratto {
  const pasto = structuredClone(piano.settimane[0].giorni[giorno].pasti[indice]);
  pasto.piatti[0].righeFisse[1] = { ...OLIVE, quantita, unita };
  return pasto;
}

/** Una settimana di `giorni` giorni: ogni giorno una cena con la Zuppa e «sale fino», 2 g proposti dall'AI. */
function pianoConSale(giorni = 2): PianoEstratto {
  return {
    archetipo: 'menu_settimanale', fonte: 'test', noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: Array.from({ length: giorni }, (_, g) => ({
        giorno: g,
        titolo: null,
        pasti: [{ nomeOriginale: 'cena', piatti: [{ nome: 'Zuppa', descrizione: null, componenti: [], righeFisse: [{ alimento: 'sale', quantita: 2, unita: 'g' as const, quantitaInferita: true, testoOriginale: 'sale fino' }] }] }],
      })),
    }],
  };
}
