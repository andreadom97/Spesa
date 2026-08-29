import { describe, it, expect } from 'vitest';
import { assegnaPiatti } from '../planner';
import { generaSettimana } from '../week-shape';
import { wrap, INGREDIENTI } from './fixtures';
import type { Dish, Ingredient, MealSlot, MealSlotDef, PantryState } from '../types';

const DEFS: MealSlotDef[] = [
  { id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, true, false, false, false, false] },
  { id: 'cen', nome: 'Cena', posizione: 1, assenzeAbituali: Array(7).fill(false) },
];

function piatto(
  id: string,
  slotDefId: string,
  attivo = true,
  ciclo: { settimanaCiclo?: number | null; giornoCiclo?: number | null } = {},
): Dish {
  return {
    id, nome: id, slotDefId, fonte: 'proprio', attivo, descrizione: null,
    settimanaCiclo: ciclo.settimanaCiclo ?? null,
    giornoCiclo: ciclo.giornoCiclo ?? null,
    ingredienti: [],
    componenti: [],
  };
}

const PIATTI = [piatto('c1', 'col'), piatto('c2', 'col'), piatto('n1', 'cen')];

describe('assegnaPiatti', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('assegna un piatto a ogni slot a casa', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.stato === 'casa').every((s) => s.dishId !== null)).toBe(true);
  });

  it('non assegna niente agli slot fuori casa', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.stato === 'fuori').every((s) => s.dishId === null)).toBe(true);
  });

  it('ruota fra i piatti disponibili per quel pasto', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    const col = dopo.filter((s) => s.slotDefId === 'col' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data));
    expect(col.map((s) => s.dishId)).toEqual(['c1', 'c2', 'c1', 'c2', 'c1', 'c2']);
  });

  it('non pesca piatti di un altro pasto', () => {
    const dopo = assegnaPiatti({ slots, dishes: PIATTI });
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 'n1')).toBe(true);
  });

  it('ignora i piatti disattivati', () => {
    const dopo = assegnaPiatti({ slots, dishes: [piatto('c1', 'col'), piatto('c2', 'col', false), piatto('n1', 'cen')] });
    expect(dopo.filter((s) => s.slotDefId === 'col' && s.stato === 'casa')
      .every((s) => s.dishId === 'c1')).toBe(true);
  });

  it('lascia lo slot vuoto se per quel pasto non c\'è nessun piatto', () => {
    const dopo = assegnaPiatti({ slots, dishes: [piatto('n1', 'cen')] });
    expect(dopo.filter((s) => s.slotDefId === 'col').every((s) => s.dishId === null)).toBe(true);
  });

  it('non tocca uno slot che ha già un piatto scelto a mano', () => {
    const conScelta = slots.map((s) =>
      s.data === '2026-08-31' && s.slotDefId === 'col' ? { ...s, dishId: 'c2' } : s);
    const dopo = assegnaPiatti({ slots: conScelta, dishes: PIATTI });
    expect(dopo.find((s) => s.data === '2026-08-31' && s.slotDefId === 'col')!.dishId).toBe('c2');
  });

  it('è stabile rispetto all\'ordine dell\'array: stessi slot in ordine diverso → stesse assegnazioni per date', () => {
    const dopo1 = assegnaPiatti({ slots, dishes: PIATTI });
    // Mescola l'ordine degli slot
    const slotsMescolati = [...slots].reverse();
    const dopo2 = assegnaPiatti({ slots: slotsMescolati, dishes: PIATTI });

    // Verifico che per ogni data e slotDef, l'assegnazione sia identica
    for (const slot of slots) {
      const s1 = dopo1.find((s) => s.data === slot.data && s.slotDefId === slot.slotDefId)!;
      const s2 = dopo2.find((s) => s.data === slot.data && s.slotDefId === slot.slotDefId)!;
      expect(s2.dishId).toBe(s1.dishId);
    }
  });

  it('con quattordici piatti non riusa sempre i primi sette', () => {
    // Il difetto che il ciclo esiste per correggere: l'ordinale ripartiva da
    // zero ogni lunedì, quindi metà repertorio non veniva mai usata.
    const quattordici = Array.from({ length: 14 }, (_, i) => piatto(`p${i}`, 'cen'));
    const prima = assegnaPiatti({ slots, dishes: quattordici, settimaneTrascorse: 0 });
    const dopo = assegnaPiatti({ slots, dishes: quattordici, settimaneTrascorse: 1 });

    const cene = (r: typeof prima) => r
      .filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((s) => s.dishId);

    expect(cene(prima)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(cene(dopo)).toEqual(['p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13']);
  });

  it('la rotazione riprende da capo dopo un giro intero', () => {
    const due = [piatto('a', 'cen'), piatto('b', 'cen')];
    const s0 = assegnaPiatti({ slots, dishes: due, settimaneTrascorse: 0 });
    const s2 = assegnaPiatti({ slots, dishes: due, settimaneTrascorse: 2 });
    const cene = (r: typeof s0) => r
      .filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .sort((a, b) => a.data.localeCompare(b.data)).map((s) => s.dishId);
    // 7 giorni e 2 piatti: la settimana dopo parte dall'altro piatto, quella
    // dopo ancora torna al primo.
    expect(cene(s2)).toEqual(cene(s0));
  });
});

