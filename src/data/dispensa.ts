import type { PantryState } from '@/domain/types';
import { client } from './supabase';
import { aPantryState } from './mappers';

export async function leggiDispensa(): Promise<PantryState[]> {
  const { data, error } = await client().from('pantry_state').select('*');
  if (error) throw error;
  return data.map(aPantryState);
}

/**
 * "sì" scrive ultimo_check = oggi *e* toglie la riga di controllo da
 * shopping_list_item; "no" trasforma il controllo in voce d'acquisto.
 *
 * Senza la delete, la riga resta con origine='controllo' e confezioni=0 —
 * esattamente la definizione di controllo in sospeso di eControlloInSospeso
 * (src/data/lista.ts). /lista la nasconde solo in memoria locale, ma
 * /lista/fatta rilegge dal server: la troverebbe ancora lì e rimbalzerebbe
 * indietro per sempre, anche dopo aver risposto "sì".
 */
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
    const [{ error: eUpd }, { error: eDel }] = await Promise.all([
      sb
        .from('pantry_state')
        .update({ ultimo_check: oggi })
        .eq('ingredient_id', ingredientId)
        .eq('user_id', userId),
      sb
        .from('shopping_list_item')
        .delete()
        .eq('shopping_list_id', listaId)
        .eq('ingredient_id', ingredientId)
        .eq('user_id', userId),
    ]);
    if (eUpd) throw eUpd;
    if (eDel) throw eDel;
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

/**
 * Corregge a mano il residuo di un ingrediente.
 *
 * È l'eccezione prevista dal principio che regge la dispensa (spec, riga 53:
 * «l'utente non conta niente e non registra niente; corregge solo quando il
 * calcolo sbaglia»). Il residuo resta derivato — questa non è la porta per
 * tenere un inventario a mano, che è proprio la cosa che la spec esclude:
 * serve a rimettere in pari il calcolo quando la realtà se n'è discostata,
 * perché un uovo si è rotto o perché si è mangiato fuori piano.
 *
 * Perché conta: senza, uno scostamento non si recupera più e il residuo si
 * allontana dal vero in silenzio, continuando a produrre liste che sembrano
 * giuste. È il rischio già dichiarato alla riga 155 della spec.
 *
 * `upsert` e non `update`: un ingrediente mai comprato non ha ancora una riga
 * in `pantry_state`, e dichiarare che se ne ha già in casa deve funzionare
 * anche lì — è il primo caso d'uso di chi apre l'app con la dispensa piena.
 */
export async function correggiResiduo(ingredientId: string, residuo: number): Promise<void> {
  if (!Number.isFinite(residuo) || residuo < 0) {
    throw new Error(`Residuo non valido: ${residuo}. Lo schema ha check (residuo >= 0).`);
  }
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('pantry_state')
    .upsert(
      { ingredient_id: ingredientId, user_id: utente.user!.id, residuo },
      { onConflict: 'ingredient_id' },
    );
  if (error) throw error;
}
