'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useSlotDock } from './dock-slot';

/**
 * Il posto dell'azione principale: una pillola bianca a portata di pollice
 * sopra la tab bar, che scende con lei quando la barra si restringe
 * (DESIGN.md §8 Dock, una riga sola dal 20/09).
 *
 * Si monta con un portale in uno slot del `Guscio`, non dove è scritto nella
 * pagina. Le pagine stanno dentro `<main className="guscio-main">`, che
 * scorre: un figlio assoluto dentro un contenitore che scorre è la
 * situazione in cui iOS lo taglia o lo trascina. Nello slot il Dock è
 * fratello della tab bar e la domanda non si pone.
 *
 * Finché lo slot non c'è (primo render, prima che il ref si attacchi) non
 * renderizza: nessuna delle schermate mostra il Dock prima che i dati
 * arrivino, quindi non si vede nessun salto.
 */
export function Dock({ children }: { children: ReactNode }) {
  const slot = useSlotDock();
  if (slot === null) return null;
  return createPortal(<div className="dock anim-dock">{children}</div>, slot);
}
