import Anthropic from '@anthropic-ai/sdk';

/**
 * Client condiviso fra dispensa-AI ed estrattore. Le chiavi identity-linked
 * esigono l'header anthropic-workspace-id; per le chiavi di workspace la
 * variabile resta assente e l'header non parte.
 */
export function clientAnthropic(): Anthropic {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(
    workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {},
  );
}

/**
 * `stopReason` dice perché il modello si è fermato: `max_tokens` vuol dire che il
 * ragionamento ha finito i token prima del JSON (successo il 03/10 con l'indice di
 * un PDF di 10 pagine). Serve al log della route.
 */
export class RispostaSenzaJsonError extends Error {
  constructor(readonly stopReason: string | null = null) {
    super('La risposta del modello non contiene JSON.');
    this.name = 'RispostaSenzaJsonError';
  }
}

/** Il JSON può arrivare nudo o dentro un fence: si prende dal primo { all'ultimo }. */
export function estraiJson(testo: string, stopReason: string | null = null): string {
  const inizio = testo.indexOf('{');
  const fine = testo.lastIndexOf('}');
  if (inizio === -1 || fine <= inizio) throw new RispostaSenzaJsonError(stopReason);
  return testo.slice(inizio, fine + 1);
}
