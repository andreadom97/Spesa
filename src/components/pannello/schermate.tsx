'use client';

import type { ComponentType } from 'react';
import type { SottoSchermata } from './tipi';
import { StatoDatiPannello } from './DatiPannello';

/** Il contenuto di una sotto-schermata prima del suo task: niente. I Task 8–10 lo sostituiscono. */
function SottoSchermataVuota() {
  return null;
}

/** La cima prima del Task 7: solo gli stati dei dati, e un contenitore vuoto per i blocchi. */
function CimaStati() {
  return <StatoDatiPannello>{() => <div className="pannello-cima" />}</StatoDatiPannello>;
}

/** Il contenuto della cima. Il Task 7 mette qui `Cima`. */
export const CIMA: ComponentType = CimaStati;

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
