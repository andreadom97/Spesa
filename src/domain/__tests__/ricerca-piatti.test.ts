import { describe, it, expect } from 'vitest';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { areeDelPiatto, cercaPiatti, ingredientiDelPiatto } from '../ricerca-piatti';

function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {
  return {
    id, nome, unitaBase: 'g', area,
    classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
  };
}

function piatto(id: string, nome: string, fissi: string[], opzioni: string[][] = []): Dish {
  return {
    id, nome, slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null,
    settimanaCiclo: null, giornoCiclo: null,
    ingredienti: fissi.map((ingredientId) => ({ ingredientId, quantita: 10, unita: 'g' })),
    componenti: opzioni.length === 0 ? [] : [{
      id: `c-${id}`, nome: 'a scelta',
      opzioni: opzioni.map((righe, i) => ({
        id: `o-${id}-${i}`,
        righe: righe.map((ingredientId) => ({ ingredientId, quantita: 10, unita: 'g' as const })),
      })),
    }],
  };
}

const RICOTTA = ingrediente('i-ricotta', 'Ricotta');
const PASTA = ingrediente('i-pasta', 'Pasta di semola');
const TONNO = ingrediente('i-tonno', 'Tonno');
const PANE = ingrediente('i-pane', 'Pane integrale');
const FETTE = ingrediente('i-fette', 'Fette biscottate');
const CAFFE = ingrediente('i-caffe', 'Caffè');

const LASAGNE = piatto('d-1', 'Lasagne al forno', ['i-pasta', 'i-ricotta']);
const PASTA_POMODORO = piatto('d-2', 'Pasta al pomodoro', ['i-pasta']);
const COLAZIONE = piatto('d-3', 'Colazione', ['i-caffe'], [['i-pane'], ['i-fette', 'i-ricotta']]);
const INSALATA = piatto('d-4', 'Insalata di tonno', ['i-tonno']);

const PIATTI = [LASAGNE, PASTA_POMODORO, COLAZIONE, INSALATA];
const INGREDIENTI = [RICOTTA, PASTA, TONNO, PANE, FETTE, CAFFE];

describe('ingredientiDelPiatto', () => {
  it('unisce i fissi e le righe di ogni opzione, senza doppioni', () => {
    const ricottaDoppia = piatto('d-9', 'X', ['i-ricotta'], [['i-ricotta', 'i-pane']]);
    expect(ingredientiDelPiatto(ricottaDoppia)).toEqual(['i-ricotta', 'i-pane']);
    expect(ingredientiDelPiatto(COLAZIONE)).toEqual(['i-caffe', 'i-pane', 'i-fette', 'i-ricotta']);
  });

  it('senza componenti dà i soli fissi', () => {
    expect(ingredientiDelPiatto(LASAGNE)).toEqual(['i-pasta', 'i-ricotta']);
  });

  it('con soli componenti dà quelli delle opzioni', () => {
    const soloOpzioni = piatto('d-8', 'Merenda', [], [['i-pane'], ['i-fette']]);
    expect(ingredientiDelPiatto(soloOpzioni)).toEqual(['i-pane', 'i-fette']);
  });
});

describe('cercaPiatti', () => {
  it('regola 1: un testo vuoto o di soli spazi dà tutti i piatti, nello stesso ordine', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, '')).toEqual(PIATTI);
    expect(cercaPiatti(PIATTI, INGREDIENTI, '   ')).toEqual(PIATTI);
  });

  it('regola 2: accenti, maiuscole e spazi doppi non contano', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'LASAGNE  AL')).toEqual([LASAGNE]);
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'caffe')).toEqual([COLAZIONE]);
  });

  it('regola 3: trova un piatto per un ingrediente che non è nel nome', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'ricotta')).toEqual([LASAGNE, COLAZIONE]);
  });

  it('regola 3: vale anche per un ingrediente che sta solo in un\'opzione', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'biscottate')).toEqual([COLAZIONE]);
  });

  it('regola 4: il testo si cerca intero, non parola per parola', () => {
    // "pasta" è nel nome e "tonno" in un altro piatto: nessuno contiene "pasta tonno".
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'pasta tonno')).toEqual([]);
  });

  it('regola 5: un ingrediente sconosciuto si ignora', () => {
    const orfano = piatto('d-7', 'Piatto orfano', ['i-sparito']);
    expect(cercaPiatti([orfano], INGREDIENTI, 'orfano')).toEqual([orfano]);
    expect(cercaPiatti([orfano], INGREDIENTI, 'ricotta')).toEqual([]);
  });

  it('regola 6: l\'ordine di uscita è quello di entrata', () => {
    expect(cercaPiatti([INSALATA, LASAGNE, PASTA_POMODORO], INGREDIENTI, 'pasta')).toEqual([LASAGNE, PASTA_POMODORO]);
  });
});

describe('areeDelPiatto', () => {
  const FARINA = ingrediente('i-farina', 'Farina', 'cereali');
  const LATTE = ingrediente('i-latte', 'Latte', 'latticini');
  const OLIO = ingrediente('i-olio', 'Olio', 'dispensa');
  const AREA_PER_INGREDIENTE = new Map([RICOTTA, FARINA, LATTE, OLIO].map((i) => [i.id, i.area]));
  const ORDINE: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'];

  it('le aree distinte del piatto (fissi e opzioni), nell\'ordine dell\'utente e non di inserimento', () => {
    // Inserimento: cereali, latticini, dispensa. L'ordine dell'utente le vuole latticini, cereali, dispensa.
    const misto = piatto('d-10', 'Misto', ['i-farina'], [['i-latte'], ['i-olio']]);
    expect(areeDelPiatto(misto, AREA_PER_INGREDIENTE, ORDINE)).toEqual(['latticini', 'cereali', 'dispensa']);
  });

  it('un ingrediente sconosciuto alla mappa non aggiunge nessuna area', () => {
    const orfano = piatto('d-11', 'Orfano', ['i-sparito']);
    expect(areeDelPiatto(orfano, AREA_PER_INGREDIENTE, ORDINE)).toEqual([]);
  });

  it('senza ingredienti dà nessuna area', () => {
    const vuoto = piatto('d-12', 'Vuoto', []);
    expect(areeDelPiatto(vuoto, AREA_PER_INGREDIENTE, ORDINE)).toEqual([]);
  });
});
