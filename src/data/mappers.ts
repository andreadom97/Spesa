import type {
  AreaId, ClasseResiduo, FonteStato, Ingredient, MealSlot,
  MealSlotDef, PantryState, StatoSlot, UnitaBase, UnitaMisura,
} from '@/domain/types';

/** Postgres restituisce i numeric come stringa: convertire sempre, mai fidarsi. */
function num(v: unknown): number {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number);
  if (Number.isNaN(n)) throw new Error(`Numero non valido dal database: ${String(v)}`);
  return n;
}

function data(v: unknown): string {
  return String(v).slice(0, 10);
}

export function aIngrediente(r: Record<string, unknown>): Ingredient {
  return {
    id: String(r.id),
    nome: String(r.nome),
    unitaBase: r.unita_base as UnitaBase,
    area: r.area as AreaId,
    classeResiduo: r.classe_residuo as ClasseResiduo,
    deperibile: Boolean(r.deperibile),
    formatoConfezione: num(r.formato_confezione),
  };
}

export function aMealSlot(r: Record<string, unknown>): MealSlot {
  return {
    id: String(r.id),
    data: data(r.data),
    slotDefId: String(r.slot_def_id),
    stato: r.stato as StatoSlot,
    dishId: r.dish_id ? String(r.dish_id) : null,
    fonteStato: r.fonte_stato as FonteStato,
  };
}

export function aPantryState(r: Record<string, unknown>): PantryState {
  return {
    ingredientId: String(r.ingredient_id),
    residuo: num(r.residuo),
    ultimoAcquisto: r.ultimo_acquisto ? data(r.ultimo_acquisto) : null,
    giorniStimati: num(r.giorni_stimati),
    ultimoCheck: r.ultimo_check ? data(r.ultimo_check) : null,
  };
}

export function aSlotDef(r: Record<string, unknown>): MealSlotDef {
  return {
    id: String(r.id),
    nome: String(r.nome),
    posizione: num(r.posizione),
    assenzeAbituali: (r.assenze_abituali as boolean[]).map(Boolean),
  };
}

export function aDishIngredient(r: Record<string, unknown>) {
  return {
    ingredientId: String(r.ingredient_id),
    quantita: num(r.quantita),
    unita: r.unita as UnitaMisura,
  };
}
