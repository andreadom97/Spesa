'use client';

import { useState } from 'react';
import { MessaggioErrore, TastoSecondario } from './controlli';

export interface PropsDialogo {
  titolo: string;
  testo: string;
  /** Il testo del tasto, es. 'TOGLI'. */
  azione: string;
  /** `distruttivo` pieno in --errore; `primario` pieno in --ink (Esci, che è reversibile). */
  tono: 'distruttivo' | 'primario';
  /** Mostrato sotto i tasti se `onConferma` rifiuta. */
  erroreTesto: string;
  /** Chi la passa chiude il dialogo quando riesce: il dialogo da sé non si chiude mai. */
  onConferma: () => Promise<void>;
}

/**
 * Il Dialogo di conferma (DESIGN.md §8, spec fase 5 §D): titolo, testo, ANNULLA secondario a
 * sinistra e l'azione a destra. Nato come dialogo di eliminazione del lotto nella fase 4, di
 * uso comune dalla fase 5. Va dentro un `FoglioDalBasso` con `ruolo="alertdialog"`,
 * `altezza="contenuto"`, `chiudiDalVelo={false}` e `livello` 2 (sopra un foglio) o 3 (sopra il
 * Pannello impostazioni).
 *
 * Tiene da sé lo stato in volo: entrambi i tasti a 0,5 e `disabled`. Se l'azione fallisce
 * l'errore compare sotto i tasti e i tasti si riaccendono; se riesce il dialogo resta spento
 * finché chi l'ha aperto non lo toglie.
 */
export function DialogoConferma({
  titolo, testo, azione, tono, erroreTesto, onConferma, onAnnulla,
}: PropsDialogo & { onAnnulla: () => void }) {
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);

  async function conferma() {
    if (volo) return;
    setVolo(true);
    setErrore(false);
    try {
      await onConferma();
    } catch {
      setErrore(true);
      setVolo(false);
    }
  }

  return (
    <div style={{ padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)' }}>{titolo}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{testo}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <TastoSecondario onClick={onAnnulla} disabled={volo} style={{ flex: 1 }}>ANNULLA</TastoSecondario>
        <button
          type="button"
          onClick={() => void conferma()}
          disabled={volo}
          style={{
            flex: 1, height: 54, borderRadius: 18, color: 'var(--superficie)', boxShadow: 'var(--ombra-tasto)',
            background: tono === 'distruttivo' ? 'var(--errore)' : 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            opacity: volo ? 0.5 : 1,
          }}
        >
          {azione}
        </button>
      </div>
      {errore && <MessaggioErrore ruolo="alert">{erroreTesto}</MessaggioErrore>}
    </div>
  );
}
