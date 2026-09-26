/**
 * I reparti della Lista in corsia (Andrea, 26/09): il contatore «presi/totale»
 * nell'intestazione e i reparti finiti che scendono in fondo, così in cima c'è
 * sempre il prossimo reparto da fare.
 */

interface Reparto {
  voci: ReadonlyArray<{ spuntato: boolean }>;
  controlli: ReadonlyArray<unknown>;
}

/** Voci prese sul totale. I controlli («Hai ancora…?») non sono voci da prendere. */
export function contatoreReparto(r: Reparto): { presi: number; totale: number } {
  return { presi: r.voci.filter((v) => v.spuntato).length, totale: r.voci.length };
}

/**
 * Finito quando non resta niente da fare: tutte le voci prese e nessun
 * controllo da rispondere. È lo stesso criterio di `listaFinita`, per reparto.
 */
export function repartoCompleto(r: Reparto): boolean {
  return r.controlli.length === 0 && r.voci.every((v) => v.spuntato);
}

/**
 * Reparti da fare in cima, reparti finiti in fondo; dentro ognuno dei due
 * gruppi resta l'ordine delle aree scelto dall'utente. Su una copia: l'array
 * arriva dallo stato di React.
 */
export function ordinaRepartiPerSpesa<T extends Reparto>(sezioni: readonly T[]): T[] {
  return [...sezioni].sort((a, b) => Number(repartoCompleto(a)) - Number(repartoCompleto(b)));
}