describe('assegnaPiatti — ciclo su più settimane', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('usa solo i piatti della settimana del ciclo in corso', () => {
    const dishes = [
      piatto('s1a', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s1b', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s2a', 'cen', true, { settimanaCiclo: 2 }),
    ];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's1a' || s.dishId === 's1b')).toBe(true);

    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's2a')).toBe(true);
  });

  it('i piatti senza settimana dichiarata valgono per tutte', () => {
    const dishes = [piatto('sempre', 'cen'), piatto('s2', 'cen', true, { settimanaCiclo: 2 })];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 'sempre')).toBe(true);
  });

  it('se per quella settimana non c\'è nessun piatto, ripiega su tutto il repertorio', () => {
    // Meglio un piatto fuori giro che una cena vuota: chi ha taggato solo
    // metà repertorio non deve trovarsi mezza settimana in bianco.
    const dishes = [piatto('s1', 'cen', true, { settimanaCiclo: 1 })];
    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId === 's1')).toBe(true);
  });

  it('un piatto con giorno fisso va in quel giorno, non in rotazione', () => {
    const dishes = [
      piatto('mercoledi', 'cen', true, { giornoCiclo: 2 }),
      piatto('altro1', 'cen'),
      piatto('altro2', 'cen'),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    // 2026-09-02 è il mercoledì della settimana che inizia il 31/08.
    expect(dopo.find((s) => s.data === '2026-09-02' && s.slotDefId === 'cen')!.dishId).toBe('mercoledi');
    // E non compare in nessun altro giorno.
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.data !== '2026-09-02')
      .every((s) => s.dishId !== 'mercoledi')).toBe(true);
  });

  it('il giorno fisso vale dentro la sua settimana del ciclo, non nell\'altra', () => {
    const dishes = [
      piatto('lun1', 'cen', true, { settimanaCiclo: 1, giornoCiclo: 0 }),
      piatto('lun2', 'cen', true, { settimanaCiclo: 2, giornoCiclo: 0 }),
    ];
    const uno = assegnaPiatti({ slots, dishes, settimanaCiclo: 1 });
    expect(uno.find((s) => s.data === '2026-08-31' && s.slotDefId === 'cen')!.dishId).toBe('lun1');
    const due = assegnaPiatti({ slots, dishes, settimanaCiclo: 2 });
    expect(due.find((s) => s.data === '2026-08-31' && s.slotDefId === 'cen')!.dishId).toBe('lun2');
  });

  it('se tutti i piatti hanno un giorno fisso, i giorni scoperti ruotano lo stesso', () => {
    const dishes = [
      piatto('lun', 'cen', true, { giornoCiclo: 0 }),
      piatto('mar', 'cen', true, { giornoCiclo: 1 }),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    expect(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa')
      .every((s) => s.dishId !== null)).toBe(true);
  });
});
describe('assegnaPiatti — ciclo spento', () => {
  const slots = generaSettimana({ dataInizio: '2026-08-31', slotDefs: DEFS });

  it('senza settimana del ciclo le etichette dei piatti non filtrano niente', () => {
    // Spegnere la rotazione deve riportare al comportamento di prima, non
    // nascondere per sempre i piatti che erano stati taggati settimana 2.
    const dishes = [
      piatto('s1', 'cen', true, { settimanaCiclo: 1 }),
      piatto('s2', 'cen', true, { settimanaCiclo: 2 }),
    ];
    const dopo = assegnaPiatti({ slots, dishes });
    const usati = new Set(dopo.filter((s) => s.slotDefId === 'cen' && s.stato === 'casa').map((s) => s.dishId));
    expect([...usati].sort()).toEqual(['s1', 's2']);
  });

  it('il giorno fisso continua a valere anche a ciclo spento', () => {
    // "Il venerdì è pizza" non ha bisogno di una rotazione per essere vero.
    const dishes = [piatto('venerdi', 'cen', true, { giornoCiclo: 4 }), piatto('altro', 'cen')];
    const dopo = assegnaPiatti({ slots, dishes });
    expect(dopo.find((s) => s.data === '2026-09-04' && s.slotDefId === 'cen')!.dishId).toBe('venerdi');
  });
});

