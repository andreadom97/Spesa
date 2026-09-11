import type { ClasseResiduo, UnitaBase } from '@/domain/types';
import { eanValido } from '@/domain/ean';
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
  /** Il fabbisogno congelato della riga, in `unita`: serve a rifare le confezioni con un formato diverso. */
  fabbisogno: number;
  /** Il residuo congelato della riga (già utilizzabile), in `unita`. */
  residuo: number;
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
  fabbisogno: unknown;
  residuo: unknown;
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

/** Il tetto del formato: sotto un millesimo di unità o sopra 100 kg / 100 l / 100.000 pezzi non è una confezione. */
export const FORMATO_MIN = 0.001;
export const FORMATO_MAX = 100_000;
/** Il tetto delle confezioni comprate in una spesa. */
export const CONFEZIONI_MAX = 1000;

/**
 * Le voci comprate della settimana: spuntate e nate dal piano o aggiunte a
 * mano. I controlli staple ("ne hai ancora?") restano fuori per l'origine,
 * non per le confezioni: un controllo risposto "sì" sta a 0, ma è l'origine
 * `controllo` a dire che non è un acquisto. Nessun filtro su
 * `confezioni > 0`: una riga di piano non nasce mai a 0, e se sta a 0 è
 * perché una scansione l'ha scritta così ("non l'ho preso", o un refuso) —
 * deve restare in pagina, altrimenti al ricarico sparisce e non si corregge
 * più. Entrambe le liste (base e top-up), in ordine di nome; a parità di
 * nome (lo stesso ingrediente in tutte e due le liste) prima la base, poi il
 * top-up — lo stesso ordine in cui `aggiornaFormatoDaScansione` assegna le
 * confezioni comprate. Le quantità sono quelle congelate: questa funzione
 * non ricalcola niente.
 */
export async function leggiVociComprate(weekId: string): Promise<VoceComprata[]> {
  const sb = client();
  const userId = await idCasa();
  const { data: liste, error } = await sb
    .from('shopping_list')
    .select(
      'id, tipo, shopping_list_item(id, ingredient_id, fabbisogno, residuo, confezioni, quantita_totale, spuntato, origine, unita, ingredient(nome, classe_residuo, formato_confezione, ean))',
    )
    .eq('week_id', weekId)
    .eq('user_id', userId)
    .returns<Array<{ id: unknown; tipo: unknown; shopping_list_item: RigaCompratoGrezza[] }>>();
  if (error) throw error;

  const ordineLista = (tipo: unknown): number => (tipo === 'topup' ? 1 : 0);

  return (liste ?? [])
    .flatMap((l) => (l.shopping_list_item ?? []).map((r) => ({ riga: r, lista: ordineLista(l.tipo) })))
    .filter(({ riga: r }) => Boolean(r.spuntato) && (r.origine === 'piano' || r.origine === 'manuale'))
    .sort((a, b) => {
      const perNome = String(a.riga.ingredient?.nome ?? '').localeCompare(String(b.riga.ingredient?.nome ?? ''), 'it');
      return perNome !== 0 ? perNome : a.lista - b.lista;
    })
    .map(({ riga: r }): VoceComprata => ({
      itemId: String(r.id),
      ingredientId: String(r.ingredient_id),
      nome: r.ingredient ? String(r.ingredient.nome) : '',
      unita: r.unita as UnitaBase,
      classeResiduo: (r.ingredient?.classe_residuo ?? 'porzionabile') as ClasseResiduo,
      fabbisogno: Number(r.fabbisogno),
      residuo: Number(r.residuo),
      confezioni: Number(r.confezioni),
      formato: Number(r.ingredient?.formato_confezione ?? 0),
      quantitaTotale: Number(r.quantita_totale),
      ean: r.ingredient?.ean == null ? null : String(r.ingredient.ean),
    }));
}

