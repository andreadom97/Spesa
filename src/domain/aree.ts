import type { AreaId } from './types';

export interface Area {
  id: AreaId;
  nome: string;
  colore: string;
  /** Tono medio (26/09): stessa tinta OKLCH, luminosità abbassata fino a 2,8:1 su bianco. Solo icone ingrediente. */
  tonoMedio: string;
  /** Il colore al 26% della Dispensa steso sul bianco: colore opaco dell'alone sul nome. */
  tintaOpaca: string;
}

/** Fisse. Aggiungerne o toglierne rompe il marchio a griglia 3×2. */
export const AREE: readonly Area[] = [
  { id: 'ortofrutta', nome: 'ORTOFRUTTA', colore: '#A8D96A', tonoMedio: '#7AA838', tintaOpaca: '#E8F5D8' },
  { id: 'macelleria', nome: 'MACELLERIA E PESCHERIA', colore: '#F29B9B', tonoMedio: '#D88384', tintaOpaca: '#FCE5E5' },
  { id: 'latticini', nome: 'LATTICINI, UOVA E SALUMI', colore: '#9CC7F2', tonoMedio: '#759EC8', tintaOpaca: '#E5F0FC' },
  { id: 'cereali', nome: 'PASTA, RISO E CEREALI', colore: '#F5CE5B', tonoMedio: '#BB9609', tintaOpaca: '#FCF2D4' },
  { id: 'dispensa', nome: 'DISPENSA E CONSERVE', colore: '#F2A465', tonoMedio: '#D48949', tintaOpaca: '#FCE7D7' },
  { id: 'surgelati', nome: 'SURGELATI', colore: '#B9AEF5', tonoMedio: '#9D91D6', tintaOpaca: '#EDEAFC' },
] as const;

export const ORDINE_AREE_DEFAULT: AreaId[] = AREE.map((a) => a.id);

const PER_ID = new Map(AREE.map((a) => [a.id, a]));

export function coloreArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.colore;
}

export function nomeArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.nome;
}

export function tonoMedioArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.tonoMedio;
}

export function tintaOpacaArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.tintaOpaca;
}

/**
 * L'ordine delle caselle del marchio: la griglia 2×3 verticale ruotata di 90°
 * in senso orario. Riga 1 arancio/azzurro/verde, riga 2 lilla/giallo/corallo.
 * Fisso, indipendente dall'ordine scelto dall'utente per la lista.
 */
export const ORDINE_MARCHIO: AreaId[] = [
  'dispensa', 'latticini', 'ortofrutta',
  'surgelati', 'cereali', 'macelleria',
];
