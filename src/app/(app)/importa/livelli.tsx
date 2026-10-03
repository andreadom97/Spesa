'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PassoRevisione } from '@/domain/import/types';
import { useIndietroFogli } from '@/components/useIndietroFogli';

/** Le voci di cronologia dei passi (spec 8c §F): entrare in un passo ne spinge una. */
const VOCI_PASSO: Record<PassoRevisione, number> = { revisione: 1, formati: 2, riepilogo: 3 };

/** Quello che un passo dice alla pagina dei suoi livelli aperti. */
interface LivelliPasso {
  profondita: number;
  chiudiUltimo: () => void;
  indietroPasso: () => void;
}

interface ContestoLivelli {
  registra: (livelli: LivelliPasso | null) => void;
  chiudiTuttoPoi: (fn: () => void) => void;
  esci: () => void;
}

const Contesto = createContext<ContestoLivelli | null>(null);

/**
 * L'indietro di Android nella bozza di Importa (spec 8c §F): l'UNICO `useIndietroFogli` attivo
 * della schermata (lezione 8b). Le sue voci sono quelle dei passi (`VOCI_PASSO`) più i livelli
 * aperti del passo, che il passo dichiara con `useLivelliImporta`. Il gesto indietro chiude
 * l'ultimo livello del passo; senza livelli chiama l'indietro del passo. `esci()` e
 * `chiudiTuttoPoi(fn)` portano la profondità a zero, consumano tutte le voci, poi partono.
 */
export function LivelliImporta({ passo, onEsci, children }: { passo: PassoRevisione; onEsci: () => void; children: ReactNode }) {
  const [livelli, setLivelli] = useState(0);
  const [uscendo, setUscendo] = useState(false);
  const registrato = useRef<LivelliPasso | null>(null);
  const esciRef = useRef(onEsci);
  useEffect(() => {
    esciRef.current = onEsci;
  });
  const { chiudiTuttoPoi } = useIndietroFogli(uscendo ? 0 : VOCI_PASSO[passo] + livelli, () => {
    const passoAperto = registrato.current;
    if (!passoAperto) return;
    if (passoAperto.profondita > 0) passoAperto.chiudiUltimo();
    else passoAperto.indietroPasso();
  });
  const valore = useMemo<ContestoLivelli>(() => ({
    registra: (l) => {
      registrato.current = l;
      setLivelli(l?.profondita ?? 0);
    },
    chiudiTuttoPoi: (fn) => {
      setUscendo(true);
      chiudiTuttoPoi(fn);
    },
    esci: () => {
      setUscendo(true);
      chiudiTuttoPoi(() => esciRef.current());
    },
  }), [chiudiTuttoPoi]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

/**
 * Come `useIndietroFogli`, per i passi di Importa. Dentro `LivelliImporta` registra i livelli del
 * passo presso la pagina, e il suo `useIndietroFogli` resta a profondità 0 (inerte: non spinge
 * voci, e il suo ascoltatore esce subito con zero voci). Fuori (i test di componente) fa da sé,
 * come prima dell'8c. `indietroPasso` è l'indietro senza livelli aperti.
 */
export function useLivelliImporta(
  profondita: number,
  chiudiUltimo: () => void,
  indietroPasso?: () => void,
): { chiudiTuttoPoi: (fn: () => void) => void; esci: () => void } {
  const ctx = useContext(Contesto);
  const proprio = useIndietroFogli(ctx ? 0 : profondita, chiudiUltimo);
  const chiudiRef = useRef(chiudiUltimo);
  const passoRef = useRef(indietroPasso);
  useEffect(() => {
    chiudiRef.current = chiudiUltimo;
    passoRef.current = indietroPasso;
  });
  useEffect(() => {
    ctx?.registra({ profondita, chiudiUltimo: () => chiudiRef.current(), indietroPasso: () => passoRef.current?.() });
  }, [ctx, profondita]);
  useEffect(() => () => ctx?.registra(null), [ctx]);
  return ctx ? { chiudiTuttoPoi: ctx.chiudiTuttoPoi, esci: ctx.esci } : { chiudiTuttoPoi: proprio.chiudiTuttoPoi, esci: () => {} };
}

/** L'uscita da Importa con le voci dei passi da consumare (la pillola della testata); null fuori dalla bozza. */
export function useEsciImporta(): (() => void) | null {
  return useContext(Contesto)?.esci ?? null;
}
