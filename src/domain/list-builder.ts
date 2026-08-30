import type {
  AreaId, Dish, Impostazioni, Ingredient, MealSlot, PantryState, UnitaBase, ClasseResiduo,
} from './types';
import { convertiInUnitaBase } from './unita';
import { residuoUtilizzabile, serveControllo } from './pantry';
import { confezioniNecessarie } from './confezioni';
import { righeEffettive } from './opzioni';
import { fattoreConsumo } from './pronti';
// Unica eccezione al divieto di importare da ./aree: qui serve solo l'elenco
// canonico delle sei aree per validare l'input, non nomi né colori.
import { ORDINE_AREE_DEFAULT } from './aree';

export class IngredienteMancanteError extends Error {
  constructor(id: string) {
    super(`Un piatto cita l'ingrediente ${id}, che non esiste nel repertorio.`);
    this.name = 'IngredienteMancanteError';
  }
}

export class OrdineAreeNonValidoError extends Error {
  constructor(ordine: readonly AreaId[]) {
    super(
      `impostazioni.ordineAree deve contenere esattamente le sei aree ` +
      `(${ORDINE_AREE_DEFAULT.join(', ')}) senza duplicati né mancanze; ` +
      `ricevuto: [${ordine.join(', ')}].`,
    );
    this.name = 'OrdineAreeNonValidoError';
  }
}

export interface VoceLista {
  ingredientId: string;
  nome: string;
  area: AreaId;
  unita: UnitaBase;
  /** Somma delle porzioni degli slot a casa, in unita. */
  fabbisogno: number;
  /** Quanto c'è già in casa, derivato. */
  residuo: number;
  daComprare: number;
  confezioni: number;
  /** confezioni × formatoConfezione */
  quantitaTotale: number;
  /** residuo + quantitaTotale − fabbisogno: il residuo iniziale della settimana dopo. */
  residuoPrevisto: number;
  /** Il sottotitolo "serve X · in casa Y" si mostra solo quando è true. */
  mostraDettaglio: boolean;
}

export interface VoceControllo {
  ingredientId: string;
  nome: string;
  area: AreaId;
  /** Confezione da comprare se l'utente risponde "no". */
  formatoConfezione: number;
  unita: UnitaBase;
}

export interface SezioneLista {
  area: AreaId;
  voci: VoceLista[];
  controlli: VoceControllo[];
}

export interface ListaRisultato {
  base: SezioneLista[];
  topup: SezioneLista[];
}

export interface ListaInput {
  slots: MealSlot[];
  dishes: Dish[];
  ingredients: Ingredient[];
  pantry: PantryState[];
  impostazioni: Impostazioni;
  /** ISO yyyy-mm-dd */
  oggi: string;
}

/**
 * Funzione pura: niente rete, niente LLM, niente DB.
 * Segue alla lettera le nove regole della sezione "Regole di list-builder"
 * della spec, con la regola 7 sostituita dai 90 giorni fissi.
 */
