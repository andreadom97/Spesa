'use client';

import type { ComponentType } from 'react';
import type { SottoSchermata } from './tipi';
import { Cima } from './Cima';

/** Il contenuto di una sotto-schermata prima del suo task: niente. I Task 8–10 lo sostituiscono. */
function SottoSchermataVuota() {
  return null;
}

/** Il contenuto della cima (spec §B.3, §B.4). */
export const CIMA: ComponentType = Cima;

/** Titolo (spec §C, §I) e contenuto di ogni sotto-schermata. */
export const SCHERMATE: Record<SottoSchermata, { titolo: string; Componente: ComponentType }> = {
  'pasti-a-casa': { titolo: 'Pasti a casa', Componente: SottoSchermataVuota },
  'gestione-pasti': { titolo: 'Gestione dei pasti', Componente: SottoSchermataVuota },
  rotazione: { titolo: 'Rotazione del piano', Componente: SottoSchermataVuota },
  ingredienti: { titolo: 'Ingredienti', Componente: SottoSchermataVuota },
  aree: { titolo: 'Ordine delle aree', Componente: SottoSchermataVuota },
  cadenza: { titolo: 'Cadenza dei controlli', Componente: SottoSchermataVuota },
  casa: { titolo: 'Casa condivisa', Componente: SottoSchermataVuota },
  esporta: { titolo: 'Esporta i tuoi dati', Componente: SottoSchermataVuota },
};
