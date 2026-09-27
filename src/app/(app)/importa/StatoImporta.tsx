import type { CSSProperties, ReactNode } from 'react';

export interface PropsStatoImporta {
  titolo: string;
  testo: string;
  /** Un secondo paragrafo, stesso stile (il rifiuto: la motivazione, poi la spiegazione). */
  testo2?: string;
  /** Il titolo prende `.anim-luce-testo` (DESIGN.md §7): l'attesa mentre l'AI legge. */
  luce?: boolean;
  /** La scheda è `role="status"`: il suo testo si annuncia (l'attesa). */
  stato?: boolean;
  /** Lo scroller lascia la coda al Dock: chi usa il componente monta il suo `<Dock>`. */
  conDock?: boolean;
  /** Un tasto secondario sotto i testi (la ripresa: RICOMINCIA). */
  children?: ReactNode;
}

const TESTO: CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)', maxWidth: '30ch' };

/**
 * Lo Stato vuoto di DESIGN.md §8 per i passi di Importa (spec fase 8a §A): ripresa, attesa,
 * rifiuto, errore e i due errori del riepilogo. Il disegno è quello dello stato vuoto della Lista,
 * coi token al posto dei letterali. Locale a Importa e non in `src/components/`: lo stato vuoto
 * resta scritto dove serve, per scelta del progetto (DESIGN-SYSTEM.md §3); qui lo usano sei stati
 * dello stesso flusso. L'azione della schermata non sta qui: sta nel Dock di chi lo usa.
 */
export function StatoImporta({ titolo, testo, testo2, luce = false, stato = false, conDock = false, children }: PropsStatoImporta) {
  return (
    <div
      className={`sc scroll-app${conDock ? ' con-dock' : ''}`}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <div
        role={stato ? 'status' : undefined}
        style={{
          padding: '26px 20px', borderRadius: 22, background: 'var(--superficie)', border: '1px solid var(--bordo)',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 46, height: 46, marginBottom: 20, borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Il foglio della dieta: un rettangolo con tre righe. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="3.5" width="14" height="17" rx="2.5" stroke="var(--icona-spenta)" strokeWidth="1.9" />
            <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="var(--icona-spenta)" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </div>
        <h2
          className={luce ? 'anim-luce-testo' : undefined}
          style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)' }}
        >
          {titolo}
        </h2>
        <p style={TESTO}>{testo}</p>
        {testo2 && <p style={{ ...TESTO, marginTop: 8 }}>{testo2}</p>}
        {children && <div style={{ alignSelf: 'stretch', marginTop: 18 }}>{children}</div>}
      </div>
    </div>
  );
}
