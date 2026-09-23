'use client';

import type { CSSProperties } from 'react';
import { Porta } from '@/components/Porta';
import { Dock } from '@/components/Dock';

interface Props {
  pdf: File | null;
  onPdf: (pdf: File) => void;
  onApriFotocamera: () => void;
  onEstraiPdf: () => void;
}

/** L'input file vero resta accessibile per nome ma invisibile: il tocco va sul tasto che lo contiene. */
const INPUT_NASCOSTO: CSSProperties = {
  position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clipPath: 'inset(50%)',
};

/**
 * La scelta con cui si apre l'import (spec fase 3 §D): due porte, foto e PDF.
 * La foto apre la fotocamera a tutto schermo, che ha il suo primario (`Ho
 * finito`). Il PDF apre il selettore di sistema; scelto il file, la porta ne
 * mostra il nome con `Cambia file`, e il primario `ESTRAI LA DIETA` va nel
 * Dock. Senza file il Dock non c'è: niente primario spento (DESIGN.md §8).
 * Niente dati né cronologia qui: le decide la pagina.
 */
export function Acquisizione({ pdf, onPdf, onApriFotocamera, onEstraiPdf }: Props) {
  const inputPdf = (
    <input
      type="file"
      accept="application/pdf"
      aria-label="scegli il PDF della dieta"
      // Un annullamento nel selettore non deve cancellare il file già scelto.
      onChange={(e) => {
        const scelto = e.target.files?.[0];
        if (scelto) onPdf(scelto);
      }}
      style={INPUT_NASCOSTO}
    />
  );

  return (
    <div
      className={`sc scroll-app${pdf ? ' con-dock' : ''}`}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <Porta
        titolo="Fotografa i fogli"
        testo="Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli da lì."
      >
        <button type="button" className="porta-azione" onClick={onApriFotocamera}>
          APRI LA FOTOCAMERA
        </button>
      </Porta>

      {pdf ? (
        <Porta
          titolo="Carica il PDF"
          testo={
            <span
              style={{
                display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {pdf.name}
            </span>
          }
        >
          <label
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', minHeight: 44,
              fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Cambia file
            {inputPdf}
          </label>
        </Porta>
      ) : (
        <Porta titolo="Carica il PDF" testo="Se la dieta ti è arrivata in PDF, caricalo così com'è.">
          <label className="porta-azione">
            SCEGLI IL PDF
            {inputPdf}
          </label>
        </Porta>
      )}

      {pdf && (
        <Dock>
          <button type="button" className="dock-primario" onClick={onEstraiPdf}>
            ESTRAI LA DIETA
          </button>
        </Dock>
      )}
    </div>
  );
}
