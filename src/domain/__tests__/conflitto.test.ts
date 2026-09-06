import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient, MealSlot, PantryState, Scelta } from '../types';
import { conflittiSostituzione } from '../conflitto';
import { OpzioneMancanteError } from '../opzioni';

// ── Repertorio ──────────────────────────────────────────────────────────────

const POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null,
};
const RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null,
};
const OLIO: Ingredient = {
  id: 'i-olio', nome: 'Olio', unitaBase: 'ml', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null,
};
const YOGURT: Ingredient = {
  id: 'i-yogurt', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500, prezzoConfezione: null,
};
const INGREDIENTI = [POLLO, RISO, OLIO, YOGURT];

function piatto(id: string, nome: string, ingredienti: Dish['ingredienti'], componenti: Dish['componenti'] = []): Dish {
  return {
    id, nome, slotDefId: 'sd-cena', fonte: 'proprio', attivo: true,
    descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti, componenti,
  };
}

/** 200 g di pollo più olio (classe stima: non entra mai nei conti). */
const POLLO_200 = piatto('d-pollo-200', 'Pollo al forno', [
  { ingredientId: 'i-pollo', quantita: 200, unita: 'g' },
  { ingredientId: 'i-olio', quantita: 10, unita: 'ml' },
]);
const POLLO_400 = piatto('d-pollo-400', 'Pollo alla griglia', [
  { ingredientId: 'i-pollo', quantita: 400, unita: 'g' },
]);
const POLLO_150 = piatto('d-pollo-150', 'Insalata di pollo', [
  { ingredientId: 'i-pollo', quantita: 150, unita: 'g' },
]);
const RISO_100 = piatto('d-riso-100', 'Riso in bianco', [
  { ingredientId: 'i-riso', quantita: 100, unita: 'g' },
]);
/** Pollo e yogurt insieme, il riso in kg: due conflitti possibili e una conversione. */
const POLLO_YOGURT_RISO = piatto('d-misto', 'Pollo allo yogurt con riso', [
  { ingredientId: 'i-yogurt', quantita: 200, unita: 'g' },
  { ingredientId: 'i-pollo', quantita: 300, unita: 'g' },
  { ingredientId: 'i-riso', quantita: 0.3, unita: 'kg' },
]);
/** Un componente a due opzioni: petto (200 g, default) oppure coscia (500 g). */
const POLLO_SCELTA = piatto('d-scelta', 'Pollo a scelta', [], [{
  id: 'c-taglio', nome: 'taglio',
  opzioni: [
    { id: 'o-petto', righe: [{ ingredientId: 'i-pollo', quantita: 200, unita: 'g' }] },
    { id: 'o-coscia', righe: [{ ingredientId: 'i-pollo', quantita: 500, unita: 'g' }] },
  ],
}]);
/** Quantità minuscole: tre slot da 0.1 g sommano a 0.30000000000000004 in virgola mobile. */
const BRICIOLA = piatto('d-briciola', 'Briciola', [
  { ingredientId: 'i-riso', quantita: 0.1, unita: 'g' },
]);
const PIATTI = [POLLO_200, POLLO_400, POLLO_150, RISO_100, POLLO_YOGURT_RISO, POLLO_SCELTA, BRICIOLA];

// ── Settimana ───────────────────────────────────────────────────────────────

/** Giovedì: lunedì, martedì e mercoledì sono passati. */
const OGGI = '2026-09-03';
const GIORNI = ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'];

function slot(
  giorno: number,
  dishId: string | null,
  extra: Partial<Omit<MealSlot, 'id' | 'data' | 'dishId'>> = {},
): MealSlot {
  const slotDefId = extra.slotDefId ?? 'sd-cena';
  return {
    id: `${slotDefId}-${giorno}`, data: GIORNI[giorno], slotDefId, stato: 'casa', dishId,
    fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false,
    ...extra,
  };
}

function inCasa(ingredientId: string, residuo: number, ultimoAcquisto: string | null = '2026-09-02'): PantryState {
  return { ingredientId, residuo, ultimoAcquisto, giorniStimati: 90, congelato: false, ultimoCheck: null };
}

type Stato = 'bozza' | 'confermata' | 'chiusa';

