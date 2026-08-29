import type { ClasseResiduo } from './types';

export interface ConfezioniInput {
  /** In unitaBase dell'ingrediente, già moltiplicato per le porzioni. */
  fabbisogno: number;
  /** Residuo utilizzabile (residuoUtilizzabile già applicato da chi chiama). */
  residuo: number;
  /** `stima` esclusa per contratto: regola 7, nessuna aritmetica. Chi chiama filtra. */
  classeResiduo: Exclude<ClasseResiduo, 'stima'>;
  formatoConfezione: number;
}

export interface ConfezioniRisultato {
  daComprare: number;
  confezioni: number;
  /** confezioni × formato effettivo: quanto entra in casa comprando. */
  quantitaTotale: number;
}

/**
 * L'aritmetica delle confezioni, unica per list-builder e planner: se
 * divergessero, il planner sceglierebbe un'opzione "che non costa niente"
 * e la lista poi la farebbe pagare.
 */
export function confezioniNecessarie(i: ConfezioniInput): ConfezioniRisultato {
  const daComprare = Math.max(0, i.fabbisogno - i.residuo);
  const formato = i.classeResiduo === 'intero' ? 1 : i.formatoConfezione;
  const confezioni = Math.ceil(daComprare / formato);
  return { daComprare, confezioni, quantitaTotale: confezioni * formato };
}
