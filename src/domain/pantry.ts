import type { AreaId } from './types';
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

/**
 * Dopo quanti giorni dall'acquisto il residuo di un deperibile non esiste più.
 *
 * Non sono valori inventati né imposti da una norma: la durata di un prodotto
 * la fissa il produttore (Reg. UE 1169/2011 obbliga a indicarla e a provarla,
 * non a rispettare un minimo). Questi sono i tempi di conservazione domestica
 * delle linee guida del Ministero della Salute — quanto dura in frigo dopo
 * che l'hai comprato — arrotondati verso l'alto perché l'app non sa se hai
 * comprato il giorno stesso del confezionamento.
 *
 * Ministero: macinato 1 giorno, pollo e tacchino 2, carne fresca e affettati
 * al banco 3, pesce eviscerato 1, latte fresco aperto 2.
 */
export const GIORNI_FRESCO: Record<AreaId, number | null> = {
  macelleria: 3,
  ortofrutta: 7,
  latticini: 7,
  cereali: 5,
  dispensa: 7,
  // I surgelati non hanno un residuo che decade: sono già congelati.
  surgelati: null,
};

/** Il congelatore cambia l'ordine di grandezza, non il margine. */
export const GIORNI_CONGELATO = 90;

export interface ResiduoUtilizzabileInput {
  residuo: number;
  deperibile: boolean;
  area: AreaId;
  /** ISO yyyy-mm-dd, null se mai comprato. */
  ultimoAcquisto: string | null;
  /** L'utente ha dichiarato dalla Dispensa che questo residuo sta nel congelatore. */
  congelato: boolean;
  /** ISO yyyy-mm-dd */
  oggi: string;
}

/**
 * Quanto del residuo registrato è ancora davvero in casa.
 *
 * Il residuo di un deperibile non arriva alla settimana dopo: 50 g di pollo
 * avanzati o li hai mangiati o li hai buttati. Contarli lo stesso fa credere
 * all'app di avere qualcosa che non c'è, e la conseguenza è che non te lo
 * mette in lista — te ne accorgi mercoledì sera davanti ai fornelli.
 *
 * L'errore è volutamente asimmetrico. Azzerare quando invece ce l'hai ancora
 * costa una confezione in più, e dalla Dispensa la correggi in due secondi.
 * Non azzerare costa una cena. Il modello sbaglia dalla parte che costa meno.
 *
 * Nessun azzeramento senza `ultimoAcquisto`: un residuo dichiarato a mano
 * dalla Dispensa su un ingrediente mai comprato è una cosa che l'utente ha
 * appena affermato, e sarebbe assurdo cancellarla al primo ricalcolo.
 */
export function residuoUtilizzabile(i: ResiduoUtilizzabileInput): number {
  if (i.residuo <= 0) return 0;
  if (!i.deperibile) return i.residuo;
  if (!i.ultimoAcquisto) return i.residuo;

  const soglia = i.congelato ? GIORNI_CONGELATO : GIORNI_FRESCO[i.area];
  if (soglia === null) return i.residuo;

  return giorniTra(i.ultimoAcquisto, i.oggi) > soglia ? 0 : i.residuo;
}