/** Lo slot di oggi è quello che si sostituisce; il resto è la settimana attorno. */
function calcola(i: {
  statoSettimana: Stato;
  slot: MealSlot;
  candidato: Dish;
  scelte?: Record<string, Scelta>;
  altri?: MealSlot[];
  pantry?: PantryState[];
  vociLista?: { ingredientId: string; quantitaTotale: number }[];
  moltiplicatorePorzioni?: number;
  oggi?: string;
}) {
  return conflittiSostituzione({
    slot: i.slot,
    candidato: i.candidato,
    scelte: i.scelte ?? {},
    slots: [i.slot, ...(i.altri ?? [])],
    dishes: PIATTI,
    ingredients: INGREDIENTI,
    pantry: i.pantry ?? [],
    impostazioni: { moltiplicatorePorzioni: i.moltiplicatorePorzioni ?? 1 },
    statoSettimana: i.statoSettimana,
    vociLista: i.vociLista ?? [],
    oggi: i.oggi ?? OGGI,
  });
}

// ── Test ────────────────────────────────────────────────────────────────────

describe('conflittiSostituzione — settimana bozza', () => {
  it('non segnala mai nulla: la lista non esiste ancora e nascerà dal piano dopo la sostituzione', () => {
    const conflitti = calcola({
      statoSettimana: 'bozza',
      slot: slot(3, 'd-riso-100'),
      candidato: POLLO_400,
      altri: [slot(0, 'd-pollo-200'), slot(5, 'd-pollo-150')],
      pantry: [],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 100 }],
    });
    expect(conflitti).toEqual([]);
  });
});

describe('conflittiSostituzione — settimana confermata', () => {
  // residuo 100 g + 500 g in lista = 600 g disponibili.
  // Fabbisogno dopo: lunedì (passato) 200 + oggi col candidato 400 + sabato 150 = 750.
  const settimana = {
    slot: slot(3, 'd-riso-100'),
    candidato: POLLO_400,
    altri: [
      slot(0, 'd-pollo-200'),                    // lunedì, passato: conta lo stesso
      slot(1, 'd-pollo-200', { stato: 'fuori' }), // fuori casa: non consuma
      slot(2, 'd-riso-100'),                     // niente pollo
      slot(4, null),                             // nessun piatto
      slot(5, 'd-pollo-150'),                    // sabato: consuma e resterà senza
      slot(6, 'd-pollo-400', { stato: 'saltato' }),
    ],
    pantry: [inCasa('i-pollo', 100)],
    vociLista: [
      { ingredientId: 'i-pollo', quantitaTotale: 500 },
      { ingredientId: 'i-riso', quantitaTotale: 200 },
    ],
  };

  it('mancante = fabbisogno di tutta la settimana − (residuo utilizzabile + lista)', () => {
    const conflitti = calcola({ statoSettimana: 'confermata', ...settimana });
    expect(conflitti).toEqual([{
      ingredientId: 'i-pollo', nome: 'Pollo', unita: 'g', mancante: 150,
      pastiDopo: [{ data: '2026-09-05', slotDefId: 'sd-cena' }],
    }]);
  });

  it('il pasto già passato conta nel fabbisogno: la lista lo ha comprato, si assume mangiato', () => {
    // Senza il lunedì il fabbisogno scende a 550 < 600: nessun conflitto.
    const conflitti = calcola({
      statoSettimana: 'confermata', ...settimana,
      altri: settimana.altri.filter((s) => s.data !== '2026-08-31'),
    });
    expect(conflitti).toEqual([]);
  });

  it('un ingrediente non in lista non è un conflitto anche se manca: lo aggiungerà allineaTopUp', () => {
    const conflitti = calcola({
      statoSettimana: 'confermata', ...settimana,
      vociLista: [{ ingredientId: 'i-riso', quantitaTotale: 200 }],
    });
    expect(conflitti).toEqual([]);
  });

  it('le voci della stessa lista si sommano (base + top-up) e un ingrediente senza dispensa vale 0', () => {
    const conflitti = calcola({
      statoSettimana: 'confermata', ...settimana,
      pantry: [],
      vociLista: [
        { ingredientId: 'i-pollo', quantitaTotale: 300 },
        { ingredientId: 'i-pollo', quantitaTotale: 200 },
      ],
    });
    expect(conflitti).toHaveLength(1);
    expect(conflitti[0].mancante).toBe(250); // 750 − (0 + 500)
  });

  it('uno slot con una scelta verso un\'opzione rimossa si salta nelle somme e non compare fra i pasti dopo', () => {
    const conflitti = calcola({
      statoSettimana: 'confermata',
      slot: slot(3, 'd-riso-100'),
      candidato: POLLO_400,
      altri: [
        slot(0, 'd-pollo-200'),
        slot(5, 'd-scelta', { scelte: { 'c-taglio': { opzioneId: 'o-sparita', fonte: 'manuale' } } }),
        slot(6, 'd-fantasma'), // piatto rimosso dal repertorio: nessun consumo
      ],
      pantry: [],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 500 }],
    });
    expect(conflitti).toEqual([{
      ingredientId: 'i-pollo', nome: 'Pollo', unita: 'g', mancante: 100, // 200 + 400 − 500
      pastiDopo: [],
    }]);
  });

  it('se è il candidato ad avere una scelta rotta, l\'errore propaga: è l\'input di Scegli a essere sbagliato', () => {
    expect(() => calcola({
      statoSettimana: 'confermata',
      slot: slot(3, 'd-riso-100'),
      candidato: POLLO_SCELTA,
      scelte: { 'c-taglio': { opzioneId: 'o-sparita', fonte: 'manuale' } },
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 500 }],
    })).toThrow(OpzioneMancanteError);
  });

  it('una differenza da virgola mobile non è un mancante', () => {
    // 0.1 + 0.1 + 0.1 = 0.30000000000000004 in JS; la lista copre 0.3.
    const conflitti = calcola({
      statoSettimana: 'confermata',
      slot: slot(3, null),
      candidato: BRICIOLA,
      altri: [slot(4, 'd-briciola'), slot(5, 'd-briciola')],
      vociLista: [{ ingredientId: 'i-riso', quantitaTotale: 0.3 }],
    });
    expect(conflitti).toEqual([]);
  });
});

