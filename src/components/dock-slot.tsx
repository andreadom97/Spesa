'use client';

import { createContext, useContext, type ReactNode } from 'react';

const Slot = createContext<HTMLElement | null>(null);

/** Pubblica il nodo in cui il Dock si monta: lo renderizza `Guscio`, accanto alla tab bar. */
export function SlotDockProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <Slot.Provider value={slot}>{children}</Slot.Provider>;
}

/** null finché il nodo non è montato: `Dock` in quel caso non renderizza nulla. */
export function useSlotDock(): HTMLElement | null {
  return useContext(Slot);
}
