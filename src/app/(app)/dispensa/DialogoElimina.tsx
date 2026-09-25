'use client';

import { DialogoConferma } from '@/components/DialogoConferma';

interface Props {
  nome: string;
  porzioni: number;
  impegnate: number;
  onAnnulla: () => void;
  onElimina: () => Promise<void>;
}

/**
 * Il dialogo di eliminazione del lotto (spec fase 4 §G, v1 06b): un uso di `DialogoConferma`
 * (spec fase 5 §D). Il velo non chiude: si esce da ANNULLA. Va dentro un `FoglioDalBasso` con
 * `ruolo="alertdialog"`, `livello={2}`, `altezza="contenuto"` e `chiudiDalVelo={false}`.
 */
export function DialogoElimina({ nome, porzioni, impegnate, onAnnulla, onElimina }: Props) {
  const quante = porzioni === 1 ? '1 porzione' : `${porzioni} porzioni`;
  const impegno = impegnate === 0
    ? ''
    : impegnate === 1
      ? ' 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.'
      : ` ${impegnate} sono impegnate dai pasti in programma: dopo, quei pasti non le trovano più.`;

  return (
    <DialogoConferma
      titolo="Elimini il lotto?"
      testo={`${nome}, ${quante}.${impegno}`}
      azione="ELIMINA"
      tono="distruttivo"
      erroreTesto="Non siamo riusciti a salvare. Riprova."
      onConferma={onElimina}
      onAnnulla={onAnnulla}
    />
  );
}