describe('conflittiSostituzione — settimana chiusa', () => {
  it('il residuo è già al netto della settimana: lo storno restituisce il piatto attuale e addebita il candidato', () => {
    // disponibile = 50 + 200 (piatto attuale) = 250; fabbisogno = 400 → mancano 150.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-pollo-200'),
      candidato: POLLO_400,
      pantry: [inCasa('i-pollo', 50)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    });
    expect(conflitti).toEqual([{
      ingredientId: 'i-pollo', nome: 'Pollo', unita: 'g', mancante: 150, pastiDopo: [],
    }]);
  });

  it('gli altri slot non entrano nella somma a settimana chiusa, ma decidono i pasti che resteranno senza', () => {
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-pollo-200'),
      candidato: POLLO_400,
      altri: [slot(0, 'd-pollo-400'), slot(5, 'd-pollo-150')],
      pantry: [inCasa('i-pollo', 50)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    });
    expect(conflitti).toHaveLength(1);
    expect(conflitti[0].mancante).toBe(150); // identico al caso senza altri slot
    expect(conflitti[0].pastiDopo).toEqual([{ data: '2026-09-05', slotDefId: 'sd-cena' }]);
  });

  it('un residuo scaduto non è disponibile per nessuno, nemmeno a settimana chiusa', () => {
    // Pollo comprato nove giorni fa: la soglia della macelleria è 3, il residuo vale 0.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-pollo-200'),
      candidato: POLLO_400,
      pantry: [inCasa('i-pollo', 50, '2026-08-25')],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    });
    expect(conflitti).toHaveLength(1);
    expect(conflitti[0].mancante).toBe(200); // 400 − (0 + 200)
  });

  it('la classe stima resta fuori: nessuna aritmetica sul residuo (regola 7)', () => {
    // L'olio è in lista con 0 e in casa non c'è: sarebbe un conflitto, se contasse.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, null),
      candidato: POLLO_200,
      pantry: [inCasa('i-pollo', 200), inCasa('i-olio', 0)],
      vociLista: [
        { ingredientId: 'i-olio', quantitaTotale: 0 },
        { ingredientId: 'i-pollo', quantitaTotale: 0 },
      ],
    });
    expect(conflitti).toEqual([]);
  });

  it('stesso piatto, scelta più costosa: il conflitto nasce dalla differenza fra le opzioni', () => {
    // Oggi monta il petto (200 g); in Scegli si passa alla coscia (500 g).
    // disponibile = 100 + 200 = 300; fabbisogno = 500 → mancano 200.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-scelta', { scelte: { 'c-taglio': { opzioneId: 'o-petto', fonte: 'planner' } } }),
      candidato: POLLO_SCELTA,
      scelte: { 'c-taglio': { opzioneId: 'o-coscia', fonte: 'manuale' } },
      pantry: [inCasa('i-pollo', 100)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    });
    expect(conflitti).toEqual([{
      ingredientId: 'i-pollo', nome: 'Pollo', unita: 'g', mancante: 200, pastiDopo: [],
    }]);
  });

  it('il moltiplicatore delle porzioni scala sia il piatto attuale sia il candidato', () => {
    // ×2: attuale 400, candidato 800; disponibile = 0 + 400 → mancano 400.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-pollo-200'),
      candidato: POLLO_400,
      moltiplicatorePorzioni: 2,
      pantry: [inCasa('i-pollo', 0)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 400 }],
    });
    expect(conflitti).toHaveLength(1);
    expect(conflitti[0].mancante).toBe(400);
  });

  it('stato, daPronti e porzioniPreparate dello slot restano quelli attuali anche sul candidato', () => {
    // Slot spento ma con 1 porzione preparata: fattore 1 per entrambi i piatti.
    // disponibile = 0 + 200; fabbisogno = 400 → mancano 200. Con daPronti
    // acceso e nessuna porzione, nessuno dei due consuma: nessun conflitto.
    const base = {
      statoSettimana: 'chiusa' as const,
      candidato: POLLO_400,
      pantry: [inCasa('i-pollo', 0)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    };
    const preparato = calcola({ ...base, slot: slot(3, 'd-pollo-200', { stato: 'fuori', porzioniPreparate: 1 }) });
    expect(preparato).toHaveLength(1);
    expect(preparato[0].mancante).toBe(200);

    const daPronti = calcola({ ...base, slot: slot(3, 'd-pollo-200', { daPronti: true }) });
    expect(daPronti).toEqual([]);
  });

  it('un conflitto per ingrediente, in unità base, ordinati per nome', () => {
    // Niente in casa, lista a zero: mancano 300 g di pollo, 300 g di riso (0.3 kg) e 200 g di yogurt.
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, null),
      candidato: POLLO_YOGURT_RISO,
      pantry: [],
      vociLista: [
        { ingredientId: 'i-yogurt', quantitaTotale: 0 },
        { ingredientId: 'i-riso', quantitaTotale: 0 },
        { ingredientId: 'i-pollo', quantitaTotale: 0 },
      ],
    });
    expect(conflitti.map((c) => [c.nome, c.unita, c.mancante])).toEqual([
      ['Pollo', 'g', 300],
      ['Riso', 'g', 300],
      ['Yogurt greco', 'g', 200],
    ]);
  });
});

