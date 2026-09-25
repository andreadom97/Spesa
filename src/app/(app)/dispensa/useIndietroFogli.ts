'use client';

import { useEffect, useRef } from 'react';

/**
 * Il gesto indietro del telefono con fogli, dialogo o widget AI aperti: chiude
 * l'ultimo livello invece di uscire dalla Dispensa. È il modello di /importa
 * (fase 3, spec §G) esteso a più livelli: ogni livello aperto ha una voce
 * nella cronologia, sullo stesso URL.
 *
 * `profondita` è quanti livelli sono aperti, calcolata dallo stato della
 * pagina. L'hook tiene in `voci` quante voci ha messo, e le allinea:
 * - `profondita > voci`: `pushState(null, '')` per la differenza;
 * - `profondita < voci` perché l'interfaccia ha chiuso (X, velo, ANNULLA,
 *   AGGIUNGI, ELIMINA, CREA…): un solo `history.go(-(voci - profondita))`, e
 *   il `popstate` che ne segue è atteso: non chiude altro. `voci` si aggiorna
 *   subito, quindi due chiusure di fila non consumano due volte la stessa voce;
 * - un `popstate` non atteso è il gesto indietro: `voci` scende di uno e
 *   `chiudiUltimo` riporta lo stato al livello di sotto, così la profondità
 *   torna uguale a `voci` e non parte nessun `go()`.
 *
 * Misurato nel browser in fase 3 (Next 16): `pushState(null, '')` sullo stesso
 * URL e poi indietro dà un solo `popstate`, niente rimontaggio, URL invariato.
 * `history.state` non riconosce la voce (Next lo riscrive), per questo si
 * contano le voci invece di marcarle. Allo smontaggio la cronologia resta com'è:
 * le voci orfane sono quelle già accettate in fase 3 (spec §K).
 *
 * `chiudiUltimo` si legge da un ref: l'ascoltatore si aggancia una volta sola.
 */
export function useIndietroFogli(profondita: number, chiudiUltimo: () => void) {
  const voci = useRef(0);
  // I `popstate` dei nostri `go()` ancora da arrivare: il browser ne manda uno per traversata.
  const attesi = useRef(0);
  const chiudi = useRef(chiudiUltimo);

  useEffect(() => {
    chiudi.current = chiudiUltimo;
  });

  useEffect(() => {
    if (profondita > voci.current) {
      for (let i = voci.current; i < profondita; i++) window.history.pushState(null, '');
      voci.current = profondita;
    } else if (profondita < voci.current) {
      const passi = voci.current - profondita;
      voci.current = profondita;
      attesi.current += 1;
      window.history.go(-passi);
    }
  }, [profondita]);

  useEffect(() => {
    const suPopstate = () => {
      if (attesi.current > 0) {
        attesi.current -= 1;
        return;
      }
      // Senza livelli aperti il popstate è la navigazione della pagina: non è nostro.
      if (voci.current === 0) return;
      voci.current -= 1;
      chiudi.current();
    };
    window.addEventListener('popstate', suPopstate);
    return () => window.removeEventListener('popstate', suPopstate);
  }, []);
}
