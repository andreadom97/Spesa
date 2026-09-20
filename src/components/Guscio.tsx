'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { MarchioProvider } from './marchio-context';

export type StatoBarra = 'grande' | 'ridotta';

/** Soglie della spec §B: si riduce oltre 24 di scrollTop scendendo di ≥ 6; torna grande salendo di ≥ 6 o sotto 8. */
export function calcolaStatoBarra(prec: StatoBarra, scrollTop: number, delta: number): StatoBarra {
  if (scrollTop < 8) return 'grande';
  if (delta <= -6) return 'grande';
  if (delta >= 6 && scrollTop > 24) return 'ridotta';
  return prec;
}

/**
 * Il guscio dell'app: fondo a gradiente, contenuto, tab bar flottante sopra.
 * Gli eventi `scroll` non risalgono ma si catturano: un solo ascoltatore sul
 * documento vede tutti gli scroller delle pagine, senza che le pagine sappiano
 * nulla. Lo stato è esposto come `data-barra`: il CSS decide --fine e misure.
 */
export function Guscio({ children }: { children: ReactNode }) {
  const [barra, setBarra] = useState<StatoBarra>('grande');
  const pathname = usePathname();
  const ultimo = useRef(new WeakMap<Element, number>());

  useEffect(() => { setBarra('grande'); }, [pathname]);

  useEffect(() => {
    const h = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || !t.classList.contains('scroll-app')) return;
      const top = t.scrollTop;
      // Primo scroll mai visto per questo elemento: la base è la cima (0), non `top` stesso
      // (altrimenti il primo evento avrebbe sempre delta 0 e non ridurrebbe mai la barra).
      const prec = ultimo.current.get(t) ?? 0;
      ultimo.current.set(t, top);
      setBarra((s) => calcolaStatoBarra(s, top, top - prec));
    };
    document.addEventListener('scroll', h, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', h, { capture: true });
  }, []);

  return (
    <MarchioProvider>
      <div className="guscio" data-barra={barra}>
        <main className="guscio-main">{children}</main>
        <TabBar />
      </div>
    </MarchioProvider>
  );
}
