import type { AreaId, UnitaBase } from '@/domain/types';
import { costruisciLista } from '@/domain/list-builder';
import { calcolaChiusura, type VoceChiusura } from '@/domain/chiusura';
import { client } from './supabase';
import { leggiImpostazioni } from './impostazioni';
import { leggiSlotSettimana } from './settimana';
import { leggiRepertorio, leggiIngredienti } from './repertorio';
import { leggiDispensa } from './dispensa';

export interface VoceSalvata {
  /** id di shopping_list_item: è questo che la coda offline accoda. */
  id: string;
  ingredientId: string;
  nome: string;
  area: AreaId;
  unita: UnitaBase;
  fabbisogno: number;
  residuo: number;
  confezioni: number;
  quantitaTotale: number;
  spuntato: boolean;
  origine: 'piano' | 'controllo' | 'manuale';
  /** true sulle sole voci porzionabili: mostra "serve X · in casa Y". */
  mostraDettaglio: boolean;
}

export interface SezioneSalvata {
  area: AreaId;
  voci: VoceSalvata[]; // origine 'piano' o 'manuale'
  controlli: VoceSalvata[]; // origine 'controllo'
}

export interface ListaSalvata {
  base: SezioneSalvata[];
  topup: SezioneSalvata[];
  /**
   * id di shopping_list per tipo: serve a rispondiControllo, che scrive su
   * shopping_list_item facendo upsert su (shopping_list_id, ingredient_id).
   * Non null quando la lista esiste: generaListe crea sempre le due righe
   * insieme, una per tipo.
   */
  baseListaId: string | null;
  topupListaId: string | null;
}

/**
 * Costruisce le liste dagli slot della settimana e le congela in
 * shopping_list_item. Le quantità non si ricalcolano al volo a ogni apertura:
 * chi è in corsia non deve vedere la lista cambiare sotto gli occhi perché
 * nel frattempo ha spuntato qualcosa.
 */
export async function generaListe(weekId: string): Promise<void> {
  const sb = client();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user!.id;

  // Difesa in profondità (C4): una settimana chiusa non va mai rigenerata,
  // qualunque sia la via per cui si arriva qui. Cancellare e reinserire gli
  // shopping_list_item perderebbe ogni spunta e ogni risposta ai controlli
  // già dati — e se a monte lo stato fosse stato riportato a 'confermata'
  // (il bug di C4 sulla pagina Settimana), una chiudiSpesa successiva
  // riapplicherebbe il delta al residuo e duplicherebbe le righe purchase.
  const { data: week, error: eWeek } = await sb
    .from('week')
    .select('stato')
    .eq('id', weekId)
    .eq('user_id', userId)
    .maybeSingle();
  if (eWeek) throw eWeek;
  if (!week || week.stato === 'chiusa') return;

  const [slots, dishes, ingredients, pantry, impostazioni] = await Promise.all([
    leggiSlotSettimana(weekId), leggiRepertorio(), leggiIngredienti(),
    leggiDispensa(), leggiImpostazioni(),
  ]);

  const risultato = costruisciLista({
    slots, dishes, ingredients, pantry, impostazioni,
    oggi: new Date().toISOString().slice(0, 10),
  });

  for (const tipo of ['base', 'topup'] as const) {
    const { data: lista, error } = await sb.from('shopping_list')
      .upsert({ user_id: userId, week_id: weekId, tipo }, { onConflict: 'week_id,tipo' })
      .select('id').single();
    if (error) throw error;

    await sb.from('shopping_list_item').delete().eq('shopping_list_id', lista.id);

    const sezioni = risultato[tipo];
    const righe = [
      ...sezioni.flatMap((s) => s.voci.map((v) => ({
        user_id: userId, shopping_list_id: lista.id, ingredient_id: v.ingredientId,
        fabbisogno: v.fabbisogno, residuo: v.residuo, confezioni: v.confezioni,
        quantita_totale: v.quantitaTotale, unita: v.unita, area: v.area, origine: 'piano',
      }))),
      ...sezioni.flatMap((s) => s.controlli.map((c) => ({
        user_id: userId, shopping_list_id: lista.id, ingredient_id: c.ingredientId,
        fabbisogno: 0, residuo: 0, confezioni: 0,
        quantita_totale: 0, unita: c.unita, area: c.area, origine: 'controllo',
      }))),
    ];
    if (righe.length > 0) {
      const { error: e } = await sb.from('shopping_list_item').insert(righe);
      if (e) throw e;
    }
  }

  // Il non ricomprato della settimana, fissato qui e non ricalcolato dopo
  // (spec 2026-09-05-non-ricomprato-design.md §1 e §3): stesso residuo e
  // stessa aritmetica delle voci appena scritte. Rigenerare sostituisce le
  // righe della settimana, anche a zero voci: un piano svuotato non deve
  // continuare a raccontare il risparmio della generazione precedente.
  const { error: eRisparmioDel } = await sb
    .from('risparmio_settimana')
    .delete()
    .eq('week_id', weekId)
    .eq('user_id', userId);
  if (eRisparmioDel) throw eRisparmioDel;
  if (risultato.evitato.length > 0) {
    const { error: eRisparmioIns } = await sb.from('risparmio_settimana').insert(
      risultato.evitato.map((v) => ({
        user_id: userId, week_id: weekId, ingredient_id: v.ingredientId,
        fabbisogno: v.fabbisogno, confezioni_ingenue: v.confezioniIngenue,
        confezioni_reali: v.confezioniReali, confezioni_evitate: v.confezioniEvitate,
        quantita_evitata: v.quantitaEvitata, unita: v.unita,
        prezzo_confezione: v.prezzoConfezione,
      })),
    );
    if (eRisparmioIns) throw eRisparmioIns;
  }
}

