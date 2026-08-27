'use client';

export interface OpzioneSegmento {
  id: string;
  label: string;
}

interface Props {
  opzioni: OpzioneSegmento[];
  valore: string;
  onCambia: (id: string) => void;
}

/**
 * Riga di pillole selezionabili in orizzontale, una attiva alla volta.
 * Nasce per il filtro pasto di Piatti, ma l'interfaccia (id/label, valore
 * corrente, callback) è pensata per essere riusata identica da Ingrediente
 * e Lista con altre opzioni (aree, unità...).
 *
 * La pillola resta visivamente 38px come nell'artboard, ma l'area toccabile
 * (il <button>) è alta 44px: un pollice in corsia non deve sbagliare
 * bersaglio solo perché il disegno è sottile. Il bottone è trasparente e fa
 * solo da area di tap; lo <span> interno disegna la pillola vera, centrata.
 * Regola da portare con sé in ogni riuso, non da riparare tre volte.
 */
export function Segmento({ opzioni, valore, onCambia }: Props) {
  return (
    <div className="sc" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
        {opzioni.map((o) => {
          const attivo = o.id === valore;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambia(o.id)}
              aria-pressed={attivo}
              style={{
                flex: 'none',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 38,
                  padding: '0 15px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  fontWeight: attivo ? 700 : 500,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: attivo ? '#FFFFFF' : 'var(--sec)',
                  background: attivo ? 'var(--ink)' : '#FFFFFF',
                  border: attivo ? 'none' : '1px solid rgba(20,22,58,0.09)',
                }}
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
