'use client';

import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { Dock } from '@/components/Dock';
import { IconaAI, IconaMicrofono } from './icone';

interface Props {
  /** Il browser sa dettare: senza, il tondo non c'è (spec §A, v1 15). */
  dettatura: boolean;
  onModifica: () => void;
  /**
   * pointerdown sul tondo: la dettatura parte subito, il rilascio decide se
   * era tenuto. Passa il `pointerId` del dito, così `useDettatura` ascolta il
   * rilascio di quel dito e non di un altro.
   */
  onPremiMicrofono: (pointerId: number) => void;
  /** Click senza pointerdown prima (tastiera, screen reader): avvia a tocchi. */
  onToccaMicrofono: () => void;
}

/**
 * Il Dock della Dispensa (spec §A): `Modifica con l'AI` e il tondo del
 * microfono, sciolti e allineati a destra. Il tocco sul tondo col dito passa
 * da `pointerdown` (serve per il tenuto premuto); il `click` che il browser
 * manda dopo il rilascio si ignora. Stessa regola del tondo in `WidgetAI`: un
 * click senza pointerdown prima (tastiera, `detail` 0, o uno screen reader che
 * sintetizza il click con `detail` 1) è un tocco breve; `detail` 0 vale sempre
 * come tastiera, anche se un pointerdown è rimasto senza click.
 */
export function DockDispensa({ dettatura, onModifica, onPremiMicrofono, onToccaMicrofono }: Props) {
  const premutoRef = useRef(false);
  function premi(e: PointerEvent<HTMLButtonElement>) {
    premutoRef.current = true;
    onPremiMicrofono(e.pointerId);
  }
  function click(e: MouseEvent<HTMLButtonElement>) {
    const dalDito = premutoRef.current && e.detail !== 0;
    premutoRef.current = false;
    if (!dalDito) onToccaMicrofono();
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
          onPointerDown={premi}
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
