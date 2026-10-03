import type { MealSlot, MealSlotDef } from './types';

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
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
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
