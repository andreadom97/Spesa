import type { AreaId, UnitaBase } from '@/domain/types';
import { client } from './supabase';
import { leggiImpostazioni } from './impostazioni';

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
}

/** Corpo nel Task 14: costruisce le liste dagli slot della settimana e le congela in shopping_list_item. */
export async function generaListe(weekId: string): Promise<void> {
  throw new Error(`generaListe non ancora implementato (Task 14): weekId=${weekId}`);
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

/** Stesse due regole di ordinamento della funzione sezioni() del Task 4: ordine
 *  aree dell'utente, poi confezioni decrescenti e nome per le voci, solo nome
 *  per i controlli. Niente sezioni vuote. */
function raggruppaInSezioni(righe: RigaVoceGrezza[], ordine: AreaId[]): SezioneSalvata[] {
  const voci = righe.filter((r) => r.origine !== 'controllo').map(aVoceSalvata);
  const controlli = righe.filter((r) => r.origine === 'controllo').map(aVoceSalvata);

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

  return { base: perTipo('base'), topup: perTipo('topup') };
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
