import type { Dish, Ingredient } from '@/domain/types';
import { client } from './supabase';
import { aDishIngredient, aIngrediente } from './mappers';

export async function leggiIngredienti(): Promise<Ingredient[]> {
  const { data, error } = await client().from('ingredient').select('*').order('nome');
  if (error) throw error;
  return data.map(aIngrediente);
}

/** Solo i piatti attivi: un piatto eliminato (soft delete, `attivo = false`) non deve ricomparire qui. */
export async function leggiRepertorio(): Promise<Dish[]> {
  const { data, error } = await client()
    .from('dish')
    .select('id, nome, slot_def_id, fonte, attivo, dish_ingredient(ingredient_id, quantita, unita)')
    .eq('attivo', true)
    .order('created_at');
  if (error) throw error;
  return data.map((r) => ({
    id: String(r.id),
    nome: String(r.nome),
    slotDefId: String(r.slot_def_id),
    fonte: r.fonte as Dish['fonte'],
    attivo: Boolean(r.attivo),
    ingredienti: (r.dish_ingredient ?? []).map(aDishIngredient),
  }));
}

export async function salvaPiatto(
  piatto: Omit<Dish, 'id'> & { id?: string },
): Promise<string> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  const { data: riga, error } = await sb
    .from('dish')
    .upsert({
      id: piatto.id,
      user_id: userId,
      nome: piatto.nome,
      slot_def_id: piatto.slotDefId,
      fonte: piatto.fonte,
      attivo: piatto.attivo,
    })
    .select('id')
    .single();
  if (error) throw error;

  const dishId = String(riga.id);
  // Le righe ingrediente si riscrivono in blocco: sono poche e la diff non vale il codice.
  const { error: eDel } = await sb.from('dish_ingredient').delete().eq('dish_id', dishId);
  if (eDel) throw eDel;
  if (piatto.ingredienti.length > 0) {
    const { error: eIns } = await sb.from('dish_ingredient').insert(
      piatto.ingredienti.map((i) => ({
        user_id: userId,
        dish_id: dishId,
        ingredient_id: i.ingredientId,
        quantita: i.quantita,
        unita: i.unita,
      })),
    );
    if (eIns) throw eIns;
  }
  return dishId;
}

/**
 * Soft delete: imposta solo `attivo = false`, non cancella la riga. Le
 * settimane passate vanno conservate per lo storico acquisti, e un
 * `meal_slot` che punta a un piatto davvero cancellato perderebbe
 * l'informazione di cosa era stato mangiato. `assegnaPiatti` già ignora i
 * piatti non attivi, e `leggiRepertorio` ora li esclude dal repertorio.
 */
export async function eliminaPiatto(id: string): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('dish')
    .update({ attivo: false })
    .eq('id', id)
    .eq('user_id', utente.user!.id);
  if (error) throw error;
}

export async function salvaIngrediente(
  ing: Omit<Ingredient, 'id'> & { id?: string },
): Promise<string> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('ingredient')
    .upsert({
      id: ing.id,
      user_id: utente.user!.id,
      nome: ing.nome,
      unita_base: ing.unitaBase,
      area: ing.area,
      classe_residuo: ing.classeResiduo,
      deperibile: ing.deperibile,
      formato_confezione: ing.formatoConfezione,
    })
    .select('id')
    .single();
  if (error) throw error;

  // Ogni ingrediente ha una riga di dispensa dal primo giorno, a residuo zero:
  // "punto di partenza del residuo: zero" della spec.
  const { error: ePantry } = await sb.from('pantry_state').upsert(
    { ingredient_id: String(data.id), user_id: utente.user!.id, residuo: 0 },
    { onConflict: 'ingredient_id', ignoreDuplicates: true },
  );
  if (ePantry) throw ePantry;
  return String(data.id);
}
