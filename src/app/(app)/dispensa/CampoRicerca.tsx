'use client';

import { useRef } from 'react';
import { IconaLente, IconaX } from './icone';

/**
 * La ricerca in pagina (spec §B, v2 01/02): campo 44 col segnaposto che è anche
 * il nome accessibile; con la query, bordo 1,5 `--ink` e la X per svuotare.
 * Sotto, il contatore, che parla solo quando c'è qualcosa da contare. Non
 * prende il fuoco all'apertura (spec §A): sul telefono aprirebbe la tastiera.
 */
export function CampoRicerca({ valore, onCambia, contatore, spento = false }: {
  valore: string; onCambia: (v: string) => void; contatore: string | null; spento?: boolean;
}) {
  const campoRef = useRef<HTMLInputElement>(null);
  const pieno = valore !== '';
  return (
    <div style={{ margin: '4px 16px 14px', display: 'flex', flexDirection: 'column' }}>
      <div
        role="search"
        style={{
          height: 44, boxSizing: 'border-box', borderRadius: 14, background: 'var(--superficie)',
          border: pieno ? '1.5px solid var(--ink)' : '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
          display: 'flex', alignItems: 'center', gap: 10, padding: pieno ? '0 2px 0 14px' : '0 14px',
        }}
      >
        <IconaLente />
        <input
          ref={campoRef}
          type="text"
          aria-label="Cerca in dispensa"
          placeholder="Cerca in dispensa"
          value={valore}
          disabled={spento}
          onChange={(e) => onCambia(e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 14, color: 'var(--ink)' }}
        />
        {pieno && (
          <button
            type="button"
            aria-label="Svuota la ricerca"
            onClick={() => { onCambia(''); campoRef.current?.focus(); }}
            style={{ width: 40, height: 40, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}
          >
            <IconaX />
          </button>
        )}
      </div>
      {/* La regione viva resta montata anche vuota: una che nasce già col
          testo dentro, molti screen reader non la leggono. */}
      <div aria-live="polite" style={{ marginTop: contatore ? 8 : 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--sec)' }}>
        {contatore}
      </div>
    </div>
  );
}
