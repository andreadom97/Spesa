import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiIngredienti: vi.fn(),
  leggiRepertorio: vi.fn(),
  salvaPiatto: vi.fn(),
  salvaIngrediente: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

// La pagina naviga solo con <Link>; il mock del router c'è perché nessun
// test dipenda da un contesto Next che in jsdom non esiste.
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { leggiIngredienti, leggiRepertorio, salvaPiatto, salvaIngrediente } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import Veloce from '../page';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };

const ING_PASTA: Ingredient = {
  id: 'i-pasta', nome: 'Pasta', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null,
};
const ING_PASSATA: Ingredient = {
  id: 'i-passata', nome: 'Passata di pomodoro', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 700, prezzoConfezione: null,
};
const ING_CAFFE: Ingredient = {
  id: 'i-caffe', nome: 'Caffè', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 250, prezzoConfezione: null,
};
const ING_UOVA: Ingredient = {
  id: 'i-uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 6, prezzoConfezione: null,
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function piattoFinto(i: number): Dish {
  return {
    id: `d-${i}`, nome: `Piatto ${i}`, slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
    descrizione: null, settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [{ ingredientId: 'i-pasta', quantita: 80, unita: 'g' }], componenti: [],
  };
}

function mockBase(repertorio: Dish[] = []) {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_PASTA, ING_PASSATA, ING_CAFFE, ING_UOVA]);
  vi.mocked(leggiRepertorio).mockResolvedValue(repertorio);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

async function apri(repertorio: Dish[] = []) {
  mockBase(repertorio);
  render(<Veloce />);
  await screen.findByPlaceholderText('Dai un nome al piatto');
}

function cerca(testo: string) {
  fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: testo } });
}

function scriviNome(testo: string) {
  fireEvent.change(screen.getByLabelText('Nome del piatto'), { target: { value: testo } });
}

/** Cerca, tocca "Aggiungi {nome}" e, se c'è, scrive la quantità. */
function aggiungi(nome: string, quantita?: string) {
  cerca(nome);
  fireEvent.click(screen.getByRole('button', { name: `Aggiungi ${nome}` }));
  if (quantita !== undefined) {
    fireEvent.change(screen.getByLabelText(`Quantità di ${nome}`), { target: { value: quantita } });
  }
}

