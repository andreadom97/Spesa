export type UnitaBase = 'g' | 'ml' | 'pz';
export type UnitaMisura = 'g' | 'kg' | 'ml' | 'l' | 'pz';
export type ClasseResiduo = 'porzionabile' | 'intero' | 'stima';
export type AreaId =
  | 'ortofrutta' | 'macelleria' | 'latticini'
  | 'cereali' | 'dispensa' | 'surgelati';

export type StatoSlot = 'casa' | 'fuori' | 'saltato';
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
}

export interface DishIngredient {
  ingredientId: string;
  /** La porzione del piano per un commensale. */
  quantita: number;
  unita: UnitaMisura;
}

export interface Dish {
  id: string;
  nome: string;
  slotDefId: string;
  fonte: FonteDish;
  attivo: boolean;
  ingredienti: DishIngredient[];
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

export interface Impostazioni {
  moltiplicatorePorzioni: number;
  ordineAree: AreaId[];
}
