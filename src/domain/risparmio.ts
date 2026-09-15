import type { UnitaBase } from './types';
import type { VoceEvitata } from './list-builder';

/**
 * Il riassunto del non ricomprato, per una settimana o per tutte le settimane
 * chiuse: puro, lavora sulle `VoceEvitata` che `costruisciLista` ha fissato
 * alla generazione della lista.
 */
export interface RiassuntoEvitato {
  confezioni: number;
  /** g, ml, pz sommati per unità. */
  quantita: Record<UnitaBase, number>;
  /** null se nessun ingrediente evitato ha un prezzo. */
  euro: number | null;
  /** Con evitate > 0. */
  ingredientiEvitati: number;
  /** Fra quelli evitati. */
  ingredientiConPrezzo: number;
}

/**
 * Un prezzo su un ingrediente con zero evitate non conta: non c'è niente da
 * valutare in euro, e farebbe comparire "circa 0 €" al posto dell'invito a
 * mettere i prezzi.
 */
export function riassumiEvitato(voci: VoceEvitata[]): RiassuntoEvitato {
  const r: RiassuntoEvitato = {
    confezioni: 0, quantita: { g: 0, ml: 0, pz: 0 }, euro: null,
    ingredientiEvitati: 0, ingredientiConPrezzo: 0,
  };
  for (const v of voci) {
    if (v.confezioniEvitate <= 0) continue;
    r.confezioni += v.confezioniEvitate;
    r.quantita[v.unita] += v.quantitaEvitata;
    r.ingredientiEvitati += 1;
    if (v.prezzoConfezione !== null) {
      r.ingredientiConPrezzo += 1;
      r.euro = (r.euro ?? 0) + v.confezioniEvitate * v.prezzoConfezione;
    }
  }
  return r;
}

/**
 * "1,4 kg · 2 pz", "350 g", "1,0 l"; "" se tutto zero. Grammi e millilitri
 * passano a chili e litri da mille in su, con una cifra decimale; sotto restano
 * interi. Ordine fisso g, ml, pz; virgola decimale e spazio prima dell'unità.
 */
export function formattaQuantita(q: Record<UnitaBase, number>): string {
  const parti: string[] = [];
  const g = Math.round(q.g);
  if (g > 0) parti.push(g >= 1000 ? `${unaCifra(g / 1000)} kg` : `${g} g`);
  const ml = Math.round(q.ml);
  if (ml > 0) parti.push(ml >= 1000 ? `${unaCifra(ml / 1000)} l` : `${ml} ml`);
  const pz = Math.round(q.pz);
  if (pz > 0) parti.push(`${pz} pz`);
  return parti.join(' · ');
}

/** "circa 11 €" all'intero; "meno di 1 €" sotto l'unità. */
export function formattaEuro(euro: number): string {
  if (euro < 1) return 'meno di 1 €';
  return `circa ${Math.round(euro)} €`;
}

function unaCifra(n: number): string {
  return n.toFixed(1).replace('.', ',');
}
