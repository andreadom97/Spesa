import type { UnitaBase } from '@/domain/types';
import type { VoceEvitata } from '@/domain/list-builder';
import { client } from './supabase';

/**
 * Letture di risparmio_settimana, il non ricomprato fissato da generaListe
 * (spec 2026-09-05-non-ricomprato-design.md §3). Qui si legge e si mappa
 * soltanto: il riassunto (confezioni, quantità, euro) lo fa il dominio in
 * src/domain/risparmio.ts.
 */

const COLONNE =
  'ingredient_id, fabbisogno, confezioni_ingenue, confezioni_reali, confezioni_evitate, quantita_evitata, unita, prezzo_confezione, ingredient(nome)';

/** Forma delle righe come tornano da Supabase: numeric come stringhe, join su ingredient per il nome. */
interface RigaRisparmioGrezza {
  ingredient_id: unknown;
  fabbisogno: unknown;
  confezioni_ingenue: unknown;
  confezioni_reali: unknown;
  confezioni_evitate: unknown;
  quantita_evitata: unknown;
  unita: unknown;
  prezzo_confezione: unknown;
  ingredient: { nome: unknown } | null;
}

function aVoceEvitata(r: RigaRisparmioGrezza): VoceEvitata {
  return {
    ingredientId: String(r.ingredient_id),
    nome: r.ingredient ? String(r.ingredient.nome) : '',
    unita: r.unita as UnitaBase,
    fabbisogno: Number(r.fabbisogno),
    confezioniIngenue: Number(r.confezioni_ingenue),
    confezioniReali: Number(r.confezioni_reali),
    confezioniEvitate: Number(r.confezioni_evitate),
    quantitaEvitata: Number(r.quantita_evitata),
    prezzoConfezione: r.prezzo_confezione == null ? null : Number(r.prezzo_confezione),
  };
}

/** Stesso ordine di costruisciLista: per nome, all'italiana. */
function ordinaPerNome(righe: RigaRisparmioGrezza[]): VoceEvitata[] {
  return righe.map(aVoceEvitata).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

/** Il non ricomprato di una settimana, dalla generazione della lista in poi. */
export async function leggiRisparmioSettimana(weekId: string): Promise<VoceEvitata[]> {
  const { data, error } = await client()
    .from('risparmio_settimana')
    .select(COLONNE)
    .eq('week_id', weekId)
    .returns<RigaRisparmioGrezza[]>();
  if (error) throw error;
  return ordinaPerNome(data ?? []);
}

/**
 * Il non ricomprato di tutte le settimane chiuse dell'utente (RLS): il totale
 * racconta spese fatte davvero, non liste generate e abbandonate. Join inner
 * su week con filtro sullo stato, come la query degli storni in chiudiSpesa.
 */
export async function leggiRisparmioTotale(): Promise<VoceEvitata[]> {
  const { data, error } = await client()
    .from('risparmio_settimana')
    .select(`${COLONNE}, week!inner(stato)`)
    .eq('week.stato', 'chiusa')
    .returns<RigaRisparmioGrezza[]>();
  if (error) throw error;
  return ordinaPerNome(data ?? []);
}
