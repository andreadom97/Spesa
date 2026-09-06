import { INGREDIENTI_BASE } from '@/domain/ingredienti-base';
import { pastiDiDefault, salvaSlotDefs } from './impostazioni';
import { client } from './supabase';

/**
 * Il primo avvio automatico (spec 2026-09-06, §1, P5): senza questo, un
 * utente nuovo arrivava dal magic link a un'app senza pasti — `creaSettimana`
 * rifiuta di creare la settimana — e senza ingredienti, e i due seed SQL
 * andavano lanciati a mano dall'SQL Editor con l'email cablata. Qui si semina
 * dal codice quello che i seed seminavano a mano, alla prima apertura.
 *
 * Idempotente: due sole letture in parallelo (i conteggi di `meal_slot_def` e
 * `ingredient` dell'utente) prima di qualunque scrittura, e ogni scrittura è
 * condizionata a una tabella vuota o è un upsert con `ignoreDuplicates`.
 * Chiamarla dieci volte su un utente già seminato costa due conteggi e un
 * upsert a vuoto su `settings`. **Solo a tabella vuota**: chi ha anche un
 * solo ingrediente non riceve nulla, perché le correzioni fatte a mano non si
 * toccano (stessa regola di `seed-ingredienti.sql`, che resta lo strumento
 * per aggiungere i mancanti a un repertorio esistente).
 *
 * La riga `settings` si scrive sempre: costa un upsert che il DB ignora se la
 * riga esiste (i default li mette il DB) e toglie il caso "riga assente" che
 * `leggiImpostazioni` copre in memoria. Per un utente vecchio non cambia nulla.
 *
 * Limite dichiarato (spec §5): due schede aperte da un utente nuovissimo nello
 * stesso istante possono seminare gli ingredienti due volte, perché non c'è
 * vincolo di unicità sul nome. Si cancellano da Impostazioni → Ingredienti;
 * non vale una migrazione finché non succede.
 */
export async function assicuraDatiIniziali(): Promise<{ pasti: boolean; ingredienti: boolean }> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user?.id;
  if (!userId) return { pasti: false, ingredienti: false };

  const [pasti, ingredienti] = await Promise.all([
    sb.from('meal_slot_def').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('ingredient').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (pasti.error) throw pasti.error;
  if (ingredienti.error) throw ingredienti.error;

  // Confronto stretto con zero: un conteggio nullo senza errore sarebbe
  // un'anomalia, e nel dubbio non si semina.
  const seminaPasti = pasti.count === 0;
  const seminaIngredienti = ingredienti.count === 0;

  if (seminaPasti) {
    await salvaSlotDefs(pastiDiDefault());
  }

  const { error: eSettings } = await sb
    .from('settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (eSettings) throw eSettings;

  if (seminaIngredienti) {
    const { data, error } = await sb
      .from('ingredient')
      .insert(
        INGREDIENTI_BASE.map((i) => ({
          user_id: userId,
          nome: i.nome,
          unita_base: i.unitaBase,
          area: i.area,
          classe_residuo: i.classeResiduo,
          deperibile: i.deperibile,
          formato_confezione: i.formatoConfezione,
          prezzo_confezione: null,
        })),
      )
      .select('id');
    if (error) throw error;

    // Ogni ingrediente ha una riga di dispensa dal primo giorno, a residuo
    // zero, come fa `salvaIngrediente` per quelli creati a mano.
    const { error: ePantry } = await sb.from('pantry_state').upsert(
      (data ?? []).map((r) => ({ ingredient_id: String(r.id), user_id: userId, residuo: 0 })),
      { onConflict: 'ingredient_id', ignoreDuplicates: true },
    );
    if (ePantry) throw ePantry;
  }

  return { pasti: seminaPasti, ingredienti: seminaIngredienti };
}
