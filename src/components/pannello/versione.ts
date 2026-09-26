/**
 * La versione dell'app, per il piede del pannello (`Versione {x}`, spec fase 5
 * §B.4) e per il file di Esporta. Viene da `package.json` attraverso `env` in
 * next.config.ts, che la scrive nel bundle a build (misurato il 25/09: nel
 * bundle client c'è il valore, non la variabile). Fuori da Next (test, script)
 * la variabile non c'è e vale 0.0.0.
 *
 * `process.env.NEXT_PUBLIC_VERSIONE` scritto per intero: Next sostituisce solo
 * l'accesso letterale, non uno destrutturato o dinamico.
 */
export const VERSIONE: string = process.env.NEXT_PUBLIC_VERSIONE ?? '0.0.0';
