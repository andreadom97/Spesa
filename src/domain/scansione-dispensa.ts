import type { Ingredient, UnitaBase } from './types';
import { formatoProposto, type QuantitaConfezione } from './ean';

/** La risposta di `GET /api/prodotto/[ean]` (route esistente). */
export type RispostaProdotto =
  | { trovato: true; nome: string; marca: string; quantita: QuantitaConfezione | null }
  | { trovato: false };

// Gli stessi testi di /lista/confezioni (spec §I, «invariati»).
export const MSG_NON_TROVATO = 'Prodotto non trovato: puoi scrivere il formato a mano.';
export const MSG_CATALOGO = 'Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.';
export function msgUnitaDiversa(off: UnitaBase, unita: UnitaBase): string {
  return `Unità diversa (${off} contro ${unita}): scrivi il formato a mano.`;
}

export type EsitoCodice =
  | { tipo: 'confezione'; ean: string; formato: number }
  | { tipo: 'altroIngrediente'; ean: string; ingrediente: Ingredient }
  | { tipo: 'aMano'; ean: string; messaggio: string };

/**
 * L'ingrediente che ha già questo codice, escluso `escludiId`. L'indice su
 * `ean` non è unico: con due ingredienti, vince il primo per nome (spec §K).
 */
export function proprietario(ean: string, ingredienti: Ingredient[], escludiId?: string): Ingredient | null {
  const trovati = ingredienti
    .filter((i) => i.ean === ean && i.id !== escludiId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return trovati[0] ?? null;
}

/**
 * Il primo passo dell'esito nel dettaglio (spec §F.2), senza rete: il codice è
 * di questo ingrediente (vale il suo formato) o di un altro. Null = non è di
 * nessuno, e serve il catalogo.
 */
export function esitoLocale(ean: string, aperto: Ingredient, ingredienti: Ingredient[]): EsitoCodice | null {
  if (aperto.ean === ean) return { tipo: 'confezione', ean, formato: aperto.formatoConfezione };
  const altro = proprietario(ean, ingredienti, aperto.id);
  return altro ? { tipo: 'altroIngrediente', ean, ingrediente: altro } : null;
}

/** Il secondo passo: cosa dice il catalogo, nell'unità dell'ingrediente aperto. */
export function esitoDaCatalogo(ean: string, aperto: Ingredient, risposta: RispostaProdotto | 'errore'): EsitoCodice {
  if (risposta === 'errore') return { tipo: 'aMano', ean, messaggio: MSG_CATALOGO };
  if (!risposta.trovato || !risposta.quantita) return { tipo: 'aMano', ean, messaggio: MSG_NON_TROVATO };
  const formato = formatoProposto(risposta.quantita, aperto.unitaBase);
  if (formato === null) return { tipo: 'aMano', ean, messaggio: msgUnitaDiversa(risposta.quantita.unita, aperto.unitaBase) };
  return { tipo: 'confezione', ean, formato };
}

export type EsitoNuovo =
  | { tipo: 'altroIngrediente'; ean: string; ingrediente: Ingredient }
  | { tipo: 'letto'; ean: string; quantita: QuantitaConfezione | null; messaggio: string | null };

/** Da Nuovo ingrediente (spec §F.3): un codice già di qualcuno apre quello. */
export function esitoNuovoLocale(ean: string, ingredienti: Ingredient[]): EsitoNuovo | null {
  const altro = proprietario(ean, ingredienti);
  return altro ? { tipo: 'altroIngrediente', ean, ingrediente: altro } : null;
}

/** Da Nuovo ingrediente: la quantità del catalogo riempie quantità e unità; altrimenti il messaggio. */
export function esitoNuovoDaCatalogo(ean: string, risposta: RispostaProdotto | 'errore'): EsitoNuovo {
  if (risposta === 'errore') return { tipo: 'letto', ean, quantita: null, messaggio: MSG_CATALOGO };
  if (!risposta.trovato || !risposta.quantita) return { tipo: 'letto', ean, quantita: null, messaggio: MSG_NON_TROVATO };
  return { tipo: 'letto', ean, quantita: risposta.quantita, messaggio: null };
}