export function costruisciLista(input: ListaInput): ListaRisultato {
  const { slots, dishes, ingredients, pantry, impostazioni, oggi } = input;

  validaOrdineAree(impostazioni.ordineAree);

  const perId = new Map(ingredients.map((i) => [i.id, i]));
  const piattoPerId = new Map(dishes.map((d) => [d.id, d]));
  const dispensaPerId = new Map(pantry.map((p) => [p.ingredientId, p]));

  // Regole 1-3: solo gli slot a casa, espansi in ingredienti e aggregati.
  const fabbisogni = new Map<string, number>();
  for (const slot of slots) {
    const fattore = fattoreConsumo(slot);
    if (fattore === 0 || !slot.dishId) continue;
    const piatto = piattoPerId.get(slot.dishId);
    if (!piatto) continue;
    for (const riga of righeEffettive(piatto, slot.scelte)) {
      const ing = perId.get(riga.ingredientId);
      if (!ing) throw new IngredienteMancanteError(riga.ingredientId);
      const q = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase)
        * impostazioni.moltiplicatorePorzioni * fattore;
      fabbisogni.set(ing.id, (fabbisogni.get(ing.id) ?? 0) + q);
    }
  }

  // Regole 4-6: residuo, confezioni, classe intero.
  const voci: VoceLista[] = [];
  for (const [ingredientId, fabbisogno] of fabbisogni) {
    const ing = perId.get(ingredientId)!;
    if (ing.classeResiduo === 'stima') continue; // regola 7: nessuna aritmetica
    // Non il residuo registrato ma quello ancora davvero in casa: per un
    // deperibile comprato la settimana scorsa non c'è più, a meno che non sia
    // dichiarato in congelatore. Vedi residuoUtilizzabile.
    const statoDispensa = dispensaPerId.get(ingredientId);
    const residuo = residuoUtilizzabile({
      residuo: statoDispensa?.residuo ?? 0,
      deperibile: ing.deperibile,
      area: ing.area,
      ultimoAcquisto: statoDispensa?.ultimoAcquisto ?? null,
      congelato: statoDispensa?.congelato ?? false,
      oggi,
    });
    const { daComprare, confezioni, quantitaTotale } = confezioniNecessarie({
      fabbisogno,
      residuo,
      classeResiduo: ing.classeResiduo as Exclude<ClasseResiduo, 'stima'>, // regola 7: 'stima' esclusa sopra
      formatoConfezione: ing.formatoConfezione,
    });
    if (confezioni === 0) continue; // il residuo copre già tutto
    voci.push({
      ingredientId, nome: ing.nome, area: ing.area, unita: ing.unitaBase,
      fabbisogno, residuo, daComprare, confezioni, quantitaTotale,
      residuoPrevisto: residuo + quantitaTotale - fabbisogno,
      mostraDettaglio: ing.classeResiduo === 'porzionabile',
    });
  }

  // Regola 7: controlli sugli staple, indipendenti dal piano della settimana.
  const controlli: VoceControllo[] = [];
  for (const ing of ingredients) {
    if (ing.classeResiduo !== 'stima') continue;
    const p = dispensaPerId.get(ing.id);
    if (!p) continue;
    if (!serveControllo({ ultimoAcquisto: p.ultimoAcquisto, ultimoCheck: p.ultimoCheck, oggi })) {
      continue;
    }
    controlli.push({
      ingredientId: ing.id, nome: ing.nome, area: ing.area,
      formatoConfezione: ing.formatoConfezione, unita: ing.unitaBase,
    });
  }

  // Regole 8-9: split per deperibilità, sezioni nell'ordine dei reparti.
  const deperibile = (id: string) => perId.get(id)!.deperibile;
  return {
    base: sezioni(
      voci.filter((v) => !deperibile(v.ingredientId)),
      controlli.filter((c) => !deperibile(c.ingredientId)),
      impostazioni.ordineAree,
    ),
    topup: sezioni(
      voci.filter((v) => deperibile(v.ingredientId)),
      controlli.filter((c) => deperibile(c.ingredientId)),
      impostazioni.ordineAree,
    ),
  };
}

/**
 * L'ordine deve essere una permutazione esatta delle sei aree note: sei
 * elementi, tutti distinti, nessuno mancante, nessuno sconosciuto. Senza
 * questo controllo un'area assente sparisce in silenzio da `sezioni()`,
 * chiamata due volte più sotto — per questo si valida una volta sola qui,
 * all'ingresso.
 */
function validaOrdineAree(ordine: AreaId[]): void {
  const attese = new Set(ORDINE_AREE_DEFAULT);
  const ricevute = new Set(ordine);
  const valido =
    ordine.length === ORDINE_AREE_DEFAULT.length &&
    ricevute.size === ordine.length &&
    ordine.every((area) => attese.has(area));
  if (!valido) throw new OrdineAreeNonValidoError(ordine);
}

function sezioni(voci: VoceLista[], controlli: VoceControllo[], ordine: AreaId[]): SezioneLista[] {
  const out: SezioneLista[] = [];
  for (const area of ordine) {
    const v = voci
      .filter((x) => x.area === area)
      .sort((a, b) => b.confezioni - a.confezioni || a.nome.localeCompare(b.nome, 'it'));
    const c = controlli
      .filter((x) => x.area === area)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    if (v.length === 0 && c.length === 0) continue; // niente sezioni vuote
    out.push({ area, voci: v, controlli: c });
  }
  return out;
}
