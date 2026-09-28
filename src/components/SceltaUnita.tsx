'use client';

import type { UnitaBase } from '@/domain/types';

const OPZIONI: { id: UnitaBase; label: string }[] = [
  { id: 'g', label: 'G' },
  { id: 'ml', label: 'ML' },
  { id: 'pz', label: 'PZ' },
];

/**
 * La scelta dell'unità G / ML / PZ: la traccia `--barra-attiva` con le tre pillole, la scelta
 * bianca con `--ombra-tessera`. Nata nell'editor dell'ingrediente (frame 12), estratta nella
 * fase 8b perché la usa anche la Riga dell'alimento di Importa (spec 8b, decisione 6).
 */
export function SceltaUnita({ valore, onCambia, disabilitato = false, etichetta = 'Unità' }: {
  valore: UnitaBase | null;
  onCambia: (unita: UnitaBase) => void;
  disabilitato?: boolean;
  etichetta?: string;
}) {
  return (
    <div role="group" aria-label={etichetta} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: '0 3px', borderRadius: 999, background: 'var(--barra-attiva)', opacity: disabilitato ? 0.5 : 1 }}>
      {OPZIONI.map((o) => {
        const scelta = valore === o.id;
        return (
          // Il bottone è l'area di tocco da 44, la pillola visibile è 38 (frame 12), come in Segmento.
          <button key={o.id} type="button" aria-pressed={scelta} disabled={disabilitato} onClick={() => onCambia(o.id)} style={{ height: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              height: 38, minWidth: 44, padding: '0 10px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scelta ? 'var(--superficie)' : 'none', boxShadow: scelta ? 'var(--ombra-tessera)' : 'none',
              color: scelta ? 'var(--ink)' : 'var(--testo-2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            }}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
