import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Revisione } from '../Revisione';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];
const STATO: StatoRevisione = {
  passo: 'revisione',
  mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
  pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
};

function tutteLeChiavi(): string[] {
  const tutti: string[] = [];
  for (const s of PIANO_MENU_SETTIMANALE.settimane) for (const g of s.giorni) g.pasti.forEach((_, i) => tutti.push(`${s.numero}-${g.giorno}-${i}`));
  return tutti;
}

/**
 * Uno stato con tutti i pasti confermati E la quantità delle olive (l'unica riga non
 * risolta del fixture, giorno 2/martedì) davvero risolta in correzioni['1-1-1'] — la
 * difesa in profondità di `tuttoPronto` blocca VAI AI FORMATI su qualunque pasto
 * "confermato" con quantità non risolte, quindi un test che vuole verificare il caso
 * positivo (tutto confermato -> bottone visibile) deve partire da dati davvero completi,
 * non solo da `pastiConfermati` pieno.
 */
function statoConTuttiConfermati(): StatoRevisione {
  const oliveRisolte = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  oliveRisolte.piatti[0].righeFisse[1] = { alimento: 'olive taggiasche', quantita: 3, unita: 'pz', quantitaInferita: false, testoOriginale: '2-3 olive taggiasche' };
  return { ...STATO, pastiConfermati: tutteLeChiavi(), correzioni: { '1-1-1': oliveRisolte } };
}

