import type { PantryState } from '@/domain/types';
import { effettoCorrezione } from '@/domain/pantry';
import { eanValido } from '@/domain/ean';
import { client } from './supabase';
import { idCasa } from './casa';
import { aPantryState } from './mappers';
import { FORMATO_MAX, FORMATO_MIN } from './confezioni';

/** Oggi come lo scrive il resto dei dati (UTC, yyyy-mm-dd): lo stesso di rispondiControllo. */
function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  // L'id della casa (casa.ts), non dell'account: per un membro è il proprietario. Una chiamata per funzione: è memorizzata.
  const userId = await idCasa();

  if (ancora) {
    // update e non upsert, anche se la riga di dispensa può mancare (dopo
    // Cancella la dispensa): senza riga l'update tocca zero righe e non dà
    // errore. Non si perde niente: ultimo_check conta solo accanto a un
    // ultimo_acquisto (serveControllo torna false senza), e l'acquisto che
    // ricrea la riga è più recente di questo «sì».
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
    // maybeSingle, non single: la riga di dispensa può mancare. Succede dopo
    // Cancella la dispensa (spec fase 5 §E.2), che cancella pantry_state ma
    // lascia le righe di controllo della lista aperta. Senza riga
    // l'ingrediente è «mai comprato»: residuo 0, come lo legge la Dispensa.
    sb
      .from('pantry_state')
      .select('residuo')
      .eq('ingredient_id', ingredientId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  if (eIng) throw eIng;
  if (eStato) throw eStato;

  // Upsert, non insert: rispondere "no" due volte allo stesso controllo non
  // deve creare due voci sulla stessa lista (vincolo di unicità shopping_list_id+ingredient_id).
  // Il «no» non scrive su pantry_state: la riga mancante non serve crearla qui,
  // la crea chiudiSpesa (upsert) se la voce viene comprata.
  const { error: eIns } = await sb.from('shopping_list_item').upsert(
    {
      user_id: userId,
      shopping_list_id: listaId,
      ingredient_id: ingredientId,
      fabbisogno: 0,
      residuo: Number(stato?.residuo ?? 0),
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
 *
 * Dalla fase 4 applica le regole delle date (spec §E.2, §E.3) con
 * `effettoCorrezione`: da 0 a più di 0 è un'entrata (acquisto a oggi, data a
 * mano cancellata), a 0 la data a mano si cancella. `prima` lo dà chi chiama,
 * che ha in mano il valore mostrato: niente lettura in più.
 */
export async function correggiResiduo(ingredientId: string, residuo: number, prima: number): Promise<void> {
  if (!Number.isFinite(residuo) || residuo < 0) {
    throw new Error(`Residuo non valido: ${residuo}. Lo schema ha check (residuo >= 0).`);
  }
  const sb = client();
  const userId = await idCasa();
  const effetto = effettoCorrezione(prima, residuo, oggiIso());
  const riga: Record<string, unknown> = { ingredient_id: ingredientId, user_id: userId, residuo };
  if (effetto.ultimoAcquisto !== null) riga.ultimo_acquisto = effetto.ultimoAcquisto;
  if (effetto.cancellaScadenza) riga.scadenza_manuale = null;
  const { error } = await sb.from('pantry_state').upsert(riga, { onConflict: 'ingredient_id' });
  if (error) throw error;
}

/**
 * Dichiara che il residuo di un ingrediente sta nel congelatore.
 *
 * Cambia la soglia oltre la quale il residuo di un deperibile smette di
 * contare: da giorni a mesi (`GIORNI_CONGELATO`). Senza questo, l'azzeramento
 * automatico del fresco direbbe di ricomprare quello che sta nel freezer —
 * ed è il motivo per cui le due cose sono state fatte insieme.
 *
 * Sta su `pantry_state` e non su `ingredient` perché è una proprietà di
 * quello che hai in casa adesso: lo stesso petto di pollo è in frigo questa
 * settimana e nel congelatore la prossima.
 *
 * Cancella anche la data scritta a mano: la stima passa da giorni a mesi, e
 * la data valeva per l'altro stato (spec fase 4 §E.3).
 */
export async function impostaCongelato(ingredientId: string, congelato: boolean): Promise<void> {
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb
    .from('pantry_state')
    .upsert(
      { ingredient_id: ingredientId, user_id: userId, congelato, scadenza_manuale: null },
      { onConflict: 'ingredient_id' },
    );
  if (error) throw error;
}

/**
 * La scadenza scritta a mano dal dettaglio della Dispensa (spec fase 4 §D.4).
 * null = `USA LA STIMA`. L'intervallo ammesso (oggi … oggi + 2 anni) lo
 * controlla la schermata con `dataScadenzaValida`: qui si ferma solo una
 * stringa che non è una data, prima che la rifiuti Postgres (e prima che una
 * stringa vuota, che il dominio confonderebbe con `null` tramite `??`,
 * arrivi al database).
 */
export async function impostaScadenza(ingredientId: string, data: string | null): Promise<void> {
  if (data !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`Data non valida: ${data}`);
  const sb = client();
  const userId = await idCasa();
  const { error } = await sb
    .from('pantry_state')
    .upsert({ ingredient_id: ingredientId, user_id: userId, scadenza_manuale: data }, { onConflict: 'ingredient_id' });
  if (error) throw error;
}

/**
 * `AGGIUNGI` dello scanner nel dettaglio (spec fase 4 §F.2): una confezione in
 * più. È un acquisto: residuo + formato, acquisto a oggi, data a mano
 * cancellata. Sull'ingrediente restano il codice letto e il suo formato, come
 * fa già `aggiornaFormatoDaScansione`: l'ultima confezione comprata è la
 * miglior previsione della prossima.
 *
 * Prima l'ingrediente e poi la dispensa: se l'ingrediente non si trova (altra
 * casa, cancellato) la update torna zero righe senza errore, e senza questo
 * controllo il residuo salirebbe su un ingrediente che nessuno vede.
 */
export async function aggiungiConfezione(i: {
  ingredientId: string;
  formato: number;
  ean: string;
  residuoPrima: number;
}): Promise<void> {
  if (!Number.isFinite(i.formato) || i.formato < FORMATO_MIN || i.formato > FORMATO_MAX) {
    throw new Error('formato non valido');
  }
  if (!eanValido(i.ean)) throw new Error('codice non valido');
  if (!Number.isFinite(i.residuoPrima)) throw new Error('residuo non valido');
  const sb = client();
  const userId = await idCasa();

  const { data: toccati, error: eIng } = await sb
    .from('ingredient')
    .update({ formato_confezione: i.formato, ean: i.ean.trim() })
    .eq('id', i.ingredientId)
    .eq('user_id', userId)
    .select('id');
  if (eIng) throw eIng;
  if (!toccati || toccati.length === 0) throw new Error('ingrediente non trovato');

  const { error } = await sb.from('pantry_state').upsert(
    {
      ingredient_id: i.ingredientId,
      user_id: userId,
      residuo: Math.max(0, i.residuoPrima) + i.formato,
      ultimo_acquisto: oggiIso(),
      scadenza_manuale: null,
    },
    { onConflict: 'ingredient_id' },
  );
  if (error) throw error;
}

/**
 * L'evento che la pagina Dispensa ascolta per rileggersi quando la dispensa
 * cambia da fuori (spec fase 5 §E.2): il pannello delle Impostazioni lo
 * pubblica sul `window` dopo una `cancellaDispensa` riuscita. Una costante
 * sola per chi pubblica e chi ascolta.
 */
export const EVENTO_DISPENSA_CAMBIATA = 'spesa:dispensa-cambiata';

/**
 * «Cancella la dispensa» (spec fase 5 §E.2): la funzione SQL
 * `cancella_dispensa()` della migrazione 0015, una transazione sola. Nessun id
 * da passare: la casa la trova `casa_id()` nel database, quindi vale anche con
 * la memoria di `idCasa` vecchia di un minuto. Oltre a `pantry_state` e
 * `porzione_pronta`, riporta a normali i pasti di oggi e dopo «dai pronti», e
 * azzera il residuo congelato delle liste non chiuse (piano fase 5, Task 4,
 * D1 e D2).
 *
 * Lancia l'errore della RPC. Non pubblica EVENTO_DISPENSA_CAMBIATA: lo fa chi
 * chiama, se riesce, così un test o un altro chiamante decide da sé.
 */
export async function cancellaDispensa(): Promise<void> {
  const { error } = await client().rpc('cancella_dispensa');
  if (error) throw error;
}