/**
 * Aggiunge al top-up quello che il piano chiede e la lista non ha ancora.
 *
 * Serve al caso che si presenta ogni settimana: la spesa è già fatta e il
 * piano cambia — un pasto che si sposta, un ospite, una trasferta che salta.
 * Senza questo la lista resta ferma a com'era e si ricade sulla spesa serale
 * del singolo giorno, cioè esattamente il problema che l'app esiste per
 * togliere (spec, riga 13).
 *
 * Perché nel top-up e non nella base, anche per un non deperibile: la base è
 * la spesa grossa, già fatta. Quello che si aggiunge dopo lo si prende
 * passando, ed è la definizione di top-up nella spec (riga 15).
 *
 * Aggiunge soltanto: non riscrive né rimuove nulla di esistente. È la
 * differenza con `generaListe`, che cancella e reinserisce — qui le spunte
 * già date e le risposte ai controlli non vengono mai toccate, e per questo
 * la funzione è sicura anche su una settimana chiusa, dove il residuo è già
 * stato aggiornato (il ricalcolo lo legge aggiornato e chiede solo il
 * mancante vero).
 *
 * Conseguenza accettata: togliere un piatto non toglie la voce dalla lista.
 * Comprare una cosa in più costa poco; far sparire una riga già spuntata
 * costerebbe la fiducia in tutta la lista.
 *
 * Restituisce quante voci ha aggiunto, 0 se non c'era niente da aggiungere.
 */
export async function allineaTopUp(weekId: string): Promise<number> {
  const sb = client();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user!.id;

  const { data: liste, error: eListe } = await sb
    .from('shopping_list')
    .select('id, tipo')
    .eq('week_id', weekId)
    .eq('user_id', userId);
  if (eListe) throw eListe;

  // Nessuna lista ancora generata: la settimana non è mai stata confermata,
  // e crearla qui scavalcherebbe il gesto dell'utente.
  const topup = (liste ?? []).find((l) => l.tipo === 'topup');
  if (!topup) return 0;

  const idListe = (liste ?? []).map((l) => String(l.id));
  const { data: esistenti, error: eEsist } = await sb
    .from('shopping_list_item')
    .select('ingredient_id')
    .in('shopping_list_id', idListe);
  if (eEsist) throw eEsist;
  const gia = new Set((esistenti ?? []).map((r) => String(r.ingredient_id)));

  const [slots, dishes, ingredients, pantry, impostazioni] = await Promise.all([
    leggiSlotSettimana(weekId), leggiRepertorio(), leggiIngredienti(),
    leggiDispensa(), leggiImpostazioni(),
  ]);
  const risultato = costruisciLista({
    slots, dishes, ingredients, pantry, impostazioni,
    oggi: new Date().toISOString().slice(0, 10),
  });

  // Solo le voci del piano: i controlli staple nascono dal ciclo dei 90
  // giorni, non da un cambio di piano, e farli comparire qui sarebbe rumore.
  const righe = (['base', 'topup'] as const)
    .flatMap((tipo) => risultato[tipo])
    .flatMap((sezione) => sezione.voci)
    .filter((v) => !gia.has(v.ingredientId))
    .map((v) => ({
      user_id: userId,
      shopping_list_id: String(topup.id),
      ingredient_id: v.ingredientId,
      fabbisogno: v.fabbisogno,
      residuo: v.residuo,
      confezioni: v.confezioni,
      quantita_totale: v.quantitaTotale,
      unita: v.unita,
      area: v.area,
      origine: 'piano',
    }));

  if (righe.length === 0) return 0;
  // upsert che ignora i duplicati, non insert: fra la lettura di `gia` e la
  // scrittura può essersene infilata un'altra identica — due schede aperte,
  // due caricamenti ravvicinati della stessa pagina — e `shopping_list_item`
  // ha `unique (shopping_list_id, ingredient_id)`. Con insert la seconda
  // fallisce e l'errore finisce sull'utente; qui la riga già presente resta
  // com'è, spunta compresa, che è esattamente il comportamento voluto.
  const { error } = await sb
    .from('shopping_list_item')
    .upsert(righe, { onConflict: 'shopping_list_id,ingredient_id', ignoreDuplicates: true });
  if (error) throw error;
  return righe.length;
}

