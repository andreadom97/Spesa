'use client';

import type { ReactNode } from 'react';

/**
 * Il widget d'area della Dispensa (DESIGN.md §8 Tessera widget di sezione),
 * **senza contatore** (spec §A, decisione 10). `colore` null = il widget
 * Pronti, senza quadratino.
 */
export function WidgetArea({ etichetta, colore, children }: { etichetta: string; colore: string | null; children: ReactNode }) {
  return (
    <section
      aria-label={etichetta}
      style={{
        margin: '0 16px 12px', background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22,
        boxShadow: 'var(--ombra-pannello)', padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
        {colore && <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: colore, flex: 'none' }} />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          {etichetta}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>{children}</div>
    </section>
  );
}
