'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useSlotDock } from './dock-slot';
import { useBarraNascosta } from './barra-context';

/**
 * Il posto dell'azione principale: una pillola bianca a portata di pollice
 * sopra la tab bar, che scende con lei quando la barra si restringe
 * (DESIGN.md §8 Dock, una riga sola dal 20/09).
 *
 * Si monta con un portale in uno slot del `Guscio`, non dove è scritto nella
 * pagina. Le pagine stanno dentro `<main className="guscio-main">`, che
 * scorre: un figlio assoluto dentro un contenitore che scorre è la
 * situazione in cui iOS lo taglia o lo trascina. Nello slot il Dock è
 * fratello della tab bar e la domanda non si pone.
 *
 * Finché lo slot non c'è (primo render, prima che il ref si attacchi) non
 * renderizza: nessuna delle schermate mostra il Dock prima che i dati
 * arrivino, quindi non si vede nessun salto.
 *
 * Senza tab bar sta a 22 dal fondo (`.dock-senza-barra`).
 */
// `sciolto`: la Dispensa, dove due controlli stanno allineati a destra senza
// il contenitore bianco, spec fase 4 §A.
export function Dock({ children, sciolto = false }: { children: ReactNode; sciolto?: boolean }) {
  const slot = useSlotDock();
  // Senza tab bar (l'editor dell'ingrediente, spec fase 5 §F) il Dock scende dove
  // starebbe lei: lo decide il CSS con `.dock-senza-barra`. Lo chiede chi nasconde la
  // barra con `useNascondiBarra`, il Dock lo legge e basta.
  const senzaBarra = useBarraNascosta();
  if (slot === null) return null;
  const classi = `dock anim-dock${sciolto ? ' dock-sciolto' : ''}${senzaBarra ? ' dock-senza-barra' : ''}`;
  // Una regione con nome (spec fase 3 §H, DESIGN.md §8 Dock): chi naviga per
  // regioni con lo screen reader trova l'azione principale senza scorrere. Il
  // nome dice il posto, uguale per ogni Dock; l'azione ha il suo sul tasto.
  return createPortal(
    <div className={classi} role="region" aria-label="Azione principale">{children}</div>,
    slot,
  );
}

/**
 * L'errore dell'azione del Dock (fase 7): sta sopra la pillola, fuori, su fondo
 * bianco, perché sotto scorre la pagina. Si passa come figlio del `Dock`, prima
 * del tasto: il messaggio si appoggia al bordo alto del contenitore `.dock`.
 * `role="alert"`: compare dopo un tocco fallito e va annunciato. È il blocco di
 * oggi dell'editor dell'ingrediente, pari pari, estratto perché lo usano anche
 * Scegli e l'editor del Piatto: un disegno solo, non tre copie.
 */
export function ErroreSopraDock({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{
      position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', margin: 0, padding: '10px 14px',
      borderRadius: 14, background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
      fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)',
    }}>
      {children}
    </p>
  );
}