describe('piatti sorella sullo stesso giorno', () => {
  // Due ingredienti di dispensa, formati diversi apposta: il costo in
  // confezioni deve dipendere dal residuo e dal formato, non da chi arriva
  // prima nell'array dei piatti.
  const cioccolato: Ingredient = {
    id: 'cioccolato', nome: 'Cioccolato fondente', unitaBase: 'g', area: 'dispensa',
    classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 100,
  };
  const noci: Ingredient = {
    id: 'noci', nome: 'Noci', unitaBase: 'g', area: 'dispensa',
    classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200,
  };

  function spuntino(id: string, ingredientId: string, quantita: number): Dish {
    return {
      id, nome: id, slotDefId: 'spu', fonte: 'proprio', attivo: true, descrizione: null,
      settimanaCiclo: null, giornoCiclo: 0,
      ingredienti: [{ ingredientId, quantita, unita: 'g' }],
      componenti: [],
    };
  }
  const spuntinoCioccolato = spuntino('spuntino-cioccolato', 'cioccolato', 10);
  const spuntinoNoci = spuntino('spuntino-noci', 'noci', 20);

  function slotSpuntinoLunedi(): MealSlot {
    return {
      id: 'spu-lun', data: '2026-08-31', slotDefId: 'spu', stato: 'casa',
      dishId: null, fonteStato: 'default', scelte: {},
    };
  }

  function residuoDi(ingredientId: string, residuo: number): PantryState {
    return { ingredientId, residuo, ultimoAcquisto: null, giorniStimati: 90, congelato: false, ultimoCheck: null };
  }

  it('vince la sorella che richiede meno confezioni nuove', () => {
    // 90 g di cioccolato in dispensa, niente noci: il cioccolato costa 0 confezioni, le noci 1.
    const out = assegnaPiatti({
      slots: [slotSpuntinoLunedi()],
      dishes: [spuntinoNoci, spuntinoCioccolato], // ordine sfavorevole: non deve contare
      ingredients: [cioccolato, noci],
      pantry: [residuoDi('cioccolato', 90)],
      oggi: '2026-08-31',
      moltiplicatorePorzioni: 1,
    });
    expect(out[0].dishId).toBe('spuntino-cioccolato');
  });

  it('a parità di confezioni decide la rotazione, che avanza con le settimane', () => {
    // Dispensa vuota: entrambe costano 1 confezione. settimaneTrascorse pari/dispari alterna.
    const pari = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [], oggi: '2026-08-31', settimaneTrascorse: 0 });
    const dispari = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [], oggi: '2026-08-31', settimaneTrascorse: 1 });
    expect(pari[0].dishId).not.toBe(dispari[0].dishId);
  });

  it('senza dati di dispensa (input facoltativi assenti) sceglie per rotazione', () => {
    // Nessun ingredients/pantry/oggi: costo sempre 0 per entrambe, decide il
    // tie-break di rotazione sull'elenco ordinato per id — non sull'ordine
    // dell'array in ingresso. 'spuntino-cioccolato' < 'spuntino-noci', quindi
    // ordinale 0 (settimaneTrascorse 0) cade su di lui.
    const out = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], settimaneTrascorse: 0 });
    expect(out[0].dishId).toBe('spuntino-cioccolato');
  });

  it('è deterministico: stessi input, stessa scelta', () => {
    const a = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [residuoDi('cioccolato', 90)], oggi: '2026-08-31' });
    const b = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoNoci, spuntinoCioccolato], ingredients: [cioccolato, noci], pantry: [residuoDi('cioccolato', 90)], oggi: '2026-08-31' });
    expect(a[0].dishId).toBe(b[0].dishId);
  });

  it('regressione: passare solo ingredients (senza pantry né oggi) non accende da solo il criterio del costo', () => {
    // Un pasto libero di lunedì consuma cioccolato; martedì due sorelle
    // fisse, una a cioccolato una a noci. Senza NESSUN dato di dispensa
    // decide la rotazione (z-noci). Il bug: passando SOLO `ingredients` (non
    // `pantry` né `oggi`), `consumaDaResiduo` di lunedì popolava comunque la
    // copia di lavoro simulando un acquisto contro una dispensa fantasma, e
    // il confronto costi si accendeva da solo per martedì, facendo vincere
    // m-cioccolato invece di rispettare "facoltativi insieme per contratto".
    const lunediLibero: Dish = {
      id: 'lunedi-libero', nome: 'lunedi-libero', slotDefId: 'pasto', fonte: 'proprio',
      attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
      ingredienti: [{ ingredientId: 'cioccolato', quantita: 10, unita: 'g' }],
      componenti: [],
    };
    const mCioccolato: Dish = {
      id: 'm-cioccolato', nome: 'm-cioccolato', slotDefId: 'pasto', fonte: 'proprio',
      attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: 1,
      ingredienti: [{ ingredientId: 'cioccolato', quantita: 5, unita: 'g' }],
      componenti: [],
    };
    const zNoci: Dish = {
      id: 'z-noci', nome: 'z-noci', slotDefId: 'pasto', fonte: 'proprio',
      attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: 1,
      ingredienti: [{ ingredientId: 'noci', quantita: 20, unita: 'g' }],
      componenti: [],
    };
    const slots: MealSlot[] = [
      { id: 'lun', data: '2026-08-31', slotDefId: 'pasto', stato: 'casa', dishId: null, fonteStato: 'default', scelte: {} },
      { id: 'mar', data: '2026-09-01', slotDefId: 'pasto', stato: 'casa', dishId: null, fonteStato: 'default', scelte: {} },
    ];
    const dishes = [lunediLibero, mCioccolato, zNoci];
    const martediDi = (r: MealSlot[]) => r.find((s) => s.data === '2026-09-01')!.dishId;

    const senzaDispensa = assegnaPiatti({ slots, dishes, settimaneTrascorse: 0 });
    const soloIngredients = assegnaPiatti({ slots, dishes, ingredients: [cioccolato, noci], settimaneTrascorse: 0 });

    expect(martediDi(senzaDispensa)).toBe('z-noci');
    expect(martediDi(soloIngredients)).toBe(martediDi(senzaDispensa));
  });
});

