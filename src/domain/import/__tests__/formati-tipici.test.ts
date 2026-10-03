import { describe, it, expect } from 'vitest';
import {
  proponi, origineProposta, arrotonda, convertiCucchiai, convertiPezzi, numeroInParole,
  categoriaDi, pesoPezzo, porzioneTipica, quantitaInTesto, testoCambio, testoConversione,
} from '../formati-tipici';
import { unitaBaseDi } from '../types';

describe('proponi — le chiavi per parole intere', () => {
  it('«melanzane» non prende la voce «mela»', () => {
    expect(proponi('melanzane', 'g')).toMatchObject({ nome: 'Melanzane', area: 'dispensa', classeResiduo: 'stima', formatoConfezione: 500 });
    expect(origineProposta('melanzane', 'g')).toBe('ripiego');
  });

  it('«latte parzialmente scremato» prende la voce «latte», col nome della dieta', () => {
    expect(proponi('latte parzialmente scremato', 'ml')).toMatchObject({
      nome: 'Latte parzialmente scremato', unitaBase: 'ml', area: 'latticini', deperibile: true, formatoConfezione: 1000,
    });
    expect(origineProposta('latte parzialmente scremato', 'ml')).toBe('tabella');
  });

  it('fra più voci vince ancora la chiave più lunga', () => {
    expect(proponi('frutta secca mista', 'g')).toMatchObject({ nome: 'Frutta secca mista', area: 'dispensa', formatoConfezione: 200 });
  });
});

describe('proponi — il nome', () => {
  it('pane integrale e pane di segale restano due nomi diversi', () => {
    const integrale = proponi('pane integrale', 'g');
    const segale = proponi('pane di segale', 'g');
    expect(integrale.nome).toBe('Pane integrale');
    expect(segale.nome).toBe('Pane di segale');
    expect(integrale).toMatchObject({ area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 });
  });

  it('«pasta integrale» non diventa «Pasta di semola»', () => {
    expect(proponi('pasta integrale', 'g').nome).toBe('Pasta integrale');
  });

  it('un alimento uguale alla chiave prende il nome della tabella', () => {
    expect(proponi('pasta', 'g').nome).toBe('Pasta di semola');
    expect(proponi('Olio  Extravergine', 'ml').nome).toBe('Olio extravergine di oliva');
  });

  it("l'alimento della proposta resta il nome estratto normalizzato", () => {
    expect(proponi('Pane Integrale', 'g').alimento).toBe('pane integrale');
  });
});

describe('proponi — il ripiego', () => {
  it('a pezzi propone 1 pz a confezione', () => {
    expect(proponi('olive taggiasche', 'pz')).toMatchObject({ unitaBase: 'pz', formatoConfezione: 1, area: 'dispensa', classeResiduo: 'stima', deperibile: false, prezzoConfezione: null });
    expect(origineProposta('olive taggiasche', 'pz')).toBe('ripiego');
  });

  it('in g e in ml resta 500', () => {
    expect(proponi('olive taggiasche', 'g')).toMatchObject({ unitaBase: 'g', formatoConfezione: 500 });
    expect(proponi('alchermes', 'ml')).toMatchObject({ unitaBase: 'ml', formatoConfezione: 500 });
  });

  it('senza unità: 500 g', () => {
    expect(proponi('cosa ignota', null)).toMatchObject({ unitaBase: 'g', formatoConfezione: 500 });
  });

  it("un'unità che non torna con la voce è un ripiego", () => {
    expect(origineProposta('latte', 'g')).toBe('ripiego');
    expect(proponi('latte', 'g')).toMatchObject({ nome: 'Latte', unitaBase: 'g', formatoConfezione: 500, area: 'dispensa' });
  });

  it('il prezzo non si propone mai', () => {
    expect(proponi('pasta', 'g').prezzoConfezione).toBeNull();
  });
});

describe('pesoPezzo (spec 8c §A.1)', () => {
  it('per parole intere, singolare e plurale', () => {
    expect(pesoPezzo('Zucchine')).toBe(200);
    expect(pesoPezzo('zucchina grigliata')).toBe(200);
    expect(pesoPezzo('uova')).toBe(60);
    expect(pesoPezzo('Uovo')).toBe(60);
  });

  it('«pomodorini» non è «pomodori», e un nome ignoto è null', () => {
    expect(pesoPezzo('pomodorini')).toBeNull();
    expect(pesoPezzo('cavolo nero')).toBeNull();
  });

  it('prova i nomi in ordine: il primo che trova vince', () => {
    expect(pesoPezzo('Ortaggio misto', 'melanzane')).toBe(300);
  });
});

