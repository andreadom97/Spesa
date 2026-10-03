import type { Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, PantryState, Scelta } from './types';
import type { AvvisoScadenza } from './scadenza';
import { giorniTra, sommaGiorni } from './date';
import { residuoUtilizzabile } from './pantry';
import { righeEffettive } from './opzioni';
import { consumoSlot } from './storno';
import { convertiInUnitaBase } from './unita';
import { fattoreConsumo, porzioniUtilizzabili } from './pronti';
import { trovaIcona, type ChiaveIcona } from './icone-ingredienti';

/**
 * La home «Oggi» (spec 2026-10-03-oggi-design.md). Funzioni pure: niente rete, niente DB,
 * niente orologio di sistema (l'ora entra come argomento).
 */

/** Data e minuti dalla mezzanotte, entrambi dall'orologio locale (spec §B.1). */
export function oggiLocale(adesso: Date): { data: string; minuti: number } {
  const anno = adesso.getFullYear();
  const mese = String(adesso.getMonth() + 1).padStart(2, '0');
  const giorno = String(adesso.getDate()).padStart(2, '0');
  return { data: `${anno}-${mese}-${giorno}`, minuti: adesso.getHours() * 60 + adesso.getMinutes() };
}

/** Una fascia del giorno in minuti dalla mezzanotte; la fine è esclusa. */
export interface Fascia { inizio: number; fine: number }

const ORA = (h: number, m = 0) => h * 60 + m;
const FINE_GIORNO = ORA(24);

const FASCE = {
  colazione: { inizio: 0, fine: ORA(10, 30) },
  spuntinoMattina: { inizio: ORA(10, 30), fine: ORA(12) },
  pranzo: { inizio: ORA(12), fine: ORA(15) },
  spuntinoPomeriggio: { inizio: ORA(15), fine: ORA(18) },
  cena: { inizio: ORA(18), fine: ORA(21, 30) },
  dopocena: { inizio: ORA(21, 30), fine: FINE_GIORNO },
} as const satisfies Record<string, Fascia>;

type TipoNoto = keyof typeof FASCE;

