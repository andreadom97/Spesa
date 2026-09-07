import type { ClasseResiduo, UnitaBase } from '@/domain/types';
import { client } from './supabase';
import { idCasa } from './casa';

/**
 * Una voce comprata della settimana, pronta per la schermata Confezioni
 * (spec 2026-09-07-scan-confezione-design.md §1 e §4): la riga congelata di
 * shopping_list_item più quello che serve dall'ingrediente per proporre e
 * confrontare il formato letto dal codice a barre.
 */
export interface VoceComprata {
  /** id di shopping_list_item. */
  itemId: string;
  ingredientId: string;
  nome: string;
  unita: UnitaBase;
  /** La pagina non offre lo scan per `intero` (si conta) né per `stima`. */
  classeResiduo: ClasseResiduo;
  confezioni: number;
  /** Il formato assunto oggi sull'ingrediente, in `unita`. */
  formato: number;
  /** confezioni × formato, congelato alla generazione (o già corretto da una scansione). */
  quantitaTotale: number;
  /** L'ultimo codice scansionato per l'ingrediente, null se mai. */
  ean: string | null;
}

/** Forma delle righe come tornano da Supabase con l'embed su ingredient. */
interface RigaCompratoGrezza {
  id: unknown;
  ingredient_id: unknown;
  confezioni: unknown;
  quantita_totale: unknown;
  spuntato: unknown;
  origine: unknown;
  unita: unknown;
  ingredient: {
    nome: unknown;
    classe_residuo: unknown;
    formato_confezione: unknown;
    ean: unknown;
  } | null;
}

/**
 * Le voci comprate della settimana: spuntate, nate dal piano o aggiunte a
 * mano (i controlli staple "ne hai ancora?" non sono acquisti) e con almeno
 * una confezione (un controllo risposto "sì" resta a 0). Entrambe le liste
 * (base e top-up), in ordine di nome. Le quantità sono quelle congelate:
 * questa funzione non ricalcola niente.
 */
export async function leggiVociComprate(weekId: string): Promise<VoceComprata[]> {
  const sb = client();
  const userId = await idCasa();
  const { data: liste, error } = await sb
    .from('shopping_list')
    .select(
      'id, shopping_list_item(id, ingredient_id, confezioni, quantita_totale, spuntato, origine, unita, ingredient(nome, classe_residuo, formato_confezione, ean))',
    )
    .eq('week_id', weekId)
    .eq('user_id', userId)
    .returns<Array<{ id: unknown; shopping_list_item: RigaCompratoGrezza[] }>>();
  if (error) throw error;

  return (liste ?? [])
    .flatMap((l) => l.shopping_list_item ?? [])
    .filter((r) =>
      Boolean(r.spuntato)
      && (r.origine === 'piano' || r.origine === 'manuale')
      && Number(r.confezioni) > 0)
    .map((r): VoceComprata => ({
      itemId: String(r.id),
      ingredientId: String(r.ingredient_id),
      nome: r.ingredient ? String(r.ingredient.nome) : '',
      unita: r.unita as UnitaBase,
      classeResiduo: (r.ingredient?.classe_residuo ?? 'porzionabile') as ClasseResiduo,
      confezioni: Number(r.confezioni),
      formato: Number(r.ingredient?.formato_confezione ?? 0),
      quantitaTotale: Number(r.quantita_totale),
      ean: r.ingredient?.ean == null ? null : String(r.ingredient.ean),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

/**
 * Scrive il formato letto dal codice a barre in due posti, perché il formato
 * vive in due posti:
 *
 * - `ingredient.formato_confezione`: è quello che costruisciLista userà da
 *   qui in avanti. Corregge le settimane PROSSIME.
 * - `shopping_list_item.quantita_totale` delle righe di questa settimana:
 *   `chiudiSpesa` accredita al residuo la quantita_totale congelata, non il
 *   formato vivo dell'ingrediente. Senza riscriverla, il residuo di QUESTA
 *   settimana resterebbe sbagliato di (formato assunto − formato vero) ×
 *   confezioni. Riga per riga, perché quantita_totale = confezioni × formato
 *   e le confezioni sono della riga (una voce può stare in base o in top-up,
 *   con conteggi diversi).
 *
 * `ean` si memorizza solo se c'è (null lascia l'ultimo codice, come il
 * `coalesce` della spec §4). Solo a settimana non chiusa: dopo la chiusura
 * il residuo è già accreditato e correggere quantita_totale non
 * cambierebbe più niente — anzi, un chiudiSpesa non può ripartire (è
 * idempotente sullo stato) e la correzione sembrerebbe fatta senza esserlo.
 * Stesso guard di generaListe/chiudiSpesa, ma qui si lancia: la pagina deve
 * dirlo, non tacere.
 */
export async function aggiornaFormatoDaScansione(i: {
  ingredientId: string;
  weekId: string;
  formato: number;
  ean: string | null;
}): Promise<void> {
  // Un formato a 0 farebbe quantita_totale = 0 su righe comprate davvero e
  // un ceil(x / 0) infinito nelle liste prossime; il check del database
  // (formato_confezione > 0) lo fermerebbe, ma dopo aver già capito male.
  if (!Number.isFinite(i.formato) || i.formato <= 0) throw new Error('formato non valido');

  const sb = client();
  const userId = await idCasa();

  const { data: week, error: eWeek } = await sb
    .from('week')
    .select('stato')
    .eq('id', i.weekId)
    .eq('user_id', userId)
    .maybeSingle();
  if (eWeek) throw eWeek;
  if (!week) throw new Error('settimana non trovata');
  if (week.stato === 'chiusa') throw new Error('spesa già chiusa');

  const patch: Record<string, unknown> = { formato_confezione: i.formato };
  if (i.ean !== null) patch.ean = i.ean;
  const { error: eIng } = await sb
    .from('ingredient')
    .update(patch)
    .eq('id', i.ingredientId)
    .eq('user_id', userId);
  if (eIng) throw eIng;

  const { data: liste, error: eListe } = await sb
    .from('shopping_list')
    .select('id')
    .eq('week_id', i.weekId)
    .eq('user_id', userId);
  if (eListe) throw eListe;
  const idListe = (liste ?? []).map((l) => String(l.id));
  if (idListe.length === 0) return;

  const { data: righe, error: eRighe } = await sb
    .from('shopping_list_item')
    .select('id, confezioni')
    .in('shopping_list_id', idListe)
    .eq('ingredient_id', i.ingredientId);
  if (eRighe) throw eRighe;

  // Solo le righe con confezioni: un controllo staple risposto "sì" (0
  // confezioni) non è un acquisto e la sua quantita_totale resta 0.
  for (const r of (righe ?? []).filter((r) => Number(r.confezioni) > 0)) {
    const { error } = await sb
      .from('shopping_list_item')
      .update({ quantita_totale: Number(r.confezioni) * i.formato })
      .eq('id', String(r.id))
      .eq('user_id', userId);
    if (error) throw error;
  }
}
