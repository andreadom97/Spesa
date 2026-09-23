'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { cercaPiatti, ingredientiDelPiatto } from '@/domain/ricerca-piatti';

interface Props {
  piatti: Dish[];
  ingredienti: Ingredient[];
  ordineAree: AreaId[];
}

/**
 * Il corpo di Piatti a repertorio pieno (spec fase 3 §A–§C): il campo di
 * ricerca fermo in alto, e sotto lo scroller con l'aggiungi tratteggiato in
 * cima, le righe piatto e, se la ricerca non trova niente, il vuoto di
 * ricerca. Niente dati: li carica la pagina. Un file a sé, e non dentro
 * `page.tsx`, perché la sonda del browser lo possa montare con dati finti.
 */
export function ElencoPiatti({ piatti, ingredienti, ordineAree }: Props) {
  const [ricerca, setRicerca] = useState('');
  const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
  const mostrati = cercaPiatti(piatti, ingredienti, ricerca);

  return (
    <>
      {/* Fuori dallo scroller: resta fermo mentre la lista scorre, e con la
          tastiera aperta si vede cosa si sta scrivendo (spec §A, §M.3). */}
      <div style={{ padding: '8px 16px 10px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ position: 'absolute', left: 14, top: 13, pointerEvents: 'none' }}
          >
            <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--sec)" strokeWidth="2.1" />
            <path d="m15.5 15.5 5 5" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca un piatto o un ingrediente"
            aria-label="Cerca un piatto o un ingrediente"
            style={{
              width: '100%', height: 44, padding: '0 14px 0 41px', boxSizing: 'border-box',
              borderRadius: 14, border: '1px solid var(--bordo)', background: 'var(--superficie)',
              boxShadow: 'var(--ombra-pannello)', color: 'var(--ink)', fontSize: 14, outline: 'none',
            }}
          />
        </div>
      </div>

      <div
        className="sc scroll-app"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <Link
          href="/piatti/nuovo"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            width: '100%', height: 56, boxSizing: 'border-box', borderRadius: 14,
            border: '2px dashed var(--bordo-tratteggio)', background: 'none', textDecoration: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuovo piatto
        </Link>

        {mostrati.map((piatto) => (
          <RigaPiatto
            key={piatto.id}
            piatto={piatto}
            aree={areeDelPiatto(piatto, areaPerIngrediente, ordineAree)}
          />
        ))}

        {mostrati.length === 0 && (
          <div style={{ flexShrink: 0, padding: '44px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Nessun piatto qui
            </div>
            <div style={{ fontSize: 14, color: 'var(--testo-2)' }}>Prova un&apos;altra parola, oppure aggiungine uno.</div>
          </div>
        )}
      </div>
    </>
  );
}

/** Le aree distinte fra gli ingredienti del piatto (fissi e alternative), nell'ordine dell'utente. */
function areeDelPiatto(
  piatto: Dish,
  areaPerIngrediente: Map<string, AreaId>,
  ordineAree: AreaId[],
): AreaId[] {
  const presenti = new Set(
    ingredientiDelPiatto(piatto)
      .map((id) => areaPerIngrediente.get(id))
      .filter((a): a is AreaId => a !== undefined),
  );
  return ordineAree.filter((a) => presenti.has(a));
}

/**
 * La Riga piatto (DESIGN.md §8): un solo bersaglio che apre il piatto, nome su
 * una riga, sottoriga col numero degli ingredienti e `dalla dieta` sui piatti
 * dell'import, pallini d'area, chevron decorativo in una zona da 44.
 */
function RigaPiatto({ piatto, aree }: { piatto: Dish; aree: AreaId[] }) {
  const n = ingredientiDelPiatto(piatto).length;
  const sottoriga = `${n} ${n === 1 ? 'INGREDIENTE' : 'INGREDIENTI'}${piatto.fonte === 'nutrizionista' ? ' · DALLA DIETA' : ''}`;
  return (
    <Link
      href={`/piatti/${piatto.id}`}
      aria-label={`Apri ${piatto.nome}`}
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', minHeight: 'var(--riga-piatto)', boxSizing: 'border-box',
        borderRadius: 14, background: 'var(--superficie)', border: '1px solid rgba(20,22,58,0.09)',
        boxShadow: 'var(--ombra-pannello)', textDecoration: 'none', color: 'inherit',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {piatto.nome}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ter)' }}>
          {sottoriga}
        </span>
        {aree.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {aree.map((a) => (
              <span
                key={a}
                data-area={a}
                style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
              />
            ))}
          </div>
        )}
      </div>
      <span aria-hidden="true" style={{ width: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--icona-spenta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