/**
 * Scrive quello che si è comprato davvero: il formato letto dal codice a
 * barre E quante confezioni di quel formato sono entrate nel carrello. Le
 * due cose vanno insieme: `confezioni` della riga è derivato dal formato
 * assunto (`ceil(daComprare / formato)`), e cambiare il formato tenendo il
 * conteggio darebbe una `quantita_totale` che non corrisponde a niente di
 * comprato — fabbisogno 800 g, formato assunto 500 → 2 confezioni; in
 * corsia il pacco è da 1 kg e se ne prende 1: scrivere 2 × 1000 = 2000
 * gonfierebbe il residuo di un chilo e la settimana dopo la pasta non
 * verrebbe chiesta.
 *
 * Il formato vive in due posti, e si scrive in questo ordine:
 *
 * 1. `shopping_list_item` di QUESTA settimana, per l'ingrediente:
 *    `confezioni` e `quantita_totale = confezioni × formato`. `chiudiSpesa`
 *    accredita al residuo la quantita_totale congelata, non il formato vivo
 *    dell'ingrediente. Se l'ingrediente sta in più righe (base e top-up),
 *    tutto va sulla prima in ordine base → top-up e 0 sulle altre: le
 *    confezioni comprate sono un numero solo, e spalmarle a caso fra due
 *    righe inventerebbe una divisione che nessuno ha fatto. Solo le righe
 *    `piano`/`manuale`: un controllo staple ("ne hai ancora?") è una
 *    domanda, non un acquisto, e metterci delle confezioni lo farebbe
 *    registrare come tale alla chiusura.
 * 2. `ingredient.formato_confezione` (ed `ean`, se c'è): è quello che
 *    costruisciLista userà da qui in avanti. Corregge le settimane PROSSIME.
 *
 * Prima le righe e poi l'ingrediente perché un fallimento a metà non deve
 * lasciare le settimane prossime corrette e questa no: la chiusura di questa
 * settimana è l'unico momento in cui il residuo diventa reale, e se qualcosa
 * si rompe è meglio che l'ingrediente resti com'era e la pagina dica di
 * riprovare.
 *
 * `confezioni = 0` è ammesso: vuol dire "in corsia non l'ho preso". La riga
 * resta spuntata con 0 confezioni e quantita_totale 0, e alla chiusura non
 * accredita niente al residuo (l'acquisto registrato sarà a 0, un limite
 * dichiarato in spec §7). `ean` si memorizza solo se c'è (null lascia
 * l'ultimo codice, come il `coalesce` della spec §4).
 *
 * Solo a settimana non chiusa: dopo la chiusura il residuo è già accreditato
 * e correggere quantita_totale non cambierebbe più niente — anzi, un
 * chiudiSpesa non può ripartire (è idempotente sullo stato) e la correzione
 * sembrerebbe fatta senza esserlo. Stesso guard di generaListe/chiudiSpesa,
 * ma qui si lancia: la pagina deve dirlo, non tacere.
 *
 * Tetti: `formato` finito in [FORMATO_MIN, FORMATO_MAX] (un formato a 0
 * farebbe un ceil(x / 0) infinito nelle liste prossime; uno da un milione
 * di grammi è un refuso, non un pacco), `confezioni` intero in
 * [0, CONFEZIONI_MAX], `ean` (se c'è) di 8–14 cifre come il check SQL
 * `^[0-9]{8,14}$`, scritto senza spazi ai bordi. Si controlla qui, prima di
 * toccare il database: i check lo fermerebbero, ma sull'ultimo update, con
 * le righe della settimana già riscritte.
 *
 * L'update dell'ingrediente rilegge l'id toccato (`select('id')`): con le
 * policy per casa un ingrediente di un'altra casa, o cancellato, dà zero
 * righe senza errore, e la pagina segnerebbe AGGIORNATO un formato che non
 * ha scritto nessuno. Zero righe → `ingrediente non trovato`.
 */
export async function aggiornaFormatoDaScansione(i: {
  ingredientId: string;
  weekId: string;
  formato: number;
  ean: string | null;
  /** Le confezioni di quel formato comprate davvero, intero ≥ 0. */
  confezioni: number;
}): Promise<void> {
  if (!Number.isFinite(i.formato) || i.formato < FORMATO_MIN || i.formato > FORMATO_MAX) {
    throw new Error('formato non valido');
  }
  if (!Number.isInteger(i.confezioni) || i.confezioni < 0 || i.confezioni > CONFEZIONI_MAX) {
    throw new Error('confezioni non valide');
  }
  if (i.ean !== null && !eanValido(i.ean)) throw new Error('codice non valido');

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

  const { data: liste, error: eListe } = await sb
    .from('shopping_list')
    .select('id, tipo')
    .eq('week_id', i.weekId)
    .eq('user_id', userId);
  if (eListe) throw eListe;
  // Base prima del top-up: è la riga su cui vanno le confezioni comprate.
  const listeOrdinate = [...(liste ?? [])]
    .map((l) => ({ id: String(l.id), ordine: l.tipo === 'topup' ? 1 : 0 }))
    .sort((a, b) => a.ordine - b.ordine);
  const idListe = listeOrdinate.map((l) => l.id);

  if (idListe.length > 0) {
    const { data: righe, error: eRighe } = await sb
      .from('shopping_list_item')
      .select('id, shopping_list_id, origine')
      .in('shopping_list_id', idListe)
      .eq('ingredient_id', i.ingredientId);
    if (eRighe) throw eRighe;

    const acquisti = (righe ?? [])
      .filter((r) => r.origine === 'piano' || r.origine === 'manuale')
      .map((r) => ({ id: String(r.id), ordine: idListe.indexOf(String(r.shopping_list_id)) }))
      .sort((a, b) => a.ordine - b.ordine || a.id.localeCompare(b.id));

    for (const [indice, r] of acquisti.entries()) {
      const confezioni = indice === 0 ? i.confezioni : 0;
      const { error } = await sb
        .from('shopping_list_item')
        .update({ confezioni, quantita_totale: confezioni * i.formato })
        .eq('id', r.id)
        .eq('user_id', userId);
      if (error) throw error;
    }
  }

  const patch: Record<string, unknown> = { formato_confezione: i.formato };
  if (i.ean !== null) patch.ean = i.ean.trim();
  const { data: toccati, error: eIng } = await sb
    .from('ingredient')
    .update(patch)
    .eq('id', i.ingredientId)
    .eq('user_id', userId)
    .select('id');
  if (eIng) throw eIng;
  if (!toccati || toccati.length === 0) throw new Error('ingrediente non trovato');
}
