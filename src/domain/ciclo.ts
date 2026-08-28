import { giorniTra, lunediDi } from './date';

export const MIN_SETTIMANE_CICLO = 1;
export const MAX_SETTIMANE_CICLO = 4;

/**
 * L'origine di ripiego quando il ciclo non è ancora stato ancorato a una data
 * (`ciclo_origine` nullo). È un lunedì fisso e arbitrario: serve solo a dare
 * alla rotazione un punto da cui contare le settimane, e nessuna scelta di
 * data lo renderebbe più "giusto" di un'altra. Cambiarlo sposterebbe la
 * rotazione di tutti i piatti non ancorati, quindi non si cambia.
 */
export const ORIGINE_ROTAZIONE = '2026-01-05';

/**
 * Quante settimane piene separano l'origine dal lunedì passato. Negativo per
 * una settimana che precede l'origine — chi imposta il ciclo oggi e poi
 * guarda una settimana passata non deve trovare un errore, solo un numero.
 *
 * Normalizza entrambe le date al loro lunedì: `ciclo_origine` è per
 * definizione un lunedì, ma un dato sporco (inserito a mano, importato) non
 * deve produrre un conteggio a frazioni di settimana.
 */
export function settimaneTrascorse(lunedi: string, origine: string | null): number {
  const base = lunediDi(origine ?? ORIGINE_ROTAZIONE);
  return Math.floor(giorniTra(base, lunediDi(lunedi)) / 7);
}

export interface SettimanaDelCicloInput {
  /** Una data qualunque della settimana da collocare nel giro. */
  lunedi: string;
  /** `settings.ciclo_origine`: il lunedì della settimana 1. */
  origine: string | null;
  /** `settings.settimane_ciclo`: da 1 a 4. */
  settimaneCiclo: number;
}

/**
 * A che punto del giro siamo: 1..settimaneCiclo.
 *
 * Con `settimaneCiclo = 1` (il default) la risposta è sempre 1 e nessun
 * piatto viene mai escluso — è il comportamento che l'app aveva prima del
 * ciclo, e chi non lo usa non deve accorgersi che esiste.
 */
export function settimanaDelCiclo(i: SettimanaDelCicloInput): number {
  const n = Math.min(Math.max(Math.trunc(i.settimaneCiclo), MIN_SETTIMANE_CICLO), MAX_SETTIMANE_CICLO);
  if (n === 1) return 1;
  const trascorse = settimaneTrascorse(i.lunedi, i.origine);
  // Modulo positivo: in JS -1 % 2 vale -1, che qui darebbe la settimana 0.
  return (((trascorse % n) + n) % n) + 1;
}
