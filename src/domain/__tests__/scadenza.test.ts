import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient, MealSlot, PantryState } from '../types';
import { sommaGiorni } from '../date';
import { GIORNI_CONGELATO, GIORNI_FRESCO, residuoUtilizzabile, type ResiduoUtilizzabileInput } from '../pantry';
import { avvisiScadenza, etichettaScadenza, scadenzaResiduo } from '../scadenza';
import { avena, olio, passata, uova, wrap, yogurt } from './fixtures';

describe('scadenzaResiduo', () => {
  const BASE: Omit<ResiduoUtilizzabileInput, 'oggi'> & { ultimoAcquisto: string } = {
    residuo: 200,
    deperibile: true,
    area: 'macelleria',
    ultimoAcquisto: '2026-09-06',
    congelato: false,
  };

  /**
   * Il contratto della spec §1.1: la scadenza è l'ultimo giorno in cui
   * residuoUtilizzabile conta ancora il residuo. Si prova sui tre giorni che
   * decidono (soglia−1, soglia, soglia+1): se qui i due modelli divergessero,
   * l'avviso direbbe "scade martedì" e la lista ricomprerebbe lunedì.
   */
  function provaContratto(i: typeof BASE, soglia: number) {
    const scadenza = scadenzaResiduo(i);
    expect(scadenza).not.toBeNull();
    for (const giorni of [soglia - 1, soglia, soglia + 1]) {
      const oggi = sommaGiorni(i.ultimoAcquisto, giorni);
      expect(residuoUtilizzabile({ ...i, oggi }) > 0, `giorno ${giorni}`).toBe(oggi <= scadenza!);
    }
  }

  it('è ultimoAcquisto più la soglia dell\'area', () => {
    // Tre giorni per la macelleria: comprato domenica, mercoledì è l'ultimo giorno buono.
    expect(scadenzaResiduo(BASE)).toBe('2026-09-09');
  });

  it('rispetta residuoUtilizzabile intorno alla soglia della macelleria', () => {
    provaContratto(BASE, GIORNI_FRESCO.macelleria!);
  });

  it('rispetta residuoUtilizzabile intorno alla soglia dell\'ortofrutta', () => {
    provaContratto({ ...BASE, area: 'ortofrutta' }, GIORNI_FRESCO.ortofrutta!);
  });

  it('il congelatore sposta la scadenza a novanta giorni', () => {
    expect(scadenzaResiduo({ ...BASE, congelato: true })).toBe(sommaGiorni(BASE.ultimoAcquisto, GIORNI_CONGELATO));
    provaContratto({ ...BASE, congelato: true }, GIORNI_CONGELATO);
  });

  it('i surgelati non hanno una scadenza: sono già congelati', () => {
    expect(scadenzaResiduo({ ...BASE, area: 'surgelati' })).toBeNull();
    expect(residuoUtilizzabile({ ...BASE, area: 'surgelati', oggi: '2030-01-01' })).toBe(200);
  });

  it('un non deperibile non ha una scadenza', () => {
    expect(scadenzaResiduo({ ...BASE, deperibile: false })).toBeNull();
    expect(residuoUtilizzabile({ ...BASE, deperibile: false, oggi: '2030-01-01' })).toBe(200);
  });

  it('senza un acquisto non c\'è un orologio da cui contare', () => {
    expect(scadenzaResiduo({ ...BASE, ultimoAcquisto: null })).toBeNull();
    expect(residuoUtilizzabile({ ...BASE, ultimoAcquisto: null, oggi: '2030-01-01' })).toBe(200);
  });

  it('un residuo a zero non scade: non c\'è niente da mostrare', () => {
    expect(scadenzaResiduo({ ...BASE, residuo: 0 })).toBeNull();
    expect(scadenzaResiduo({ ...BASE, residuo: -5 })).toBeNull();
  });
});

