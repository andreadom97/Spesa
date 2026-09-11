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
 * Perché un timeout: una rete lenta (o una richiesta che non torna mai) non
 * deve tenere l'app a schermo bianco. Dopo `TIMEOUT_MS` il cancello si apre
 * comunque: la semina, se ancora in corso, finisce in sottofondo — è
 * idempotente, quindi al peggio le pagine vedono per un istante tabelle
 * vuote e alla prossima apertura tutto è al suo posto. Un errore arrivato
 * dopo lo scadere finisce comunque in console.
 *
 * Il ref serve per React Strict Mode in sviluppo, che monta, smonta e rimonta
 * il componente eseguendo l'effetto due volte: senza il ref l'insert dei 71
 * ingredienti partirebbe due volte in parallelo, e non c'è vincolo di unicità
 * sul nome a fermarlo. Il ref sopravvive allo smontaggio simulato, quindi la
 * seconda esecuzione esce subito. Non c'è una bandiera di annullamento per la
 * stessa ragione: la prima esecuzione deve poter aprire il cancello anche se
 * Strict Mode l'ha "smontata" nel frattempo.
 */
/** Quanto si aspetta la semina prima di aprire comunque il cancello. */
export const TIMEOUT_MS = 4000;

export function PrimoAvvio({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const avviato = useRef(false);

  useEffect(() => {
    if (avviato.current) return;
    avviato.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scadenza = new Promise<void>((risolvi) => {
      timer = setTimeout(risolvi, TIMEOUT_MS);
    });
    const semina = assicuraDatiIniziali()
      .then(() => undefined)
      .catch((e: unknown) => {
        console.error('primo avvio: semina iniziale fallita.', e);
      });
    // Nessuna delle due può rigettare: la semina ha già il suo catch. Chi
    // arriva prima apre il cancello; il timer si spegne in ogni caso.
    Promise.race([semina, scadenza]).finally(() => {
      clearTimeout(timer);
      setPronto(true);
    });
  }, []);

  if (!pronto) return null;
  return <>{children}</>;
}
