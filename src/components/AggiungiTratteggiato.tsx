'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

type Props = { etichetta: string; ariaLabel?: string } & ({ href: string } | { onClick: () => void });

const STILE: CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  width: '100%', height: 56, boxSizing: 'border-box', borderRadius: 14,
  border: '2px dashed var(--bordo-tratteggio)', background: 'none', textDecoration: 'none',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ink)',
};

/**
 * L'Aggiungi tratteggiato (DESIGN.md §8 Tasti): alto 56, raggio 14, bordo 2
 * tratteggiato, niente fondo, mono 11/700/0,08em maiuscolo in --ink, il «+» 16.
 * Estratto dalla fase 7 dal «Nuovo piatto» di Piatti, perché lo usano anche
 * Scegli (`CREA UN PIATTO NUOVO`) e l'editor del Piatto (`AGGIUNGI INGREDIENTE`,
 * `AGGIUNGI COMPONENTE`): un disegno solo, non tre copie. Con `href` è un
 * link, con `onClick` un bottone. `ariaLabel` serve dove il testo da solo è
 * ambiguo: gli AGGIUNGI INGREDIENTE delle opzioni dicono a quale opzione
 * aggiungono.
 */
export function AggiungiTratteggiato(props: Props) {
  const corpo = (
    <>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {props.etichetta}
    </>
  );
  if ('href' in props) {
    return (
      <Link href={props.href} aria-label={props.ariaLabel} style={STILE}>
        {corpo}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} aria-label={props.ariaLabel} style={STILE}>
      {corpo}
    </button>
  );
}
