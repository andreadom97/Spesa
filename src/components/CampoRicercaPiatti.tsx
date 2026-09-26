'use client';

interface Props {
  valore: string;
  onCambia: (testo: string) => void;
}

/**
 * Il campo di ricerca di Piatti (spec fase 3 §A), condiviso con Scegli dalla
 * fase 7 (§A.3): fuori dallo scroller, resta fermo mentre la lista scorre —
 * con la tastiera aperta si vede cosa si sta scrivendo.
 */
export function CampoRicercaPiatti({ valore, onCambia }: Props) {
  return (
    <div style={{ padding: '8px 16px 10px' }}>
      <div style={{ position: 'relative' }}>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          style={{ position: 'absolute', left: 14, top: 13, pointerEvents: 'none' }}
        >
          <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--sec)" strokeWidth="2.1" />
          <path d="m15.5 15.5 5 5" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={valore}
          onChange={(e) => onCambia(e.target.value)}
          placeholder="Cerca un piatto o un ingrediente"
          aria-label="Cerca un piatto o un ingrediente"
          style={{
            width: '100%', height: 44, padding: '0 14px 0 41px', boxSizing: 'border-box',
            borderRadius: 14, border: '1px solid var(--bordo)', background: 'var(--superficie)',
            boxShadow: 'var(--ombra-pannello)', color: 'var(--ink)', fontSize: 14, outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
