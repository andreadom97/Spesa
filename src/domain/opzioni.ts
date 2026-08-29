import type { Dish, DishIngredient, Scelta } from './types';

export class OpzioneMancanteError extends Error {
  constructor(dishNome: string, componenteNome: string, opzioneId: string) {
    super(
      `Il piatto "${dishNome}" non ha più l'opzione ${opzioneId} del componente ` +
      `"${componenteNome}": la scelta registrata punta nel vuoto. Riapri il pasto ` +
      `da Scegli e conferma un'opzione esistente.`,
    );
    this.name = 'OpzioneMancanteError';
  }
}

/**
 * Le righe ingrediente che questo piatto comporta davvero, date le scelte
 * della settimana: righe fisse + l'opzione scelta di ogni componente.
 * Scelta assente → prima opzione (il default): uno slot mai passato dal
 * planner non deve mai rompere la lista. Scelta verso un'opzione rimossa →
 * errore esplicito: il piatto è cambiato sotto una scelta già registrata,
 * e saltare la riga in silenzio produrrebbe una lista sbagliata senza avviso.
 */
export function righeEffettive(dish: Dish, scelte: Record<string, Scelta>): DishIngredient[] {
  const righe = [...dish.ingredienti];
  for (const componente of dish.componenti) {
    const scelta = scelte[componente.id];
    const opzione = scelta === undefined
      ? componente.opzioni[0]
      : componente.opzioni.find((o) => o.id === scelta.opzioneId);
    if (!opzione) throw new OpzioneMancanteError(dish.nome, componente.nome, scelte[componente.id]!.opzioneId);
    righe.push(...opzione.righe);
  }
  return righe;
}

/**
 * Il sottotitolo della Settimana: le opzioni scelte, coi nomi degli
 * ingredienti ("Uova + Passata di pomodoro"; più componenti separati da " · ").
 * null per il piatto senza componenti: nessun sottotitolo da mostrare.
 */
export function descriviScelte(
  dish: Dish,
  scelte: Record<string, Scelta>,
  nomePerIngrediente: Map<string, string>,
): string | null {
  if (dish.componenti.length === 0) return null;
  const parti: string[] = [];
  for (const componente of dish.componenti) {
    const scelta = scelte[componente.id];
    const opzione = scelta === undefined
      ? componente.opzioni[0]
      : componente.opzioni.find((o) => o.id === scelta.opzioneId);
    if (!opzione) continue; // il sottotitolo non è il posto dove esplodere: ci pensa righeEffettive
    parti.push(
      opzione.righe
        .map((r) => nomePerIngrediente.get(r.ingredientId) ?? '?')
        .join(' + '),
    );
  }
  return parti.length > 0 ? parti.join(' · ') : null;
}
