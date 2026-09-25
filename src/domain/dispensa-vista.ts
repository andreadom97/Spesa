import type { Ingredient, LottoPronto, UnitaBase } from './types';
import type { AvvisoScadenza } from './scadenza';
import { residuoUtilizzabile, scadenzaResiduo, scadenzaStimata, type ResiduoUtilizzabileInput } from './pantry';
import { sommaGiorni } from './date';

/**
 * Un ingrediente come lo vede la Dispensa: l'ingrediente e il suo stato in
 * casa, già con i default di una riga di pantry assente (residuo 0, mai
 * comprato, fuori dal congelatore, nessuna data a mano).
 */
export interface VoceDispensa {
  ingrediente: Ingredient;
  residuo: number;
  ultimoAcquisto: string | null;
  congelato: boolean;
  scadenzaManuale: string | null;
}

export type StatoTessera = 'inCasa' | 'finita' | 'maiComprata';

/** Lo stesso taglio della Dispensa di prima: in casa se c'è residuo, finita se è stata comprata almeno una volta. */
export function statoTessera(v: VoceDispensa): StatoTessera {
  if (v.residuo > 0) return 'inCasa';
  return v.ultimoAcquisto !== null ? 'finita' : 'maiComprata';
}

function input(v: VoceDispensa): Omit<ResiduoUtilizzabileInput, 'oggi'> {
  return {
    residuo: v.residuo, deperibile: v.ingrediente.deperibile, area: v.ingrediente.area,
    ultimoAcquisto: v.ultimoAcquisto, congelato: v.congelato, scadenzaManuale: v.scadenzaManuale,
  };
}

/** La scadenza effettiva (data a mano se c'è, altrimenti la stima). */
export function scadenzaVoce(v: VoceDispensa): string | null {
  return scadenzaResiduo(input(v));
}

/** La stima di Dispesa, quella che `USA LA STIMA` ripristina. */
export function stimaVoce(v: VoceDispensa): string | null {
  return scadenzaStimata(input(v));
}

/** «Decaduto»: c'è un residuo registrato, ma per il modello non conta più. */
export function decaduta(v: VoceDispensa, oggi: string): boolean {
  return v.residuo > 0 && residuoUtilizzabile({ ...input(v), oggi }) === 0;
}

/**
 * «Dimenticato»: nessun pasto della settimana lo usa prima che scada. Vale solo
 * se l'avviso parla della stessa scadenza e se questa cade entro domenica:
 * oltre, il piano di questa settimana non può dire nulla. È la regola di
 * `annotaScadenza` della Dispensa di prima, spostata qui.
 */
export function eDimenticato(scadenza: string | null, avviso: AvvisoScadenza | undefined, domenica: string): boolean {
  return scadenza !== null && scadenza <= domenica && avviso !== undefined && avviso.scadenza === scadenza && !avviso.usatoInTempo;
}

export type AvvisoVoce = 'dimenticato' | 'decaduto' | null;

export function avvisoVoce(v: VoceDispensa, oggi: string, dimenticato: boolean): AvvisoVoce {
  if (v.residuo <= 0) return null;
  if (dimenticato) return 'dimenticato';
  if (decaduta(v, oggi)) return 'decaduto';
  return null;
}

/** Il testo intero degli avvisi, nel dettaglio (spec §D). */
export const TESTO_AVVISO: Record<'dimenticato' | 'decaduto', string> = {
  dimenticato: 'Nessun pasto in programma lo usa prima che scada.',
  decaduto: 'Troppo tempo per essere ancora buono: la lista lo richiede.',
};

export interface PillolaStato {
  testo: string;
  tono: 'avviso' | 'freddo';
}

/**
 * La pillola di stato della tessera: una sola, con la precedenza della v1
 * (spec §A): dimenticato · scadenza · decaduto · congelato.
 */
export function pillolaStato(v: VoceDispensa, oggi: string, dimenticato: boolean): PillolaStato | null {
  if (v.residuo <= 0) return null;
  if (dimenticato) return { testo: 'NESSUN PASTO LO USA', tono: 'avviso' };
  const morta = decaduta(v, oggi);
  const scadenza = scadenzaVoce(v);
  if (!morta && scadenza !== null) {
    return { testo: scadenza === oggi ? 'Scade oggi' : `Scade il ${dataCorta(scadenza)}`, tono: 'avviso' };
  }
  if (morta) return { testo: 'FORSE NON PIÙ BUONO', tono: 'avviso' };
  if (v.congelato) return { testo: 'Congelato', tono: 'freddo' };
  return null;
}

const NUMERO = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1, useGrouping: false });

/** `600 g`, `1250 g`, `1,5 pz`: numeri esatti con unità (DESIGN.md §10), resi maiuscoli dal CSS. */
export function etichettaQuantita(n: number, unita: UnitaBase): string {
  return `${NUMERO.format(n)} ${unita}`;
}

/** `07/09`: la data corta della tessera e del dettaglio. */
export function dataCorta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

/** `12 set`: la data del lotto (`PREPARATO IL 12 SET`, maiuscolo dal CSS). */
export function dataBreve(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MESI[Number(iso.slice(5, 7)) - 1] ?? ''}`;
}

/** Oggi o domani: la scadenza del dettaglio va in `--avviso` (spec §D.4). */
export function scadeVicino(scadenza: string, oggi: string): boolean {
  return scadenza <= sommaGiorni(oggi, 1);
}

/** Lo stesso giorno fra due anni: il tetto della data a mano (spec §D.4). */
export function maxScadenza(oggi: string): string {
  return `${Number(oggi.slice(0, 4)) + 2}${oggi.slice(4)}`;
}

export function dataScadenzaValida(data: string, oggi: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && data >= oggi && data <= maxScadenza(oggi);
}

/** La stima di una confezione comprata oggi (esito dello scanner, spec §F.2). */
export function stimaNuovaConfezione(ing: Ingredient, congelato: boolean, oggi: string): string | null {
  return scadenzaStimata({ residuo: 1, deperibile: ing.deperibile, area: ing.area, ultimoAcquisto: oggi, congelato });
}

/**
 * Le porzioni di un lotto impegnate dai pasti in programma (spec §G). Gli
 * impegni sono per piatto, i lotti no: con due lotti dello stesso piatto, dare
 * a ciascuno tutti gli impegni del piatto farebbe leggere il doppio, e il
 * dialogo di eliminazione avvertirebbe anche quando l'altro lotto basta. Qui un
 * lotto porta solo gli impegni che gli altri lotti vivi del piatto non coprono:
 * quelli che mancherebbero davvero se questo lotto sparisse. `vivi` sono i
 * lotti utilizzabili oggi, il lotto stesso compreso o no.
 */
export function impegnateLotto(lotto: LottoPronto, vivi: LottoPronto[], impegniPiatto: number): number {
  const altri = vivi
    .filter((l) => l.dishId === lotto.dishId && l.id !== lotto.id)
    .reduce((somma, l) => somma + l.porzioni, 0);
  return Math.min(lotto.porzioni, Math.max(0, impegniPiatto - altri));
}
