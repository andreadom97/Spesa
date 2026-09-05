import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Formati } from '../Formati';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { Ingredient } from '@/domain/types';
import type { PastoEstratto, StatoRevisione } from '@/domain/import/types';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 , prezzoConfezione: null};
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

describe('Formati', () => {
  it('propone i soli non abbinati: l\'avena esistente non compare', async () => {
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);
    expect(await screen.findByDisplayValue(/latte/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/avena/i)).not.toBeInTheDocument();
  });

  it('correggere il formato e andare al riepilogo persiste gli ingredienti nello stato', async () => {
    const onStato = vi.fn();
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={onStato} />);
    const formato = (await screen.findAllByLabelText(/formato confezione/i))[0];
    fireEvent.change(formato, { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /vai al riepilogo/i }));
    await waitFor(() => {
      const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
      expect(stato.passo).toBe('riepilogo');
      expect(stato.ingredientiNuovi.some((i) => i.formatoConfezione === 750)).toBe(true);
    });
  });

  it('ricalcola sempre: conserva le proposte già corrette e propone i nuovi alimenti introdotti da una correzione', async () => {
    // Correzione della colazione (settimana 1, giorno 0, pasto indice 0): stesse
    // righe originali più un alimento mai visto prima ("farina di mandorle"),
    // come se fosse tornato dalla revisione dopo un BozzaIncompletaError.
    const colazioneCorretta: PastoEstratto = {
      nomeOriginale: 'colazione',
      piatti: [{
        nome: 'Porridge', descrizione: null, componenti: [],
        righeFisse: [
          { alimento: "fiocchi d'avena", quantita: 30, unita: 'g', quantitaInferita: false, testoOriginale: "30g fiocchi d'avena" },
          { alimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml', quantitaInferita: false, testoOriginale: '150ml latte parz. scremato' },
          { alimento: 'farina di mandorle', quantita: 20, unita: 'g', quantitaInferita: false, testoOriginale: '20g farina di mandorle' },
        ],
      }],
    };
    const statoConCorrezione: StatoRevisione = {
      ...STATO,
      correzioni: { '1-0-0': colazioneCorretta },
      // Il "latte" è già stato corretto dall'utente in un giro precedente di
      // questo stesso passo; "alimento fantasma" non serve più al piano
      // (nessuna riga lo referenzia più) e deve sparire dalla fusione.
      ingredientiNuovi: [
        { alimento: 'latte parzialmente scremato', nome: 'Latte scremato bio', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 750 , prezzoConfezione: null},
        { alimento: 'alimento fantasma', nome: 'Fantasma', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1 , prezzoConfezione: null},
      ],
    };

    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={statoConCorrezione} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);

    expect(await screen.findByDisplayValue(/latte scremato bio/i)).toBeInTheDocument();
    expect(await screen.findByDisplayValue(/farina di mandorle/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/fantasma/i)).not.toBeInTheDocument();
  });

  it('"usa l\'ingrediente esistente" offre solo esistenti con unità compatibile, e la scelta rinomina la proposta', async () => {
    const LATTE_ESISTENTE: Ingredient = { id: 'i-latte', nome: 'Latte intero', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 , prezzoConfezione: null};
    const PARMIGIANO_ESISTENTE: Ingredient = { id: 'i-parm', nome: 'Parmigiano', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 , prezzoConfezione: null};

    render(
      <Formati
        piano={PIANO_MENU_SETTIMANALE}
        stato={STATO}
        ingredientiEsistenti={[AVENA, LATTE_ESISTENTE, PARMIGIANO_ESISTENTE]}
        onStato={() => {}}
      />,
    );

    const select = await screen.findByLabelText(/usa l'ingrediente esistente per latte parzialmente scremato/i);
    const opzioni = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(opzioni).toContain('Latte intero');
    expect(opzioni).not.toContain('Parmigiano');

    fireEvent.change(select, { target: { value: 'i-latte' } });
    expect(await screen.findByDisplayValue(/latte intero/i)).toBeInTheDocument();
  });

  describe('prezzo di una confezione (facoltativo)', () => {
    async function statoAlRiepilogo(onStato: ReturnType<typeof vi.fn>): Promise<StatoRevisione> {
      fireEvent.click(screen.getByRole('button', { name: /vai al riepilogo/i }));
      await waitFor(() => expect((onStato.mock.calls.at(-1)![0] as StatoRevisione).passo).toBe('riepilogo'));
      return onStato.mock.calls.at(-1)![0] as StatoRevisione;
    }

    it('ogni ingrediente nuovo ha il suo campo prezzo, accanto al formato', async () => {
      render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);
      const formati = await screen.findAllByLabelText(/formato confezione di/i);
      const prezzi = screen.getAllByLabelText(/prezzo di una confezione di/i);
      expect(prezzi).toHaveLength(formati.length);
      expect(screen.getAllByText('PREZZO')).toHaveLength(formati.length);
      expect(screen.getAllByText('facoltativo')).toHaveLength(formati.length);
    });

    it('digitando "1,2" (virgola) ingredientiNuovi[i].prezzoConfezione diventa 1.2; lasciato vuoto resta null', async () => {
      const onStato = vi.fn();
      render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={onStato} />);
      const prezzi = await screen.findAllByLabelText(/prezzo di una confezione di/i);
      expect(prezzi.length).toBeGreaterThan(1);
      fireEvent.change(prezzi[0], { target: { value: '1,2' } });

      const stato = await statoAlRiepilogo(onStato);
      expect(stato.ingredientiNuovi[0].prezzoConfezione).toBe(1.2);
      expect(stato.ingredientiNuovi.slice(1).every((i) => i.prezzoConfezione === null)).toBe(true);
    });

    it('un prezzo "0" blocca VAI AL RIEPILOGO come un formato non valido; svuotarlo lo sblocca', async () => {
      render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);
      const prezzo = (await screen.findAllByLabelText(/prezzo di una confezione di/i))[0];
      const avanti = screen.getByRole('button', { name: /vai al riepilogo/i });
      expect(avanti).toBeEnabled();

      fireEvent.change(prezzo, { target: { value: '0' } });
      expect(avanti).toBeDisabled();

      fireEvent.change(prezzo, { target: { value: '' } });
      expect(avanti).toBeEnabled();
    });
  });
});
