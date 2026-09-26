'use client';

import type { ReactNode } from 'react';
import { MessaggioErrore } from '@/components/controlli';

type Finale =
  | { tipo: 'valore'; valore: string; onApri: () => void }
  | { tipo: 'campo'; campo: ReactNode }
  | { tipo: 'azione'; onAzione: () => void; tono?: 'errore' }
  | { tipo: 'niente' };

interface Props {
  nome: string;
  nota?: ReactNode;
  finale: Finale;
  errore?: string | null;
}

const STILE_RIGA = {
  display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, width: '100%', boxSizing: 'border-box' as const,
  padding: '8px 4px', border: 0, background: 'none', textAlign: 'left' as const, font: 'inherit', color: 'var(--ink)',
};

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M9 5l7 7-7 7" stroke="var(--icona-spenta)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Riga di impostazione (DESIGN.md §8): minimo 56, nome 15/700, nota 12,5 in
 * --testo-2, e uno di quattro finali. `valore` e `azione` fanno della riga
 * intera un `button`; `campo` e `niente` la lasciano un contenitore. L'errore
 * di salvataggio sta sotto la riga, dentro il blocco, con `role="alert"` (§B.5).
 */
export function RigaImpostazione({ nome, nota, finale, errore }: Props) {
  const nomeInErrore = finale.tipo === 'azione' && finale.tono === 'errore';
  const testi = (
    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: nomeInErrore ? 'var(--errore)' : 'var(--ink)', overflowWrap: 'anywhere' }}>
        {nome}
      </span>
      {nota && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5, lineHeight: 1.35, color: 'var(--testo-2)', overflowWrap: 'anywhere' }}>
          {nota}
        </span>
      )}
    </span>
  );

  let riga: ReactNode;
  switch (finale.tipo) {
    case 'valore':
      riga = (
        <button type="button" onClick={finale.onApri} style={STILE_RIGA}>
          {testi}
          {finale.valore && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
              {finale.valore}
            </span>
          )}
          <Chevron />
        </button>
      );
      break;
    case 'azione':
      riga = <button type="button" onClick={finale.onAzione} style={STILE_RIGA}>{testi}</button>;
      break;
    case 'campo':
      riga = <div style={STILE_RIGA}>{testi}{finale.campo}</div>;
      break;
    default:
      riga = <div style={STILE_RIGA}>{testi}</div>;
  }

  return (
    <div>
      {riga}
      {errore && (
        <div style={{ paddingBottom: 8 }}>
          <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>
        </div>
      )}
    </div>
  );
}
