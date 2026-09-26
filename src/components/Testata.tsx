'use client';

import { inizialeDi, useUtente } from '@/data/utente';
import { usePannello } from './pannello/PannelloProvider';
import { ID_MENU_UTENTE, ID_PANNELLO } from './pannello/tipi';

interface Props {
  titolo: string;
  /** Etichetta della pillola settimana, in sentence case ("Settimana del 21 settembre"): la
   *  pillola la rende maiuscola da sé (DESIGN.md §3). Assente = niente pillola. */
  settimana?: string;
  /**
   * Modo indietro (spec fase 5 §G.2): una pillola sopra il titolo, al posto del
   * Menù utente. L'etichetta dice dove porta (`IMPOSTAZIONI`, `LISTA`, `PIANO`),
   * `ariaLabel` lo dice per intero, e `onTorna` ci va: la Testata non sa
   * niente di pannello e cronologia, lo sa chi la monta. La pillola settimana,
   * se c'è, sta sotto il titolo anche qui (spec fase 6 §D.2): il traguardo
   * chiude quella settimana.
   */
  indietro?: { etichetta: string; ariaLabel: string; onTorna: () => void };
}

const STILE_TITOLO = { margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' } as const;

/**
 * Testata condivisa (redesign 19/09): titolo in sentence case a sinistra e, a destra, il Menù
 * utente — pillola con il tondo dell'iniziale e il kebab — che apre e chiude il Pannello
 * impostazioni (spec fase 5 §A.2); in modo indietro, la pillola sopra il titolo (§G.2). Il
 * Marchio non vive più qui: sta nella tab bar, come icona della Lista. Fuori dal Guscio (i test
 * di una pagina) il pannello è inerte: il Menù c'è e non apre niente.
 */
export function Testata({ titolo, settimana, indietro }: Props) {
  const utente = useUtente();
  const { aperto, apri, chiudi } = usePannello();
  const nome = utente?.nome ?? '';
  // Prima che getUser risponda il nome non c'è: il nome accessibile dice solo cosa apre.
  const etichettaMenu = nome ? `${nome}: profilo e impostazioni` : 'Profilo e impostazioni';
  // Gli hook stanno sopra: si chiamano sempre, anche in modo indietro.
  if (indietro) {
    return (
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PillolaIndietro {...indietro} />
        <h1 style={STILE_TITOLO}>{titolo}</h1>
        {settimana && <PillolaSettimana testo={settimana} />}
      </div>
    );
  }
  return (
    <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
          <h1 style={STILE_TITOLO}>{titolo}</h1>
        </div>
        <button
          type="button"
          id={ID_MENU_UTENTE}
          aria-label={etichettaMenu}
          aria-expanded={aperto}
          aria-controls={ID_PANNELLO}
          onClick={() => (aperto ? chiudi() : apri())}
          style={{
            height: 50, display: 'flex', alignItems: 'center', gap: 5, margin: '0 -2px -3px 0', flex: 'none',
            background: 'var(--barra-attiva)', borderRadius: 999, padding: '0 12px 0 6px',
            boxShadow: aperto ? 'var(--ombra-nav)' : 'none',
          }}
        >
          <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--superficie)' }}>
              {inizialeDi(nome)}
            </span>
          </span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="4" r="1.8" fill="var(--ink)" /><circle cx="10" cy="10" r="1.8" fill="var(--ink)" /><circle cx="10" cy="16" r="1.8" fill="var(--ink)" />
          </svg>
        </button>
      </div>
      {settimana && <PillolaSettimana testo={settimana} />}
    </div>
  );
}

/**
 * La pillola del modo indietro (frame 22): alta 44 su 0,07, freccia 20 e
 * l'etichetta mono 11. È un bottone e non un link: la destinazione può
 * dipendere da `sessionStorage` (l'origine del pannello), che non esiste
 * al momento del render sul server.
 */
function PillolaIndietro({ etichetta, ariaLabel, onTorna }: { etichetta: string; ariaLabel: string; onTorna: () => void }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onTorna}
      style={{
        alignSelf: 'flex-start', height: 44, display: 'flex', alignItems: 'center', gap: 6,
        borderRadius: 999, background: 'var(--barra-attiva)', padding: '0 16px 0 10px', color: 'var(--ink)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {etichetta}
    </button>
  );
}

/** La pillola settimana (DESIGN.md §8 Testata): informativa, non si tocca. */
function PillolaSettimana({ testo }: { testo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--ink)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--superficie)' }}>
        {testo}
      </span>
    </div>
  );
}
