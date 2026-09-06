import type { AreaId, ClasseResiduo, Ingredient, UnitaBase } from './types';

export type IngredienteBase = Omit<Ingredient, 'id' | 'prezzoConfezione'>;

/**
 * Gli ingredienti di base di un supermercato italiano, già classificati con i
 * campi che l'app usa per calcolare la lista. Sono gli stessi 71 di
 * `supabase/seed-ingredienti.sql`, nome per nome, nello stesso ordine e con gli
 * stessi valori: chi corregge uno dei due file corregge anche l'altro.
 *
 * Perché stanno in codice: il primo avvio (spec 2026-09-06, §1) semina il
 * repertorio di un utente nuovo con `INGREDIENTI_BASE` e non richiede di
 * aprire l'SQL Editor. Il file SQL resta lo strumento manuale per chi ha già
 * un repertorio e vuole aggiungere i mancanti senza toccare i suoi.
 *
 * Non vengono da un database pubblico: nessuno espone area, classe di residuo
 * e formato confezione. Sono decisi qui, con i formati che si trovano davvero
 * a scaffale; dove il proprio supermercato ne vende un altro si corregge da
 * Impostazioni → Ingredienti. `prezzoConfezione` non c'è: parte a null.
 */
export const INGREDIENTI_BASE: ReadonlyArray<IngredienteBase> = [
  // ORTOFRUTTA — a pezzo quello che si compra a pezzo, a peso il resto
  { nome: 'Banane', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Mele', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Arance', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Limoni', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Avocado', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Zucchine', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Melanzane', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Peperoni', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Broccoli', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Finocchi', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Sedano', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Pomodori', unitaBase: 'pz', area: 'ortofrutta', classeResiduo: 'intero', deperibile: true, formatoConfezione: 1 },
  { nome: 'Pomodorini', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Insalata', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { nome: 'Spinaci freschi', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { nome: 'Rucola', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { nome: 'Carote', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Patate', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1500 },
  { nome: 'Cipolle', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Aglio', unitaBase: 'g', area: 'ortofrutta', classeResiduo: 'stima', deperibile: false, formatoConfezione: 100 },

  // MACELLERIA E PESCHERIA — tutto fresco, tutto in top-up
  { nome: 'Petto di pollo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
  { nome: 'Macinato di manzo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Salmone fresco', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },

  // LATTICINI, UOVA E SALUMI
  { nome: 'Uova', unitaBase: 'pz', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 6 },
  { nome: 'Latte', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
  { nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Yogurt bianco', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Mozzarella', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 125 },
  { nome: 'Ricotta', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 250 },
  { nome: 'Parmigiano', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 200 },
  { nome: 'Philadelphia', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 150 },
  { nome: 'Prosciutto crudo', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { nome: 'Prosciutto cotto', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { nome: 'Bresaola', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 100 },
  { nome: 'Burro', unitaBase: 'g', area: 'latticini', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 250 },

  // PASTA, RISO E CEREALI
  { nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Pasta integrale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Riso', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { nome: 'Farro', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Cous cous', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Fiocchi di avena', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Pane', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
  { nome: 'Pane in cassetta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 400 },
  { nome: 'Fette biscottate', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 315 },
  { nome: 'Farina 00', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },

  // DISPENSA E CONSERVE
  { nome: 'Olio extravergine', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { nome: 'Olio di semi', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { nome: 'Aceto balsamico', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 500 },
  { nome: 'Sale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000 },
  { nome: 'Pepe', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 50 },
  { nome: 'Zucchero', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000 },
  { nome: 'Miele', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 400 },
  { nome: 'Caffè', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 250 },
  { nome: 'Passata di pomodoro', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 700 },
  { nome: 'Pelati', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 400 },
  { nome: 'Tonno in scatola', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 240 },
  { nome: 'Ceci lessati', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 400 },
  { nome: 'Fagioli lessati', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 400 },
  { nome: 'Lenticchie secche', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { nome: 'Mais', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
  { nome: 'Noci', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200 },
  { nome: 'Mandorle', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 200 },
  { nome: 'Burro di arachidi', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 350 },
  { nome: 'Cioccolato fondente', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 100 },

  // SURGELATI
  { nome: 'Spinaci surgelati', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 450 },
  { nome: 'Piselli surgelati', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 450 },
  { nome: 'Minestrone surgelato', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 450 },
  { nome: 'Merluzzo surgelato', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 400 },
  { nome: 'Gamberi surgelati', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
];

/** Il fresco sta in ortofrutta, macelleria e latticini; il resto si conserva. */
const AREA_DEPERIBILE: Record<AreaId, boolean> = {
  ortofrutta: true,
  macelleria: true,
  latticini: true,
  cereali: false,
  dispensa: false,
  surgelati: false,
};

const PER_UNITA: Record<UnitaBase, { classeResiduo: ClasseResiduo; formatoConfezione: number }> = {
  // A pezzo: 3 banane sono 3 banane, formato 1 come impone list-builder per gli interi.
  pz: { classeResiduo: 'intero', formatoConfezione: 1 },
  g: { classeResiduo: 'porzionabile', formatoConfezione: 500 },
  ml: { classeResiduo: 'porzionabile', formatoConfezione: 1000 },
};

/**
 * I difetti per la mini-creazione di un ingrediente dalla schermata veloce
 * (spec 2026-09-06, §2.3), dove l'utente sceglie solo nome, area e unità.
 *
 * Sono difetti sensati, non verità: `pz` → intero da 1; `g` → porzionabile da
 * 500; `ml` → porzionabile da 1000; deperibile se l'area è del fresco. Un
 * sale in `g` esce "porzionabile da 500" invece che "stima": si corregge in
 * Impostazioni → Ingredienti, come qualunque altro campo.
 */
export function predefinitiIngrediente(
  area: AreaId,
  unita: UnitaBase,
): Pick<Ingredient, 'classeResiduo' | 'deperibile' | 'formatoConfezione'> {
  const { classeResiduo, formatoConfezione } = PER_UNITA[unita];
  return { classeResiduo, deperibile: AREA_DEPERIBILE[area], formatoConfezione };
}