/** Forma delle righe come tornano davvero da Supabase: esportata solo per il test di regressione su raggruppaInSezioni. */
export interface RigaVoceGrezza {
  id: unknown;
  ingredient_id: unknown;
  fabbisogno: unknown;
  residuo: unknown;
  confezioni: unknown;
  quantita_totale: unknown;
  unita: unknown;
  area: unknown;
  spuntato: unknown;
  origine: unknown;
  ingredient: { nome: unknown; classe_residuo: unknown } | null;
}

function aVoceSalvata(r: RigaVoceGrezza): VoceSalvata {
  return {
    id: String(r.id),
    ingredientId: String(r.ingredient_id),
    nome: r.ingredient ? String(r.ingredient.nome) : '',
    area: r.area as AreaId,
    unita: r.unita as UnitaBase,
    fabbisogno: Number(r.fabbisogno),
    residuo: Number(r.residuo),
    confezioni: Number(r.confezioni),
    quantitaTotale: Number(r.quantita_totale),
    spuntato: Boolean(r.spuntato),
    origine: r.origine as VoceSalvata['origine'],
    mostraDettaglio: r.ingredient?.classe_residuo === 'porzionabile',
  };
}

/**
 * Una riga è ancora un controllo in sospeso solo finché origine è 'controllo'
 * *e* confezioni è 0 — lo stato in cui generaListe la congela. Quando la
 * Lista risponde "no", rispondiControllo() scrive confezioni: 1 sulla stessa
 * riga ma lascia origine com'era (è l'audit trail di dove è nata la voce):
 * senza questo secondo controllo su confezioni, quella riga resterebbe per
 * sempre bloccata fra i controlli invece di diventare una tessera normale.
 */
function eControlloInSospeso(r: RigaVoceGrezza): boolean {
  return r.origine === 'controllo' && Number(r.confezioni) === 0;
}

/**
 * Stesse due regole di ordinamento della funzione sezioni() del Task 4: ordine
 * aree dell'utente, poi confezioni decrescenti e nome per le voci, solo nome
 * per i controlli. Niente sezioni vuote.
 *
 * Esportata solo per il test di regressione sullo smistamento voci/controlli
 * (eControlloInSospeso): leggiListe resta l'unico chiamante in produzione.
 */
export function raggruppaInSezioni(righe: RigaVoceGrezza[], ordine: AreaId[]): SezioneSalvata[] {
  const voci = righe.filter((r) => !eControlloInSospeso(r)).map(aVoceSalvata);
  const controlli = righe.filter(eControlloInSospeso).map(aVoceSalvata);

  const out: SezioneSalvata[] = [];
  for (const area of ordine) {
    const v = voci
      .filter((x) => x.area === area)
      .sort((a, b) => b.confezioni - a.confezioni || a.nome.localeCompare(b.nome, 'it'));
    const c = controlli
      .filter((x) => x.area === area)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (v.length === 0 && c.length === 0) continue;
    out.push({ area, voci: v, controlli: c });
  }
  return out;
}

/**
 * Ricostruisce le sezioni dalle righe congelate in shopping_list_item, non
 * richiamando costruisciLista: la lista non deve cambiare sotto gli occhi di
 * chi è in corsia.
 */
