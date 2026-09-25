import type { AreaId, Ingredient, LottoPronto, UnitaBase } from './types';
import { normalizza } from './import/mapping';
import { INGREDIENTI_BASE } from './ingredienti-base';
import { ORDINE_AREE_DEFAULT } from './aree';
import { statoTessera, type VoceDispensa } from './dispensa-vista';

export interface GruppoArea {
  area: AreaId;
  voci: VoceDispensa[];
}

/** In pagina stanno le voci in casa e le finite; i mai comprati solo fra i risultati (spec §A). */
export function vociInPagina(voci: VoceDispensa[]): VoceDispensa[] {
  return voci.filter((v) => statoTessera(v) !== 'maiComprata');
}

function ordina(voci: VoceDispensa[]): VoceDispensa[] {
  // Nome A–Z, finite mescolate alle altre; i mai comprati (solo fra i
  // risultati) dopo, perché sono catalogo e non casa.
  return [...voci].sort((a, b) => {
    const ma = statoTessera(a) === 'maiComprata' ? 1 : 0;
    const mb = statoTessera(b) === 'maiComprata' ? 1 : 0;
    return ma - mb || a.ingrediente.nome.localeCompare(b.ingrediente.nome, 'it');
  });
}

/**
 * Un gruppo per area con almeno una voce, nell'ordine delle Impostazioni. Le
 * aree che l'ordine salvato non nomina vanno in coda nell'ordine di default:
 * un ordine vecchio o parziale non deve far sparire un widget.
 */
export function raggruppaPerArea(voci: VoceDispensa[], ordineAree: AreaId[]): GruppoArea[] {
  const perArea = new Map<AreaId, VoceDispensa[]>();
  for (const v of voci) {
    const lista = perArea.get(v.ingrediente.area) ?? [];
    lista.push(v);
    perArea.set(v.ingrediente.area, lista);
  }
  const ordine = [...ordineAree, ...ORDINE_AREE_DEFAULT.filter((a) => !ordineAree.includes(a))];
  return ordine.filter((a) => perArea.has(a)).map((area) => ({ area, voci: ordina(perArea.get(area)!) }));
}

export interface RisultatiRicerca {
  voci: VoceDispensa[];
  lotti: LottoPronto[];
  totale: number;
}

/**
 * La ricerca della Dispensa (spec §B): il nome normalizzato contiene la query
 * normalizzata, dal primo carattere. Cerca in tutti gli ingredienti, mai
 * comprati compresi, e nei lotti per nome del piatto. Null con una query
 * vuota: la pagina mostra i widget di sempre.
 */
export function cercaInDispensa(
  query: string,
  voci: VoceDispensa[],
  lotti: LottoPronto[],
  nomePiatto: (l: LottoPronto) => string,
): RisultatiRicerca | null {
  const q = normalizza(query);
  if (q === '') return null;
  const trovate = voci.filter((v) => normalizza(v.ingrediente.nome).includes(q));
  const lottiTrovati = lotti.filter((l) => normalizza(nomePiatto(l)).includes(q));
  return { voci: trovate, lotti: lottiTrovati, totale: trovate.length + lottiTrovati.length };
}

export function etichettaRisultati(n: number): string {
  return n === 1 ? '1 risultato' : `${n} risultati`;
}

export interface DefaultNuovo {
  area: AreaId | null;
  unitaBase: UnitaBase;
  deperibile: boolean | null;
}

/**
 * I default di Nuovo ingrediente (spec §C): se il nome è uno degli ingredienti
 * di base, reparto, unità e deperibile vengono da lì; altrimenti nessun
 * reparto (lo sceglie l'utente), grammi, e deperibile deciso dal reparto.
 */
export function predefinitiNuovo(nome: string): DefaultNuovo {
  const n = normalizza(nome);
  const base = INGREDIENTI_BASE.find((b) => normalizza(b.nome) === n);
  if (base) return { area: base.area, unitaBase: base.unitaBase, deperibile: base.deperibile };
  return { area: null, unitaBase: 'g', deperibile: null };
}

export function nomeGiaUsato(nome: string, ingredienti: Ingredient[]): boolean {
  const n = normalizza(nome);
  return ingredienti.some((i) => normalizza(i.nome) === n);
}