describe('arrotonda e convertiPezzi (spec 8c §A.3)', () => {
  it('pz al quarto, g all\'intero, mai sotto il minimo', () => {
    expect(arrotonda(0.74, 'pz')).toBe(0.75);
    expect(arrotonda(0.05, 'pz')).toBe(0.25);
    expect(arrotonda(399.6, 'g')).toBe(400);
    expect(arrotonda(0.2, 'g')).toBe(1);
    expect(arrotonda(7.5, 'ml')).toBe(7.5);
  });

  it('fra g e pz col peso, altrimenti null', () => {
    expect(convertiPezzi(150, 'g', 'pz', 200)).toBe(0.75);
    expect(convertiPezzi(2, 'pz', 'g', 200)).toBe(400);
    expect(convertiPezzi(150, 'g', 'g', 200)).toBe(150);
    expect(convertiPezzi(150, 'g', 'ml', 200)).toBeNull();
  });
});

describe('convertiCucchiai (spec 8c §C)', () => {
  it('in ml i valori generici, 15 e 5', () => {
    expect(convertiCucchiai(1, 'cucchiaio', 'olio extravergine', 'ml')).toEqual({ quantita: 15, daTabella: true });
    expect(convertiCucchiai(2, 'cucchiaino', 'aceto', 'ml')).toEqual({ quantita: 10, daTabella: true });
  });

  it('in g la tabella per alimento', () => {
    expect(convertiCucchiai(1, 'cucchiaio', 'miele millefiori', 'g')).toEqual({ quantita: 21, daTabella: true });
    expect(convertiCucchiai(2, 'cucchiaino', 'zucchero di canna', 'g')).toEqual({ quantita: 8, daTabella: true });
  });

  it('in g senza voce: 15 g o 5 g, da controllare; a pezzi non si converte', () => {
    expect(convertiCucchiai(1, 'cucchiaio', 'semi di chia', 'g')).toEqual({ quantita: 15, daTabella: false });
    expect(convertiCucchiai(1, 'cucchiaio', 'olive', 'pz')).toBeNull();
  });
});

describe('porzioneTipica (spec 8c §D)', () => {
  it('per parole intere, la chiave più lunga vince', () => {
    expect(porzioneTipica('pasta integrale')).toEqual({ quantita: 80, unita: 'g', origine: 'porzione' });
    expect(porzioneTipica('olio extravergine di oliva')).toEqual({ quantita: 10, unita: 'ml', origine: 'porzione' });
    expect(porzioneTipica('frutta secca mista')).toEqual({ quantita: 30, unita: 'g', origine: 'porzione' });
    expect(porzioneTipica('frutta di stagione')).toEqual({ quantita: 150, unita: 'g', origine: 'porzione' });
  });

  it('niente olive né sale: restano dubbi', () => {
    expect(porzioneTipica('olive taggiasche')).toBeNull();
    expect(porzioneTipica('sale')).toBeNull();
  });
});

