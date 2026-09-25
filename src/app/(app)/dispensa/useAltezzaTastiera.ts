'use client';

import { useEffect, useState } from 'react';

/**
 * Quanto la tastiera copre dal fondo (spec §H.1), da `visualViewport`: su
 * Android Chrome la tastiera non ridimensiona il layout [ipotesi, da provare
 * sul telefono], quindi un elemento `fixed` a `bottom: 114` finirebbe sotto.
 * 0 senza `visualViewport` o senza tastiera.
 */
export function useAltezzaTastiera(): number {
  const [altezza, setAltezza] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const misura = () => setAltezza(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    // La prima misura: se il widget si apre con la tastiera già su (per
    // esempio col fuoco rimasto nella ricerca), nessun `resize` arriverebbe. Al frame dopo,
    // non dentro l'effetto, così il render iniziale resta quello del server.
    const primo = requestAnimationFrame(misura);
    vv.addEventListener('resize', misura);
    vv.addEventListener('scroll', misura);
    return () => {
      cancelAnimationFrame(primo);
      vv.removeEventListener('resize', misura);
      vv.removeEventListener('scroll', misura);
    };
  }, []);
  return altezza;
}
