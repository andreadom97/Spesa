'use client';

import type { MouseEvent } from 'react';
import { Dock } from '@/components/Dock';
import { IconaAI, IconaMicrofono } from './icone';

interface Props {
  /** Il browser sa dettare: senza, il tondo non c'è (spec §A, v1 15). */
  dettatura: boolean;
  onModifica: () => void;
  /** pointerdown sul tondo: la dettatura parte subito, il rilascio decide se era tenuto (Task 8). */
  onPremiMicrofono: () => void;
  /** Attivazione da tastiera (click senza puntatore): avvia a tocchi. */
  onToccaMicrofono: () => void;
}

/**
 * Il Dock della Dispensa (spec §A): `Modifica con l'AI` e il tondo del
 * microfono, sciolti e allineati a destra. Il tocco sul tondo col dito passa
 * da `pointerdown` (serve per il tenuto premuto); il `click` che il browser
 * manda dopo il rilascio si ignora, tranne quando viene dalla tastiera
 * (`detail === 0`), che non ha pointerdown.
 */
export function DockDispensa({ dettatura, onModifica, onPremiMicrofono, onToccaMicrofono }: Props) {
  function click(e: MouseEvent<HTMLButtonElement>) {
    if (e.detail === 0) onToccaMicrofono();
  }
  return (
    <Dock sciolto>
      <button
        type="button"
        onClick={onModifica}
        style={{
          height: 56, borderRadius: 999, background: 'var(--superficie)', boxShadow: 'var(--ombra-nav)',
          display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink)',
        }}
      >
        <IconaAI size={18} />
        {"Modifica con l'AI"}
      </button>
      {dettatura && (
        <button
          type="button"
          aria-label="Registra un vocale"
          onPointerDown={onPremiMicrofono}
          onClick={click}
          style={{
            width: 56, height: 56, flex: 'none', borderRadius: 999, background: 'var(--ink)', boxShadow: 'var(--ombra-nav)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none',
          }}
        >
          <IconaMicrofono />
        </button>
      )}
    </Dock>
  );
}
