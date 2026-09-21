'use client';

import Link from 'next/link';
import { useIniziale } from '@/data/utente';

interface Props {
  titolo: string;
  /** Etichetta della pillola settimana, in sentence case ("Settimana del 21 settembre"): la
   *  pillola la rende maiuscola da sé (DESIGN.md §3). Assente = niente pillola. */
  settimana?: string;
  /** Modalità indietro: freccia di ritorno a /impostazioni al posto del menù utente. */
  indietro?: boolean;
}

/**
 * Testata condivisa (redesign 19/09): titolo in sentence case a sinistra e, a
 * destra, il menù utente — pillola con il tondo dell'iniziale e il kebab — che
 * porta a /impostazioni come faceva l'ingranaggio (stesso nome accessibile).
 * Il Marchio non vive più qui: sta nella tab bar, come icona della Lista.
 */
export function Testata({ titolo, settimana, indietro = false }: Props) {
  const iniziale = useIniziale();
  return (
    <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
          {indietro && (
            <Link
              href="/impostazioni"
              aria-label="Indietro"
              style={{ width: 44, height: 44, margin: '4px -10px 0 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m12 4-8 6 8 6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <h1 style={{ margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
            {titolo}
          </h1>
        </div>
        {!indietro && (
          <Link
            href="/impostazioni"
            aria-label="Impostazioni"
            style={{
              height: 50, display: 'flex', alignItems: 'center', gap: 5, margin: '0 -2px -3px 0', flex: 'none',
              background: 'var(--barra-attiva)', borderRadius: 999, padding: '0 12px 0 6px', textDecoration: 'none',
            }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--superficie)' }}>
                {iniziale}
              </span>
            </span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="4" r="1.8" fill="var(--ink)" /><circle cx="10" cy="10" r="1.8" fill="var(--ink)" /><circle cx="10" cy="16" r="1.8" fill="var(--ink)" />
            </svg>
          </Link>
        )}
      </div>
      {settimana && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--ink)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--superficie)' }}>
            {settimana}
          </span>
        </div>
      )}
    </div>
  );
}
