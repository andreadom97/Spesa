'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { MarchioProvider } from './marchio-context';
import { SlotDockProvider } from './dock-slot';

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
  const pathname = usePathname();
  const [stato, setStato] = useState<{ barra: StatoBarra; percorso: string | null }>({ barra: 'grande', percorso: pathname });
  // Inizializzazione pigra: una WeakMap allocata una volta sola, non a ogni render.
  const ultimo = useRef<WeakMap<Element, number> | null>(null);
  if (ultimo.current == null) { ultimo.current = new WeakMap(); }

  // Il nodo dello slot va in stato, non in un ref: il contesto deve
  // ri-renderizzare i figli quando il nodo si attacca, e un ref non lo fa.
  // Il callback del ref è il setter: React lo chiama col nodo al mount.
  const [slotDock, setSlotDock] = useState<HTMLDivElement | null>(null);

  // Cambio di route: la barra torna grande. Aggiustamento dello stato durante il
  // render (pattern React per "stato derivato da una prop"), non in un effetto.
  if (stato.percorso !== pathname) setStato({ barra: 'grande', percorso: pathname });
  const barra = stato.percorso === pathname ? stato.barra : 'grande';

  useEffect(() => {
    const h = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || !t.classList.contains('scroll-app')) return;
      const top = t.scrollTop;
      // Primo scroll mai visto per questo elemento: la base è la cima (0), non `top` stesso
      // (altrimenti il primo evento avrebbe sempre delta 0 e non ridurrebbe mai la barra).
      const prec = ultimo.current!.get(t) ?? 0;
      ultimo.current!.set(t, top);
      setStato((s) => {
        const b = calcolaStatoBarra(s.barra, top, top - prec);
        return b === s.barra ? s : { barra: b, percorso: s.percorso };
      });
    };
    document.addEventListener('scroll', h, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', h, { capture: true });
  }, []);

  return (
    <MarchioProvider>
      <div className="guscio" data-barra={barra}>
        <SlotDockProvider slot={slotDock}>
          <main className="guscio-main">{children}</main>
        </SlotDockProvider>
        {/* Lo slot copre la cornice ma non intercetta niente: `pointer-events: none`
            sul contenitore, `auto` su quello che il Dock ci mette dentro. Senza,
            un velo invisibile mangerebbe lo scorrimento di tutta l'app. */}
        <div className="dock-slot" ref={setSlotDock} />
        <TabBar />
      </div>
    </MarchioProvider>
  );
}
