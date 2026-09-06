import type {
  Dish, Impostazioni, Ingredient, MealSlot, PantryState, Scelta, UnitaBase,
} from './types';
import { consumoSlot } from './storno';
import { residuoUtilizzabile } from './pantry';

export interface ConflittoResiduo {
  ingredientId: string;
  nome: string;
  unita: UnitaBase;
  /** In `unita`, sempre > 0. */
  mancante: number;
  /** Gli altri slot della settimana, da oggi in poi, che consumano l'ingrediente: resteranno senza. */
  pastiDopo: { data: string; slotDefId: string }[];
}

export interface ConflittiSostituzioneInput {
  /** Lo slot che si sta sostituendo, com'è ora (piatto e scelte attuali, stato, daPronti, porzioniPreparate). */
  slot: MealSlot;
  candidato: Dish;
  /** Le scelte correnti in Scegli per i componenti del candidato. */
  scelte: Record<string, Scelta>;
  slots: MealSlot[];
  dishes: Dish[];
  ingredients: Ingredient[];
  pantry: PantryState[];
  impostazioni: Pick<Impostazioni, 'moltiplicatorePorzioni'>;
  statoSettimana: 'bozza' | 'confermata' | 'chiusa';
  /** Base + top-up, tutte le voci, qualunque origine e spunta. */
  vociLista: { ingredientId: string; quantitaTotale: number }[];
  /** ISO yyyy-mm-dd */
  oggi: string;
}

/**
 * Sotto questa soglia un mancante non è un mancante: somme di quantità in
 * virgola mobile (0.1 + 0.1 + 0.1) sforano il totale della lista di 1e-17 e
 * segnalarle sarebbe un avviso su niente.
 */
const TOLLERANZA = 1e-9;

/**
 * Cosa resterà scoperto se lo slot monta il candidato (spec scadenza-fresco
 * §1.3). Il buco che mostra: `allineaTopUp` aggiunge al top-up solo gli
 * ingredienti non ancora in lista, quindi un fabbisogno che cresce su un
 * ingrediente già in lista non lo compra nessuno — e a settimana chiusa lo
 * storno clampa a zero e il mancante sparisce senza traccia.
 *
 * - bozza: niente, mai — la lista nascerà dal piano com'è dopo la sostituzione.
 * - ingrediente non in lista: niente — `allineaTopUp` lo aggiungerà.
 * - confermata: la lista copre tutta la settimana, quindi si confronta il
 *   fabbisogno di TUTTI gli slot (anche i passati: comprati e mangiati) con
 *   residuo utilizzabile + lista.
 * - chiusa: il residuo è già al netto della settimana; lo storno restituirà il
 *   piatto attuale e addebiterà il candidato, quindi si confrontano solo i due.
 *
 * `consumoSlot` è l'unica aritmetica del consumo: nessuna seconda formula.
 * Uno slot con una scelta che punta a un'opzione rimossa (o un piatto sparito
 * dal repertorio) si salta nelle somme, come fa `descriviScelte`: un avviso
 * non è il posto dove esplodere. Se invece è il candidato a rompersi l'errore
 * propaga, perché è l'input di Scegli a essere sbagliato.
 */
export function conflittiSostituzione(i: ConflittiSostituzioneInput): ConflittoResiduo[] {
  if (i.statoSettimana === 'bozza') return [];

  const moltiplicatorePorzioni = i.impostazioni.moltiplicatorePorzioni;
  const ingredientePerId = new Map(i.ingredients.map((x) => [x.id, x]));
  const dishPerId = new Map(i.dishes.map((d) => [d.id, d]));
  const dispensaPerId = new Map(i.pantry.map((p) => [p.ingredientId, p]));

  // Stato, daPronti e porzioniPreparate restano quelli dello slot: cambia solo
  // cosa si cucina, non se e quanto (spec §1.3).
  const slotCandidato: MealSlot = { ...i.slot, dishId: i.candidato.id, scelte: i.scelte };
  const consumoCandidato = consumoSlot({
    slot: slotCandidato, dish: i.candidato, ingredients: i.ingredients, moltiplicatorePorzioni,
  });
  if (consumoCandidato.size === 0) return [];

  const inLista = new Map<string, number>();
  for (const v of i.vociLista) {
    inLista.set(v.ingredientId, (inLista.get(v.ingredientId) ?? 0) + v.quantitaTotale);
  }

  const consumoTollerante = (slot: MealSlot): Map<string, number> | null => {
    try {
      return consumoSlot({
        slot,
        dish: slot.dishId === null ? null : dishPerId.get(slot.dishId) ?? null,
        ingredients: i.ingredients,
        moltiplicatorePorzioni,
      });
    } catch {
      return null;
    }
  };

  const altri = i.slots
    .filter((s) => s.id !== i.slot.id)
    .flatMap((s) => {
      const consumo = consumoTollerante(s);
      return consumo === null ? [] : [{ slot: s, consumo }];
    });
  // Il piatto attuale, per lo storno a settimana chiusa. Se le sue scelte sono
  // rotte non c'è consumo da restituire: vale 0, come uno slot saltato.
  const consumoAttuale = consumoTollerante(i.slot) ?? new Map<string, number>();

  const conflitti: ConflittoResiduo[] = [];
  for (const [ingredientId, fabbisognoCandidato] of consumoCandidato) {
    const quantitaInLista = inLista.get(ingredientId);
    if (quantitaInLista === undefined) continue;
    const ing = ingredientePerId.get(ingredientId)!; // consumoSlot esplode se manca dal repertorio

    const stato = dispensaPerId.get(ingredientId);
    const residuo = residuoUtilizzabile({
      residuo: stato?.residuo ?? 0,
      deperibile: ing.deperibile,
      area: ing.area,
      ultimoAcquisto: stato?.ultimoAcquisto ?? null,
      congelato: stato?.congelato ?? false,
      oggi: i.oggi,
    });

    let disponibile: number;
    let fabbisogno: number;
    if (i.statoSettimana === 'confermata') {
      disponibile = residuo + quantitaInLista;
      fabbisogno = fabbisognoCandidato;
      for (const a of altri) fabbisogno += a.consumo.get(ingredientId) ?? 0;
    } else {
      disponibile = residuo + (consumoAttuale.get(ingredientId) ?? 0);
      fabbisogno = fabbisognoCandidato;
    }

    const mancante = fabbisogno - disponibile;
    if (mancante <= TOLLERANZA) continue;

    const pastiDopo = altri
      .filter((a) => a.slot.data >= i.oggi && (a.consumo.get(ingredientId) ?? 0) > 0)
      .map((a) => ({ data: a.slot.data, slotDefId: a.slot.slotDefId }))
      .sort((a, b) => a.data.localeCompare(b.data) || a.slotDefId.localeCompare(b.slotDefId));

    conflitti.push({ ingredientId, nome: ing.nome, unita: ing.unitaBase, mancante, pastiDopo });
  }

  return conflitti.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}
