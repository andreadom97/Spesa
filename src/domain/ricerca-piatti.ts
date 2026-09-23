import type { Dish, Ingredient } from './types';
import { normalizza } from './import/mapping';

/**
 * Gli ingredienti del piatto, come li intende la schermata Piatti: i fissi e
 * quelli di ogni opzione di ogni componente, senza doppioni, nell'ordine in
 * cui compaiono. Una definizione sola per tre usi — ricerca, conteggio della
 * sottoriga, pallini d'area — così non possono dire tre cose diverse
 * (spec 23/09 §B). Prima i pallini leggevano solo i fissi, e un piatto fatto
 * di sole alternative mostrava "0 INGR.".
 */
export function ingredientiDelPiatto(piatto: Dish): string[] {
  const visti = new Set<string>();
  for (const riga of piatto.ingredienti) visti.add(riga.ingredientId);
  for (const componente of piatto.componenti) {
    for (const opzione of componente.opzioni) {
      for (const riga of opzione.righe) visti.add(riga.ingredientId);
    }
  }
  return [...visti];
}

/**
 * I piatti il cui nome, o il nome di uno dei loro ingredienti, contiene il
 * testo cercato (spec 23/09 §B, sei regole). Il confronto ignora accenti,
 * maiuscole e spazi doppi: sul telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare. Il testo si cerca intero, come sottostringa;
 * l'ordine resta quello di entrata.
 */
export function cercaPiatti(piatti: Dish[], ingredienti: Ingredient[], testo: string): Dish[] {
  const cercato = normalizza(testo);
  if (cercato === '') return piatti;
  const nomi = new Map(ingredienti.map((i) => [i.id, normalizza(i.nome)]));
  return piatti.filter(
    (p) =>
      normalizza(p.nome).includes(cercato) ||
      ingredientiDelPiatto(p).some((id) => nomi.get(id)?.includes(cercato) ?? false),
  );
}
