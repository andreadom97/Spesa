import type { AreaId, UnitaBase } from '@/domain/types';
import { costruisciLista } from '@/domain/list-builder';
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

interface RigaVoceGrezza {
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

/** Stesse due regole di ordinamento della funzione sezioni() del Task 4: ordine
 *  aree dell'utente, poi confezioni decrescenti e nome per le voci, solo nome
 *  per i controlli. Niente sezioni vuote. */
function raggruppaInSezioni(righe: RigaVoceGrezza[], ordine: AreaId[]): SezioneSalvata[] {
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

/** Corpo nel Task 15: registra gli acquisti, aggiorna la dispensa e chiude le liste. */
export async function chiudiSpesa(weekId: string): Promise<void> {
  throw new Error(`chiudiSpesa non ancora implementato (Task 15): weekId=${weekId}`);
}
