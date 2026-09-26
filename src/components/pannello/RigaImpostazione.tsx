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
  /**
   * Il nome accessibile della riga, quando il testo visibile non basta a dire cosa fa il
   * tocco (Scegli: `Cambia {componente}: ora {opzione}`, spec fase 7 §A.4). Vale solo dove
   * la riga è un `button` (`valore`, `azione`); senza, il nome è il testo della riga.
   */
  etichetta?: string;
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
export function RigaImpostazione({ nome, nota, finale, errore, etichetta }: Props) {
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
        <button type="button" aria-label={etichetta} onClick={finale.onApri} style={STILE_RIGA}>
          {testi}
          {finale.valore && (
            // Al massimo metà riga, poi ellissi: un valore lungo (le opzioni di Scegli,
            // «Ricotta + Noci + …») non deve schiacciare il nome a zero. Il testo intero
            // resta nell'etichetta, se chi monta la riga la passa. I valori corti del
            // Pannello («2 PASTI», «OGNI 3 MESI», «NESSUNO FUORI CASA») stanno sotto la
            // metà e non cambiano. Maiuscolo via CSS (DESIGN.md §8): chi passa «Ricotta»
            // la vede RICOTTA, e nel DOM resta il testo.
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', maxWidth: '50%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {finale.valore}
            </span>
          )}
          <Chevron />
        </button>
      );
      break;
    case 'azione':
      riga = <button type="button" aria-label={etichetta} onClick={finale.onAzione} style={STILE_RIGA}>{testi}</button>;
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
