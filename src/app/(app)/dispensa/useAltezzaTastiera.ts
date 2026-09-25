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
    vv.addEventListener('resize', misura);
    vv.addEventListener('scroll', misura);
    return () => {
      vv.removeEventListener('resize', misura);
      vv.removeEventListener('scroll', misura);
    };
  }, []);
  return altezza;
}