describe('Task 12b: il ripiego per categoria nelle porzioni tipiche', () => {
  it('verdure e ortaggi 200 g, frutta 150 g, singolari e plurali, per parole intere', () => {
    for (const verdura of ['zucchine', 'finocchi', 'melanzane', 'cavolo nero', 'cime di rapa', 'cavoletti di bruxelles', 'fiori di zucca', 'spinaci', 'broccoli', 'peperone rosso']) {
      expect(porzioneTipica(verdura), verdura).toEqual({ quantita: 200, unita: 'g', origine: 'categoria' });
    }
    for (const frutto of ['mela', 'pere', 'kiwi', 'fragole', 'frutti di bosco', 'arance', 'uva']) {
      expect(porzioneTipica(frutto), frutto).toEqual({ quantita: 150, unita: 'g', origine: 'categoria' });
    }
  });

  it('una voce specifica della tabella vince sempre sul ripiego', () => {
    expect(porzioneTipica('insalata di pomodori')).toEqual({ quantita: 80, unita: 'g', origine: 'porzione' });
    expect(porzioneTipica('verdure grigliate')).toEqual({ quantita: 200, unita: 'g', origine: 'porzione' });
    expect(porzioneTipica('pasta alle zucchine')).toEqual({ quantita: 80, unita: 'g', origine: 'porzione' });
    expect(porzioneTipica('yogurt ai frutti di bosco')).toEqual({ quantita: 125, unita: 'g', origine: 'porzione' });
  });

  it('le forme lavorate non sono una porzione di verdura o di frutta', () => {
    for (const lavorato of ['succo di mela', 'passata di pomodoro', 'pomodori secchi', 'marmellata di albicocche', 'funghi secchi', 'spremuta di arance']) {
      expect(porzioneTipica(lavorato), lavorato).toBeNull();
      expect(categoriaDi(lavorato), lavorato).toBeNull();
    }
  });

  it('fix M2: la parola della categoria vale solo in testa all\'alimento, e le forme lavorate restano fuori', () => {
    for (const falso of [
      'aceto di mele', 'frutti di mare', 'pesto di rucola', 'crema di carciofi', 'uva passa', 'gelato alla fragola',
      'pizza ai funghi', "carciofi sott'olio", 'carciofi sott’olio', "cipolline sott'aceto", "cipolline all'aceto", 'pomodori pelati',
    ]) {
      expect(porzioneTipica(falso), falso).toBeNull();
      expect(categoriaDi(falso), falso).toBeNull();
    }
    for (const buono of ['zucchine', 'finocchi', 'cavolo nero', 'frutti di bosco', 'frutti rossi', 'fragole fresche', 'broccoli al vapore']) {
      expect(porzioneTipica(buono), buono).toMatchObject({ origine: 'categoria' });
    }
  });

  it('fix M3: singolari e plurali di ogni voce', () => {
    for (const verdura of [
      'radicchi', 'lattughe', 'zucche', 'sedani', 'indivie', 'scarole', 'cicorie', 'fagiolino', 'cipolline', 'cipollina',
      'datterini', 'datterino', 'bieta', 'puntarella', 'scalogni', 'cima di rapa', 'fiore di zucca', 'cavoletto di bruxelles', 'germoglio',
    ]) {
      expect(categoriaDi(verdura), verdura).toBe('verdure');
    }
    for (const frutto of ['mirtillo', 'lampone', 'nespola', 'melagrane', 'melograno', 'manghi', 'nettarine', 'mora']) {
      expect(categoriaDi(frutto), frutto).toBe('frutta');
    }
    // Il plurale di una voce della tabella resta la voce della tabella, non il ripiego.
    expect(porzioneTipica('insalate miste')).toEqual({ quantita: 80, unita: 'g', origine: 'porzione' });
  });

  it('categoriaDi: verdure, frutta, o niente', () => {
    expect(categoriaDi('Zucchine')).toBe('verdure');
    expect(categoriaDi('insalata mista')).toBe('verdure');
    expect(categoriaDi('banana')).toBe('frutta');
    expect(categoriaDi('frutta di stagione')).toBe('frutta');
    expect(categoriaDi('patate')).toBeNull();
    expect(categoriaDi('pane')).toBeNull();
    expect(categoriaDi('fagioli')).toBeNull();
  });
});

describe('i due valori (spec 8c, «Come si mostra una conversione»)', () => {
  it('«150 g, quindi 0,75 pz» e «1 cucchiaio, quindi 15 ml»', () => {
    expect(testoConversione({ quantita: 150, unita: 'g' }, { quantita: 0.75, unita: 'pz' })).toBe('150 g, quindi 0,75 pz');
    expect(testoConversione({ quantita: 1, unita: 'cucchiaio' }, { quantita: 15, unita: 'ml' })).toBe('1 cucchiaio, quindi 15 ml');
    expect(testoConversione({ quantita: 2, unita: 'cucchiaino' }, { quantita: 10, unita: 'ml' })).toBe('2 cucchiaini, quindi 10 ml');
  });

  it('i numeri con la virgola, al massimo due decimali', () => {
    expect(numeroInParole(0.75)).toBe('0,75');
    expect(numeroInParole(7.5)).toBe('7,5');
    expect(numeroInParole(1 / 3)).toBe('0,33');
    expect(quantitaInTesto(0.5, 'cucchiaio')).toBe('0,5 cucchiai');
  });

  it('il cambio di unità in una frase', () => {
    expect(testoCambio('Zucchine', 'g', 200)).toBe('Zucchine passa a grammi: 1 pz = 200 g.');
  });

  it('unitaBaseDi: i cucchiai non sono un\'unità di base', () => {
    expect(unitaBaseDi('g')).toBe('g');
    expect(unitaBaseDi('cucchiaio')).toBeNull();
    expect(unitaBaseDi(null)).toBeNull();
  });
});
