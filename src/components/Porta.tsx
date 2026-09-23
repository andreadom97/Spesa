import type { ReactNode } from 'react';

interface Props {
  titolo: string;
  /** Una frase, o un nodo (in Importa, il nome del PDF scelto). */
  testo: ReactNode;
  /** L'azione della porta: un <Link>, un <button> o un <label> col suo input, con classe `porta-azione`. */
  children: ReactNode;
}

/**
 * Una porta: scheda bianca con titolo, spiegazione e la propria azione. Nata
 * nello stato vuoto di Piatti (spec due porte 06/09 §2.1), condivisa dal 23/09
 * con la scelta di Importa (spec fase 3 §C, §D). Una scelta fra due strade, non
 * il primario della schermata: per questo sta nel contenuto e non nel Dock.
 */
export function Porta({ titolo, testo, children }: Props) {
  return (
    <div
      style={{
        flexShrink: 0, padding: '20px 18px 18px', borderRadius: 22,
        background: 'var(--superficie)', border: '1px solid var(--bordo)',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--ink)' }}>
        {titolo}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', margin: '6px 0 16px' }}>{testo}</div>
      {children}
    </div>
  );
}
