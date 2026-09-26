import type { AreaId, GiorniControllo } from './types';
import { giorniTra, sommaGiorni } from './date';

export type { GiorniControllo } from './types';

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

/**
 * Le tre cadenze dei controlli staple (spec fase 5 §E.1, §C.6), dalla più
 * fitta: ogni mese, ogni 2 mesi, ogni 3 mesi. Sono i tre valori che il check
 * della colonna `settings.giorni_controllo` ammette.
 */
export const CADENZE: readonly GiorniControllo[] = [30, 60, 90];

/**
 * La cadenza di chi non l'ha mai scelta: 90 giorni, cioè l'intervallo fisso
 * che prima della fase 5 si chiamava GIORNI_CONTROLLO_STAPLE (decisione del
 * 2026-08-26, che sostituiva la soglia `giorni_stimati × 0.8` della regola 7).
 * Deve coincidere col default della colonna.
 */
export const GIORNI_CONTROLLO_DEFAULT: GiorniControllo = 90;

/**
 * Il testo della cadenza in mono maiuscolo: il valore della riga nel
 * pannello e la sottoriga della Riga di controllo (`CONTROLLO {testo}`).
 */
export function testoCadenza(g: GiorniControllo): 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI' {
  switch (g) {
    case 30: return 'OGNI MESE';
    case 60: return 'OGNI 2 MESI';
    case 90: return 'OGNI 3 MESI';
  }
}

/**
 * La cadenza a inizio frase: la nota della classe «a stima» nell'editor
 * dell'ingrediente («Ogni 3 mesi dall'ultimo acquisto…», Task 12). Prima della
 * fase 5 quella nota diceva «Ogni 90 giorni» (decisione di Andrea del 26/09).
 */
export function ogniCadenza(g: GiorniControllo): 'Ogni mese' | 'Ogni 2 mesi' | 'Ogni 3 mesi' {
  switch (g) {
    case 30: return 'Ogni mese';
    case 60: return 'Ogni 2 mesi';
    case 90: return 'Ogni 3 mesi';
  }
}

/**
 * La cadenza in mezzo a una frase: `CHIUDENDO LA SPESA` in Lista fatta
 * («Serve solo a ricordarti fra 3 mesi che l'olio…»). Prima diceva «fra 90
 * giorni» (decisione di Andrea del 26/09).
 */
export function fraCadenza(g: GiorniControllo): 'fra un mese' | 'fra 2 mesi' | 'fra 3 mesi' {
  switch (g) {
    case 30: return 'fra un mese';
    case 60: return 'fra 2 mesi';
    case 90: return 'fra 3 mesi';
  }
}

export interface ServeControlloInput {
  ultimoAcquisto: string | null;
  ultimoCheck: string | null;
  /** ISO yyyy-mm-dd */
  oggi: string;
  /**
   * La cadenza delle Impostazioni. Obbligatoria, non facoltativa: un
   * chiamante che la dimentica tornerebbe in silenzio ai 90 giorni fissi.
   */
  giorniControllo: GiorniControllo;
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
  return giorniTra(riferimento, i.oggi) >= i.giorniControllo;
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
  /**
   * ISO yyyy-mm-dd scritta a mano dalla Dispensa; null = vale la stima.
   * Obbligatorio e non facoltativo: un chiamante che lo dimentica
   * calcolerebbe la lista ignorando una correzione dell'utente, e `tsc` deve
   * dirlo (spec fase 4 §E.1).
   */
  scadenzaManuale: string | null;
  /** ISO yyyy-mm-dd */
  oggi: string;
}

export type StimaInput = Pick<ResiduoUtilizzabileInput, 'residuo' | 'deperibile' | 'area' | 'ultimoAcquisto' | 'congelato'>;

/**
 * Il giorno in cui l'app smette di contare il residuo secondo il suo modello:
 * `ultimoAcquisto + soglia`, con la soglia del congelatore o dell'area. Non è
 * la data sulla confezione. Null quando non c'è niente che decada: residuo a
 * zero, non deperibile, mai comprato, area senza soglia (surgelati).
 */
export function scadenzaStimata(i: StimaInput): string | null {
  if (i.residuo <= 0) return null;
  if (!i.deperibile) return null;
  if (!i.ultimoAcquisto) return null;
  const soglia = i.congelato ? GIORNI_CONGELATO : GIORNI_FRESCO[i.area];
  if (soglia === null) return null;
  return sommaGiorni(i.ultimoAcquisto, soglia);
}

/**
 * La scadenza effettiva: la data scritta a mano se c'è, altrimenti la stima.
 * La data a mano vale solo dove una stima esiste: su un non deperibile o un
 * surgelato non c'è niente che decada, e una data lì non deve inventarlo.
 * Contratto: residuoUtilizzabile(oggi) > 0 ⇔ oggi ≤ scadenzaResiduo, quando
 * questa non è null.
 */
export function scadenzaResiduo(i: Omit<ResiduoUtilizzabileInput, 'oggi'>): string | null {
  const stima = scadenzaStimata(i);
  if (stima === null) return null;
  return i.scadenzaManuale ?? stima;
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
 *
 * Dalla fase 4 legge la scadenza effettiva: una data scritta a mano dalla
 * Dispensa sposta il giorno in cui il residuo smette di contare. Senza data a
 * mano il risultato è identico a prima: `oggi > acquisto + soglia` equivale a
 * `giorniTra(acquisto, oggi) > soglia`.
 */
export function residuoUtilizzabile(i: ResiduoUtilizzabileInput): number {
  if (i.residuo <= 0) return 0;
  const scadenza = scadenzaResiduo(i);
  if (scadenza === null) return i.residuo;
  return i.oggi > scadenza ? 0 : i.residuo;
}

/**
 * Cosa succede alle date quando l'utente cambia il residuo a mano (spec fase 4
 * §E.2, §E.3). Da 0 a più di 0 è roba nuova che entra in casa: l'acquisto va a
 * oggi e la data a mano, che parlava di un'altra confezione, si cancella. A 0
 * la data a mano non ha più niente di cui parlare. Da più di 0 a più di 0 è
 * una correzione della quantità, e le date restano.
 */
export function effettoCorrezione(
  prima: number,
  dopo: number,
  oggi: string,
): { ultimoAcquisto: string | null; cancellaScadenza: boolean } {
  if (dopo <= 0) return { ultimoAcquisto: null, cancellaScadenza: true };
  if (prima <= 0) return { ultimoAcquisto: oggi, cancellaScadenza: true };
  return { ultimoAcquisto: null, cancellaScadenza: false };
}
