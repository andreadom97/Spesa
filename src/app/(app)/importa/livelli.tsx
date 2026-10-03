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
  /** Vedi `useLivelliImporta`: il passo non chiede nessuna voce di cronologia, nemmeno la sua. */
  sospeso: boolean;
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
 *
 * **Passo sospeso** (correzione 8c-bis, prove dal telefono del 03/10): mentre il dialogo «Esci
 * dall'import?» è aperto perché è arrivato un indietro, la profondità chiesta è 0, né la voce del
 * passo né quella del dialogo. Altrimenti il dialogo spingerebbe due voci dentro la reazione al
 * `popstate`, senza un tocco dell'utente: Chrome (intervento sulla manipolazione della
 * cronologia) marca da saltare col tasto indietro le voci aggiunte senza attivazione, e il
 * secondo indietro, dopo RESTA, lascerebbe l'app invece di riaprire il dialogo [ipotesi forte,
 * non verificata dentro Chrome; sul Chromium del computer la sequenza funzionava]. Al tocco su
 * RESTA il passo si risveglia e la sua voce torna nell'effetto che segue il click, che ha
 * l'attivazione. Un indietro a dialogo aperto non trova voci nostre: la navigazione è del
 * browser, si torna alla pagina di provenienza (la bozza resta sul server: come ESCI). ESCI con
 * il passo sospeso non ha voci da consumare: la funzione di uscita parte subito.
 */
export function LivelliImporta({ passo, onEsci, children }: { passo: PassoRevisione; onEsci: () => void; children: ReactNode }) {
  const [livelli, setLivelli] = useState(0);
  const [sospeso, setSospeso] = useState(false);
  const [uscendo, setUscendo] = useState(false);
  const registrato = useRef<LivelliPasso | null>(null);
  const esciRef = useRef(onEsci);
  useEffect(() => {
    esciRef.current = onEsci;
  });
  const { chiudiTuttoPoi } = useIndietroFogli(uscendo || sospeso ? 0 : VOCI_PASSO[passo] + livelli, () => {
    const passoAperto = registrato.current;
    if (!passoAperto) return;
    if (passoAperto.profondita > 0) passoAperto.chiudiUltimo();
    else passoAperto.indietroPasso();
  });
  const valore = useMemo<ContestoLivelli>(() => ({
    registra: (l) => {
      registrato.current = l;
      // Nello stesso batch: la profondità non passa mai da «passo + dialogo» prima di sospendersi.
      setLivelli(l?.profondita ?? 0);
      setSospeso(l?.sospeso ?? false);
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
 * come prima dell'8c. `indietroPasso` è l'indietro senza livelli aperti. `sospeso` è per il
 * livello aperto da `indietroPasso` (il dialogo di uscita): niente voci di cronologia finché è
 * vero, vedi `LivelliImporta`.
 */
export function useLivelliImporta(
  profondita: number,
  chiudiUltimo: () => void,
  indietroPasso?: () => void,
  sospeso = false,
): { chiudiTuttoPoi: (fn: () => void) => void; esci: () => void } {
  const ctx = useContext(Contesto);
  const proprio = useIndietroFogli(ctx || sospeso ? 0 : profondita, chiudiUltimo);
  const chiudiRef = useRef(chiudiUltimo);
  const passoRef = useRef(indietroPasso);
  useEffect(() => {
    chiudiRef.current = chiudiUltimo;
    passoRef.current = indietroPasso;
  });
  useEffect(() => {
    ctx?.registra({ profondita, chiudiUltimo: () => chiudiRef.current(), indietroPasso: () => passoRef.current?.(), sospeso });
  }, [ctx, profondita, sospeso]);
  useEffect(() => () => ctx?.registra(null), [ctx]);
  return ctx ? { chiudiTuttoPoi: ctx.chiudiTuttoPoi, esci: ctx.esci } : { chiudiTuttoPoi: proprio.chiudiTuttoPoi, esci: () => {} };
}

/** L'uscita da Importa con le voci dei passi da consumare (la pillola della testata); null fuori dalla bozza. */
export function useEsciImporta(): (() => void) | null {
  return useContext(Contesto)?.esci ?? null;
}
