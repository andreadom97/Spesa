'use client';

import { useState } from 'react';
import type { StatoAlternativa } from '@/domain/oggi';
import { IconaIngrediente, alone } from '@/components/IconaIngrediente';
import type { IconaPiatto } from './Poster';

export interface VoceAlternativa { dishId: string; nome: string; stato: StatoAlternativa; icona: IconaPiatto | null }

const LARGHEZZA_CARTA = 252;
const GAP_CAROSELLO = 8;

/** Le due frecce di SCAMBIA, tratto d'azione 2,1 (DESIGN.md §6). */
function IconaScambia() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** La banda «Oppure, con quello che hai» dentro il poster (spec §C.5, variante B1). */
export function Alternative({ voci, inVolo, onScambia }: {
  voci: VoceAlternativa[]; inVolo: boolean; onScambia: (dishId: string) => void;
}) {
  const [indice, setIndice] = useState(0);
  if (voci.length === 0) return null;
  const sola = voci.length === 1;
  return (
    <div style={{ position: 'relative', zIndex: 1, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--poster-filo)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--poster-testo-3)' }}>
        Oppure, con quello che hai
      </span>
      {/* role="list" esplicito: con `list-style: none` Safari toglie la semantica di lista (spec §C.5). */}
      <ul
        role="list"
        className="carosello-oggi"
        style={sola ? undefined : { marginRight: -16, paddingRight: 16 }}
        onScroll={(e) => setIndice(Math.round(e.currentTarget.scrollLeft / (LARGHEZZA_CARTA + GAP_CAROSELLO)))}
      >
        {voci.map((v) => (
          <li key={v.dishId} style={{ width: sola ? '100%' : LARGHEZZA_CARTA }}>
            <div style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 150, borderRadius: 18, background: 'var(--superficie)', padding: '13px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box' }}>
              <span style={{
                alignSelf: 'flex-start', position: 'relative', zIndex: 1, borderRadius: 999, padding: '4px 8px',
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                background: v.stato.tipo === 'tutto' ? 'var(--tinta-neutra)' : 'var(--tinta-avviso)',
                color: v.stato.tipo === 'tutto' ? 'var(--ink)' : 'var(--avviso)',
              }}>
                {v.stato.tipo === 'tutto' ? 'Tutto in casa' : `Manca: ${v.stato.ingrediente.nome}`}
              </span>
              <span style={{ position: 'relative', zIndex: 1, maxWidth: '76%', fontSize: 18, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.12, color: 'var(--ink)', textShadow: v.icona ? alone('#FFFFFF', 2) : undefined }}>
                {v.nome}
              </span>
              <button
                type="button"
                className="tasto-scambia"
                style={{ marginTop: 'auto', alignSelf: 'flex-start', zIndex: 1 }}
                aria-label={`Scambia con ${v.nome}`}
                disabled={inVolo}
                onClick={() => onScambia(v.dishId)}
              >
                <IconaScambia />
                Scambia
              </button>
              {v.icona && <IconaIngrediente chiave={v.icona.chiave} area={v.icona.area} tono="area" taglia={96} />}
            </div>
          </li>
        ))}
      </ul>
      {!sola && (
        <div data-puntini="" aria-hidden="true" style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {voci.map((v, n) => (
            <span key={v.dishId} style={{ width: n === indice ? 16 : 6, height: 6, borderRadius: 999, background: n === indice ? 'var(--superficie)' : 'var(--poster-casella)' }} />
          ))}
        </div>
      )}
    </div>
  );
}
