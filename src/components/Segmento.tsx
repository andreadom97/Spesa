'use client';

export interface OpzioneSegmento {
  id: string;
  label: string;
}

interface Props {
  opzioni: OpzioneSegmento[];
  valore: string;
  onCambia: (id: string) => void;
  /**
   * 'pillola' (default): il filtro di Piatti — pillole 38px in una fila
   * scorrevole, l'artboard di Piatti.dc.html le disegna così.
   * 'blocco': i segmenti di Ingrediente (UNITÀ, COME SI CONSUMA) — rettangoli
   * a piena larghezza (`flex:1`), alti 46px, raggio 14, in una fila che non
   * scorre, `gap:7px`: `Ingrediente.dc.html` li disegna così (`seg =
   * "flex:1;height:46px;border-radius:14px..."`). Sono due forme diverse
   * nei due artboard, non un'incoerenza da correggere.
   */
  variante?: 'pillola' | 'blocco';
  /**
   * Un segmento disabilitato non è cliccabile né lo sembra: `disabled`
   * nativo su ogni bottone (niente click, niente attivazione da tastiera) e
   * opacità ridotta sull'intera fila. Serve a Ingrediente quando la classe
   * di residuo è 'intero': l'unità è forzata a PZ e l'interfaccia non deve
   * offrire di tornare indietro (il guardiano in salva() copre comunque il
   * caso in cui, per un bug futuro, questo prop non venga passato).
   */
  disabilitato?: boolean;
}

const STILE_BLOCCO_BASE = {
  flex: 1,
  height: 46,
  borderRadius: 14,
  textAlign: 'center' as const,
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
};

/**
 * Riga di segmenti selezionabili, uno attivo alla volta. Nasce nel Task 9
 * come pillole per il filtro pasto di Piatti; l'interfaccia (id/label,
 * valore corrente, callback) è pensata per essere riusata identica da
 * Ingrediente e Lista con altre opzioni (aree, unità...) — è la variante
 * visiva a cambiare, non il contratto.
 *
 * La regola dell'area di tap da 44px vive qui, in un posto solo, per
 * entrambe le varianti:
 * - 'pillola': la pillola visibile resta 38px come nell'artboard, ma l'area
 *   toccabile (il <button>) è alta 44px — un pollice in corsia non deve
 *   sbagliare bersaglio solo perché il disegno è sottile. Il bottone è
 *   trasparente e fa solo da area di tap; lo <span> interno disegna la
 *   pillola vera, centrata.
 * - 'blocco': l'altezza visiva del bottone è già 46px, quindi qui il
 *   bottone stesso è l'area di tap — nessun wrapper separato serve.
 */
export function Segmento({ opzioni, valore, onCambia, variante = 'pillola', disabilitato = false }: Props) {
  if (variante === 'blocco') {
    return (
      <div style={{ display: 'flex', gap: 7, opacity: disabilitato ? 0.5 : 1 }}>
        {opzioni.map((o) => {
          const attivo = o.id === valore;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambia(o.id)}
              disabled={disabilitato}
              aria-pressed={attivo}
              style={{
                ...STILE_BLOCCO_BASE,
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
    );
  }

  return (
    <div className="sc" style={{ overflowX: 'auto', opacity: disabilitato ? 0.5 : 1 }}>
      <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
        {opzioni.map((o) => {
          const attivo = o.id === valore;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambia(o.id)}
              disabled={disabilitato}
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
