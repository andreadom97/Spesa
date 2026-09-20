'use client';

import type { ReactNode } from 'react';

/**
 * Stub minimo: il task 3 lo sostituisce con il contesto vero del marchio
 * (colore/area attiva). Qui serve solo perché `Guscio` compili e monti
 * qualcosa al posto del provider definitivo.
 */
export function MarchioProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
