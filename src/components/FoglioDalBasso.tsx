'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Il nome del dialogo: dice il contesto (DESIGN.md §8 Foglio dal basso). */
  etichetta: string;
  onChiudi: () => void;
  /** 'alto': da top 88 al fondo, il contenuto scorre dentro. 'contenuto': alto quanto serve, al massimo fino a 88 dalla cima. */
  altezza?: 'alto' | 'contenuto';
  ruolo?: 'dialog' | 'alertdialog';
  /** Il dialogo di conferma non si chiude dal velo: si esce da ANNULLA. */
  chiudiDalVelo?: boolean;
  /**
   * 2 = sopra un altro foglio (il dialogo di eliminazione sopra il lotto); 3 = il Dialogo di
   * conferma sopra il Pannello impostazioni, che sta a 70 (spec fase 5 §A.2).
   */
  livello?: 1 | 2 | 3;
  children: ReactNode;
}

const Z_LIVELLO = { 1: 50, 2: 60, 3: 80 } as const;

// Lato client `document` c'è già al primo render; lato server (e nel primo render
// dell'idratazione) no: lo snapshot del server dice «non ancora», e il foglio si
// monta appena il browser ha il suo `body`. Nessuno store da ascoltare.
const nessunAbbonamento = () => () => {};
const ciSonoNelBrowser = () => true;
const nonSonoNelBrowser = () => false;

/**
 * Velo e foglio ancorato in basso (DESIGN.md §8), con `position: fixed` e uno
 * z sopra la tab bar (20) e sopra lo slot del Dock (19): a foglio aperto
 * niente sotto resta toccabile. È la forma di `FoglioAzioniPasto`, fatta
 * componente perché la Dispensa ne apre quattro.
 *
 * Si monta con un portale su `document.body`, non dove è scritto nella pagina
 * (correzione 8c-bis F, prove dal telefono del 03/10): lo scroller delle pagine
 * (`.scroll-app`) ha `mask-image` e `overflow: auto`, e la maschera ritaglia
 * anche i `fixed` discendenti al box dello scroller. Il foglio dentro lo
 * scroller restava tagliato, con testata, tasto in basso, Dock e tab bar sopra
 * il velo e toccabili. Fuori dallo scroller il velo copre tutto.
 *
 * Il fuoco va al foglio all'apertura, così lo screen reader ci entra e Tab
 * parte da dentro.
 */
export function FoglioDalBasso({
  etichetta, onChiudi, altezza = 'alto', ruolo = 'dialog', chiudiDalVelo = true, livello = 1, children,
}: Props) {
  const foglioRef = useRef<HTMLDivElement>(null);
  const nelBrowser = useSyncExternalStore(nessunAbbonamento, ciSonoNelBrowser, nonSonoNelBrowser);
  // Il foglio esiste solo dopo `nelBrowser`: il fuoco va dato quando il nodo c'è.
  useEffect(() => {
    if (nelBrowser) foglioRef.current?.focus();
  }, [nelBrowser]);

  if (!nelBrowser) return null;
  return createPortal(
    <div
      data-testid="velo-foglio"
      onClick={chiudiDalVelo ? onChiudi : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: Z_LIVELLO[livello], background: 'var(--overlay-foglio)' }}
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
          // Un foglio «contenuto» non sale oltre la cima di `foglio-alto` (88): sopra, chi lo usa
          // fa scorrere la sua parte lunga (spec 8c §G, il Selettore a foglio).
          maxHeight: altezza === 'contenuto' ? 'calc(100% - 88px)' : undefined,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
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