describe('risoluzione dei componenti', () => {
  function slotPranzoLunedi(): MealSlot {
    return {
      id: 'pra-lun', data: '2026-08-31', slotDefId: 'pra', stato: 'casa',
      dishId: null, fonteStato: 'default', scelte: {},
    };
  }

  function residuoDi(ingredientId: string, residuo: number): PantryState {
    return { ingredientId, residuo, ultimoAcquisto: null, giorniStimati: 90, congelato: false, ultimoCheck: null };
  }

  it('sceglie l’opzione coperta dal residuo e la registra con fonte planner', () => {
    // 500 g di yogurt in casa, niente uova: l'opzione yogurt costa 0, quella uova 2 (uova pz + passata).
    const out = assegnaPiatti({
      slots: [slotPranzoLunedi()],
      dishes: [wrap],
      ingredients: INGREDIENTI,
      pantry: [residuoDi('yogurt', 500)],
      oggi: '2026-08-31',
    });
    expect(out[0].scelte).toEqual({ farcitura: { opzioneId: 'farcitura-yogurt', fonte: 'planner' } });
  });

  it('una scelta manuale non si tocca, qualunque cosa dica il residuo', () => {
    const slot = { ...slotPranzoLunedi(), scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'manuale' as const } } };
    const out = assegnaPiatti({
      slots: [slot], dishes: [wrap], ingredients: INGREDIENTI,
      pantry: [residuoDi('yogurt', 500)], oggi: '2026-08-31',
    });
    expect(out[0].scelte.farcitura).toEqual({ opzioneId: 'farcitura-uova', fonte: 'manuale' });
  });

  it('la scalatura è sequenziale: due pasti non si aggiudicano lo stesso residuo', () => {
    // Fixture locali al test: `succo` (porzionabile, formato 200, non
    // deperibile, area dispensa) e piatto `merenda` (slotDefId 'mer', nessuna
    // riga fissa) con un componente 'bevanda' a due opzioni NELL'ORDINE:
    // 'opz-a-succo' (succo 200 g) poi 'opz-b-avena' (avena 40 g).
    // Dispensa: succo 200, avena 500. Tre slot merenda: lun, mar, mer.
    const succo: Ingredient = {
      id: 'succo', nome: 'Succo di frutta', unitaBase: 'g', area: 'dispensa',
      classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200,
    };
    const merenda: Dish = {
      id: 'merenda', nome: 'Merenda', slotDefId: 'mer',
      fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
      ingredienti: [],
      componenti: [{
        id: 'bevanda', nome: 'bevanda',
        opzioni: [
          { id: 'opz-a-succo', righe: [{ ingredientId: 'succo', quantita: 200, unita: 'g' }] },
          { id: 'opz-b-avena', righe: [{ ingredientId: 'avena', quantita: 40, unita: 'g' }] },
        ],
      }],
    };
    function slotMerenda(data: string): MealSlot {
      return {
        id: `mer-${data}`, data, slotDefId: 'mer', stato: 'casa',
        dishId: null, fonteStato: 'default', scelte: {},
      };
    }

    const out = assegnaPiatti({
      slots: [slotMerenda('2026-08-31'), slotMerenda('2026-09-01'), slotMerenda('2026-09-02')],
      dishes: [merenda],
      ingredients: [...INGREDIENTI, succo],
      pantry: [residuoDi('succo', 200), residuoDi('avena', 500)],
      oggi: '2026-08-31',
      settimaneTrascorse: 0,
    });
    // Lunedì: entrambe le opzioni costano 0 -> parità -> ordinale 0 -> succo.
    expect(out[0].scelte.bevanda.opzioneId).toBe('opz-a-succo');
    // Martedì: il succo è stato consumato lunedì (200-200=0) -> costa 1, l'avena 0.
    expect(out[1].scelte.bevanda.opzioneId).toBe('opz-b-avena');
    // Mercoledì È l'asserzione che discrimina: con scalatura vera l'avena ha
    // ancora residuo -> costo 0 -> vince di nuovo; senza scalatura sarebbe di
    // nuovo parità e l'ordinale 2 riporterebbe al succo.
    expect(out[2].scelte.bevanda.opzioneId).toBe('opz-b-avena');
  });
});