export async function leggiListe(weekId: string): Promise<ListaSalvata | null> {
  const sb = client();
  const { data: liste, error } = await sb
    .from('shopping_list')
    .select(
      'id, tipo, shopping_list_item(id, ingredient_id, fabbisogno, residuo, confezioni, quantita_totale, unita, area, spuntato, origine, ingredient(nome, classe_residuo))',
    )
    .eq('week_id', weekId)
    .returns<Array<{ id: unknown; tipo: 'base' | 'topup'; shopping_list_item: RigaVoceGrezza[] }>>();
  if (error) throw error;
  if (!liste || liste.length === 0) return null;

  const impostazioni = await leggiImpostazioni();

  const perTipo = (tipo: 'base' | 'topup'): SezioneSalvata[] => {
    const lista = liste.find((l) => l.tipo === tipo);
    const righe = lista?.shopping_list_item ?? [];
    return raggruppaInSezioni(righe, impostazioni.ordineAree);
  };
  const idPerTipo = (tipo: 'base' | 'topup'): string | null => {
    const lista = liste.find((l) => l.tipo === tipo);
    return lista ? String(lista.id) : null;
  };

  return {
    base: perTipo('base'), topup: perTipo('topup'),
    baseListaId: idPerTipo('base'), topupListaId: idPerTipo('topup'),
  };
}

export async function spunta(itemId: string, spuntato: boolean): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('shopping_list_item')
    .update({ spuntato, spuntato_il: spuntato ? new Date().toISOString() : null })
    .eq('id', itemId)
    .eq('user_id', utente.user!.id);
  if (error) throw error;
}

/** Forma grezza delle righe lette per la chiusura: solo i campi che servono a calcolaChiusura, niente join su ingredient. */
interface RigaChiusuraGrezza {
  ingredient_id: unknown;
  fabbisogno: unknown;
  residuo: unknown;
  confezioni: unknown;
  quantita_totale: unknown;
  spuntato: unknown;
  origine: unknown;
}

/**
 * L'unico momento in cui il residuo viene scritto: senza questo tap la
 * registrazione silenziosa non ha un istante in cui avvenire. Legge le righe
 * congelate di entrambe le liste (non leggiListe: qui non servono sezioni,
 * ordine aree o nomi — solo i numeri che calcolaChiusura consuma), chiama la
 * funzione pura, e in una sola andata scrive pantry_state, purchase,
 * shopping_list.chiusa_il e week.stato.
 *
 * Idempotente rispetto alla week: se è già `chiusa` esce subito senza
 * scrivere nulla. calcolaChiusura legge il residuo congelato nella riga della
 * lista, non quello live in pantry_state — richiamarla due volte sulla stessa
 * settimana (doppio tap, o si torna sulla schermata dopo averla già chiusa)
 * applicherebbe due volte lo stesso delta, sballando la dispensa.
 *
 * Per questo il guard e la scrittura non possono correre in parallelo fra
 * loro: prima i DATI (pantry_state, purchase), solo se vanno a buon fine la
 * chiusura UFFICIALE (shopping_list.chiusa_il, week.stato). Se posassimo
 * `week.stato = 'chiusa'` insieme a un insert su `purchase` che poi fallisce,
 * il guard qui sopra bloccherebbe in silenzio ogni ritentativo — la week
 * risulterebbe già chiusa, ma lo storico acquisti di quella spesa sarebbe
 * perso per sempre, e non c'è modo di riscriverlo se non a mano sul database.
 * Il residuo non ha lo stesso problema (è una sovrascrittura assoluta da
 * dati congelati, non un delta: un ritentativo la ricalcola identica), ma non
 * costa nulla tenerlo nello stesso primo passo dei dati.
 */
