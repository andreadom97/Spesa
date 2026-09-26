'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const SlotPiede = createContext<HTMLElement | null>(null);

/** Il Pannello pubblica il nodo del suo piede fisso; fuori dal pannello il nodo non c'è. */
export function SlotPiedeProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <SlotPiede.Provider value={slot}>{children}</SlotPiede.Provider>;
}

/**
 * Il piede fisso del pannello (spec §B.1, §C.9): il primario di Ordine delle aree, Esporta e
 * Casa, fuori dallo scorrimento, sopra un filetto. Un portale nel nodo del Pannello, come il
 * Dock nello slot del Guscio: la sotto-schermata lo scrive dove le serve, e lui va in fondo. Il
 * piede si vede solo finché qualcuno ci monta dentro (`.pannello-piede:empty`).
 */
export function PiedePannello({ children }: { children: ReactNode }) {
  const slot = useContext(SlotPiede);
  if (slot === null) return null;
  return createPortal(children, slot);
}
