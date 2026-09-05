import type { ArchetipoImportabile, RifiutoImport } from './types';
import { PianoNonValidoError, validaEsito } from './valida';

/**
 * L'indice di estrazione (spec 2026-09-05 §2.1): il primo passaggio della pipeline a
 * pagine dice, per ogni pagina inviata, cosa contiene. Serve a scegliere l'archetipo una
 * volta sola, a dire a ogni chiamata di pagina cosa aspettarsi e a rifiutare subito una
 * dieta di soli macro.
 */
export interface VocePagina {
  /** 1..4 */
  settimana: number;
  /** 0..6 negli archetipi settimanali; indice progressivo (>= 0) per giorni_tipo. */
  giorno: number;
  /** Solo giorni_tipo: il nome dello scenario. null per gli altri archetipi. */
  titolo: string | null;
  /** Nomi dei pasti come scritti, nell'ordine. */
  pasti: string[];
}

export interface PaginaIndice {
  /** 1-based, ordine di invio. */
  pagina: number;
  /** Il primo pasto è la coda di un pasto iniziato sulla pagina prima. */
  continuaDallaPrecedente: boolean;
  /** Vuoto per copertine e regolamenti: la pagina va dichiarata comunque. */
  contenuto: VocePagina[];
}

export interface IndiceEstrazione {
  archetipo: ArchetipoImportabile;
  fonte: string;
  pagine: PaginaIndice[];
  noteEstrazione: string[];
}

export type EsitoIndice =
  | { tipo: 'indice'; indice: IndiceEstrazione }
  | { tipo: 'rifiuto'; rifiuto: RifiutoImport };

// Stessi controlli di forma di valida.ts (lì non esportati): la disciplina è la stessa.
function ogg(v: unknown, percorso: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un oggetto');
  return v as Record<string, unknown>;
}
function arr(v: unknown, percorso: string): unknown[] {
  if (!Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un array');
  return v;
}
function str(v: unknown, percorso: string): string {
  if (typeof v !== 'string') throw new PianoNonValidoError(percorso, 'non è una stringa');
  return v;
}
function intero(v: unknown, percorso: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new PianoNonValidoError(percorso, 'non è un intero');
  return v;
}

const ARCHETIPI = new Set(['menu_settimanale', 'giornata_unica', 'griglia_alternative', 'giorni_tipo']);

function validaVoce(v: unknown, percorso: string, giorniTipo: boolean): VocePagina {
  const vo = ogg(v, percorso);
  const settimana = intero(vo.settimana, `${percorso}.settimana`);
  if (settimana < 1 || settimana > 4) throw new PianoNonValidoError(`${percorso}.settimana`, 'fuori da 1..4');
  const giorno = intero(vo.giorno, `${percorso}.giorno`);
  if (giorno < 0 || (!giorniTipo && giorno > 6)) throw new PianoNonValidoError(`${percorso}.giorno`, 'fuori intervallo');
  const titoloGrezzo = vo.titolo === undefined || vo.titolo === null ? null : str(vo.titolo, `${percorso}.titolo`);
  if (giorniTipo && (titoloGrezzo === null || titoloGrezzo.trim() === ''))
    throw new PianoNonValidoError(`${percorso}.titolo`, 'obbligatorio per giorni_tipo');
  if (!giorniTipo && titoloGrezzo !== null)
    throw new PianoNonValidoError(`${percorso}.titolo`, 'ammesso solo per giorni_tipo');
  const pasti = arr(vo.pasti, `${percorso}.pasti`).map((p, i) => {
    const nome = str(p, `${percorso}.pasti[${i}]`);
    if (nome.trim() === '') throw new PianoNonValidoError(`${percorso}.pasti[${i}]`, 'vuoto');
    return nome;
  });
  return { settimana, giorno, titolo: titoloGrezzo, pasti };
}

function validaIndiceEstrazione(v: unknown): IndiceEstrazione {
  const ind = ogg(v, 'indice');
  const archetipo = str(ind.archetipo, 'indice.archetipo');
  if (!ARCHETIPI.has(archetipo)) throw new PianoNonValidoError('indice.archetipo', `sconosciuto: ${archetipo}`);
  const giorniTipo = archetipo === 'giorni_tipo';
  const pagine = arr(ind.pagine, 'indice.pagine');
  if (pagine.length === 0) throw new PianoNonValidoError('indice.pagine', 'vuoto');
  const pagineValidate = pagine.map((p, k) => {
    const pa = ogg(p, `indice.pagine[${k}]`);
    const pagina = intero(pa.pagina, `indice.pagine[${k}].pagina`);
    if (pagina < 1) throw new PianoNonValidoError(`indice.pagine[${k}].pagina`, 'non è un intero positivo');
    const continuaDallaPrecedente = pa.continuaDallaPrecedente;
    if (typeof continuaDallaPrecedente !== 'boolean')
      throw new PianoNonValidoError(`indice.pagine[${k}].continuaDallaPrecedente`, 'non è un booleano');
    const contenuto = arr(pa.contenuto, `indice.pagine[${k}].contenuto`).map((c, i) =>
      validaVoce(c, `indice.pagine[${k}].contenuto[${i}]`, giorniTipo));
    return { pagina, continuaDallaPrecedente, contenuto };
  });
  // Numerate 1..N nell'ordine di invio: niente buchi, doppioni o disordine.
  if (pagineValidate.some((p, k) => p.pagina !== k + 1))
    throw new PianoNonValidoError('indice.pagine', 'non contigue');
  return {
    archetipo: archetipo as ArchetipoImportabile,
    fonte: str(ind.fonte, 'indice.fonte'),
    pagine: pagineValidate,
    noteEstrazione: arr(ind.noteEstrazione, 'indice.noteEstrazione').map((n, i) => str(n, `indice.noteEstrazione[${i}]`)),
  };
}

/** Stessa disciplina di validaEsito: il ramo rifiuto è proprio quello di valida.ts. */
export function validaIndice(v: unknown): EsitoIndice {
  const e = ogg(v, 'esito');
  if (e.tipo === 'indice') return { tipo: 'indice', indice: validaIndiceEstrazione(e.indice) };
  if (e.tipo === 'rifiuto') {
    const esito = validaEsito(v);
    if (esito.tipo !== 'rifiuto') throw new PianoNonValidoError('esito.tipo', 'né indice né rifiuto');
    return esito;
  }
  throw new PianoNonValidoError('esito.tipo', 'né indice né rifiuto');
}
