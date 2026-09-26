'use client';

import type { ComponentType } from 'react';
import type { SottoSchermata } from './tipi';
import { Cima } from './Cima';
import { PastiACasa } from './PastiACasa';
import { GestionePasti } from './GestionePasti';
import { Rotazione } from './Rotazione';
import { Ingredienti } from './Ingredienti';
import { OrdineAree } from './OrdineAree';
import { Cadenza } from './Cadenza';
import { Casa } from './Casa';
import { Esporta } from './Esporta';

/** Il contenuto della cima (spec §B.3, §B.4). */
export const CIMA: ComponentType = Cima;

/** Titolo (spec §C, §I) e contenuto di ogni sotto-schermata. */
export const SCHERMATE: Record<SottoSchermata, { titolo: string; Componente: ComponentType }> = {
  'pasti-a-casa': { titolo: 'Pasti a casa', Componente: PastiACasa },
  'gestione-pasti': { titolo: 'Gestione dei pasti', Componente: GestionePasti },
  rotazione: { titolo: 'Rotazione del piano', Componente: Rotazione },
  ingredienti: { titolo: 'Ingredienti', Componente: Ingredienti },
  aree: { titolo: 'Ordine delle aree', Componente: OrdineAree },
  cadenza: { titolo: 'Cadenza dei controlli', Componente: Cadenza },
  casa: { titolo: 'Casa condivisa', Componente: Casa },
  esporta: { titolo: 'Esporta i tuoi dati', Componente: Esporta },
};
