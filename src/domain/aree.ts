import type { AreaId } from './types';

export interface Area {
  id: AreaId;
  nome: string;
  colore: string;
}

/** Fisse. Aggiungerne o toglierne rompe il marchio a griglia 3×2. */
export const AREE: readonly Area[] = [
  { id: 'ortofrutta', nome: 'ORTOFRUTTA', colore: '#A8D96A' },
  { id: 'macelleria', nome: 'MACELLERIA E PESCHERIA', colore: '#F29B9B' },
  { id: 'latticini', nome: 'LATTICINI, UOVA E SALUMI', colore: '#9CC7F2' },
  { id: 'cereali', nome: 'PASTA, RISO E CEREALI', colore: '#F5CE5B' },
  { id: 'dispensa', nome: 'DISPENSA E CONSERVE', colore: '#F2A465' },
  { id: 'surgelati', nome: 'SURGELATI', colore: '#B9AEF5' },
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

/**
 * L'ordine delle caselle del marchio: la griglia 2×3 verticale ruotata di 90°
 * in senso orario. Riga 1 arancio/azzurro/verde, riga 2 lilla/giallo/corallo.
 * Fisso, indipendente dall'ordine scelto dall'utente per la lista.
 */
export const ORDINE_MARCHIO: AreaId[] = [
  'dispensa', 'latticini', 'ortofrutta',
  'surgelati', 'cereali', 'macelleria',
];
