import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { NOME_PASTO_CONDIMENTI, pastoEffettivo, unitaBaseDi } from './types';
import { eSpezia } from './formati-tipici';

export function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * «Quanto basta» (spec 8c §B): una riga il cui testo dice q.b., qb, quanto basta o a piacere, per
 * parole intere, e che non ha una quantità trascritta dal foglio. Vale anche quando il lettore ci
 * ha messo una quantità INFERITA (`quantitaInferita: true`, come chiede il prompt per «q.b.»):
 * quella stima si scarta, quantità e unità (correzione S1 del piano 8c). Una quantità trascritta
 * (`quantitaInferita: false`) vince sempre. È un valore, non un dubbio: non blocca e non si chiede.
 *
 * Sale, pepe, spezie ed erbe (`eSpezia`) sono q.b. anche quando il foglio non lo dice: senza
 * quantità trascritta («Sale», «Cannella se ti va») o con una stima del lettore («Origano» con
 * «1 cucchiaino» inferito) non c'è niente da chiedere (correzione 8c-bis A, prove dal telefono del
 * 03/10: «Spezie: quanto basta è un valore, niente grammatura, non blocca»).
 */
export function quantoBasta(riga: RigaEstratta): boolean {
  if (riga.quantita !== null && !riga.quantitaInferita) return false;
  if (eSpezia(riga.alimento)) return true;
  const parole = ` ${normalizza(riga.testoOriginale).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return [' q b ', ' qb ', ' quanto basta ', ' a piacere '].some((p) => parole.includes(p));
}

/**
 * Due livelli (spec 8c §A.2). Il primo come sempre, a unità compatibile: match esatto sul nome
 * normalizzato, poi per inclusione (in entrambi i versi) preferendo il nome più corto. Niente
 * fuzzy a distanza: un abbinamento sbagliato silenzioso è peggio di un ingrediente doppio.
 * Il secondo, solo se il primo non trova niente: lo stesso nome ESATTO con l'unità diversa fra
 * g e pz → abbinamento con cambio di unità (il nuovo piano prevale, `cambiUnita` in
 * ingredienti.ts). Niente inclusione al secondo livello («Pasta di farro» non cambia l'unità di
 * «Pasta»), niente ml (servirebbe una densità); fra due esistenti dallo stesso nome vince il primo
 * per id.
 */
export function abbina(alimento: string, unita: UnitaBase | null, ingredienti: Ingredient[]): Ingredient | null {
  const norm = normalizza(alimento);
  const compatibili = ingredienti.filter((i) => unita === null || i.unitaBase === unita);
  // Il nome identico prima, poi lo stesso nome al singolare o al plurale (correzione 8c-bis B).
  const esatto = compatibili.find((i) => normalizza(i.nome) === norm) ?? compatibili.find((i) => stessoNome(normalizza(i.nome), norm));
  if (esatto) return esatto;
  const inclusi = compatibili
    .filter((i) => {
      const n = normalizza(i.nome);
      if (n.includes(norm) || norm.includes(n)) return true;
      // Il plurale tollera solo in testa e mai fra una spezia e una non spezia («noci» non è «Noce
      // moscata», «mela» non è «Aceto di mele»): un abbinamento sbagliato silenzioso è peggio di un
      // doppione (spec 8c §A.2, fix round 1 dell'8c-bis).
      if (eSpezia(n) !== eSpezia(norm)) return false;
      return inTestaAlNome(n, norm) || inTestaAlNome(norm, n);
    })
    .sort((a, b) => a.nome.length - b.nome.length);
  if (inclusi[0]) return inclusi[0];
  if (unita !== 'g' && unita !== 'pz') return null;
  const altra: UnitaBase = unita === 'g' ? 'pz' : 'g';
  return ingredienti
    .filter((i) => i.unitaBase === altra && stessoNome(normalizza(i.nome), norm))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
}

/** I plurali possibili di una parola al singolare (già normalizzata): regole regolari dell'italiano. */
function plurali(s: string): string[] {
  if (s.length < 3) return [];
  const radice = s.slice(0, -1);
  if (/[cg]ia$/.test(s)) return [`${s.slice(0, -2)}e`, `${radice}e`]; // arancia → arance, ciliegia → ciliegie
  if (/[cg]a$/.test(s)) return [`${radice}he`]; // pesca → pesche, alga → alghe
  if (s.endsWith('a')) return [`${radice}e`]; // banana → banane
  if (/[cg]o$/.test(s)) return [`${radice}hi`, `${radice}i`]; // fico → fichi, fungo → funghi, asparago → asparagi
  if (s === 'uovo') return ['uova'];
  if (s.endsWith('o') || s.endsWith('e')) return [`${radice}i`]; // pomodoro → pomodori, pesce → pesci
  return [];
}

/**
 * Due parole già normalizzate sono la stessa se uguali o se una è il plurale dell'altra (banana,
 * banane). Sotto le tre lettere solo l'uguaglianza. «pesca» e «pesce» non combaciano: pesche/pesci.
 */
export function stessaParola(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return plurali(a).includes(b) || plurali(b).includes(a);
}

/** Lo stesso nome, parola per parola e nello stesso ordine, ciascuna con `stessaParola`. */
export function stessoNome(a: string, b: string): boolean {
  const pa = a.split(' ');
  const pb = b.split(' ');
  return pa.length === pb.length && pa.every((p, i) => stessaParola(p, pb[i]));
}

/** Le prime parole di `lungo` sono `corto`, parola per parola, al singolare o al plurale. */
function inTestaAlNome(lungo: string, corto: string): boolean {
  const pl = lungo.split(' ');
  const pc = corto.split(' ');
  return pc.length <= pl.length && pc.every((p, j) => stessaParola(pl[j], p));
}

const SINONIMI_SLOT: Record<string, string[]> = {
  colazione: ['colazione'],
  spuntino: ['spuntino', 'merenda', 'break'],
  pranzo: ['pranzo'],
  cena: ['cena'],
};

/**
 * Proposta di slot per il nome pasto della dieta: match per inclusione sul
 * nome slot normalizzato, con i sinonimi comuni. 'condimenti' e i nomi ignoti
 * restano null: li mappa l'utente. In caso di più slot plausibili
 * ("Spuntino mattina" e "Spuntino pomeriggio" per "spuntino_mattina") vince
 * quello il cui nome condivide più parole col nome della dieta.
 */
export function proponiSlot(
  nomeOriginale: string,
  slotDefs: MealSlotDef[],
  posizione: PosizioneNelGiorno | null = null,
): string | null {
  const norm = normalizza(nomeOriginale.replace(/_/g, ' '));
  if (norm === NOME_PASTO_CONDIMENTI) return null;
  // «Dopo cena» e «Dopocena» sono lo stesso nome: il nome compatto uguale vince sopra ogni punteggio
  // (correzione 8c-bis D, prove dal telefono del 03/10).
  // Il nome compatto tiene solo lettere e cifre: «Dopo-cena» e «Dopo_cena» sono «Dopocena».
  const compatto = norm.replace(/[^a-z0-9]/g, '');
  const identico = compatto === '' ? undefined : slotDefs.find((def) => normalizza(def.nome).replace(/[^a-z0-9]/g, '') === compatto);
  if (identico) return identico.id;
  const parole = new Set(norm.split(' '));
  const candidati: { id: string; nome: string; punteggio: number }[] = [];
  for (const def of slotDefs) {
    const nomeSlot = normalizza(def.nome);
    const paroleSlot = nomeSlot.split(' ');
    const base = paroleSlot[0];
    const famiglia = Object.entries(SINONIMI_SLOT).find(([, sin]) => sin.some((s) => norm.includes(s)));
    const stessaFamiglia = famiglia !== undefined && SINONIMI_SLOT[famiglia[0]].some((s) => base.includes(s) || s.includes(base));
    if (!stessaFamiglia && !norm.includes(base) && !nomeSlot.includes(norm)) continue;
    const punteggio = paroleSlot.filter((p) => parole.has(p)).length + (stessaFamiglia ? 1 : 0);
    candidati.push({ id: def.id, nome: nomeSlot, punteggio });
  }
  if (candidati.length === 0) return null;
  const massimo = Math.max(...candidati.map((c) => c.punteggio));
  const pari = candidati.filter((c) => c.punteggio === massimo);
  if (pari.length > 1) {
    // Pari merito fra gli spuntini di mattina e di pomeriggio: la parola chiave, poi l'orario nel
    // nome, poi dove sta il pasto nel giorno del piano; senza niente di questo, il primo (come prima).
    const lato = latoDi(norm) ?? latoDaOrario(norm) ?? (posizione === 'dopo' ? 'pomeriggio' : posizione === 'prima' ? 'mattina' : null);
    const scelto = lato ? pari.find((c) => latoDi(c.nome) === lato) : undefined;
    if (scelto) return scelto.id;
  }
  return pari[0].id;
}

/** Dove sta un pasto rispetto al pranzo, nei giorni del piano in cui compaiono entrambi. */
export type PosizioneNelGiorno = 'prima' | 'dopo';

type LatoSpuntino = 'mattina' | 'pomeriggio';

/** Mattina o pomeriggio dalle parole del nome (già normalizzato); la merenda è del pomeriggio. */
function latoDi(norm: string): LatoSpuntino | null {
  if (/\b(mattina|mattutin\w*)\b/.test(norm)) return 'mattina';
  if (/\b(pomeriggio|pomeridian\w*|merenda)\b/.test(norm)) return 'pomeriggio';
  return null;
}

/** Mattina se l'ora nel nome è prima di mezzogiorno, pomeriggio dopo: «17:30», «17.30», «ore 17», «h 10». */
function latoDaOrario(norm: string): LatoSpuntino | null {
  const ora = /\b(\d{1,2})\s*[:.]\s*\d{2}\b/.exec(norm) ?? /\b(?:ore|h)\s*(\d{1,2})\b/.exec(norm);
  if (!ora) return null;
  return Number(ora[1]) < 12 ? 'mattina' : 'pomeriggio';
}

/** La famiglia di un nome di pasto della dieta (colazione, spuntino, pranzo, cena), o null. */
function famigliaPasto(norm: string): string | null {
  return Object.entries(SINONIMI_SLOT).find(([, sin]) => sin.some((s) => norm.includes(s)))?.[0] ?? null;
}

/**
 * Per ogni nome di pasto di famiglia «spuntino» (chiave normalizzata), se nei giorni del piano
 * viene prima o dopo il pranzo: a maggioranza sui giorni in cui compaiono entrambi, a pari merito
 * niente (vale la regola di prima in `proponiSlot`).
 */
export function posizioniRispettoAlPranzo(piano: PianoEstratto): Map<string, PosizioneNelGiorno> {
  const voti = new Map<string, { prima: number; dopo: number }>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      const nomi = giorno.pasti.map((p) => normalizza(p.nomeOriginale.replace(/_/g, ' ')));
      const pranzo = nomi.findIndex((n) => famigliaPasto(n) === 'pranzo');
      if (pranzo < 0) continue;
      nomi.forEach((n, indice) => {
        if (famigliaPasto(n) !== 'spuntino') return;
        const chiave = normalizza(giorno.pasti[indice].nomeOriginale);
        const voce = voti.get(chiave) ?? { prima: 0, dopo: 0 };
        if (indice > pranzo) voce.dopo += 1;
        else voce.prima += 1;
        voti.set(chiave, voce);
      });
    }
  }
  const posizioni = new Map<string, PosizioneNelGiorno>();
  for (const [chiave, { prima, dopo }] of voti) {
    if (dopo > prima) posizioni.set(chiave, 'dopo');
    else if (prima > dopo) posizioni.set(chiave, 'prima');
  }
  return posizioni;
}

/**
 * La posizione media di ogni nome di pasto (chiave normalizzata) nel giorno del piano: l'indice nel
 * giorno, mediato su tutti i giorni in cui compare. Serve a ordinare i pasti che finiscono nello
 * stesso slot.
 */
export function posizioniMedieNelGiorno(piano: PianoEstratto): Map<string, number> {
  const somme = new Map<string, { somma: number; n: number }>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      giorno.pasti.forEach((pasto, indice) => {
        const chiave = normalizza(pasto.nomeOriginale);
        const voce = somme.get(chiave) ?? { somma: 0, n: 0 };
        voce.somma += indice;
        voce.n += 1;
        somme.set(chiave, voce);
      });
    }
  }
  return new Map([...somme].map(([chiave, { somma, n }]) => [chiave, somma / n]));
}

/**
 * I pasti nell'ordine della casa (correzione 8c-bis D): per `posizione` dello slot assegnato, a
 * pari slot per posizione media nel giorno del piano, quelli senza slot in fondo nell'ordine di
 * prima. Stabile: a parità resta l'ordine di comparsa nel piano.
 */
export function ordinaPastiPerSlot<T extends { chiave: string; slotDefId: string | null }>(
  voci: T[],
  slotDefs: MealSlotDef[],
  posizioniMedie: Map<string, number>,
): T[] {
  const posizioneSlot = new Map(slotDefs.map((s) => [s.id, s.posizione]));
  const conSlot = (v: T) => v.slotDefId !== null && posizioneSlot.has(v.slotDefId);
  return voci
    .map((v, indice) => ({ v, indice }))
    .sort((a, b) => {
      const sa = conSlot(a.v);
      const sb = conSlot(b.v);
      if (sa !== sb) return sa ? -1 : 1;
      if (sa && sb) {
        const dp = (posizioneSlot.get(a.v.slotDefId as string) as number) - (posizioneSlot.get(b.v.slotDefId as string) as number);
        if (dp !== 0) return dp;
        const dm = (posizioniMedie.get(a.v.chiave) ?? 0) - (posizioniMedie.get(b.v.chiave) ?? 0);
        if (dm !== 0) return dm;
      }
      return a.indice - b.indice;
    })
    .map(({ v }) => v);
}

function tutteLeRighe(pasto: PastoEstratto): RigaEstratta[] {
  return pasto.piatti.flatMap((p) => [...p.righeFisse, ...p.componenti.flatMap((c) => c.opzioni.flat())]);
}

/**
 * Tutte le righe del piano, correzioni applicate, nell'ordine stabile del piano: settimane,
 * giorni, pasti, piatti, righe fisse e poi opzioni. È l'ordine dei pari merito (ruling 8c, Task 8).
 */
export function righeDelPiano(piano: PianoEstratto, correzioni: Record<string, PastoEstratto>): RigaEstratta[] {
  const righe: RigaEstratta[] = [];
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      giorno.pasti.forEach((_, indice) => {
        righe.push(...tutteLeRighe(pastoEffettivo(piano, correzioni, settimana.numero, giorno.giorno, indice)));
      });
    }
  }
  return righe;
}

/**
 * L'unità di base che una riga dice dell'ingrediente: i cucchiai valgono come «senza unità», e il
 * q.b. non ne ha, nemmeno quella stimata dal lettore (correzione S1).
 */
export function unitaDellaRiga(riga: RigaEstratta): UnitaBase | null {
  return quantoBasta(riga) ? null : unitaBaseDi(riga.unita);
}

/**
 * L'unità che prevale fra quelle delle righe, nell'ordine del piano (ruling 8c, Task 8): fra g e
 * pz la più frequente, a pari merito la prima; se c'è anche ml, la prima (fra ml e il resto non si
 * converte: come prima dell'8c). Nessuna unità: null.
 */
export function unitaPrevalente(unita: UnitaBase[]): UnitaBase | null {
  if (unita.length === 0) return null;
  if (unita.some((u) => u === 'ml')) return unita[0];
  const g = unita.filter((u) => u === 'g').length;
  const pz = unita.length - g;
  return g === pz ? unita[0] : g > pz ? 'g' : 'pz';
}

/**
 * L'unità che una riga con la quantità trascritta dal foglio dice dell'ingrediente: come
 * `unitaDellaRiga`, ma una quantità proposta dal lettore (`quantitaInferita`) non dice niente
 * (correzione 8c-bis C, prove dal telefono del 03/10: «Sedano» in g, il lettore stima «1 pz»).
 * È l'unica che vota l'unità finale di un ingrediente.
 */
export function unitaTrascritta(riga: RigaEstratta): UnitaBase | null {
  return riga.quantitaInferita ? null : unitaDellaRiga(riga);
}

/**
 * L'unione deduplicata (per alimento normalizzato) di tutte le righe del piano, correzioni
 * applicate. `alimento` è la chiave normalizzata; `grezzo` è l'alimento com'è scritto nella
 * prima riga che lo porta, con accenti e maiuscole, per il nome da proporre. `unitaViste` sono le
 * unità di tutte le sue righe che ne hanno una, nell'ordine del piano, stime del lettore comprese;
 * `unitaTrascritte` solo quelle delle righe con la quantità trascritta (`unitaTrascritta`).
 * `unita` è quella che prevale (`unitaPrevalente`) fra le trascritte: con le righe tutte in
 * un'unità, la stessa di sempre. Se non ce n'è nessuna, prevale fra le stime (correzione 8c-bis C).
 */
export function ingredientiDaAbbinare(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
): { alimento: string; grezzo: string; unita: UnitaBase | null; unitaViste: UnitaBase[]; unitaTrascritte: UnitaBase[] }[] {
  const visti = new Map<string, { alimento: string; grezzo: string; unitaViste: UnitaBase[]; unitaTrascritte: UnitaBase[] }>();
  for (const riga of righeDelPiano(piano, correzioni)) {
    const chiave = normalizza(riga.alimento);
    // `grezzo` resta quello della prima riga: accenti e maiuscole per il nome proposto.
    const voce = visti.get(chiave) ?? { alimento: chiave, grezzo: riga.alimento, unitaViste: [], unitaTrascritte: [] };
    const unita = unitaDellaRiga(riga);
    if (unita !== null) voce.unitaViste.push(unita);
    const trascritta = unitaTrascritta(riga);
    if (trascritta !== null) voce.unitaTrascritte.push(trascritta);
    visti.set(chiave, voce);
  }
  return [...visti.values()].map((v) => ({ ...v, unita: unitaPrevalente(v.unitaTrascritte) ?? unitaPrevalente(v.unitaViste) }));
}

/**
 * La mappatura pasti iniziale: uno slot proposto per ogni `nomeOriginale` distinto del piano
 * (chiave normalizzata); i `null` di `proponiSlot` (condimenti, nomi ignoti) restano fuori, li
 * assegna l'utente in Controlla. Spostata qui da page.tsx (spec 8c §E): la usa anche la route.
 */
export function mappaturaPastiIniziale(piano: PianoEstratto, slotDefs: MealSlotDef[]): Record<string, string> {
  const mappa: Record<string, string> = {};
  const visti = new Set<string>();
  const posizioni = posizioniRispettoAlPranzo(piano);
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      for (const pasto of giorno.pasti) {
        const chiave = normalizza(pasto.nomeOriginale);
        if (visti.has(chiave)) continue;
        visti.add(chiave);
        const slotId = proponiSlot(pasto.nomeOriginale, slotDefs, posizioni.get(chiave) ?? null);
        if (slotId) mappa[chiave] = slotId;
      }
    }
  }
  return mappa;
}

/** Lo stato di revisione di una lettura appena arrivata: Controlla, con la mappatura proposta. */
export function statoRevisioneIniziale(piano: PianoEstratto, slotDefs: MealSlotDef[]): StatoRevisione {
  return { passo: 'revisione', mappaturaPasti: mappaturaPastiIniziale(piano, slotDefs), pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };
}