describe('Piatti veloce (/piatti/veloce)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testata e contatore', () => {
    it('con repertorio vuoto: PIATTO 1 e "Nessun piatto ancora"', async () => {
      await apri([]);
      expect(screen.getByText('PIATTO 1')).toBeInTheDocument();
      expect(
        screen.getByText('Nessun piatto ancora · ne bastano 8 per far girare la settimana'),
      ).toBeInTheDocument();
    });

    it('con 1 piatto: PIATTO 2 e "1 piatto salvato"', async () => {
      await apri([piattoFinto(1)]);
      expect(screen.getByText('PIATTO 2')).toBeInTheDocument();
      expect(screen.getByText('1 piatto salvato · ne bastano 8 per far girare la settimana')).toBeInTheDocument();
    });

    it('con 3 piatti: "3 piatti salvati"', async () => {
      await apri([1, 2, 3].map(piattoFinto));
      expect(screen.getByText('PIATTO 4')).toBeInTheDocument();
      expect(screen.getByText('3 piatti salvati · ne bastano 8 per far girare la settimana')).toBeInTheDocument();
    });

    it('con 9 piatti: PIATTO 10 e "Ne hai 9: la settimana può girare"', async () => {
      await apri([1, 2, 3, 4, 5, 6, 7, 8, 9].map(piattoFinto));
      expect(screen.getByText('PIATTO 10')).toBeInTheDocument();
      expect(screen.getByText('Ne hai 9: la settimana può girare. Aggiungine quanti vuoi.')).toBeInTheDocument();
    });

    it('i pasti vengono dai meal_slot_def reali, il primo è preselezionato', async () => {
      await apri();
      expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Cena' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('se il caricamento fallisce mostra il messaggio', async () => {
      mockBase();
      vi.mocked(leggiSlotDefs).mockRejectedValue(new Error('rete'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<Veloce />);
      expect(await screen.findByText('Non riusciamo a caricare. Riprova più tardi.')).toBeInTheDocument();
    });
  });

  describe('ricerca', () => {
    it('è tollerante agli accenti: "caffe" trova Caffè', async () => {
      await apri();
      cerca('caffe');
      expect(screen.getByRole('button', { name: 'Aggiungi Caffè' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aggiungi Pasta' })).not.toBeInTheDocument();
    });

    it('"pas" trova Pasta e Passata', async () => {
      await apri();
      cerca('pas');
      expect(screen.getByRole('button', { name: 'Aggiungi Pasta' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aggiungi Passata di pomodoro' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Aggiungi Uova' })).not.toBeInTheDocument();
    });

    it('con testo vuoto non mostra nessun risultato', async () => {
      await apri();
      expect(screen.queryByRole('button', { name: /^Aggiungi / })).not.toBeInTheDocument();
      cerca('pas');
      cerca('');
      expect(screen.queryByRole('button', { name: /^Aggiungi / })).not.toBeInTheDocument();
    });

    it('un ingrediente già nel piatto non ricompare fra i risultati', async () => {
      await apri();
      aggiungi('Pasta');
      cerca('pas');
      expect(screen.queryByRole('button', { name: 'Aggiungi Pasta' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aggiungi Passata di pomodoro' })).toBeInTheDocument();
    });
  });

  describe('righe', () => {
    it('il tap aggiunge una riga con quantità vuota e unità base; la ricerca si svuota', async () => {
      await apri();
      aggiungi('Pasta');
      const quantita = screen.getByLabelText('Quantità di Pasta');
      expect(quantita).toHaveValue('');
      expect(quantita).toHaveAttribute('inputmode', 'decimal');
      expect(quantita.closest('[data-riga]')).toHaveTextContent('g');
      expect(screen.getByLabelText('Cerca un ingrediente')).toHaveValue('');
      expect(
        screen.queryByText('Un piatto senza ingredienti non entra nella lista della spesa'),
      ).not.toBeInTheDocument();
    });

    it('la X toglie la riga e torna la nota del piatto vuoto', async () => {
      await apri();
      expect(screen.getByText('Un piatto senza ingredienti non entra nella lista della spesa')).toBeInTheDocument();
      aggiungi('Pasta');
      fireEvent.click(screen.getByRole('button', { name: 'Togli Pasta' }));
      expect(screen.queryByLabelText('Quantità di Pasta')).not.toBeInTheDocument();
      expect(screen.getByText('Un piatto senza ingredienti non entra nella lista della spesa')).toBeInTheDocument();
    });

    it('un ingrediente a pezzi ha unità pz', async () => {
      await apri();
      aggiungi('Uova');
      expect(screen.getByLabelText('Quantità di Uova').closest('[data-riga]')).toHaveTextContent('pz');
    });
  });

  describe('validazione', () => {
    it('mostra una sola ragione alla volta, la prima, e abilita il bottone solo quando è tutto a posto', async () => {
      await apri();
      const salva = screen.getByRole('button', { name: 'SALVA E AVANTI' });
      expect(salva).toBeDisabled();
      expect(screen.getByText('Manca il nome')).toBeInTheDocument();

      scriviNome('Pasta al pomodoro');
      expect(salva).toBeDisabled();
      expect(screen.queryByText('Manca il nome')).not.toBeInTheDocument();
      expect(screen.getByText('Aggiungi almeno un ingrediente')).toBeInTheDocument();

      aggiungi('Pasta');
      expect(salva).toBeDisabled();
      expect(screen.getByText('Manca la quantità di Pasta')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Quantità di Pasta'), { target: { value: '80' } });
      expect(salva).toBeEnabled();
      expect(screen.queryByText(/^Manca /)).not.toBeInTheDocument();
      expect(screen.queryByText('Aggiungi almeno un ingrediente')).not.toBeInTheDocument();
    });

    it('un nome di soli spazi non basta', async () => {
      await apri();
      scriviNome('   ');
      expect(screen.getByText('Manca il nome')).toBeInTheDocument();
    });

    it('accetta la virgola come separatore decimale', async () => {
      await apri();
      scriviNome('Pasta al pomodoro');
      aggiungi('Pasta', '80,5');
      expect(screen.getByRole('button', { name: 'SALVA E AVANTI' })).toBeEnabled();
    });

    it('rifiuta zero e testo non numerico', async () => {
      await apri();
      scriviNome('Pasta al pomodoro');
      aggiungi('Pasta', '0');
      expect(screen.getByText('Manca la quantità di Pasta')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Quantità di Pasta'), { target: { value: 'abc' } });
      expect(screen.getByText('Manca la quantità di Pasta')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SALVA E AVANTI' })).toBeDisabled();
    });
  });

  describe('salvataggio', () => {
    it('chiama salvaPiatto con il payload esatto e poi svuota il modulo lasciando il pasto', async () => {
      vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
      await apri();
      scriviNome('Pasta al pomodoro');
      fireEvent.click(screen.getByRole('button', { name: 'Cena' }));
      aggiungi('Pasta', '80');

      fireEvent.click(screen.getByRole('button', { name: 'SALVA E AVANTI' }));

      expect(await screen.findByText('Salvato: Pasta al pomodoro')).toBeInTheDocument();
      expect(salvaPiatto).toHaveBeenCalledTimes(1);
      expect(salvaPiatto).toHaveBeenCalledWith({
        nome: 'Pasta al pomodoro',
        slotDefId: 'sd-3',
        fonte: 'proprio',
        attivo: true,
        descrizione: null,
        settimanaCiclo: null,
        giornoCiclo: null,
        ingredienti: [{ ingredientId: 'i-pasta', quantita: 80, unita: 'g' }],
        componenti: [],
      });

      expect(screen.getByText('PIATTO 2')).toBeInTheDocument();
      expect(screen.getByText('1 piatto salvato · ne bastano 8 per far girare la settimana')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome del piatto')).toHaveValue('');
      expect(screen.queryByLabelText('Quantità di Pasta')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cena' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'SALVA E AVANTI' })).toBeDisabled();
    });

    it('il nome viene ripulito dagli spazi e la virgola diventa un numero', async () => {
      vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
      await apri();
      scriviNome('  Uova strapazzate ');
      aggiungi('Uova', '2,5');
      fireEvent.click(screen.getByRole('button', { name: 'SALVA E AVANTI' }));

      await screen.findByText('Salvato: Uova strapazzate');
      expect(salvaPiatto).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Uova strapazzate',
          slotDefId: 'sd-1',
          ingredienti: [{ ingredientId: 'i-uova', quantita: 2.5, unita: 'pz' }],
        }),
      );
    });

    it('"Salvato:" sparisce quando si ricomincia a scrivere il nome', async () => {
      vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
      await apri();
      scriviNome('Pasta al pomodoro');
      aggiungi('Pasta', '80');
      fireEvent.click(screen.getByRole('button', { name: 'SALVA E AVANTI' }));
      await screen.findByText('Salvato: Pasta al pomodoro');

      scriviNome('R');
      expect(screen.queryByText('Salvato: Pasta al pomodoro')).not.toBeInTheDocument();
    });

    it('se salvaPiatto fallisce mostra il messaggio e lascia i dati intatti', async () => {
      vi.mocked(salvaPiatto).mockRejectedValue(new Error('rete'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await apri();
      scriviNome('Pasta al pomodoro');
      aggiungi('Pasta', '80');
      fireEvent.click(screen.getByRole('button', { name: 'SALVA E AVANTI' }));

      expect(await screen.findByText('Non siamo riusciti a salvare il piatto. Riprova.')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome del piatto')).toHaveValue('Pasta al pomodoro');
      expect(screen.getByLabelText('Quantità di Pasta')).toHaveValue('80');
      expect(screen.getByText('PIATTO 1')).toBeInTheDocument();
      expect(screen.queryByText(/^Salvato:/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SALVA E AVANTI' })).toBeEnabled();
    });
  });

  describe('mini-creazione', () => {
    it('"Crea «…»" compare solo quando nessun ingrediente ha esattamente quel nome', async () => {
      await apri();
      cerca('Tofu');
      expect(screen.getByRole('button', { name: 'Crea «Tofu»' })).toBeInTheDocument();
      cerca('Pasta');
      expect(screen.queryByRole('button', { name: /^Crea «/ })).not.toBeInTheDocument();
      cerca('caffè ');
      expect(screen.queryByRole('button', { name: /^Crea «/ })).not.toBeInTheDocument();
    });

    it('apre il riquadro con i default di predefinitiIngrediente e li riapplica a ogni cambio di area o unità', async () => {
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));

      expect(screen.getByLabelText("Nome dell'ingrediente")).toHaveValue('Tofu');
      expect(screen.getByRole('button', { name: 'DISPENSA E CONSERVE' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'G' })).toHaveAttribute('aria-pressed', 'true');
      const deperibile = screen.getByRole('button', { name: 'Va comprato fresco' });
      expect(deperibile).toHaveAttribute('aria-pressed', 'false');
      expect(deperibile).toHaveTextContent('No, si conserva a lungo');
      const formato = screen.getByLabelText('Formato della confezione');
      expect(formato).toHaveValue('500');
      expect(formato).toBeEnabled();
      expect(
        screen.getByText('Formato e reparto li puoi correggere dopo in Impostazioni → Ingredienti.'),
      ).toBeInTheDocument();
      // I risultati lasciano il posto al riquadro.
      expect(screen.queryByRole('button', { name: 'Crea «Tofu»' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'LATTICINI, UOVA E SALUMI' }));
      expect(deperibile).toHaveAttribute('aria-pressed', 'true');
      expect(deperibile).toHaveTextContent('Sì, va comprato fresco');

      fireEvent.click(screen.getByRole('button', { name: 'ML' }));
      expect(screen.getByLabelText('Formato della confezione')).toHaveValue('1000');

      fireEvent.click(screen.getByRole('button', { name: 'PZ' }));
      expect(screen.getByLabelText('Formato della confezione')).toHaveValue('1');
      expect(screen.getByLabelText('Formato della confezione')).toBeDisabled();
    });

    it('un campo toccato a mano non viene sovrascritto dai default', async () => {
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));

      fireEvent.click(screen.getByRole('button', { name: 'Va comprato fresco' }));
      expect(screen.getByRole('button', { name: 'Va comprato fresco' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '250' } });

      // cereali → deperibile falso di default, ma l'utente l'ha messo a mano.
      fireEvent.click(screen.getByRole('button', { name: 'PASTA, RISO E CEREALI' }));
      expect(screen.getByRole('button', { name: 'Va comprato fresco' })).toHaveAttribute('aria-pressed', 'true');
      // ml → 1000 di default, ma il formato è stato scritto a mano.
      fireEvent.click(screen.getByRole('button', { name: 'ML' }));
      expect(screen.getByLabelText('Formato della confezione')).toHaveValue('250');
    });

    it('CREA E AGGIUNGI chiama salvaIngrediente e mette la riga nel piatto', async () => {
      vi.mocked(salvaIngrediente).mockResolvedValue('i-tofu');
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));
      fireEvent.click(screen.getByRole('button', { name: 'LATTICINI, UOVA E SALUMI' }));
      fireEvent.click(screen.getByRole('button', { name: 'PZ' }));

      fireEvent.click(screen.getByRole('button', { name: 'CREA E AGGIUNGI' }));

      expect(await screen.findByLabelText('Quantità di Tofu')).toBeInTheDocument();
      expect(salvaIngrediente).toHaveBeenCalledTimes(1);
      expect(salvaIngrediente).toHaveBeenCalledWith({
        nome: 'Tofu',
        unitaBase: 'pz',
        area: 'latticini',
        classeResiduo: 'intero',
        deperibile: true,
        formatoConfezione: 1,
        prezzoConfezione: null,
      });
      expect(screen.getByLabelText('Quantità di Tofu').closest('[data-riga]')).toHaveTextContent('pz');
      expect(screen.queryByLabelText("Nome dell'ingrediente")).not.toBeInTheDocument();
      expect(screen.getByLabelText('Cerca un ingrediente')).toHaveValue('');

      // L'ingrediente nuovo è entrato nell'elenco locale: dopo averlo tolto si ritrova cercandolo.
      fireEvent.click(screen.getByRole('button', { name: 'Togli Tofu' }));
      cerca('tofu');
      expect(screen.getByRole('button', { name: 'Aggiungi Tofu' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Crea «/ })).not.toBeInTheDocument();
    });

    it('CREA E AGGIUNGI è disabilitato senza nome o con formato non valido', async () => {
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));
      const crea = screen.getByRole('button', { name: 'CREA E AGGIUNGI' });
      expect(crea).toBeEnabled();

      fireEvent.change(screen.getByLabelText("Nome dell'ingrediente"), { target: { value: '  ' } });
      expect(crea).toBeDisabled();
      fireEvent.change(screen.getByLabelText("Nome dell'ingrediente"), { target: { value: 'Tofu' } });
      expect(crea).toBeEnabled();

      fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '0' } });
      expect(crea).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '' } });
      expect(crea).toBeDisabled();
    });

    it('ANNULLA chiude il riquadro senza chiamare salvaIngrediente', async () => {
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));
      fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));

      expect(screen.queryByLabelText("Nome dell'ingrediente")).not.toBeInTheDocument();
      expect(salvaIngrediente).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Quantità di Tofu')).not.toBeInTheDocument();
    });

    it('se salvaIngrediente fallisce mostra il messaggio e il riquadro resta aperto', async () => {
      vi.mocked(salvaIngrediente).mockRejectedValue(new Error('rete'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await apri();
      cerca('Tofu');
      fireEvent.click(screen.getByRole('button', { name: 'Crea «Tofu»' }));
      fireEvent.click(screen.getByRole('button', { name: 'CREA E AGGIUNGI' }));

      expect(await screen.findByText("Non siamo riusciti a creare l'ingrediente. Riprova.")).toBeInTheDocument();
      expect(screen.getByLabelText("Nome dell'ingrediente")).toHaveValue('Tofu');
      await waitFor(() => expect(screen.getByRole('button', { name: 'CREA E AGGIUNGI' })).toBeEnabled());
      expect(screen.queryByLabelText('Quantità di Tofu')).not.toBeInTheDocument();
    });
  });

  describe('navigazione', () => {
    it('HO FINITO porta alla Settimana e la freccia torna ai Piatti', async () => {
      await apri();
      expect(screen.getByRole('link', { name: 'HO FINITO' })).toHaveAttribute('href', '/settimana');
      expect(screen.getByRole('link', { name: 'Torna ai piatti' })).toHaveAttribute('href', '/piatti');
    });
  });
});
