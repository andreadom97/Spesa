export type UnitaBase = 'g' | 'ml' | 'pz';
export type UnitaMisura = 'g' | 'kg' | 'ml' | 'l' | 'pz';
export type ClasseResiduo = 'porzionabile' | 'intero' | 'stima';
export type AreaId =
  | 'ortofrutta' | 'macelleria' | 'latticini'
  | 'cereali' | 'dispensa' | 'surgelati';

export type StatoSlot = 'casa' | 'fuori' | 'saltato' | 'sostituito';
export type FonteStato = 'default' | 'calendario' | 'checkin' | 'correzione';
export type FonteDish = 'nutrizionista' | 'proprio';

export interface Ingredient {
  id: string;
  nome: string;
  unitaBase: UnitaBase;
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  /** Quantità di una confezione, espressa in unitaBase. */
  formatoConfezione: number;
  /**
   * Facoltativo: euro per una confezione, null = nessun prezzo. Serve solo al
   * contatore del non ricomprato (spec 2026-09-05): non entra in nessun
   * calcolo della lista né del residuo.
   */
  prezzoConfezione: number | null;
}

export interface DishIngredient {
  ingredientId: string;
  /** La porzione del piano per un commensale. */
  quantita: number;
  unita: UnitaMisura;
}

export interface OpzioneComponente {
  id: string;
  /** Le righe ingrediente che questa opzione comporta (>=1: "ricotta 50g + noci 20g" è UNA opzione). */
  righe: DishIngredient[];
}

export interface Componente {
  id: string;
  /** Etichetta mostrata in Scegli e nell'editor: "pane", "farcitura". */
  nome: string;
  /** >=1. La prima è il default quando nessuna scelta è registrata. */
  opzioni: OpzioneComponente[];
}

export interface Scelta {
  opzioneId: string;
  /** Come fonteStato: una scelta 'manuale' non viene mai sovrascritta dal planner. */
  fonte: 'planner' | 'manuale';
}

export interface Dish {
  id: string;
  nome: string;
  slotDefId: string;
  fonte: FonteDish;
  attivo: boolean;
  /** Il procedimento, testo libero. Non entra in nessun calcolo. */
  descrizione: string | null;
  /**
   * A quale settimana del ciclo appartiene (1..4). `null` = va bene in tutte,
   * che è il comportamento di prima del ciclo.
   */
  settimanaCiclo: number | null;
  /**
   * Giorno fisso dentro quella settimana, 0 = lunedì. `null` = lo sceglie il
   * planner ruotando. Obbligatori entrambi e non facoltativi: se un mapper si
   * dimenticasse di leggerli, il piano uscirebbe sbagliato in silenzio.
   */
  giornoCiclo: number | null;
  ingredienti: DishIngredient[];
  /** Componenti a scelta. [] = piatto senza alternative = comportamento identico a prima. */
  componenti: Componente[];
}

export interface MealSlotDef {
  id: string;
  nome: string;
  posizione: number;
  /** Sette booleani, indice 0 = lunedì. true = abitualmente fuori casa. */
  assenzeAbituali: boolean[];
}

export interface MealSlot {
  id: string;
  /** ISO yyyy-mm-dd */
  data: string;
  slotDefId: string;
  stato: StatoSlot;
  dishId: string | null;
  fonteStato: FonteStato;
  /**
   * componenteId -> scelta della settimana. Vuoto finché il planner non
   * risolve. La fonte è per singola scelta: si può correggere a mano un solo
   * componente e lasciare gli altri al planner.
   */
  scelte: Record<string, Scelta>;
  /** Porzioni EXTRA che questo slot cucina (entrano nei Pronti). 0 = pasto normale. */
  porzioniPreparate: number;
  /** Il pasto è coperto da una porzione già pronta: niente consumo di crudo. */
  daPronti: boolean;
}

export interface PantryState {
  ingredientId: string;
  /** In unitaBase dell'ingrediente. Mai negativo. */
  residuo: number;
  /** ISO yyyy-mm-dd, null se mai comprato. */
  ultimoAcquisto: string | null;
  /** Costante 90 in Fase 1. Presente per la Fase 4. */
  giorniStimati: number;
  /** Il residuo sta nel congelatore: decade in mesi invece che in giorni. */
  congelato: boolean;
  /** ISO yyyy-mm-dd dell'ultima risposta "sì" a un controllo. */
  ultimoCheck: string | null;
}

export interface LottoPronto {
  id: string;
  dishId: string;
  /** > 0; il lotto a 0 si cancella. */
  porzioni: number;
  congelato: boolean;
  /** ISO yyyy-mm-dd: il giorno dello slot che l'ha creato. Può essere futuro (batch pianificato). */
  preparataIl: string;
  /** Lo slot della dichiarazione, null per i lotti manuali della Dispensa. */
  mealSlotId: string | null;
}

export interface Impostazioni {
  moltiplicatorePorzioni: number;
  ordineAree: AreaId[];
  /** Quante settimane compongono il piano prima di ricominciare (1..4). */
  settimaneCiclo: number;
  /** Il lunedì della settimana 1 del ciclo. null finché il ciclo non si usa. */
  cicloOrigine: string | null;
}