describe('conflittiSostituzione — pastiDopo', () => {
  it('esclude lo slot stesso e i giorni passati; include gli slot da oggi in poi che usano l\'ingrediente, per data e poi slotDefId', () => {
    const conflitti = calcola({
      statoSettimana: 'chiusa',
      slot: slot(3, 'd-pollo-200'),
      candidato: POLLO_400,
      altri: [
        slot(0, 'd-pollo-400'),                                  // passato
        slot(2, 'd-pollo-150'),                                  // passato (ieri)
        slot(3, 'd-pollo-150', { slotDefId: 'sd-pranzo' }),      // oggi, altro pasto: conta
        slot(4, 'd-riso-100'),                                   // domani, niente pollo
        slot(5, 'd-pollo-150', { slotDefId: 'sd-pranzo' }),      // sabato pranzo
        slot(5, 'd-pollo-200'),                                  // sabato cena
        slot(6, 'd-pollo-200', { stato: 'fuori' }),              // fuori: non consuma
        slot(6, 'd-pollo-200', { slotDefId: 'sd-pranzo', daPronti: true }), // da pronti: non consuma
      ],
      pantry: [inCasa('i-pollo', 50)],
      vociLista: [{ ingredientId: 'i-pollo', quantitaTotale: 200 }],
    });
    expect(conflitti).toHaveLength(1);
    expect(conflitti[0].pastiDopo).toEqual([
      { data: '2026-09-03', slotDefId: 'sd-pranzo' },
      { data: '2026-09-05', slotDefId: 'sd-cena' },
      { data: '2026-09-05', slotDefId: 'sd-pranzo' },
    ]);
  });
});
