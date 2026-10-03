import type { Scelta } from '@/domain/types';

/**
 * Il piatto che lo slot del poster aveva prima del primo scambio fatto da Oggi (spec §C.6).
 * Una voce sola: il poster mostra uno slot alla volta. `sessionStorage` può lanciare
 * (navigazione privata, spazio esaurito): in quel caso l'annullo semplicemente non c'è.
 */
export interface PianoPrima { slotId: string; dishId: string; scelte: Record<string, Scelta> }

const CHIAVE = 'spesa:oggi-piano-prima';

export function leggiPianoPrima(slotId: string): PianoPrima | null {
  try {
    const grezzo = window.sessionStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const p = JSON.parse(grezzo) as PianoPrima;
    if (p.slotId === slotId) return p;
    window.sessionStorage.removeItem(CHIAVE);
    return null;
  } catch {
    return null;
  }
}

export function salvaPianoPrima(p: PianoPrima): void {
  try {
    if (leggiPianoPrima(p.slotId)) return;
    window.sessionStorage.setItem(CHIAVE, JSON.stringify(p));
  } catch {
    // Senza memoria non c'è annullo.
  }
}

export function dimenticaPianoPrima(): void {
  try {
    window.sessionStorage.removeItem(CHIAVE);
  } catch {
    // Niente da fare.
  }
}