/** Minuscolo, senza accenti e senza spazi: «Dopo cena» e «Dopocena» si leggono uguali. */
function normalizza(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

/** Il tipo dal nome; `dopocena` prima di `cena`, che è contenuto nell'altro. */
function tipoDi(nome: string): TipoNoto | 'spuntino' | null {
  const n = normalizza(nome);
  if (n.includes('colazione')) return 'colazione';
  if (n.includes('dopocena')) return 'dopocena';
  if (n.includes('pranzo')) return 'pranzo';
  if (n.includes('cena')) return 'cena';
  if (n.includes('spuntino') || n.includes('merenda')) {
    if (n.includes('mattin')) return 'spuntinoMattina';
    if (n.includes('pomerig')) return 'spuntinoPomeriggio';
    return 'spuntino';
  }
  return null;
}

const perPosizione = (a: MealSlotDef, b: MealSlotDef) => a.posizione - b.posizione;

/**
 * La fascia di ogni pasto (spec §B.2). Uno spuntino senza «mattina» o «pomeriggio» si decide
 * dalla posizione rispetto al pranzo (senza pranzo: mattina). Un nome sconosciuto inizia dove
 * finisce il pasto riconosciuto prima e finisce dove inizia quello riconosciuto dopo.
 */
export function fasceDi(defs: MealSlotDef[]): Map<string, Fascia> {
  const ordinati = [...defs].sort(perPosizione);
  const tipi = ordinati.map((d) => tipoDi(d.nome));
  const indicePranzo = tipi.indexOf('pranzo');
  const note: (Fascia | null)[] = tipi.map((t, i) => {
    if (t === null) return null;
    if (t === 'spuntino') {
      return indicePranzo >= 0 && i > indicePranzo ? FASCE.spuntinoPomeriggio : FASCE.spuntinoMattina;
    }
    return FASCE[t];
  });
  const fasce = new Map<string, Fascia>();
  ordinati.forEach((d, i) => {
    const nota = note[i];
    if (nota) {
      fasce.set(d.id, { inizio: nota.inizio, fine: nota.fine });
      return;
    }
    let inizio = 0;
    for (let j = i - 1; j >= 0; j--) {
      const f = note[j];
      if (f) { inizio = f.fine; break; }
    }
    let fine = FINE_GIORNO;
    for (let j = i + 1; j < ordinati.length; j++) {
      const f = note[j];
      if (f) { fine = f.inizio; break; }
    }
    fasce.set(d.id, { inizio, fine: Math.max(inizio, fine) });
  });
  return fasce;
}

export interface PastoScelto { slot: MealSlot; giorno: 'oggi' | 'domani' }

export type Prossimo =
  | ({ tipo: 'pasto' } & PastoScelto)
  | { tipo: 'domaniNonCreato' }
  | { tipo: 'nessuno' };

/** Da poster: a casa e con un piatto (decisione 10 della spec). */
function daPoster(s: MealSlot): boolean {
  return s.stato === 'casa' && s.dishId !== null;
}

function ordinaSlot(slots: MealSlot[], defs: MealSlotDef[]): MealSlot[] {
  const pos = new Map(defs.map((d) => [d.id, d.posizione]));
  return [...slots].sort((a, b) => (pos.get(a.slotDefId) ?? 0) - (pos.get(b.slotDefId) ?? 0));
}

/**
 * Il pasto del poster (spec §B.1): il primo di oggi, in ordine di posizione, a casa, con un
 * piatto e con la fascia non ancora finita; se oggi non ce n'è più, il primo di domani.
 * `slotsDomani` null = la settimana di domani non esiste ancora.
 */
export function prossimoPasto(i: {
  slotsOggi: MealSlot[]; slotsDomani: MealSlot[] | null; defs: MealSlotDef[]; minuti: number;
}): Prossimo {
  const fasce = fasceDi(i.defs);
  for (const s of ordinaSlot(i.slotsOggi, i.defs)) {
    const f = fasce.get(s.slotDefId);
    if (f && f.fine > i.minuti && daPoster(s)) return { tipo: 'pasto', slot: s, giorno: 'oggi' };
  }
  if (i.slotsDomani === null) return { tipo: 'domaniNonCreato' };
  for (const s of ordinaSlot(i.slotsDomani, i.defs)) {
    if (daPoster(s)) return { tipo: 'pasto', slot: s, giorno: 'domani' };
  }
  return { tipo: 'nessuno' };
}

/**
 * Il pasto che viene dopo `dopo` con la stessa regola (spec §D.4): più avanti nello stesso
 * giorno, poi il primo di domani. Da un pasto di domani non si va a dopodomani.
 */
export function pastoDopo(i: {
  dopo: PastoScelto; slotsOggi: MealSlot[]; slotsDomani: MealSlot[] | null; defs: MealSlotDef[];
}): PastoScelto | null {
  const pos = new Map(i.defs.map((d) => [d.id, d.posizione]));
  const posDopo = pos.get(i.dopo.slot.slotDefId) ?? 0;
  const stessoGiorno = i.dopo.giorno === 'oggi' ? i.slotsOggi : (i.slotsDomani ?? []);
  for (const s of ordinaSlot(stessoGiorno, i.defs)) {
    if ((pos.get(s.slotDefId) ?? 0) > posDopo && daPoster(s)) return { slot: s, giorno: i.dopo.giorno };
  }
  if (i.dopo.giorno === 'domani' || i.slotsDomani === null) return null;
  for (const s of ordinaSlot(i.slotsDomani, i.defs)) {
    if (daPoster(s)) return { slot: s, giorno: 'domani' };
  }
  return null;
}

export type StatoCasella = 'passata' | 'poster' | 'futura' | 'fuori';

/**
 * Una casella per pasto della casa (spec §B.3). Precedenza: poster, poi fuori/saltato/
 * sostituito, poi fascia finita, poi futuro. `minuti` null = il giorno è domani.
 */
export function caselleGiornata(i: {
  slots: MealSlot[]; defs: MealSlotDef[]; minuti: number | null; slotPosterId: string;
}): { slotDefId: string; stato: StatoCasella }[] {
  const fasce = fasceDi(i.defs);
  return [...i.defs].sort(perPosizione).map((d) => {
    const s = i.slots.find((x) => x.slotDefId === d.id);
    let stato: StatoCasella = 'futura';
    if (s && s.id === i.slotPosterId) stato = 'poster';
    else if (s && s.stato !== 'casa') stato = 'fuori';
    else if (i.minuti !== null && (fasce.get(d.id)?.fine ?? FINE_GIORNO) <= i.minuti) stato = 'passata';
    return { slotDefId: d.id, stato };
  });
}

/** Spec §E: la dispensa conta solo se l'ultima spesa chiusa nell'app è di 9 giorni fa al massimo. */
export const GIORNI_DISPENSA_AGGIORNATA = 9;

export function dispensaAggiornata(ultimaChiusura: string | null, oggi: string): boolean {
  if (ultimaChiusura === null) return false;
  return giorniTra(ultimaChiusura, oggi) <= GIORNI_DISPENSA_AGGIORNATA;
}

/**
 * L'ingrediente che dà l'icona a un piatto (spec §C.4): la riga più grande in g o ml fra quelle
 * con un'icona; a pari quantità la prima; senza righe in g o ml, la prima con un'icona. Classe
 * stima e righe q.b. non concorrono.
 */
export function ingredientePrincipale(
  dish: Dish, ingredients: Ingredient[], scelte: Record<string, Scelta> = {},
): { ingrediente: Ingredient; icona: ChiaveIcona } | null {
  const perId = new Map(ingredients.map((x) => [x.id, x]));
  let piuGrande: { ingrediente: Ingredient; icona: ChiaveIcona; q: number } | null = null;
  let primo: { ingrediente: Ingredient; icona: ChiaveIcona } | null = null;
  try {
    for (const riga of righeEffettive(dish, scelte)) {
      const ingrediente = perId.get(riga.ingredientId);
      if (!ingrediente || ingrediente.classeResiduo === 'stima' || riga.quantita === null) continue;
      const icona = trovaIcona(ingrediente.nome);
      if (!icona) continue;
      primo ??= { ingrediente, icona };
      if (ingrediente.unitaBase === 'pz') continue;
      const q = convertiInUnitaBase(riga.quantita, riga.unita, ingrediente.unitaBase);
      if (!piuGrande || q > piuGrande.q) piuGrande = { ingrediente, icona, q };
    }
  } catch {
    // L'icona è decorativa: un piatto che non si legge (unità incompatibile, opzione rimossa)
    // resta senza, e la home non si rompe.
    return null;
  }
  return piuGrande ? { ingrediente: piuGrande.ingrediente, icona: piuGrande.icona } : primo;
}

export type StatoAlternativa = { tipo: 'tutto' } | { tipo: 'manca'; ingrediente: Ingredient };
export interface Alternativa { dish: Dish; stato: StatoAlternativa }

export interface AlternativeInput {
  /** Il pasto del poster, di oggi, a casa, non dai Pronti e senza porzioni da preparare (chi chiama lo garantisce). */
  slot: MealSlot;
  statoSettimana: 'bozza' | 'confermata' | 'chiusa';
  /** Gli slot della settimana: servono a escludere i piatti già in programma. */
  slotsSettimana: MealSlot[];
  dishes: Dish[];
  ingredients: Ingredient[];
  pantry: PantryState[];
  /** `moltiplicatorePorzioni` delle impostazioni. */
  persone: number;
  oggi: string;
  /** Gli ingredienti che scadono entro due giorni (§D.1): fanno salire una proposta. */
  inScadenza: ReadonlySet<string>;
}

export const MAX_ALTERNATIVE = 2;

/**
 * I piatti «con quello che hai» (spec §C.2–§C.5). Disponibile = residuo utilizzabile, più
 * quello che il pasto di stasera libera se la settimana è chiusa: dopo la chiusura il residuo è
 * già al netto del piano, stasera compresa, e lo storno di aggiornaSlot lo riaccredita.
 */
export function alternative(i: AlternativeInput): Alternativa[] {
  const perId = new Map(i.ingredients.map((x) => [x.id, x]));
  const dispensaPerId = new Map(i.pantry.map((x) => [x.ingredientId, x]));
  const attuale = i.dishes.find((d) => d.id === i.slot.dishId) ?? null;
  let liberato = new Map<string, number>();
  if (i.statoSettimana === 'chiusa') {
    try {
      liberato = consumoSlot({ slot: i.slot, dish: attuale, ingredients: i.ingredients, moltiplicatorePorzioni: i.persone });
    } catch {
      // Il piatto di stasera non si legge: non si libera niente. Meno proposte, mai un falso
      // «tutto in casa».
    }
  }
  const disponibile = (ing: Ingredient): number => {
    const riga = dispensaPerId.get(ing.id);
    const residuo = riga
      ? residuoUtilizzabile({
        residuo: riga.residuo, deperibile: ing.deperibile, area: ing.area,
        ultimoAcquisto: riga.ultimoAcquisto, congelato: riga.congelato,
        scadenzaManuale: riga.scadenzaManuale ?? null, oggi: i.oggi,
      })
      : 0;
    return residuo + (liberato.get(ing.id) ?? 0);
  };
  const inProgramma = new Set(
    i.slotsSettimana
      .filter((s) => s.data >= i.oggi && s.stato === 'casa' && s.dishId !== null)
      .map((s) => s.dishId as string),
  );
  // Il fabbisogno è quantità × persone, senza le porzioni da preparare dello slot: lo scambio non le
  // eredita (aggiornaSlot le azzera col cambio di piatto), e la pagina non propone niente su uno slot
  // che ne ha. Per `liberato` vale invece il consumo vero dello slot, porzioni comprese.
  const trovate: (Alternativa & { usaScadenza: boolean })[] = [];
  for (const dish of i.dishes) {
    if (!dish.attivo || dish.slotDefId !== i.slot.slotDefId) continue;
    if (dish.id === i.slot.dishId || inProgramma.has(dish.id)) continue;
    const fabbisogno = new Map<string, number>();
    const quantoBasta = new Set<string>();
    let leggibile = true;
    try {
      for (const riga of righeEffettive(dish, {})) {
        const ingrediente = perId.get(riga.ingredientId);
        if (!ingrediente) { leggibile = false; break; }
        if (ingrediente.classeResiduo === 'stima') continue;
        if (riga.quantita === null) { quantoBasta.add(ingrediente.id); continue; }
        const q = convertiInUnitaBase(riga.quantita, riga.unita, ingrediente.unitaBase) * i.persone;
        fabbisogno.set(ingrediente.id, (fabbisogno.get(ingrediente.id) ?? 0) + q);
      }
    } catch {
      // Un piatto che non si legge (unità incompatibile, opzione rimossa) non si propone.
      leggibile = false;
    }
    if (!leggibile) continue;
    const scoperti: Ingredient[] = [];
    for (const [id, q] of fabbisogno) {
      const ingrediente = perId.get(id) as Ingredient;
      if (disponibile(ingrediente) < q) scoperti.push(ingrediente);
    }
    for (const id of quantoBasta) {
      if (fabbisogno.has(id)) continue;
      const ingrediente = perId.get(id) as Ingredient;
      if (disponibile(ingrediente) <= 0) scoperti.push(ingrediente);
    }
    if (scoperti.length > 1) continue;
    const usaScadenza = [...fabbisogno.keys(), ...quantoBasta].some((id) => i.inScadenza.has(id));
    trovate.push({
      dish,
      stato: scoperti.length === 0 ? { tipo: 'tutto' } : { tipo: 'manca', ingrediente: scoperti[0] },
      usaScadenza,
    });
  }
  const rango = (a: Alternativa) => (a.stato.tipo === 'tutto' ? 0 : 1);
  trovate.sort((a, b) =>
    rango(a) - rango(b)
    || Number(b.usaScadenza) - Number(a.usaScadenza)
    || a.dish.nome.localeCompare(b.dish.nome, 'it'));
  return trovate.slice(0, MAX_ALTERNATIVE).map(({ dish, stato }) => ({ dish, stato }));
}

export const GIORNI_SCADE_PRESTO = 2;
export const MAX_PER_GRUPPO = 2;

/** Gli ingredienti degli avvisi che scadono entro oggi + 2 (spec §D.1, §C.5). */
export function inScadenzaEntro(avvisi: AvvisoScadenza[], oggi: string): Set<string> {
  return new Set(avvisi.filter((a) => giorniTra(oggi, a.scadenza) <= GIORNI_SCADE_PRESTO).map((a) => a.ingredientId));
}

export interface ScadePresto { ingrediente: Ingredient; scadenza: string; uso: { data: string; slotDefId: string } | null }
export type DaScongelare =
  | { tipo: 'ingrediente'; ingrediente: Ingredient; slotDefId: string }
  | { tipo: 'lotto'; lotto: LottoPronto; dish: Dish; slotDefId: string };
export interface ProntiPiatto { dish: Dish; libere: number; congelato: boolean; lottoDaAprire: LottoPronto }
export interface DaFare { scade: ScadePresto[]; scongela: DaScongelare[]; pronti: ProntiPiatto[] }

/** Gli ingredienti che le righe effettive di uno slot usano; vuoto se il piatto non si legge. */
function ingredientiDelloSlot(slot: MealSlot, dishPerId: Map<string, Dish>): Set<string> {
  const dish = slot.dishId ? dishPerId.get(slot.dishId) : undefined;
  if (!dish) return new Set();
  try {
    return new Set(righeEffettive(dish, slot.scelte).map((r) => r.ingredientId));
  } catch {
    // Come per l'icona e le alternative: un piatto che non si legge non rompe la home.
    return new Set();
  }
}

function ordinaPerDataEPosizione(slots: MealSlot[], defs: MealSlotDef[]): MealSlot[] {
  const pos = new Map(defs.map((d) => [d.id, d.posizione]));
  return [...slots].sort((a, b) => a.data.localeCompare(b.data) || (pos.get(a.slotDefId) ?? 0) - (pos.get(b.slotDefId) ?? 0));
}

/**
 * Le tessere della griglia che vengono dalla dispensa (spec §D.1–§D.3). Chi chiama le mostra
 * solo con la dispensa aggiornata.
 */
export function daFare(i: {
  avvisi: AvvisoScadenza[]; slots: MealSlot[]; defs: MealSlotDef[]; dishes: Dish[];
  ingredients: Ingredient[]; pantry: PantryState[]; lotti: LottoPronto[]; oggi: string; minuti: number;
}): DaFare {
  const dishPerId = new Map(i.dishes.map((d) => [d.id, d]));
  const ingPerId = new Map(i.ingredients.map((x) => [x.id, x]));
  const fasce = fasceDi(i.defs);
  const domani = sommaGiorni(i.oggi, 1);
  const ordinati = ordinaPerDataEPosizione(i.slots, i.defs);

  // §D.1 — un uso «in tempo» è un pasto che consuma, da adesso alla scadenza compresa.
  const ancoraDaMangiare = (s: MealSlot) =>
    s.data > i.oggi || (s.data === i.oggi && (fasce.get(s.slotDefId)?.fine ?? 0) > i.minuti);
  const scade: ScadePresto[] = i.avvisi
    .filter((a) => giorniTra(i.oggi, a.scadenza) <= GIORNI_SCADE_PRESTO && ingPerId.has(a.ingredientId))
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza) || a.nome.localeCompare(b.nome, 'it'))
    .slice(0, MAX_PER_GRUPPO)
    .map((a) => {
      const pasto = ordinati.find((s) =>
        s.data <= a.scadenza && ancoraDaMangiare(s) && fattoreConsumo(s) > 0
        && ingredientiDelloSlot(s, dishPerId).has(a.ingredientId));
      return {
        ingrediente: ingPerId.get(a.ingredientId) as Ingredient,
        scadenza: a.scadenza,
        uso: pasto ? { data: pasto.data, slotDefId: pasto.slotDefId } : null,
      };
    });

  // §D.2 — domani: i lotti congelati dei pasti dai Pronti, poi gli ingredienti in congelatore.
  const slotsDomani = ordinati.filter((s) => s.data === domani && s.stato === 'casa' && s.dishId !== null);
  const scongela: DaScongelare[] = [];
  const lottiVisti = new Set<string>();
  for (const s of slotsDomani) {
    if (!s.daPronti) continue;
    const dish = dishPerId.get(s.dishId as string);
    const lottoCongelato = i.lotti
      .filter((l) => l.dishId === s.dishId && l.congelato && porzioniUtilizzabili(l, i.oggi) > 0)
      .sort((a, b) => a.preparataIl.localeCompare(b.preparataIl))[0];
    // Due pasti di domani dallo stesso piatto pescano dallo stesso lotto: una tessera sola.
    if (!dish || !lottoCongelato || lottiVisti.has(lottoCongelato.id)) continue;
    lottiVisti.add(lottoCongelato.id);
    scongela.push({ tipo: 'lotto', lotto: lottoCongelato, dish, slotDefId: s.slotDefId });
  }
  const giaVisti = new Set<string>();
  for (const s of slotsDomani) {
    if (s.daPronti) continue;
    for (const id of ingredientiDelloSlot(s, dishPerId)) {
      const riga = i.pantry.find((p) => p.ingredientId === id);
      const ingrediente = ingPerId.get(id);
      if (!riga?.congelato || !ingrediente || giaVisti.has(id)) continue;
      giaVisti.add(id);
      scongela.push({ tipo: 'ingrediente', ingrediente, slotDefId: s.slotDefId });
    }
  }

  // §D.3 — per piatto: utilizzabili meno gli impegni dei pasti dai Pronti da oggi in poi.
  const impegni = new Map<string, number>();
  for (const s of i.slots) {
    if (!s.daPronti || s.dishId === null || s.data < i.oggi) continue;
    impegni.set(s.dishId, (impegni.get(s.dishId) ?? 0) + 1);
  }
  const viviPerPiatto = new Map<string, LottoPronto[]>();
  for (const l of i.lotti) {
    if (porzioniUtilizzabili(l, i.oggi) <= 0) continue;
    viviPerPiatto.set(l.dishId, [...(viviPerPiatto.get(l.dishId) ?? []), l]);
  }
  const pronti: ProntiPiatto[] = [];
  for (const [dishId, vivi] of viviPerPiatto) {
    const dish = dishPerId.get(dishId);
    if (!dish) continue;
    const libere = vivi.reduce((n, l) => n + porzioniUtilizzabili(l, i.oggi), 0) - (impegni.get(dishId) ?? 0);
    if (libere <= 0) continue;
    const ordinatiPerEta = [...vivi].sort((a, b) => a.preparataIl.localeCompare(b.preparataIl));
    pronti.push({ dish, libere, congelato: vivi.every((l) => l.congelato), lottoDaAprire: ordinatiPerEta[0] });
  }
  pronti.sort((a, b) => a.lottoDaAprire.preparataIl.localeCompare(b.lottoDaAprire.preparataIl));

  return { scade, scongela: scongela.slice(0, MAX_PER_GRUPPO), pronti: pronti.slice(0, MAX_PER_GRUPPO) };
}
