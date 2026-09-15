'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Sotto questo intervallo fra i due tap il secondo si ignora: due `click` a
 * ~100 ms sono un doppio tap involontario (o un dito che rimbalza), non una
 * conferma. Il bottone resta armato e aspetta un tap vero.
 */
export const RITARDO_MINIMO_MS = 350;

/** Armato e dimenticato: dopo questo tempo si disarma da solo. */
export const DISARMO_MS = 6000;

/**
 * Conferma in due tocchi: il primo tap arma il bottone (il testo diventa
 * "SICURO?"), solo il secondo chiama `onConferma`. Un tap fuori dal bottone
 * disarma, e dopo `DISARMO_MS` si disarma da sé. Il secondo tap conta solo
 * se arriva almeno `RITARDO_MINIMO_MS` dopo il primo (review del 15/09): un
 * doppio tap involontario armava e confermava in un colpo solo, e la
 * conferma in due tocchi serve proprio a non farlo. Non dipende da altro
 * stato della pagina, quindi vive da sé e lo usano Impostazioni (TOGLI, ESCI
 * DALLA CASA, ESCI DALL'ACCOUNT) e Lista (RIFAI LA LISTA). `disabled` serve
 * mentre una conferma è in corso.
 */
export function BottoneDueTocchi({ testo, onConferma, disabled, style }: {
  testo: string; onConferma: () => void; disabled?: boolean; style?: CSSProperties;
}) {
  const [armato, setArmato] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  // Quando è partito l'armamento: il secondo tap si confronta con questo.
  const armatoAlRef = useRef(0);

  // Finché è armato: un tap fuori disarma, e un timer disarma da solo. La
  // pulizia dell'effetto toglie il listener e spegne il timer sia al
  // disarmo (per tap, conferma o scadenza) sia allo smontaggio.
  useEffect(() => {
    if (!armato) return;
    function fuoriDalBottone(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setArmato(false);
    }
    document.addEventListener('click', fuoriDalBottone);
    const timer = setTimeout(() => setArmato(false), DISARMO_MS);
    return () => {
      document.removeEventListener('click', fuoriDalBottone);
      clearTimeout(timer);
    };
  }, [armato]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!armato) {
          armatoAlRef.current = Date.now();
          setArmato(true);
          return;
        }
        if (Date.now() - armatoAlRef.current < RITARDO_MINIMO_MS) return;
        setArmato(false);
        onConferma();
      }}
      style={style}
    >
      {armato ? 'SICURO?' : testo}
    </button>
  );
}
