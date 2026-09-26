'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { AreaId, Dish } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { ingredientiDelPiatto } from '@/domain/ricerca-piatti';

/**
 * I due modi della Riga piatto (DESIGN.md §8, fase 7 §A.3): 'apri' è quello
 * di sempre, un `Link` che porta al piatto; 'scegli' è quello nuovo di
 * Scegli, un bottone che sceglie il piatto per il pasto. Un tipo solo,
 * discriminato su `modo`: i due usi non condividono le prop extra.
 */
export type ModoRigaPiatto =
  | { modo: 'apri'; href: string }
  | { modo: 'scegli'; scelto: boolean; corrente: boolean; onScegli: () => void };

type Props = { piatto: Dish; aree: AreaId[] } & ModoRigaPiatto;

/**
 * La Riga piatto, condivisa fra Piatti e Scegli (spec fase 7 §A.3): un solo
 * bersaglio, nome su una riga, sottoriga col numero degli ingredienti e
 * «dalla dieta» sui piatti dell'import, pallini d'area. A destra, secondo il
 * modo: il chevron che apre il piatto (oggi, invariato), o — in Scegli — la
 * spunta che dice «è questo». La riga scelta è piena (fondo --ink): «pieno =
 * scelto», la stessa regola della Striscia dei giorni (DESIGN.md §8).
 */
export function RigaPiatto(props: Props) {
  const { piatto, aree } = props;
  const scelto = props.modo === 'scegli' && props.scelto;
  const inProgramma = props.modo === 'scegli' && props.corrente;

  const n = ingredientiDelPiatto(piatto).length;
  const sottoriga =
    `${inProgramma ? 'ORA IN PROGRAMMA · ' : ''}${n} ${n === 1 ? 'INGREDIENTE' : 'INGREDIENTI'}` +
    `${piatto.fonte === 'nutrizionista' ? ' · DALLA DIETA' : ''}`;

  // Bordo e ombra invariati fra i due stati: solo fondo e colore del testo
  // cambiano quando la riga è scelta (spec: «pieno = scelto»).
  const stileRiga: CSSProperties = {
    flexShrink: 0, display: 'flex', alignItems: 'center', minHeight: 'var(--riga-piatto)', boxSizing: 'border-box',
    borderRadius: 14, background: scelto ? 'var(--ink)' : 'var(--superficie)', border: '1px solid rgba(20,22,58,0.09)',
    boxShadow: 'var(--ombra-pannello)', textDecoration: 'none', color: 'inherit',
  };

  // Solo <span> dentro la riga, anche dove serve un blocco (display flex): in modo
  // 'scegli' la riga è un <button>, e un blocco div dentro un bottone non è HTML valido.
  const corpo = (
    <>
      <span style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2,
            color: scelto ? 'var(--superficie)' : 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {piatto.nome}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em',
            color: scelto ? 'rgba(255,255,255,0.62)' : 'var(--ter)',
          }}
        >
          {sottoriga}
        </span>
        {aree.length > 0 && (
          <span style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {aree.map((a) => (
              <span
                key={a}
                data-area={a}
                style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
              />
            ))}
          </span>
        )}
      </span>
      <span aria-hidden="true" style={{ width: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {scelto ? (
          // La spunta di oggi di Scegli (stessa geometria, stesso 13 in viewBox 20), in --ink
          // dentro il tondo 24 in --superficie: prima era bianca dentro un tondo pieno.
          <span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--superficie)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M4.5 10.5 8.2 14 15.5 6.4" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--icona-spenta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </>
  );

  if (props.modo === 'apri') {
    return (
      <Link href={props.href} aria-label={`Apri ${piatto.nome}`} style={stileRiga}>
        {corpo}
      </Link>
    );
  }

  return (
    <button type="button" aria-pressed={scelto} aria-label={`Scegli ${piatto.nome}`} onClick={props.onScegli} style={stileRiga}>
      {corpo}
    </button>
  );
}