export async function chiudiSpesa(weekId: string): Promise<void> {
  const sb = client();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user!.id;
  const oggi = new Date().toISOString().slice(0, 10);

  const { data: week, error: eWeek } = await sb
    .from('week')
    .select('stato')
    .eq('id', weekId)
    .eq('user_id', userId)
    .maybeSingle();
  if (eWeek) throw eWeek;
  if (!week || week.stato === 'chiusa') return;

  const { data: liste, error } = await sb
    .from('shopping_list')
    .select('id, shopping_list_item(ingredient_id, fabbisogno, residuo, confezioni, quantita_totale, spuntato, origine)')
    .eq('week_id', weekId)
    .returns<Array<{ id: unknown; shopping_list_item: RigaChiusuraGrezza[] }>>();
  if (error) throw error;
  if (!liste || liste.length === 0) return;

  // Ogni ingrediente compare in una sola delle due liste (base/topup sono uno
  // split per deperibilità, non due copie): la mappa non perde nessuna riga.
  const shoppingListIdPerIngrediente = new Map<string, string>();
  const voci: VoceChiusura[] = [];
  for (const lista of liste) {
    for (const r of lista.shopping_list_item ?? []) {
      const ingredientId = String(r.ingredient_id);
      shoppingListIdPerIngrediente.set(ingredientId, String(lista.id));
      voci.push({
        ingredientId,
        spuntato: Boolean(r.spuntato),
        quantitaTotale: Number(r.quantita_totale),
        fabbisogno: Number(r.fabbisogno),
        residuo: Number(r.residuo),
        confezioni: Number(r.confezioni),
        origine: r.origine as VoceChiusura['origine'],
      });
    }
  }
  if (voci.length === 0) return;

  const aggiornamenti = calcolaChiusura({ voci, oggi });

  // ── Riapplicazione degli storni (spec spunta-pasti §5.2) ────────────────
  // La sovrascrittura qui sotto è ASSOLUTA, dai dati congelati: uno storno
  // registrato fra la generazione della lista e questa chiusura (salti il
  // pranzo di lunedì, spesa la sera) verrebbe cancellato. Si sommano quindi
  // gli storni degli slot della settimana al residuo in scrittura — ma SOLO
  // per gli ingredienti che la chiusura sovrascrive: uno storno su un
  // ingrediente fuori dalla lista congelata è già nel residuo vivo dal
  // momento del tap, e l'overwrite non lo tocca — riapplicarlo lo conterebbe
  // due volte. La riapplicazione compensa esattamente ciò che l'overwrite
  // cancella, niente di più; il guard di idempotenza la fa girare una volta.
  const { data: righeStorno, error: eStorni } = await sb
    .from('meal_slot_storno')
    .select('ingredient_id, delta, meal_slot!inner(week_id)')
    .eq('meal_slot.week_id', weekId);
  if (eStorni) throw eStorni;
  const stornoPerIngrediente = new Map<string, number>();
  for (const r of (righeStorno ?? []) as Array<Record<string, unknown>>) {
    const id = String(r.ingredient_id);
    stornoPerIngrediente.set(id, (stornoPerIngrediente.get(id) ?? 0) + Number(r.delta));
  }

  const scrittureDispensa = aggiornamenti
    .filter((a) => a.residuo !== null || a.ultimoAcquisto !== null)
    .map((a) => {
      // pantry_state.residuo ha `check (residuo >= 0)`: calcolaChiusura non
      // produce mai un negativo, ma qui si scrive solo quello che è cambiato
      // davvero, mai un valore indovinato per le colonne che non c'entrano.
      //
      // upsert, non update: pantry_state esiste solo per gli ingredienti
      // creati passando da salvaIngrediente(). Un ingrediente inserito con
      // un insert SQL diretto (repertorio popolato a mano da un piano di un
      // nutrizionista) non ha ancora una riga — un update su una riga
      // inesistente è un no-op silenzioso, senza errore da nessuna parte: il
      // residuo di quell'ingrediente non si accumulerebbe mai (I1).
      const patch: Record<string, unknown> = { ingredient_id: a.ingredientId, user_id: userId };
      if (a.residuo !== null) {
        patch.residuo = Math.max(0, a.residuo + (stornoPerIngrediente.get(a.ingredientId) ?? 0));
      }
      if (a.ultimoAcquisto !== null) patch.ultimo_acquisto = a.ultimoAcquisto;
      return sb.from('pantry_state').upsert(patch, { onConflict: 'ingredient_id' });
    });

  const righeAcquisto = aggiornamenti
    .filter((a) => a.registraAcquisto)
    .map((a) => ({
      user_id: userId,
      ingredient_id: a.ingredientId,
      data: oggi,
      confezioni: a.confezioni,
      quantita: a.quantita,
      shopping_list_id: shoppingListIdPerIngrediente.get(a.ingredientId) ?? null,
    }));

  const listaIds = liste.map((l) => String(l.id));

  // Passo 1, i DATI: se uno di questi fallisce, si lancia qui, PRIMA di
  // toccare shopping_list/week — il guard di idempotenza resta disarmato e
  // un ritentativo dell'utente può ancora scrivere lo storico mancante.
  const risultatiDati = await Promise.all([
    ...scrittureDispensa,
    righeAcquisto.length > 0
      ? sb.from('purchase').insert(righeAcquisto)
      : Promise.resolve({ error: null }),
  ]);
  const primoErroreDati = risultatiDati.find((r) => r.error)?.error;
  if (primoErroreDati) throw primoErroreDati;

  // Passo 2, la chiusura UFFICIALE: solo ora, con i dati al sicuro, si arma
  // il guard che rende chiudiSpesa idempotente.
  const risultatiChiusura = await Promise.all([
    sb.from('shopping_list').update({ chiusa_il: new Date().toISOString() }).in('id', listaIds).eq('user_id', userId),
    sb.from('week').update({ stato: 'chiusa' }).eq('id', weekId).eq('user_id', userId),
  ]);
  const primoErroreChiusura = risultatiChiusura.find((r) => r.error)?.error;
  if (primoErroreChiusura) throw primoErroreChiusura;
}
