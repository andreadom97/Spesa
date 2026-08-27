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
 * Le pillole sono alte 38px per fedeltà all'artboard: più basse del minimo
 * di 44px per i bersagli tattili dettato dalle regole globali. È una
 * divergenza dichiarata, non un errore: sia il brief che l'artboard la
 * indicano esplicitamente.
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
