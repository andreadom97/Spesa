import type { UnitaBase } from './types';

export interface VoceContesto {
  id: string;
  nome: string;
  unitaBase: UnitaBase;
  formatoConfezione: number;
  residuo: number;
  congelato: boolean;
}

export type ContestoDispensa = VoceContesto[];

export interface ModificaProposta {
  ingredientId: string;
  campo: 'residuo' | 'congelato';
  valoreNuovo: number | boolean;
  /** Sempre riscritto da validaProposte col valore del contesto: è ciò che Annulla riscrive, e il modello non è fonte di verità sull'attuale. */
  valoreAttuale: number | boolean;
  /** 0..1, per modifica. */
  confidence: number;
  /** Una frase mostrata nel recap: "«l'olio è a metà» → 500 di 1000 ml". */
  motivazione: string;
}

export interface EsitoCorrezione {
  proposte: ModificaProposta[];
  nonRiconosciuti: string[];
}

/** ≥ soglia: si applica subito col recap e Annulla; sotto: proposta da confermare (spec §4). */
export const CONFIDENCE_SOGLIA = 0.9;

export class EsitoNonValidoError extends Error {
  constructor(motivo: string) {
    super(`Esito della correzione non valido: ${motivo}`);
    this.name = 'EsitoNonValidoError';
  }
}

/**
 * L'unico varco fra il modello (o il mock) e le scritture: o l'esito è
 * integralmente valido o non si applica nulla (spec §2, §7). Riscrive
 * valoreAttuale dal contesto e risolve i conflitti interni tenendo l'ultima
 * proposta per (ingrediente, campo) — l'ordine della nota è l'ordine delle
 * proposte (spec §4).
 */
export function validaProposte(grezzo: unknown, contesto: ContestoDispensa): EsitoCorrezione {
  if (typeof grezzo !== 'object' || grezzo === null) throw new EsitoNonValidoError('non è un oggetto');
  const o = grezzo as Record<string, unknown>;
  if (!Array.isArray(o.proposte)) throw new EsitoNonValidoError('proposte mancanti');
  if (!Array.isArray(o.nonRiconosciuti)) throw new EsitoNonValidoError('nonRiconosciuti mancanti');
  if (!o.nonRiconosciuti.every((n) => typeof n === 'string')) {
    throw new EsitoNonValidoError('nonRiconosciuti non è una lista di stringhe');
  }

  const perId = new Map(contesto.map((v) => [v.id, v]));
  const perChiave = new Map<string, ModificaProposta>();

  for (const grezza of o.proposte) {
    if (typeof grezza !== 'object' || grezza === null) throw new EsitoNonValidoError('proposta non oggetto');
    const p = grezza as Record<string, unknown>;
    const voce = typeof p.ingredientId === 'string' ? perId.get(p.ingredientId) : undefined;
    if (!voce) throw new EsitoNonValidoError(`ingrediente sconosciuto: ${String(p.ingredientId)}`);
    if (p.campo !== 'residuo' && p.campo !== 'congelato') {
      throw new EsitoNonValidoError(`campo non ammesso: ${String(p.campo)}`);
    }
    if (p.campo === 'residuo') {
      if (typeof p.valoreNuovo !== 'number' || !Number.isFinite(p.valoreNuovo) || p.valoreNuovo < 0) {
        throw new EsitoNonValidoError(`residuo non valido: ${String(p.valoreNuovo)}`);
      }
    } else if (typeof p.valoreNuovo !== 'boolean') {
      throw new EsitoNonValidoError(`congelato non booleano: ${String(p.valoreNuovo)}`);
    }
    if (typeof p.confidence !== 'number' || !Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1) {
      throw new EsitoNonValidoError(`confidence fuori range: ${String(p.confidence)}`);
    }
    if (typeof p.motivazione !== 'string') throw new EsitoNonValidoError('motivazione non stringa');

    // Ultima vince: la Map sovrascrive la precedente sulla stessa chiave,
    // e l'ordine di inserimento conserva l'ordine della nota.
    perChiave.set(`${voce.id}|${p.campo}`, {
      ingredientId: voce.id,
      campo: p.campo,
      valoreNuovo: p.valoreNuovo,
      valoreAttuale: p.campo === 'residuo' ? voce.residuo : voce.congelato,
      confidence: p.confidence,
      motivazione: p.motivazione,
    });
  }

  return { proposte: [...perChiave.values()], nonRiconosciuti: o.nonRiconosciuti as string[] };
}
