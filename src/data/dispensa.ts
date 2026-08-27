import type { PantryState } from '@/domain/types';
import { client } from './supabase';
import { aPantryState } from './mappers';

export async function leggiDispensa(): Promise<PantryState[]> {
  const { data, error } = await client().from('pantry_state').select('*');
  if (error) throw error;
  return data.map(aPantryState);
}

/** "sì" scrive ultimo_check = oggi; "no" trasforma il controllo in voce d'acquisto. */
export async function rispondiControllo(
  ingredientId: string,
  listaId: string,
  ancora: boolean,
): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;

  if (ancora) {
    const oggi = new Date().toISOString().slice(0, 10);
    const { error } = await sb
      .from('pantry_state')
      .update({ ultimo_check: oggi })
      .eq('ingredient_id', ingredientId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const [{ data: ing, error: eIng }, { data: stato, error: eStato }] = await Promise.all([
    sb
      .from('ingredient')
      .select('area, unita_base, formato_confezione')
      .eq('id', ingredientId)
      .eq('user_id', userId)
      .single(),
    sb
      .from('pantry_state')
      .select('residuo')
      .eq('ingredient_id', ingredientId)
      .eq('user_id', userId)
      .single(),
  ]);
  if (eIng) throw eIng;
  if (eStato) throw eStato;

  // Upsert, non insert: rispondere "no" due volte allo stesso controllo non
  // deve creare due voci sulla stessa lista (vincolo di unicità shopping_list_id+ingredient_id).
  const { error: eIns } = await sb.from('shopping_list_item').upsert(
    {
      user_id: userId,
      shopping_list_id: listaId,
      ingredient_id: ingredientId,
      fabbisogno: 0,
      residuo: Number(stato.residuo),
      confezioni: 1,
      quantita_totale: Number(ing.formato_confezione),
      unita: ing.unita_base,
      area: ing.area,
      origine: 'controllo',
    },
    { onConflict: 'shopping_list_id,ingredient_id' },
  );
  if (eIns) throw eIns;
}
