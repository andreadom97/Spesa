'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';

/** Il segno che l'avvio l'ha già visto questa sessione di navigazione (spec §J). */
export const CHIAVE_AVVIO = 'spesa:avvio-visto';

/** I tempi della spec §J, in ms dal montaggio. */
export const TEMPI_AVVIO = { volo: 1200, arrivo: 1700, smontaggio: 2100 } as const;

/** I ritardi del pop in ordine di griglia (log §1): l'ordine è quello di ORDINE_MARCHIO. */
export const RITARDI_POP = [0, 340, 170, 255, 85, 425] as const;

/** Il Marchio grande del log §1: caselle 40, gap 10, raggio 11,2 (40 × 0,28), bordo 2. */
const LATO = 40;
const GAP = 10;
const RAGGIO = 11.2;
/** Sopra tutto: il pannello, i fogli (fino a 80) e il dialogo stanno sotto. */
const Z_AVVIO = 100;

type Rett = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
export interface Volo { dx: number; dy: number; scala: number }

/**
 * Da dove sta il Marchio grande a dove sta quello della barra: si sposta il
 * centro sul centro, e si scala sulla larghezza (35 / 140 = 0,25). In altezza
 * resta mezzo pixel di scarto, che la dissolvenza finale copre (spec §J).
 */
export function calcolaVolo(da: Rett, a: Rett): Volo {
  return {
    dx: a.left + a.width / 2 - (da.left + da.width / 2),
    dy: a.top + a.height / 2 - (da.top + da.height / 2),
    scala: a.width / da.width,
  };
}

/**
 * Parte solo su `/lista` (lo start_url della PWA), una volta per sessione di
 * navigazione, e mai con `prefers-reduced-motion: reduce`. Senza `matchMedia`
 * non si sa se il moto è permesso, e senza `sessionStorage` non si può
 * promettere «una volta sola»: in entrambi i casi non parte. È un ornamento, e
 * nel dubbio si salta. Se parte, lo segna subito.
 */
export function devePartire(pathname: string | null): boolean {
  if (pathname !== '/lista') return false;
  if (typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (window.sessionStorage.getItem(CHIAVE_AVVIO) !== null) return false;
    window.sessionStorage.setItem(CHIAVE_AVVIO, '1');
    return true;
  } catch {
    return false;
  }
}

/** Il segno della voce Lista in tab bar, se c'è. */
function segnoDellaBarra(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-marchio-barra]');
}

/** Il bersaglio del volo: il Marchio della barra, solo a barra grande (§J: ridotta o assente, niente volo). */
function bersaglioDelVolo(): HTMLElement | null {
  const segno = segnoDellaBarra();
  if (!segno || segno.closest('.guscio')?.getAttribute('data-barra') !== 'grande') return null;
  return (segno.firstElementChild as HTMLElement | null) ?? segno;
}

type Fase = 'pop' | 'volo' | 'arrivo' | 'dissolto';

/**
 * L'animazione, senza condizioni: la monta `AvvioMarchio` quando deve partire,
 * e la sonda del Task 15 a comando. Non ritarda niente: il livello non prende
 * tocchi, e sotto la Lista carica come sempre. Le classi `.anim-avvio-*`
 * stanno in globals.css; i movimenti solo dentro `no-preference`.
 *
 * Il Marchio della barra si nasconde dal montaggio e torna a 1700 mentre
 * quello in volo si dissolve: i due segni non si vedono mai insieme. Si
 * tocca con `classList`, e React non lo sovrascrive: il `className` del segno
 * non cambia fra un render e l'altro della barra.
 */
export function LivelloAvvio({ onFine }: { onFine: () => void }) {
  const marchioRef = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<Fase>('pop');
  const [volo, setVolo] = useState<Volo | null>(null);
  const fine = useRef(onFine);
  useEffect(() => {
    fine.current = onFine;
  });

  useEffect(() => {
    const segno = segnoDellaBarra();
    segno?.classList.add('anim-avvio-rivela', 'anim-avvio-nascosto');
    const timer = [
      setTimeout(() => {
        // Si misura adesso, non al montaggio: a 1200 la barra è quella che l'utente vede.
        const bersaglio = bersaglioDelVolo();
        const el = marchioRef.current;
        if (el && bersaglio) {
          setVolo(calcolaVolo(el.getBoundingClientRect(), bersaglio.getBoundingClientRect()));
          setFase('volo');
        } else {
          segno?.classList.remove('anim-avvio-nascosto');
          setFase('dissolto');
        }
      }, TEMPI_AVVIO.volo),
      setTimeout(() => {
        setFase((f) => (f === 'volo' ? 'arrivo' : f));
        segno?.classList.remove('anim-avvio-nascosto');
      }, TEMPI_AVVIO.arrivo),
      setTimeout(() => fine.current(), TEMPI_AVVIO.smontaggio),
    ];
    return () => {
      timer.forEach(clearTimeout);
      segno?.classList.remove('anim-avvio-rivela', 'anim-avvio-nascosto');
    };
  }, []);

  const classeMarchio = fase === 'volo' ? 'anim-avvio-volo' : fase === 'arrivo' ? 'anim-avvio-volo anim-avvio-svanisce' : undefined;
  return (
    <div
      data-avvio
      aria-hidden="true"
      className={fase === 'dissolto' ? 'anim-avvio-dissolto' : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: Z_AVVIO, pointerEvents: 'none' }}
    >
      <div
        data-avvio-fondo
        className={fase === 'pop' ? undefined : 'anim-avvio-fondo-via'}
        style={{ position: 'absolute', inset: 0, background: 'var(--sfondo-schermata)' }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          ref={marchioRef}
          data-avvio-marchio
          className={classeMarchio}
          style={{
            display: 'grid', gridTemplateColumns: `repeat(3, ${LATO}px)`, gap: GAP, transformOrigin: '50% 50%',
            transform: volo ? `translate(${volo.dx}px, ${volo.dy}px) scale(${volo.scala})` : undefined,
          }}
        >
          {ORDINE_MARCHIO.map((area, i) => (
            <span
              key={area}
              data-avvio-casella
              data-area={area}
              className="anim-avvio-casella"
              style={{
                display: 'block', width: LATO, height: LATO, boxSizing: 'border-box', borderRadius: RAGGIO,
                border: `2px solid ${coloreArea(area)}`, background: coloreArea(area),
                animationDelay: `${RITARDI_POP[i]}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * L'avvio del Marchio (spec fase 5 §J, decisione 16): all'apertura dell'app il
 * Marchio si compone al centro e vola sull'icona della Lista in tab bar. È
 * un'eccezione dichiarata a DESIGN.md §7 (`.anim-avvio`): dura oltre 250 ms e
 * non segue un gesto, perché accade una volta sola ed è il marchio.
 *
 * Si decide una volta, al primo montaggio del Guscio: chi arriva su /piano e poi
 * va sulla Lista non la vede. In un effetto di layout, così il livello c'è
 * prima del primo disegno dopo l'idratazione. Il ref tiene la decisione anche
 * col doppio effetto di Strict Mode.
 */
export function AvvioMarchio() {
  const pathname = usePathname();
  const [parte, setParte] = useState(false);
  const deciso = useRef(false);
  useLayoutEffect(() => {
    if (deciso.current) return;
    deciso.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- una decisione sola, prima del primo disegno
    if (devePartire(pathname)) setParte(true);
  }, [pathname]);
  if (!parte) return null;
  return <LivelloAvvio onFine={() => setParte(false)} />;
}
