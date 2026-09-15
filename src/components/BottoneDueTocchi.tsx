'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Conferma in due tocchi: il primo tap arma il bottone (il testo diventa
 * "SICURO?"), solo il secondo chiama `onConferma`. Un tap fuori dal bottone
 * disarma. Non dipende da altro stato della pagina, quindi vive da sé e lo
 * usano Impostazioni (TOGLI, ESCI DALLA CASA) e Lista (RIFAI LA LISTA).
 * `disabled` serve mentre una conferma è in corso.
 */
export function BottoneDueTocchi({ testo, onConferma, disabled, style }: {
  testo: string; onConferma: () => void; disabled?: boolean; style?: CSSProperties;
}) {
  const [armato, setArmato] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armato) return;
    function fuoriDalBottone(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setArmato(false);
    }
    document.addEventListener('click', fuoriDalBottone);
    return () => document.removeEventListener('click', fuoriDalBottone);
  }, [armato]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armato) {
          setArmato(false);
          onConferma();
        } else {
          setArmato(true);
        }
      }}
      style={style}
    >
      {armato ? 'SICURO?' : testo}
    </button>
  );
}
