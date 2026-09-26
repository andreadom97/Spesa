/** La parte di una sezione della lista che serve a dire se la spesa è finita. */
export interface SezioneDaSpuntare {
  voci: { spuntato: boolean }[];
  controlli: unknown[];
}

/**
 * Tipo strutturale e non `ListaSalvata`: il dominio non importa dal data layer, e
 * `ListaSalvata` lo soddisfa così com'è.
 */
export interface ListaDaSpuntare {
  base: SezioneDaSpuntare[];
  topup: SezioneDaSpuntare[];
}

/**
 * Vero solo quando non resta più niente da fare: almeno una voce, ogni voce spuntata *e*
 * nessun controllo in sospeso, su base e top-up insieme. Un controllo si risponde, non si
 * spunta: finché non ha risposta la spesa non è finita. La usano la Lista (per mostrare
 * HAI PRESO TUTTO), il traguardo e Confezioni (per non mostrarsi a spesa non finita): una
 * regola sola, perché se le tre copie divergessero il Dock porterebbe a una pagina che
 * rimanda indietro.
 */
export function listaFinita(lista: ListaDaSpuntare): boolean {
  const sezioni = [...lista.base, ...lista.topup];
  return contaVoci(lista) > 0 && sezioni.every((s) => s.controlli.length === 0 && s.voci.every((v) => v.spuntato));
}

/** Le voci di base e top-up, senza i controlli: il «N voci su N» del traguardo. */
export function contaVoci(lista: ListaDaSpuntare): number {
  return [...lista.base, ...lista.topup].reduce((n, s) => n + s.voci.length, 0);
}
