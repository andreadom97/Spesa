import { giorniTra } from './date';

/**
 * Intervallo fisso del controllo staple. In Fase 1 non si apprende nulla:
 * la decisione chiusa il 2026-08-26 sostituisce la soglia `giorni_stimati × 0.8`
 * della regola 7 di list-builder.
 */
export const GIORNI_CONTROLLO_STAPLE = 90;

export interface NuovoResiduoInput {
  residuoPrecedente: number;
  acquistato: number;
  consumatoDaPiano: number;
}

/**
 * Il cuore del modello: la dispensa è derivata, mai inserita.
 * Si ferma a zero — un residuo negativo non ha significato fisico, e lasciarlo
 * negativo gonfierebbe in silenzio la lista successiva.
 */
export function nuovoResiduo(i: NuovoResiduoInput): number {
  return Math.max(0, i.residuoPrecedente + i.acquistato - i.consumatoDaPiano);
}

export interface ServeControlloInput {
  ultimoAcquisto: string | null;
  ultimoCheck: string | null;
  /** ISO yyyy-mm-dd */
  oggi: string;
}

/**
 * Vale solo per la classe `stima`; chi chiama filtra la classe.
 * Il conto riparte dal più recente fra l'ultimo acquisto e l'ultimo "sì":
 * senza questo, rispondere "sì" non zittirebbe mai il controllo.
 */
export function serveControllo(i: ServeControlloInput): boolean {
  if (!i.ultimoAcquisto) return false;
  const riferimento =
    i.ultimoCheck && i.ultimoCheck > i.ultimoAcquisto ? i.ultimoCheck : i.ultimoAcquisto;
  return giorniTra(riferimento, i.oggi) >= GIORNI_CONTROLLO_STAPLE;
}
