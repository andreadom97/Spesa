import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta } from './types';
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
 * L'unione deduplicata (per alimento normalizzato) di tutte le righe del piano, correzioni
 * applicate. `alimento` è la chiave normalizzata; `grezzo` è l'alimento com'è scritto nella
 * prima riga che lo porta, con accenti e maiuscole, per il nome da proporre.
 */
export function ingredientiDaAbbinare(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
): { alimento: string; grezzo: string; unita: UnitaBase | null }[] {
  const visti = new Map<string, { alimento: string; grezzo: string; unita: UnitaBase | null }>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      giorno.pasti.forEach((_, indice) => {
        const pasto = pastoEffettivo(piano, correzioni, settimana.numero, giorno.giorno, indice);
        for (const riga of tutteLeRighe(pasto)) {
          const chiave = normalizza(riga.alimento);
          const esistente = visti.get(chiave);
          // I cucchiai non sono un'unità dell'ingrediente: valgono come «senza unità».
          // Il q.b. non ha unità: nemmeno quella stimata dal lettore (correzione S1).
          const unita = quantoBasta(riga) ? null : unitaBaseDi(riga.unita);
          // Un'unità nota vince su null: la prima riga con grammatura fissa il tipo.
          if (!esistente || (esistente.unita === null && unita !== null)) {
            // `grezzo` resta quello della prima riga: accenti e maiuscole per il nome proposto.
            visti.set(chiave, { alimento: chiave, grezzo: esistente?.grezzo ?? riga.alimento, unita });
          }
        }
      });
    }
  }
  return [...visti.values()];
}
