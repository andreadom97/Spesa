import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta } from './types';
import { pastoEffettivo } from './types';

export function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match esatto sul nome normalizzato, poi per inclusione (in entrambi i versi)
 * preferendo il nome più corto. Niente fuzzy a distanza: un abbinamento
 * sbagliato silenzioso è peggio di un ingrediente doppio, e l'utente vede
 * comunque l'esito nel passo formati. Un conflitto di unità rompe il match.
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
  return inclusi[0] ?? null;
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
  if (norm === 'condimenti') return null;
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

/** L'unione deduplicata (per alimento normalizzato) di tutte le righe del piano, correzioni applicate. */
export function ingredientiDaAbbinare(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
): { alimento: string; unita: UnitaBase | null }[] {
  const visti = new Map<string, { alimento: string; unita: UnitaBase | null }>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      giorno.pasti.forEach((_, indice) => {
        const pasto = pastoEffettivo(piano, correzioni, settimana.numero, giorno.giorno, indice);
        for (const riga of tutteLeRighe(pasto)) {
          const chiave = normalizza(riga.alimento);
          const esistente = visti.get(chiave);
          // Un'unità nota vince su null: la prima riga con grammatura fissa il tipo.
          if (!esistente || (esistente.unita === null && riga.unita !== null)) {
            visti.set(chiave, { alimento: chiave, unita: riga.unita });
          }
        }
      });
    }
  }
  return [...visti.values()];
}
