'use client';

/**
 * Il caricamento della Dispensa (spec §A, v2 05): tre widget vuoti attraversati
 * dalla luce. Si montano insieme, quindi le tre luci partono in fase. Con meno
 * moto la classe non anima niente e restano fermi (globals.css).
 */
export function WidgetVuoti() {
  return (
    <div role="status" aria-label="Carico la dispensa" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1, 2].map((w) => (
        <div
          key={w}
          className="anim-luce-widget"
          style={{
            margin: '0 16px', background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22,
            boxShadow: 'var(--ombra-pannello)', padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <span style={{ width: '38%', height: 10, borderRadius: 5, background: 'rgba(20,22,58,0.06)', marginLeft: 4 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
            {[0, 1].map((t) => (
              <span key={t} style={{ height: 104, borderRadius: 14, background: 'rgba(20,22,58,0.06)' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
