import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import type { Ingredient, UnitaBase } from '@/domain/types';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { PIANO_GIORNATA_UNICA, PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import { proponi } from '@/domain/import/formati-tipici';
import { SlotDockProvider } from '@/components/dock-slot';
import { Ingredienti } from '../Ingredienti';

const ing = (id: string, nome: string, unitaBase: Ingredient['unitaBase']): Ingredient => ({
  id, nome, unitaBase, area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
});
const AVENA = ing('i-avena', "Fiocchi d'avena", 'g');
const LATTE = ing('i-latte', 'Latte intero', 'ml');
const PARMIGIANO = ing('i-parm', 'Parmigiano', 'g');
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

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

function rendi(esistenti: Ingredient[] = [AVENA], stato: StatoRevisione = STATO, piano: PianoEstratto = PIANO_MENU_SETTIMANALE) {
  const onStato = vi.fn();
  render(<SlotDockProvider slot={slotDock}><Ingredienti piano={piano} stato={stato} ingredientiEsistenti={esistenti} onStato={onStato} /></SlotDockProvider>);
  return onStato;
}
const avanti = () => within(screen.getByRole('region', { name: 'Azione principale' })).getByRole('button', { name: 'VAI AL RIEPILOGO' });
const indietro = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });

/** Un piano di un solo pasto con queste righe: per le frasi. */
function pianoCon(...righe: [string, UnitaBase | null][]): PianoEstratto {
  const piano = structuredClone(PIANO_GIORNATA_UNICA);
  piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse = righe.map(([alimento, unita]) => ({
    alimento, quantita: unita ? 10 : null, unita, quantitaInferita: false, testoOriginale: alimento,
  }));
  return piano;
}