describe('avvisiScadenza', () => {
  // Lunedì. Il pollo comprato ieri (domenica) scade mercoledì 9.
  const oggi = '2026-09-07';

  const pollo: Ingredient = {
    id: 'pollo', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
    classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500, prezzoConfezione: null,
  };
  /** Deperibile ma di classe stima: fuori da ogni aritmetica sul residuo. */
  const latte: Ingredient = {
    id: 'latte', nome: 'Latte', unitaBase: 'ml', area: 'latticini',
    classeResiduo: 'stima', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null,
  };
  const INGREDIENTI = [pollo, yogurt, avena, uova, olio, passata, latte];

  const cenaPollo: Dish = {
    id: 'cena-pollo', nome: 'Pollo alla piastra', slotDefId: 'cen',
    fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [{ ingredientId: 'pollo', quantita: 150, unita: 'g' }],
    componenti: [],
  };
  const cenaLatte: Dish = {
    id: 'cena-latte', nome: 'Latte e biscotti', slotDefId: 'cen',
    fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [{ ingredientId: 'latte', quantita: 200, unita: 'ml' }],
    componenti: [],
  };
  const PIATTI = [cenaPollo, cenaLatte, wrap];

  function slot(data: string, dishId: string | null, extra: Partial<MealSlot> = {}): MealSlot {
    return {
      id: `${data}-${extra.slotDefId ?? 'cen'}`, data, slotDefId: 'cen', stato: 'casa',
      dishId, fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false,
      ...extra,
    };
  }

  function riga(ingredientId: string, ultimoAcquisto: string | null, extra: Partial<PantryState> = {}): PantryState {
    return { ingredientId, residuo: 300, ultimoAcquisto, giorniStimati: 90, congelato: false, ultimoCheck: null, ...extra };
  }

  const polloDiIeri = riga('pollo', '2026-09-06');

  function avvisi(slots: MealSlot[], pantry: PantryState[] = [polloDiIeri]) {
    return avvisiScadenza({ slots, dishes: PIATTI, ingredients: INGREDIENTI, pantry, oggi });
  }

  it('segnala il pasto che troverà il residuo già scaduto', () => {
    // Giovedì il pollo comprato domenica, per il modello, non c'è più.
    expect(avvisi([slot('2026-09-10', 'cena-pollo')])).toEqual([{
      ingredientId: 'pollo', nome: 'Pollo', scadenza: '2026-09-09',
      pastiDopo: [{ data: '2026-09-10', slotDefId: 'cen' }],
      usatoInTempo: false,
    }]);
  });

  it('un pasto entro la scadenza lo usa in tempo', () => {
    const [a] = avvisi([slot('2026-09-08', 'cena-pollo')]);
    expect(a.usatoInTempo).toBe(true);
    expect(a.pastiDopo).toEqual([]);
  });

  it('il giorno stesso della scadenza è ancora in tempo', () => {
    // Coerente con residuoUtilizzabile: il terzo giorno il pollo si mangia.
    const [a] = avvisi([slot('2026-09-09', 'cena-pollo')]);
    expect(a.usatoInTempo).toBe(true);
    expect(a.pastiDopo).toEqual([]);
  });

  it('l\'avviso esiste anche senza nessun pasto che usi l\'ingrediente', () => {
    // È la riga anti-dimenticanza della Dispensa: nessuno lo usa prima che scada.
    expect(avvisi([])).toEqual([{
      ingredientId: 'pollo', nome: 'Pollo', scadenza: '2026-09-09', pastiDopo: [], usatoInTempo: false,
    }]);
  });

  it('ignora i pasti già passati', () => {
    // Ieri il pollo l'hai mangiato o no: il piano di oggi non può più dirlo.
    const [a] = avvisi([slot('2026-09-06', 'cena-pollo')]);
    expect(a.usatoInTempo).toBe(false);
    expect(a.pastiDopo).toEqual([]);
  });

  it('ignora gli slot fuori casa e saltati', () => {
    const [a] = avvisi([
      slot('2026-09-08', 'cena-pollo', { stato: 'fuori' }),
      slot('2026-09-10', 'cena-pollo', { stato: 'saltato' }),
    ]);
    expect(a.usatoInTempo).toBe(false);
    expect(a.pastiDopo).toEqual([]);
  });

  it('ignora lo slot coperto dai pronti senza porzioni da cucinare', () => {
    const [a] = avvisi([slot('2026-09-10', 'cena-pollo', { daPronti: true })]);
    expect(a.pastiDopo).toEqual([]);
  });

  it('conta lo slot spento che cucina porzioni per il futuro', () => {
    // fattoreConsumo: cucinare per i Pronti consuma crudo anche se stasera si mangia fuori.
    const [a] = avvisi([slot('2026-09-10', 'cena-pollo', { stato: 'fuori', porzioniPreparate: 2 })]);
    expect(a.pastiDopo).toEqual([{ data: '2026-09-10', slotDefId: 'cen' }]);
  });

  it('rispetta le scelte dei componenti', () => {
    // Lo yogurt comprato domenica scade domenica 13. Il wrap del 20 lo usa
    // solo se la farcitura è quella di default (yogurt), non con le uova.
    const yogurtDiIeri = riga('yogurt', '2026-09-06');
    const conDefault = avvisi([slot('2026-09-20', 'pranzo-wrap', { slotDefId: 'pra' })], [yogurtDiIeri]);
    expect(conDefault).toHaveLength(1);
    expect(conDefault[0].scadenza).toBe('2026-09-13');
    expect(conDefault[0].pastiDopo).toEqual([{ data: '2026-09-20', slotDefId: 'pra' }]);

    const conUova = avvisi([slot('2026-09-20', 'pranzo-wrap', {
      slotDefId: 'pra',
      scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'manuale' } },
    })], [yogurtDiIeri]);
    expect(conUova[0].pastiDopo).toEqual([]);
  });

  it('esclude la classe stima anche se deperibile', () => {
    expect(avvisi([slot('2026-09-20', 'cena-latte')], [riga('latte', '2026-09-06')])).toEqual([]);
  });

  it('esclude il residuo già scaduto: la Dispensa lo dice già a modo suo', () => {
    // Sei giorni per il pollo: residuoUtilizzabile è zero, non c'è più niente che scada.
    expect(avvisi([slot('2026-09-10', 'cena-pollo')], [riga('pollo', '2026-09-01')])).toEqual([]);
  });

  it('esclude i non deperibili, i surgelati e il mai comprato', () => {
    const surgelato: Ingredient = { ...pollo, id: 'piselli', nome: 'Piselli', area: 'surgelati' };
    const out = avvisiScadenza({
      slots: [], dishes: PIATTI, ingredients: [...INGREDIENTI, surgelato],
      pantry: [riga('avena', '2026-09-06'), riga('piselli', '2026-09-06'), riga('pollo', null)],
      oggi,
    });
    expect(out).toEqual([]);
  });

  it('un ingrediente senza riga in dispensa ha residuo zero: nessun avviso', () => {
    expect(avvisi([slot('2026-09-10', 'cena-pollo')], [])).toEqual([]);
  });

  it('salta lo slot con una scelta verso un\'opzione rimossa senza esplodere', () => {
    // Come descriviScelte: un avviso non è il posto dove far saltare la pagina.
    const rotto = slot('2026-09-20', 'pranzo-wrap', {
      slotDefId: 'pra',
      scelte: { farcitura: { opzioneId: 'farcitura-rimossa', fonte: 'planner' } },
    });
    const out = avvisi([rotto, slot('2026-09-10', 'cena-pollo')], [riga('yogurt', '2026-09-06'), polloDiIeri]);
    expect(out.map((a) => a.ingredientId)).toEqual(['pollo', 'yogurt']);
    expect(out[0].pastiDopo).toEqual([{ data: '2026-09-10', slotDefId: 'cen' }]);
    expect(out[1].pastiDopo).toEqual([]);
  });

  it('salta gli slot senza piatto o con un piatto che non esiste più', () => {
    const [a] = avvisi([slot('2026-09-10', null), slot('2026-09-11', 'piatto-cancellato')]);
    expect(a.pastiDopo).toEqual([]);
  });

  it('ordina per scadenza crescente, poi per nome', () => {
    // Zucchine e Albicocche (ortofrutta, 7 giorni) scadono insieme: vince il nome.
    const zucchine: Ingredient = { ...pollo, id: 'zucchine', nome: 'Zucchine', area: 'ortofrutta' };
    const albicocche: Ingredient = { ...pollo, id: 'albicocche', nome: 'Albicocche', area: 'ortofrutta' };
    const out = avvisiScadenza({
      slots: [], dishes: PIATTI, ingredients: [zucchine, ...INGREDIENTI, albicocche],
      pantry: [riga('zucchine', '2026-09-06'), riga('yogurt', '2026-09-04'), riga('albicocche', '2026-09-06'), polloDiIeri],
      oggi,
    });
    expect(out.map((a) => [a.nome, a.scadenza])).toEqual([
      ['Pollo', '2026-09-09'],
      ['Yogurt greco', '2026-09-11'],
      ['Albicocche', '2026-09-13'],
      ['Zucchine', '2026-09-13'],
    ]);
  });

  it('ordina i pasti dopo la scadenza per data e poi per pasto', () => {
    const [a] = avvisi([
      slot('2026-09-11', 'cena-pollo'),
      slot('2026-09-10', 'cena-pollo', { slotDefId: 'pra' }),
      slot('2026-09-10', 'cena-pollo', { slotDefId: 'cen' }),
    ]);
    expect(a.pastiDopo).toEqual([
      { data: '2026-09-10', slotDefId: 'cen' },
      { data: '2026-09-10', slotDefId: 'pra' },
      { data: '2026-09-11', slotDefId: 'cen' },
    ]);
  });
});

