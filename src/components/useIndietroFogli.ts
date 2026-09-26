'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Per quanto un `popstate` atteso resta atteso dopo il nostro `go()`. Nel
 * browser arriva in 16–33 ms (fase 3). La scadenza copre una traversata che il
 * browser fonde con un'altra senza mandare due `popstate` [ipotesi, non
 * misurata]: senza, l'atteso mai arrivato si mangerebbe il prossimo gesto
 * indietro dell'utente, che non chiuderebbe niente.
 */
const ATTESA_POPSTATE_MS = 1000;

/**
 * Il gesto indietro del telefono con fogli, dialoghi, widget o pannelli aperti: chiude
 * l'ultimo livello invece di uscire dalla pagina. Nato nella Dispensa (PR #7), di uso comune
 * dalla fase 5 (spec §A.4). È il modello di /importa
 * (fase 3, spec §G) esteso a più livelli: ogni livello aperto ha una voce
 * nella cronologia, sullo stesso URL.
 *
 * `profondita` è quanti livelli sono aperti, calcolata dallo stato della
 * pagina. L'hook tiene in `voci` quante voci ha messo, e le allinea:
 * - `profondita > voci`: `pushState(null, '')` per la differenza;
 * - `profondita < voci` perché l'interfaccia ha chiuso (X, velo, ANNULLA,
 *   AGGIUNGI, ELIMINA, CREA…): un solo `history.go(-(voci - profondita))`, e
 *   il `popstate` che ne segue, se arriva entro `ATTESA_POPSTATE_MS`, è
 *   atteso: non chiude altro. `voci` si aggiorna
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
 * **`chiudiTuttoPoi(fn)`** (spec fase 5 §A.5) serve a lasciare la pagina con livelli aperti.
 * Se il chiamante chiudesse e navigasse subito, il `go(-n)` dell'hook e la navigazione
 * correrebbero insieme, e la traversata porterebbe indietro anche la pagina nuova. Il
 * chiamante registra `fn` e, nello stesso gesto, porta il suo stato a profondità 0: l'hook
 * consuma le voci con un `go(-n)` ed esegue `fn` al `popstate` che lo conclude. Senza voci
 * aperte `fn` parte nell'effetto. Se il `popstate` non arriva entro `ATTESA_POPSTATE_MS`,
 * `fn` parte comunque. In ogni caso una volta sola; una seconda chiamata prima che parta
 * sostituisce la prima. Allo smontaggio una `fn` in attesa si butta.
 *
 * **`fn` parte sempre un giro dopo** (`setTimeout(fn, 0)`), mai dentro l'ascoltatore. Gli
 * effetti della pagina girano prima di quello dell'`AppRouter`, quindi il nostro ascoltatore
 * `popstate` sente la traversata prima di Next. Se `fn` facesse `router.push` lì dentro, la
 * traversata che Next manda subito dopo segnerebbe la push in volo come scartata
 * (`next/dist/client/components/app-router-instance.js`, righe 147–150), e la pagina nuova non
 * arriverebbe. Misurato nel browser dalla sonda del Task 2 della fase 5 (registro della fase
 * 5): con la push dentro il `popstate` la pagina resta quella di partenza; con la push un giro
 * dopo arriva, con una voce sola in più e l'indietro che torna alla pagina di partenza.
 *
 * `chiudiUltimo` si legge da un ref: l'ascoltatore si aggancia una volta sola.
 */
export function useIndietroFogli(
  profondita: number,
  chiudiUltimo: () => void,
): { chiudiTuttoPoi: (fn: () => void) => void } {
  const voci = useRef(0);
  // I `popstate` dei nostri `go()` ancora da arrivare: il browser ne manda uno per traversata.
  const attesi = useRef(0);
  // Fin quando un atteso vale (`performance.now()`): dopo, il popstate è dell'utente.
  const attesiFino = useRef(0);
  const chiudi = useRef(chiudiUltimo);
  // chiudiTuttoPoi: cosa fare quando le voci sono consumate, e il timer di riserva.
  const dopo = useRef<(() => void) | null>(null);
  const riserva = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Il giro dopo in cui fn parte davvero (vedi la docstring).
  const differita = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ogni chiudiTuttoPoi fa girare un effetto: serve quando non ci sono voci da consumare.
  const [richieste, setRichieste] = useState(0);

  useEffect(() => {
    chiudi.current = chiudiUltimo;
  });

  /**
   * Fa partire la funzione in attesa un giro dopo, una volta sola, e spegne il timer di
   * riserva. Un giro dopo, e non qui, perché Next scarterebbe la navigazione (docstring).
   */
  const esegui = useCallback(() => {
    const fn = dopo.current;
    dopo.current = null;
    if (riserva.current !== null) {
      clearTimeout(riserva.current);
      riserva.current = null;
    }
    if (fn === null) return;
    differita.current = setTimeout(() => {
      differita.current = null;
      fn();
    }, 0);
  }, []);

  /** Il popstate atteso può non arrivare mai: fn parte comunque allo scadere dell'attesa. */
  const armaRiserva = useCallback(() => {
    if (dopo.current === null || riserva.current !== null) return;
    riserva.current = setTimeout(esegui, ATTESA_POPSTATE_MS);
  }, [esegui]);

  useEffect(() => {
    if (profondita > voci.current) {
      for (let i = voci.current; i < profondita; i++) window.history.pushState(null, '');
      voci.current = profondita;
    } else if (profondita < voci.current) {
      const passi = voci.current - profondita;
      voci.current = profondita;
      attesi.current += 1;
      attesiFino.current = performance.now() + ATTESA_POPSTATE_MS;
      window.history.go(-passi);
      armaRiserva();
    }
  }, [profondita, armaRiserva]);

  // Dopo l'effetto della profondità, di proposito: se nello stesso render il chiamante è sceso
  // a 0, il go() è già partito e fn aspetta il suo popstate.
  useEffect(() => {
    if (richieste === 0 || dopo.current === null) return;
    // Il chiamante non ha ancora chiuso: fn aspetta la discesa e il suo popstate.
    if (voci.current > 0) return;
    const inArrivo = attesi.current > 0 && performance.now() < attesiFino.current;
    if (inArrivo) armaRiserva();
    else esegui();
  }, [richieste, esegui, armaRiserva]);

  useEffect(() => {
    const suPopstate = () => {
      if (attesi.current > 0 && performance.now() < attesiFino.current) {
        attesi.current -= 1;
        if (attesi.current === 0 && voci.current === 0 && dopo.current !== null) esegui();
        return;
      }
      // Un atteso mai arrivato non si mangia il gesto dell'utente.
      attesi.current = 0;
      // Senza livelli aperti il popstate è la navigazione della pagina: non è nostro.
      if (voci.current === 0) return;
      voci.current -= 1;
      chiudi.current();
    };
    window.addEventListener('popstate', suPopstate);
    return () => {
      window.removeEventListener('popstate', suPopstate);
      if (riserva.current !== null) clearTimeout(riserva.current);
      riserva.current = null;
      if (differita.current !== null) clearTimeout(differita.current);
      differita.current = null;
      dopo.current = null;
    };
  }, [esegui]);

  const chiudiTuttoPoi = useCallback((fn: () => void) => {
    // Sostituisce anche una fn già differita e non ancora partita.
    if (differita.current !== null) {
      clearTimeout(differita.current);
      differita.current = null;
    }
    dopo.current = fn;
    setRichieste((n) => n + 1);
  }, []);

  return { chiudiTuttoPoi };
}
