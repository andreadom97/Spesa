'use client';

import { Children, type ReactNode } from 'react';
import { MessaggioErrore, STILE_PILLOLA } from '@/components/controlli';

/** L'errore di ogni controllo che salva al tocco o all'uscita dal campo (§B.5). */
export const ERRORE_SALVATAGGIO = 'Non siamo riusciti a salvare. Riprova.';
/** L'errore di caricamento del pannello (§I, frame 24). */
export const TESTO_ERRORE_IMPOSTAZIONI = 'Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.';
const TESTO_CASA_CAMBIATA = 'La casa è cambiata: dati ricaricati. Riprova.';

/** Blocco di gruppo (DESIGN.md §8): bianco, raggio 18, --bordo, --ombra-pannello. */
export const STILE_BLOCCO = {
  background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 18, boxShadow: 'var(--ombra-pannello)',
} as const;

const STILE_TITOLO_BLOCCO = {
  margin: 0, padding: '0 4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--ink)',
};

/**
 * Un Blocco di gruppo con le sue righe. Fra un figlio e l'altro un filetto
 * --bordo, il primo senza: `Children.toArray` salta `null` e `false`, così una
 * riga che non c'è non lascia un filetto. Un figlio che rende `null` da sé
 * (non da un `&&`) il filetto lo lascia: chi lo passa decide prima.
 */
export function BloccoGruppo({ titolo, children }: { titolo?: ReactNode; children: ReactNode }) {
  const figli = Children.toArray(children);
  return (
    <section style={{ ...STILE_BLOCCO, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column' }}>
      {titolo && <h3 style={STILE_TITOLO_BLOCCO}>{titolo}</h3>}
      {figli.map((figlio, i) => (
        <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--bordo)' : 'none' }}>{figlio}</div>
      ))}
    </section>
  );
}

/** Nota 12,5 in --testo-2 (DESIGN.md §8 Nota). */
export function Nota({ children, ruolo }: { children: ReactNode; ruolo?: 'status' }) {
  return (
    <p role={ruolo} style={{ margin: 0, padding: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>
      {children}
    </p>
  );
}

/** Lo stato di caricamento (§B.5, frame 23): mono in --sec, niente scheletro. */
export function Carico() {
  return (
    <p role="status" style={{ margin: 0, padding: '8px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
      CARICO…
    </p>
  );
}

/** Frame 26B: sopra il blocco ricaricato, dopo un rifiuto RLS. */
export function AvvisoCasaCambiata() {
  return <MessaggioErrore ruolo="alert">{TESTO_CASA_CAMBIATA}</MessaggioErrore>;
}

/** Frame 24 (con RIPROVA) e 26 (senza): un blocco con l'errore 12,5 in --errore. */
export function ErroreCaricamento({ testo, onRiprova }: { testo: string; onRiprova?: () => void }) {
  return (
    <section style={{ ...STILE_BLOCCO, boxShadow: 'none', padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MessaggioErrore ruolo="alert">{testo}</MessaggioErrore>
      {onRiprova && (
        <button
          type="button"
          onClick={onRiprova}
          style={{ ...STILE_PILLOLA, alignSelf: 'flex-start', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
        >
          RIPROVA
        </button>
      )}
    </section>
  );
}

/** Il tondo 44 su 0,04 delle frecce e della ✕ (frame 06, 13). Spento: `disabled` e icona in --icona-spenta. */
export function TondoIcona({ etichetta, spento = false, onClick, children }: {
  etichetta: string; spento?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      disabled={spento}
      onClick={onClick}
      style={{
        width: 44, height: 44, flex: 'none', border: 0, borderRadius: 999, padding: 0,
        background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export function IconaFreccia({ verso, spenta }: { verso: 'su' | 'giu'; spenta: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={verso === 'su' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'}
        strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconaCroce({ spenta }: { spenta: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}