describe('Ingredienti', () => {
  it('la frase, le olive da controllare con la scheda aperta, gli altri come righe', () => {
    const onStato = rendi();
    expect(onStato).toHaveBeenCalledTimes(1);
    expect(onStato.mock.calls[0][0].ingredientiNuovi).toHaveLength(9);
    expect(screen.getByText('9 ingredienti nuovi. Ne conosco 8; per 1 ho messo valori prudenti: controllali.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Da controllare 1' })).toBeInTheDocument();
    expect(screen.getByText('Non è nella mia tabella dei formati: 500 g è un valore di ripiego.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Proposti da me 8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apri Pane integrale' })).toHaveTextContent('Pasta, riso e cereali · fresco');
    expect(screen.getByRole('button', { name: 'Apri Pane di segale' })).toBeInTheDocument();
    expect(avanti()).toBeEnabled();
  });

  it('niente prezzo e niente scelta dell\'unità', () => {
    rendi();
    expect(screen.queryByLabelText(/prezzo/i)).toBeNull();
    expect(screen.queryByRole('group', { name: /Unità/ })).toBeNull();
  });

  it('una riga apre la sua scheda nel foglio; la confezione a zero spegne il Dock', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    const foglio = screen.getByRole('dialog', { name: 'Latte parzialmente scremato' });
    expect(within(foglio).getByRole('textbox', { name: 'Nome' })).toHaveValue('Latte parzialmente scremato');
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Confezione' }), { target: { value: '0' } });
    expect(avanti()).toBeDisabled();
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Confezione' }), { target: { value: '750' } });
    expect(avanti()).toBeEnabled();
  });

  it('un nome doppio blocca finché non si rinomina', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    const foglio = screen.getByRole('dialog', { name: 'Pane di segale' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane integrale' } });
    expect(avanti()).toBeDisabled();
    expect(within(foglio).getByText('Un altro ingrediente si chiama già così: cambia il nome.')).toBeInTheDocument();
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane nero' } });
    expect(avanti()).toBeEnabled();
    // Le due proposte, diventate doppie mentre stavano in «Proposti da me», sono entrate in «Da
    // sistemare» e ci restano dopo la correzione: il contatore dice Fatto, e la scheda di Pane
    // integrale (quella non rinominata) è ancora in pagina.
    expect(screen.getByRole('heading', { name: 'Da sistemare Fatto' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pane integrale' })).toBeInTheDocument();
  });

  it('una proposta resa due volte (in pagina e nel foglio) apre un selettore solo', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    const foglio = screen.getByRole('dialog', { name: 'Pane di segale' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane integrale' } });
    fireEvent.click(within(foglio).getByRole('button', { name: /Area/ }));
    expect(screen.getAllByRole('dialog', { name: 'Area di Pane integrale' })).toHaveLength(1);
  });

  it('la confezione svuotata dal foglio porta la proposta in «Da sistemare», col suo avviso e il campo vuoto', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    fireEvent.change(within(screen.getByRole('dialog', { name: 'Latte parzialmente scremato' })).getByRole('textbox', { name: 'Confezione' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scheda' }));
    expect(screen.getByRole('heading', { name: 'Da sistemare 1' })).toBeInTheDocument();
    const latte = screen.getByRole('region', { name: 'Latte parzialmente scremato' });
    expect(within(latte).getByRole('textbox', { name: 'Confezione' })).toHaveValue('');
    expect(within(latte).getByText("Scrivi quanto c'è in una confezione.")).toBeInTheDocument();
    expect(avanti()).toBeDisabled();
    fireEvent.change(within(latte).getByRole('textbox', { name: 'Confezione' }), { target: { value: '750' } });
    expect(screen.getByRole('heading', { name: 'Da sistemare Fatto' })).toBeInTheDocument();
    expect(avanti()).toBeEnabled();
  });

  it('una scheda già in pagina resta dov\'è e mostra l\'avviso: il nome vuoto delle olive', () => {
    rendi();
    const olive = screen.getByRole('region', { name: 'Olive taggiasche' });
    fireEvent.change(within(olive).getByRole('textbox', { name: 'Nome' }), { target: { value: '' } });
    expect(within(olive).getByText("Scrivi il nome dell'ingrediente.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Da controllare 1' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Da sistemare/ })).toBeNull();
    expect(avanti()).toBeDisabled();
  });

  it('il campo Nome resta mentre si scrive «Pasta di farro», anche quando il testo è il nome di un esistente', () => {
    rendi([AVENA, ing('i-pasta', 'Pasta', 'g')]);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    const foglio = screen.getByRole('dialog', { name: 'Pane di segale' });
    const nome = 'Pasta di farro';
    for (let i = 0; i <= nome.length; i++) {
      fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: nome.slice(0, i) } });
      expect(within(foglio).getByRole('textbox', { name: 'Nome' })).toHaveValue(nome.slice(0, i));
      expect(within(foglio).queryByText("Userò l'ingrediente che hai già.")).toBeNull();
    }
  });

  it('la legata per sola inclusione mostra la scheda intera con «Finirà su…»', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    const foglio = screen.getByRole('dialog', { name: 'Pane di segale' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Avena' } });
    expect(within(foglio).getByText("Finirà su «Fiocchi d'avena», che hai già: se è un altro ingrediente, cambia il nome.")).toBeInTheDocument();
    expect(within(foglio).getByRole('textbox', { name: 'Confezione' })).toBeInTheDocument();
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pane nero' } });
    expect(within(foglio).queryByText(/Finirà su/)).toBeNull();
  });

  it('una bozza ripresa dopo una scelta in «È lo stesso di…» si riapre legata', () => {
    const scelta = { ...proponi('latte parzialmente scremato', 'ml'), nome: 'Latte intero' };
    rendi([AVENA, LATTE], { ...STATO, ingredientiNuovi: [scelta] });
    expect(screen.getByRole('button', { name: 'Apri Latte intero' })).toHaveTextContent('Usa «Latte intero»');
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte intero' }));
    expect(within(screen.getByRole('dialog', { name: 'Latte intero' })).getByText("Userò l'ingrediente che hai già.")).toBeInTheDocument();
  });

  it('gli esistenti di «È lo stesso di…» in ordine alfabetico italiano', () => {
    rendi([ing('i-zucca', 'Zucca', 'g'), AVENA, ing('i-avena-bio', 'avena bio', 'g')]);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Pane di segale' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Pane di segale' })).getByRole('button', { name: /È lo stesso di/ }));
    const voci = within(screen.getByRole('dialog', { name: 'Pane di segale è lo stesso di…' })).getAllByRole('radio').map((r) => r.textContent);
    expect(voci).toEqual(['No, è un ingrediente nuovo', 'avena bio', "Fiocchi d'avena", 'Zucca']);
  });

  it('nella riga il formato con la virgola', () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    fireEvent.change(within(screen.getByRole('dialog', { name: 'Latte parzialmente scremato' })).getByRole('textbox', { name: 'Confezione' }), { target: { value: '0,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi la scheda' }));
    expect(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' })).toHaveTextContent('0,5 ml');
  });

  it("l'indietro chiude prima il selettore aperto nel foglio, poi la scheda", () => {
    rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Latte parzialmente scremato' })).getByRole('button', { name: /Area/ }));
    expect(screen.getByRole('dialog', { name: 'Area di Latte parzialmente scremato' })).toBeInTheDocument();
    indietro();
    expect(screen.queryByRole('dialog', { name: 'Area di Latte parzialmente scremato' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Latte parzialmente scremato' })).toBeInTheDocument();
    indietro();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('nessun onStato mentre si scrive: solo all\'ingresso e con VAI AL RIEPILOGO', () => {
    const onStato = rendi();
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    const foglio = screen.getByRole('dialog', { name: 'Latte parzialmente scremato' });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Latte fresco' } });
    fireEvent.change(within(foglio).getByRole('textbox', { name: 'Confezione' }), { target: { value: '500' } });
    fireEvent.click(within(foglio).getByRole('button', { name: 'NO' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Olive taggiasche' })).getByRole('button', { name: 'Intero' }));
    expect(onStato).toHaveBeenCalledTimes(1);
  });

  it('la frase al singolare', () => {
    rendi([], STATO, pianoCon(['pasta di semola', 'g']));
    expect(screen.getByText("1 ingrediente nuovo. L'ho proposto io: toccalo se non torna.")).toBeInTheDocument();
  });

  it('la frase a zero', () => {
    rendi([ing('i-pasta', 'Pasta di semola', 'g')], STATO, pianoCon(['pasta di semola', 'g']));
    expect(screen.getByText('Tutti gli ingredienti del piano abbinano già qualcosa che hai: niente da rivedere qui.')).toBeInTheDocument();
    expect(avanti()).toBeEnabled();
  });

  it('la frase con un solo ingrediente, di ripiego', () => {
    rendi([], STATO, pianoCon(['olive taggiasche', 'pz']));
    expect(screen.getByText('1 ingrediente nuovo. Non lo conosco: ho messo valori prudenti, controllalo.')).toBeInTheDocument();
  });

  it('la frase con tutti ripieghi, al plurale', () => {
    rendi([], STATO, pianoCon(['olive taggiasche', 'pz'], ['bacche di goji', 'g']));
    expect(screen.getByText('2 ingredienti nuovi. Non li conosco: ho messo valori prudenti, controllali.')).toBeInTheDocument();
  });

  it('un prezzo già nella bozza arriva intatto con VAI AL RIEPILOGO', () => {
    const conPrezzo = { ...proponi('latte parzialmente scremato', 'ml'), prezzoConfezione: 1.2 };
    const onStato = rendi([AVENA], { ...STATO, ingredientiNuovi: [conPrezzo] });
    fireEvent.click(avanti());
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.ingredientiNuovi.find((p) => p.alimento === 'latte parzialmente scremato')?.prezzoConfezione).toBe(1.2);
  });

  it('«È lo stesso di…» offre gli esistenti con la stessa unità, e torna indietro con «No, è nuovo»', () => {
    rendi([AVENA, LATTE, PARMIGIANO]);
    fireEvent.click(screen.getByRole('button', { name: 'Apri Latte parzialmente scremato' }));
    const foglio = screen.getByRole('dialog', { name: 'Latte parzialmente scremato' });
    fireEvent.click(within(foglio).getByRole('button', { name: /È lo stesso di/ }));
    const scelta = screen.getByRole('dialog', { name: 'Latte parzialmente scremato è lo stesso di…' });
    expect(within(scelta).getByText('Solo gli ingredienti che conti in millilitri, come questo.')).toBeInTheDocument();
    expect(within(scelta).getByRole('radio', { name: 'No, è un ingrediente nuovo' })).toHaveAttribute('aria-checked', 'true');
    expect(within(scelta).queryByRole('radio', { name: 'Parmigiano' })).toBeNull();
    fireEvent.click(within(scelta).getByRole('radio', { name: 'Latte intero' }));
    expect(screen.getByText("Userò l'ingrediente che hai già.")).toBeInTheDocument();
    expect(screen.getByText('8 ingredienti nuovi. Ne conosco 7; per 1 ho messo valori prudenti: controllali.')).toBeInTheDocument();

    // Anche la scheda delle olive, aperta in pagina, ha «È lo stesso di…» e «Nome»: si lavora dentro il foglio.
    const legato = screen.getByRole('dialog', { name: 'Latte intero' });
    fireEvent.click(within(legato).getByRole('button', { name: /È lo stesso di/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Latte intero è lo stesso di…' })).getByRole('radio', { name: 'No, è un ingrediente nuovo' }));
    expect(within(legato).getByRole('textbox', { name: 'Nome' })).toHaveValue('Latte parzialmente scremato');
  });

  it("l'area si sceglie dal foglio", () => {
    rendi();
    const olive = screen.getByRole('region', { name: 'Olive taggiasche' });
    fireEvent.click(within(olive).getByRole('button', { name: /Area/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Area di Olive taggiasche' })).getByRole('radio', { name: 'Surgelati' }));
    expect(within(olive).getByRole('button', { name: /Area/ })).toHaveTextContent('Surgelati');
  });

  it('VAI AL RIEPILOGO porta gli ingredienti e il passo', () => {
    const onStato = rendi();
    fireEvent.click(avanti());
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.passo).toBe('riepilogo');
    expect(stato.ingredientiNuovi).toHaveLength(9);
  });
});
