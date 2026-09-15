import type { MealSlotDef } from '@/domain/types';

/**
 * La riga sotto la testata di /piatti/veloce e la regola "la settimana può
 * girare", fuori dalla pagina perché sono logica pura e un `page.tsx` non
 * può esportare altro che la pagina.
 */

/**
 * Quattro pasti di default per due piatti ciascuno: sotto questa soglia il
 * planner, che ruota per pasto, ripete lo stesso piatto ogni giorno. È il
 * numero della spec (2026-09-06, §2.2), non un consiglio su quanto mangiare.
 */
export const PIATTI_PER_GIRARE = 8;

/**
 * Quanti piatti per pasto perché la rotazione abbia qualcosa da alternare:
 * con uno solo il planner ripete lo stesso piatto ogni giorno di quel pasto.
 */
export const PIATTI_PER_PASTO = 2;

/**
 * Il pasto con meno di `PIATTI_PER_PASTO` piatti, se ce n'è uno: quello con
 * meno piatti, a parità il primo nell'ordine dei pasti. `null` se ogni pasto
 * è coperto.
 */
function pastoScoperto(perPasto: Map<string, number>, slotDefs: MealSlotDef[]): MealSlotDef | null {
  let scoperto: MealSlotDef | null = null;
  for (const def of slotDefs) {
    const conta = perPasto.get(def.id) ?? 0;
    if (conta >= PIATTI_PER_PASTO) continue;
    if (scoperto === null || conta < (perPasto.get(scoperto.id) ?? 0)) scoperto = def;
  }
  return scoperto;
}

/**
 * Vero quando la settimana può girare: `n` piatti almeno alla soglia e OGNI
 * pasto con almeno `PIATTI_PER_PASTO` piatti. Il planner ruota per pasto:
 * otto cene non fanno girare la colazione.
 */
export function settimanaPuoGirare(n: number, perPasto: Map<string, number>, slotDefs: MealSlotDef[]): boolean {
  return n >= PIATTI_PER_GIRARE && pastoScoperto(perPasto, slotDefs) === null;
}

/**
 * La riga sotto la testata, a tre livelli: `n` piatti nel repertorio (letti
 * all'apertura più quelli salvati in questa sessione). Sotto la soglia dice
 * quanti ne mancano a far girare la settimana; sopra, che si può smettere.
 * Con la soglia raggiunta ma un pasto scoperto dice quale e quanti piatti
 * gli mancano. In ogni caso, appena c'è almeno un piatto, ricorda che si può
 * uscire con HO FINITO: nella prova del 15/09 chi aveva undici piatti e uno
 * Spuntino solo si è sentito bloccato, perché la riga chiedeva "ancora
 * qualcosa" senza dire cosa né che si poteva smettere. Con zero piatti
 * uscire non ha senso e non si propone.
 */
export function testoContatore(n: number, perPasto: Map<string, number>, slotDefs: MealSlotDef[]): string {
  if (n >= PIATTI_PER_GIRARE) {
    const scoperto = pastoScoperto(perPasto, slotDefs);
    if (scoperto === null) return `Ne hai ${n}: la settimana può girare. Aggiungine quanti vuoi.`;
    const mancanti = PIATTI_PER_PASTO - (perPasto.get(scoperto.id) ?? 0);
    const quanti = mancanti === 1 ? 'manca 1 piatto' : `mancano ${mancanti} piatti`;
    return `${n} piatti salvati · ${quanti} per ${scoperto.nome} (o esci con HO FINITO)`;
  }
  const coda = `ne bastano ${PIATTI_PER_GIRARE} per far girare la settimana`;
  if (n === 0) return `Nessun piatto ancora · ${coda}`;
  const uscita = 'o esci con HO FINITO';
  if (n === 1) return `1 piatto salvato · ${coda} · ${uscita}`;
  return `${n} piatti salvati · ${coda} · ${uscita}`;
}
