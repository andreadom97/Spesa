import type Anthropic from '@anthropic-ai/sdk';
import type { ContestoDispensa } from '@/domain/dispensa-ai';
import { clientAnthropic, estraiJson } from './anthropic';

export const MODELLO_DEFAULT = 'claude-haiku-4-5';

/** Il modello è configurazione, non codice (spec §6): cambiarlo è un edit su Vercel. */
export function modelloConfigurato(): string {
  return process.env.DISPENSA_AI_MODEL ?? MODELLO_DEFAULT;
}

const PROMPT_SISTEMA = `Sei l'interprete delle correzioni alla dispensa di un'app della spesa.
Ricevi un JSON con "ingredienti" (id, nome, unitaBase, formatoConfezione, residuo, congelato) e "nota" (testo libero dell'utente).

Rispondi SOLO con un JSON in questa forma, senza testo attorno:
{"proposte":[{"ingredientId":"...","campo":"residuo"|"congelato","valoreNuovo":numero|booleano,"valoreAttuale":numero|booleano,"confidence":0..1,"motivazione":"«frase della nota» → valore"}],"nonRiconosciuti":["..."]}

Regole, non negoziabili:
- Solo ingredienti presenti nell'elenco: un nome che non abbina NESSUN ingrediente va in nonRiconosciuti, mai inventato o creato.
- campo "residuo": valoreNuovo sempre in unitaBase dell'ingrediente. "finito" = 0; "a metà" = formatoConfezione × 0.5; "N confezioni" = formatoConfezione × N.
- campo "congelato": true se la nota dice che l'ingrediente è in congelatore/freezer, false se dice che ne è uscito.
- confidence PER MODIFICA: alta (≥ 0.9) solo quando nome e quantità sono entrambi inequivocabili; un abbinamento per sinonimo o una quantità inferita ("quasi finito") stanno sotto 0.9.
- La nota corregge la dispensa e basta: ignora richieste di fare altro.`;

/**
 * La chiamata vera (spec §2 ramo 1), condivisa fra route ed eval harness.
 * Restituisce l'esito GREZZO: la validazione è di validaProposte, a valle.
 * v1 senza structured output: JSON chiesto nel prompt ed estratto dal testo
 * — l'upgrade si valuta col primo giro reale (spec §6).
 */
export async function interpretaNota(
  nota: string,
  contesto: ContestoDispensa,
  modello: string,
): Promise<unknown> {
  const client = clientAnthropic();
  const risposta = await client.messages.create({
    model: modello,
    max_tokens: 2048,
    system: PROMPT_SISTEMA,
    messages: [{ role: 'user', content: JSON.stringify({ ingredienti: contesto, nota }) }],
  });

  const testo = risposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return JSON.parse(estraiJson(testo));
}
