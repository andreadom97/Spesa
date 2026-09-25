'use client';

import { useState } from 'react';
import { MessaggioErrore, TastoSecondario } from './controlli';

interface Props {
  nome: string;
  porzioni: number;
  impegnate: number;
  onAnnulla: () => void;
  onElimina: () => Promise<void>;
}

/**
 * Il dialogo di eliminazione del lotto (spec §G, v1 06b). Il velo non chiude:
 * si esce da ANNULLA. Va dentro un `FoglioDalBasso` con `ruolo="alertdialog"`,
 * `livello={2}`, `altezza="contenuto"` e `chiudiDalVelo={false}`.
 */
export function DialogoElimina({ nome, porzioni, impegnate, onAnnulla, onElimina }: Props) {
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);
  const quante = porzioni === 1 ? '1 porzione' : `${porzioni} porzioni`;
  const impegno = impegnate === 0
    ? ''
    : impegnate === 1
      ? ' 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.'
      : ` ${impegnate} sono impegnate dai pasti in programma: dopo, quei pasti non le trovano più.`;

  async function elimina() {
    if (volo) return;
    setVolo(true);
    setErrore(false);
    try {
      await onElimina();
    } catch {
      setErrore(true);
      setVolo(false);
    }
  }

  return (
    <div style={{ padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Elimini il lotto?</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{`${nome}, ${quante}.${impegno}`}</p>
      {errore && <MessaggioErrore>Non siamo riusciti a salvare. Riprova.</MessaggioErrore>}
      <div style={{ display: 'flex', gap: 8 }}>
        <TastoSecondario onClick={onAnnulla} disabled={volo} style={{ flex: 1 }}>ANNULLA</TastoSecondario>
        <button
          type="button"
          onClick={() => void elimina()}
          disabled={volo}
          style={{
            flex: 1, height: 54, borderRadius: 18, background: 'var(--errore)', color: 'var(--superficie)', boxShadow: 'var(--ombra-tasto)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', opacity: volo ? 0.5 : 1,
          }}
        >
          ELIMINA
        </button>
      </div>
    </div>
  );
}
