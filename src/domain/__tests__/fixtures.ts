import type { Dish, Ingredient, MealSlot, PantryState, Impostazioni } from '../types';
import { ORDINE_AREE_DEFAULT } from '../aree';

export const yogurt: Ingredient = {
  id: 'yogurt', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500,
};

export const avena: Ingredient = {
  id: 'avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
};

export const uova: Ingredient = {
  id: 'uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 1,
};

export const olio: Ingredient = {
  id: 'olio', nome: 'Olio extravergine', unitaBase: 'ml', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000,
};

export const passata: Ingredient = {
  id: 'passata', nome: 'Passata di pomodoro', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 700,
};

export const INGREDIENTI = [yogurt, avena, uova, olio, passata];

export const colazione: Dish = {
  id: 'colazione-yogurt', nome: 'Yogurt e avena', slotDefId: 'col',
  fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'yogurt', quantita: 150, unita: 'g' },
    { ingredientId: 'avena', quantita: 50, unita: 'g' },
  ],
};

export const frittata: Dish = {
  id: 'cena-frittata', nome: 'Frittata', slotDefId: 'cen',
  fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'uova', quantita: 3, unita: 'pz' },
    { ingredientId: 'olio', quantita: 10, unita: 'ml' },
  ],
};

export const PIATTI = [colazione, frittata];

/** Cinque colazioni a casa, lunedì-venerdì. */
export function cinqueColazioni(): MealSlot[] {
  return ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map((data, i) => ({
    id: `col-${i}`, data, slotDefId: 'col', stato: 'casa' as const,
    dishId: 'colazione-yogurt', fonteStato: 'default' as const,
  }));
}

export const IMPOSTAZIONI: Impostazioni = {
  moltiplicatorePorzioni: 1,
  ordineAree: ORDINE_AREE_DEFAULT,
  settimaneCiclo: 1,
  cicloOrigine: null,
};

export function dispensaVuota(): PantryState[] {
  return INGREDIENTI.map((i) => ({
    ingredientId: i.id, residuo: 0, ultimoAcquisto: null,
    giorniStimati: 90, ultimoCheck: null, congelato: false,
  }));
}
