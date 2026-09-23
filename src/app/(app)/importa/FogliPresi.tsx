'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

interface Props {
  pagine: { url: string }[];
  onSposta: (indice: number, delta: -1 | 1) => void;
  onTogli: (indice: number) => void;
  onChiudi: () => void;
}

const stileTasto: CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 999, border: 0, padding: 0,
  background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const SU = 'M10 15V5M5 10l5-5 5 5';
const GIU = 'M10 5v10M5 10l5 5 5-5';
const VIA = 'M5 5l10 10M15 5 5 15';

function Icona({ d, spenta }: { d: string; spenta: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={d} stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * «Rivedi i fogli presi» (DESIGN.md §8 Striscia dei fogli presi, spec fase 3
 * §F): un foglio dal basso con le pagine in colonna, nell'ordine in cui
 * l'estrazione le legge. Per ogni pagina la foto vera — senza, spostare i
 * fogli sarebbe spostare delle etichette — e tre tasti: su, giù, togli.
 * Togliere non chiede conferma (DESIGN.md §9): il foglio si rifà con uno scatto.
 *
 * Sta dentro la radice della fotocamera, non in un portale: il velo copre
 * anteprima e banda, e lo stream resta acceso per tornare subito a scattare.
 */
export function FogliPresi({ pagine, onSposta, onTogli, onChiudi }: Props) {
  const foglio = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    foglio.current?.focus();
  }, []);

  const n = pagine.length;
  return (
    <div
      onClick={onChiudi}
      style={{
        position: 'absolute', inset: 0, zIndex: 4, background: 'var(--overlay-foglio)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        ref={foglio}
        role="dialog"
        aria-modal="true"
        aria-label="Rivedi i fogli presi"
        tabIndex={-1}
        className="anim-foglio"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChiudi();
        }}
        style={{
          background: 'var(--superficie)', borderRadius: '22px 22px 0 0', padding: '16px 16px 26px',
          display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 'calc(100% - 88px)',
          boxSizing: 'border-box', outline: 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em',
            textTransform: 'uppercase', color: 'var(--testo-2)', padding: '2px 4px 4px',
          }}
        >
          {n === 1 ? '1 foglio' : `${n} fogli · l'app li legge in quest'ordine`}
        </div>

        <ol
          style={{
            listStyle: 'none', margin: 0, padding: 0, flex: 1, minHeight: 0, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          {pagine.map((p, i) => {
            const numero = i + 1;
            const primo = i === 0;
            const ultimo = i === n - 1;
            return (
              <li key={p.url} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto da object URL locale, non da fonte remota ottimizzabile */}
                <img
                  src={p.url}
                  alt={`Foglio ${numero}`}
                  style={{
                    width: 62, height: 80, flex: 'none', objectFit: 'cover', borderRadius: 14,
                    border: '1px solid rgba(20,22,58,0.09)', boxSizing: 'border-box',
                  }}
                />
                <span aria-hidden="true" style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>
                  {`Foglio ${numero}`}
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <button type="button" aria-label={`Sposta il foglio ${numero} più su`} disabled={primo} onClick={() => onSposta(i, -1)} style={stileTasto}>
                    <Icona d={SU} spenta={primo} />
                  </button>
                  <button type="button" aria-label={`Sposta il foglio ${numero} più giù`} disabled={ultimo} onClick={() => onSposta(i, 1)} style={stileTasto}>
                    <Icona d={GIU} spenta={ultimo} />
                  </button>
                  <button type="button" aria-label={`Togli il foglio ${numero}`} onClick={() => onTogli(i)} style={stileTasto}>
                    <Icona d={VIA} spenta={false} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={onChiudi}
          style={{
            width: '100%', minHeight: 50, borderRadius: 14, border: 0, background: 'rgba(20,22,58,0.04)',
            fontSize: 15.5, fontWeight: 700, color: 'var(--ink)',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
