'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { assicuraDatiIniziali } from '@/data/primo-avvio';

/**
 * Il cancello del primo avvio (spec 2026-09-06, §1): chiama
 * `assicuraDatiIniziali` una volta e mostra i figli solo quando ha finito.
 *
 * Perché nel layout del gruppo `(app)`: quel layout non si rimonta fra una
 * navigazione e l'altra, quindi la semina parte una volta per apertura
 * dell'app, non a ogni pagina.
 *
 * Perché un cancello e non un effetto collaterale: le pagine leggono pasti e
 * ingredienti al mount. Se comparissero durante la semina vedrebbero tabelle
 * vuote nell'istante sbagliato — la Settimana rifiuterebbe di crearsi, Piatti
 * mostrerebbe lo stato vuoto — e non se ne accorgerebbero finché non le si
 * ricarica. Prima di `pronto` non si renderizza nulla.
 *
 * Perché tollerante: un errore finisce in `console.error` e i figli compaiono
 * comunque (`finally`). Un utente esistente non deve restare fuori dall'app per
 * una semina che a lui non serve; un utente nuovo la ritroverà alla prossima
 * apertura, perché la funzione è idempotente.
 *
 * Il ref serve per React Strict Mode in sviluppo, che monta, smonta e rimonta
 * il componente eseguendo l'effetto due volte: senza il ref l'insert dei 71
 * ingredienti partirebbe due volte in parallelo, e non c'è vincolo di unicità
 * sul nome a fermarlo. Il ref sopravvive allo smontaggio simulato, quindi la
 * seconda esecuzione esce subito. Non c'è una bandiera di annullamento per la
 * stessa ragione: la prima esecuzione deve poter aprire il cancello anche se
 * Strict Mode l'ha "smontata" nel frattempo.
 */
export function PrimoAvvio({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const avviato = useRef(false);

  useEffect(() => {
    if (avviato.current) return;
    avviato.current = true;
    assicuraDatiIniziali()
      .catch((e: unknown) => {
        console.error('primo avvio: semina iniziale fallita.', e);
      })
      .finally(() => setPronto(true));
  }, []);

  if (!pronto) return null;
  return <>{children}</>;
}
