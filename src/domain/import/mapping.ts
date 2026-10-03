import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta, StatoRevisione } from './types';
import { NOME_PASTO_CONDIMENTI, pastoEffettivo, unitaBaseDi } from './types';

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
 */
export function quantoBasta(riga: RigaEstratta): boolean {
  if (riga.quantita !== null && !riga.quantitaInferita) return false;
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
  const esatto = compatibili.find((i) => normalizza(i.nome) === norm);
  if (esatto) return esatto;
  const inclusi = compatibili
    .filter((i) => {
      const n = normalizza(i.nome);
      return n.includes(norm) || norm.includes(n);
    })
    .sort((a, b) => a.nome.length - b.nome.length);
  if (inclusi[0]) return inclusi[0];
  if (unita !== 'g' && unita !== 'pz') return null;
  const altra: UnitaBase = unita === 'g' ? 'pz' : 'g';
  return ingredienti
    .filter((i) => i.unitaBase === altra && normalizza(i.nome) === norm)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
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
export function proponiSlot(nomeOriginale: string, slotDefs: MealSlotDef[]): string | null {
  const norm = normalizza(nomeOriginale.replace(/_/g, ' '));
  if (norm === NOME_PASTO_CONDIMENTI) return null;
  const parole = new Set(norm.split(' '));
  let migliore: { id: string; punteggio: number } | null = null;
  for (const def of slotDefs) {
    const nomeSlot = normalizza(def.nome);
    const paroleSlot = nomeSlot.split(' ');
    const base = paroleSlot[0];
    const famiglia = Object.entries(SINONIMI_SLOT).find(([, sin]) => sin.some((s) => norm.includes(s)));
    const stessaFamiglia = famiglia !== undefined && SINONIMI_SLOT[famiglia[0]].some((s) => base.includes(s) || s.includes(base));
    if (!stessaFamiglia && !norm.includes(base) && !nomeSlot.includes(norm)) continue;
    const punteggio = paroleSlot.filter((p) => parole.has(p)).length + (stessaFamiglia ? 1 : 0);
    if (!migliore || punteggio > migliore.punteggio) migliore = { id: def.id, punteggio };
  }
  return migliore?.id ?? null;
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
 * L'unione deduplicata (per alimento normalizzato) di tutte le righe del piano, correzioni
 * applicate. `alimento` è la chiave normalizzata; `grezzo` è l'alimento com'è scritto nella
 * prima riga che lo porta, con accenti e maiuscole, per il nome da proporre. `unitaViste` sono le
 * unità di tutte le sue righe che ne hanno una, nell'ordine del piano; `unita` è quella che
 * prevale (`unitaPrevalente`): con le righe tutte in un'unità, la stessa di sempre.
 */
export function ingredientiDaAbbinare(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
): { alimento: string; grezzo: string; unita: UnitaBase | null; unitaViste: UnitaBase[] }[] {
  const visti = new Map<string, { alimento: string; grezzo: string; unitaViste: UnitaBase[] }>();
  for (const riga of righeDelPiano(piano, correzioni)) {
    const chiave = normalizza(riga.alimento);
    // `grezzo` resta quello della prima riga: accenti e maiuscole per il nome proposto.
    const voce = visti.get(chiave) ?? { alimento: chiave, grezzo: riga.alimento, unitaViste: [] };
    const unita = unitaDellaRiga(riga);
    if (unita !== null) voce.unitaViste.push(unita);
    visti.set(chiave, voce);
  }
  return [...visti.values()].map((v) => ({ ...v, unita: unitaPrevalente(v.unitaViste) }));
}

/**
 * La mappatura pasti iniziale: uno slot proposto per ogni `nomeOriginale` distinto del piano
 * (chiave normalizzata); i `null` di `proponiSlot` (condimenti, nomi ignoti) restano fuori, li
 * assegna l'utente in Controlla. Spostata qui da page.tsx (spec 8c §E): la usa anche la route.
 */
export function mappaturaPastiIniziale(piano: PianoEstratto, slotDefs: MealSlotDef[]): Record<string, string> {
  const mappa: Record<string, string> = {};
  const visti = new Set<string>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      for (const pasto of giorno.pasti) {
        const chiave = normalizza(pasto.nomeOriginale);
        if (visti.has(chiave)) continue;
        visti.add(chiave);
        const slotId = proponiSlot(pasto.nomeOriginale, slotDefs);
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
