'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  /** Il nome del dialogo: dice il contesto (DESIGN.md §8 Foglio dal basso). */
  etichetta: string;
  onChiudi: () => void;
  /** 'alto': da top 88 al fondo, il contenuto scorre dentro. 'contenuto': alto quanto serve. */
  altezza?: 'alto' | 'contenuto';
  ruolo?: 'dialog' | 'alertdialog';
  /** Il dialogo di conferma non si chiude dal velo: si esce da ANNULLA. */
  chiudiDalVelo?: boolean;
  /** 2 = sopra un altro foglio (il dialogo di eliminazione sopra il lotto). */
  livello?: 1 | 2;
  children: ReactNode;
}

/**
 * Velo e foglio ancorato in basso (DESIGN.md §8), con `position: fixed` e uno
 * z sopra la tab bar (20) e sopra lo slot del Dock (19): a foglio aperto
 * niente sotto resta toccabile. È la forma di `FoglioAzioniPasto`, fatta
 * componente perché la Dispensa ne apre quattro.
 *
 * Il fuoco va al foglio all'apertura, così lo screen reader ci entra e Tab
 * parte da dentro.
 */
export function FoglioDalBasso({
  etichetta, onChiudi, altezza = 'alto', ruolo = 'dialog', chiudiDalVelo = true, livello = 1, children,
}: Props) {
  const foglioRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    foglioRef.current?.focus();
  }, []);

  return (
    <div
      data-testid="velo-foglio"
      onClick={chiudiDalVelo ? onChiudi : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: livello === 2 ? 60 : 50, background: 'var(--overlay-foglio)' }}
    >
      <div
        ref={foglioRef}
        role={ruolo}
        aria-modal="true"
        aria-label={etichetta}
        tabIndex={-1}
        className={`anim-foglio${altezza === 'alto' ? ' foglio-alto' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'var(--superficie)', borderRadius: '22px 22px 0 0',
          display: 'flex', flexDirection: 'column', outline: 'none', overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Il tondo 44 della testata di un foglio: fondo 0,04, icona 20. */
export function TondoFoglio({ etichetta, onClick, children }: { etichetta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      onClick={onClick}
      style={{
        width: 44, height: 44, flex: 'none', borderRadius: 999, background: 'rgba(20,22,58,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/**
 * La testata di un foglio della Dispensa: a sinistra la freccia (se c'è un
 * livello sopra) o il contenuto passato, a destra la X.
 */
export function TestataFoglio({
  onChiudi, etichettaChiudi = 'Chiudi il foglio', indietro, children,
}: {
  onChiudi: () => void;
  etichettaChiudi?: string;
  indietro?: { etichetta: string; onClick: () => void };
  children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 0' }}>
      {indietro && (
        <TondoFoglio etichetta={indietro.etichetta} onClick={indietro.onClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </TondoFoglio>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <TondoFoglio etichetta={etichettaChiudi} onClick={onChiudi}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </TondoFoglio>
    </div>
  );
}