describe('etichettaScadenza', () => {
  it('oggi e domani', () => {
    expect(etichettaScadenza('2026-09-06', '2026-09-06')).toBe('oggi');
    expect(etichettaScadenza('2026-09-07', '2026-09-06')).toBe('domani');
  });

  it('entro sei giorni il nome del giorno, minuscolo e con l\'accento', () => {
    // Da domenica 6: martedì 8 ... sabato 12.
    expect(etichettaScadenza('2026-09-08', '2026-09-06')).toBe('martedì');
    expect(etichettaScadenza('2026-09-09', '2026-09-06')).toBe('mercoledì');
    expect(etichettaScadenza('2026-09-10', '2026-09-06')).toBe('giovedì');
    expect(etichettaScadenza('2026-09-11', '2026-09-06')).toBe('venerdì');
    expect(etichettaScadenza('2026-09-12', '2026-09-06')).toBe('sabato');
    // Da lunedì 7 a domenica 13, da sabato 5 a lunedì 7.
    expect(etichettaScadenza('2026-09-13', '2026-09-07')).toBe('domenica');
    expect(etichettaScadenza('2026-09-07', '2026-09-05')).toBe('lunedì');
  });

  it('da sette giorni in poi la data, senza zero iniziale', () => {
    // Il settimo giorno ha lo stesso nome di oggi: "domenica" direbbe oggi.
    expect(etichettaScadenza('2026-09-13', '2026-09-06')).toBe('il 13 set');
    expect(etichettaScadenza('2026-10-01', '2026-09-06')).toBe('il 1 ott');
    expect(etichettaScadenza('2027-01-05', '2026-09-06')).toBe('il 5 gen');
  });

  it('un giorno passato non è previsto ma non fa esplodere', () => {
    expect(etichettaScadenza('2026-09-01', '2026-09-06')).toBe('il 1 set');
  });
});
