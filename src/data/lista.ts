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

  const scrittureDispensa = aggiornamenti
    .filter((a) => a.residuo !== null || a.ultimoAcquisto !== null)
    .map((a) => {
      // pantry_state.residuo ha `check (residuo >= 0)`: calcolaChiusura non
      // produce mai un negativo, ma qui si scrive solo quello che è cambiato
      // davvero, mai un valore indovinato per le colonne che non c'entrano.
      const patch: Record<string, unknown> = {};
      if (a.residuo !== null) patch.residuo = a.residuo;
      if (a.ultimoAcquisto !== null) patch.ultimo_acquisto = a.ultimoAcquisto;
      return sb.from('pantry_state').update(patch).eq('ingredient_id', a.ingredientId).eq('user_id', userId);
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

  const risultati = await Promise.all([
    ...scrittureDispensa,
    righeAcquisto.length > 0
      ? sb.from('purchase').insert(righeAcquisto)
      : Promise.resolve({ error: null }),
    sb.from('shopping_list').update({ chiusa_il: new Date().toISOString() }).in('id', listaIds).eq('user_id', userId),
    sb.from('week').update({ stato: 'chiusa' }).eq('id', weekId).eq('user_id', userId),
  ]);

  const primoErrore = risultati.find((r) => r.error)?.error;
  if (primoErrore) throw primoErrore;
}
