'use client';

import type { ReactNode } from 'react';
import type { AreaId } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';

/**
 * La testata di modifica (DESIGN.md §8, frame 12): il tondo 44 su
 * --barra-attiva con la freccia; sotto, facoltativa, l'etichetta mono col
 * quadratino d'area; poi il nome come campo a 32/800, passato da chi la usa.
 * Non è la `Testata` (niente titolo di schermata, niente tab bar): la usa
 * l'editor dell'ingrediente (dalla fase 5, qui estratta) e la userà l'editor
 * del Piatto (fase 7, Task 6) — ciascuno resta padrone del proprio stato e
 * passa il proprio campo del nome come prop `nome`.
 */
export function TestataModifica({ children, freccia, area = null, nome }: {
  children?: ReactNode;
  freccia: { etichetta: string; onTorna: () => void };
  area?: AreaId | null;
  nome?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <button
          type="button"
          aria-label={freccia.etichetta}
          onClick={freccia.onTorna}
          style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--barra-attiva)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {area && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(area) }} />
            {nomeArea(area)}
          </span>
        )}
        {nome && <div style={{ alignSelf: 'stretch' }}>{nome}</div>}
      </div>
      {children}
    </div>
  );
}