describe('Revisione', () => {
  it('mostra il giorno corrente con i testi originali sotto le righe', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText(/giorno 1 di 3/i)).toBeInTheDocument();
    expect(screen.getByText("30g fiocchi d'avena")).toBeInTheDocument();
  });

  it('modificare una quantità produce una correzione, non tocca il piano', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    const campo = screen.getAllByLabelText(/quantità/i)[0];
    fireEvent.change(campo, { target: { value: '40' } });
    // Il nome del piatto è un input controllato (non un testo statico): getByDisplayValue,
    // non getByText, è il modo corretto per risalire alla card che lo contiene.
    fireEvent.click(within(screen.getByDisplayValue('Porridge').closest('section')!).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[0].quantita).toBe(40);
    expect(stato.pastiConfermati).toContain('1-0-0');
  });

  it('una riga con quantità mancante blocca la conferma del suo pasto', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    // Giorno 2 (martedì) ha le olive senza quantità.
    fireEvent.click(screen.getByRole('button', { name: /giorno successivo/i }));
    const cardMerluzzo = screen.getByDisplayValue('Merluzzo').closest('section')!;
    expect(within(cardMerluzzo).getByText(/quantità da indicare/i)).toBeInTheDocument();
    expect(within(cardMerluzzo).getByRole('button', { name: /conferma pasto/i })).toBeDisabled();
  });

  it('una riga con quantità valorizzata ma unità mancante blocca comunque la conferma del pasto', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    const card = screen.getByDisplayValue('Porridge').closest('section')!;
    // I fiocchi d'avena partono risolti (30g): svuotare solo l'unità (mai la quantità)
    // deve comunque bloccare CONFERMA PASTO — {quantita: 40, unita: null} non è confermabile.
    const selettoreUnita = within(card).getAllByLabelText(/unità di/i)[0];
    fireEvent.change(selettoreUnita, { target: { value: '' } });
    expect(within(card).getByRole('button', { name: /conferma pasto/i })).toBeDisabled();
  });

  it('VAI AI FORMATI compare solo con tutti i pasti confermati', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={statoConTuttiConfermati()} slotDefs={SLOTS as never} onStato={onStato} />);
    fireEvent.click(screen.getByRole('button', { name: /vai ai formati/i }));
    expect(onStato.mock.calls.at(-1)![0].passo).toBe('formati');
  });

  it('un pasto confermato con quantità irrisolte (difesa in profondità) non sblocca VAI AI FORMATI', () => {
    // Stessa base di sopra ma senza risolvere le olive: pastiConfermati dice "tutto fatto",
    // ma un pasto ha ancora una quantità null. Non deve mai poter capitare passando dalla UI
    // (CONFERMA PASTO lo blocca), ma se càpita comunque il gate deve tenere.
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={{ ...STATO, pastiConfermati: tutteLeChiavi() }} slotDefs={SLOTS as never} onStato={onStato} />);
    expect(screen.queryByRole('button', { name: /vai ai formati/i })).not.toBeInTheDocument();
  });

  it('riaprire un pasto confermato e svuotarne una quantità lo toglie dai confermati: VAI AI FORMATI resta assente', () => {
    const onStato = vi.fn();
    const { rerender } = render(
      <Revisione piano={PIANO_MENU_SETTIMANALE} stato={statoConTuttiConfermati()} slotDefs={SLOTS as never} onStato={onStato} />,
    );
    // La card di colazione (giorno 1) è compattata con la spunta: riaprirla la deve togliere
    // da pastiConfermati, non lasciarla "confermata" in sottofondo.
    fireEvent.click(screen.getByRole('button', { name: /colazione/i }));
    const statoAggiornato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(statoAggiornato.pastiConfermati).not.toContain('1-0-0');
    // page.tsx ripasserebbe questo stato come nuova prop: lo si simula con rerender.
    rerender(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={statoAggiornato} slotDefs={SLOTS as never} onStato={onStato} />);

    const campo = within(screen.getByDisplayValue('Porridge').closest('section')!).getAllByLabelText(/quantità/i)[0];
    fireEvent.change(campo, { target: { value: '' } });

    const card = screen.getByDisplayValue('Porridge').closest('section')!;
    expect(within(card).getByRole('button', { name: /conferma pasto/i })).toBeDisabled();
    // Nessun altro pasto è cambiato: dovrebbero essere ancora tutti confermati e mappati, eppure
    // VAI AI FORMATI non deve comparire finché questo pasto resta irrisolto e non riconfermato.
    expect(screen.queryByRole('button', { name: /vai ai formati/i })).not.toBeInTheDocument();
  });

  it('rimuovere una riga aggiorna la correzione senza svuotare il piatto', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    fireEvent.click(screen.getByRole('button', { name: /elimina riga.*latte parzialmente scremato/i }));
    fireEvent.click(within(screen.getByDisplayValue('Porridge').closest('section')!).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse).toHaveLength(1);
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[0].alimento).toBe("fiocchi d'avena");
  });

  it("eliminare l'ultimo piatto di un pasto scrive la correzione piatti: []", () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    const card = screen.getByDisplayValue('Porridge').closest('section')!;
    fireEvent.click(within(card).getByRole('button', { name: /elimina piatto 1/i }));
    fireEvent.click(within(card).getByRole('button', { name: /elimina il pasto/i }));
    fireEvent.click(within(card).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0']).toEqual({ nomeOriginale: 'colazione', piatti: [] });
  });

  it('modificare il nome del piatto produce una correzione', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    fireEvent.change(screen.getByDisplayValue('Porridge'), { target: { value: 'Porridge speciale' } });
    fireEvent.click(within(screen.getByDisplayValue('Porridge speciale').closest('section')!).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].nome).toBe('Porridge speciale');
  });

  const PIANO_GIORNI_TIPO: PianoEstratto = {
    archetipo: 'giorni_tipo',
    fonte: 'fixture sintetico',
    noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [{
        giorno: 0,
        titolo: 'Piano 1',
        pasti: [{
          nomeOriginale: 'pranzo',
          piatti: [{
            nome: 'Pasta al pomodoro', descrizione: null, componenti: [],
            righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g', quantitaInferita: false, testoOriginale: 'pasta 80g' }],
          }],
        }],
      }],
    }],
  };

  it('giorni_tipo: l’intestazione mostra il titolo dello scenario, non il giorno della settimana', () => {
    render(<Revisione piano={PIANO_GIORNI_TIPO} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText(/Piano 1 — scenario 1 di 1/)).toBeInTheDocument();
    expect(screen.queryByText(/Lunedì/)).toBeNull();
  });

  const PIANO_CON_INFERITA: PianoEstratto = {
    archetipo: 'menu_settimanale',
    fonte: 'fixture sintetico',
    noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [{
        giorno: 0,
        titolo: null,
        pasti: [{
          nomeOriginale: 'pranzo',
          piatti: [{
            nome: 'Insalata', descrizione: null, componenti: [],
            righeFisse: [{ alimento: 'olio', quantita: 10, unita: 'g', quantitaInferita: true, testoOriginale: 'olio q.b.' }],
          }],
        }],
      }],
    }],
  };

  it('riga inferita: mostra l’avviso e correggere la quantità toglie il flag', () => {
    render(<Revisione piano={PIANO_CON_INFERITA} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText('quantità proposta: controllala')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Quantità di olio'), { target: { value: '15' } });
    // il flag cade con la correzione: l’avviso sparisce
    expect(screen.queryByText('quantità proposta: controllala')).toBeNull();
  });

  const PIANO_CON_NOTA: PianoEstratto = {
    archetipo: 'menu_settimanale',
    fonte: 'fixture sintetico',
    noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [{
        giorno: 0,
        titolo: null,
        pasti: [{
          nomeOriginale: 'cena',
          piatti: [{
            nome: 'Tacchino con pane', descrizione: null,
            righeFisse: [{ alimento: 'fesa di tacchino', quantita: 120, unita: 'g', quantitaInferita: false, testoOriginale: 'Fesa di tacchino (120g)' }],
            componenti: [{
              nome: 'pane',
              nota: '1 vv sett',
              opzioni: [
                [{ alimento: 'pane integrale', quantita: 60, unita: 'g', quantitaInferita: false, testoOriginale: 'pane integrale (60g)' }],
              ],
            }],
          }],
        }],
      }],
    }],
  };

  it('la nota del componente è visibile accanto al nome', () => {
    render(<Revisione piano={PIANO_CON_NOTA} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText(/1 vv sett/)).toBeInTheDocument();
  });
});
