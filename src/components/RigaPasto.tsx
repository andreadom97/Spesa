'use client';

import Link from 'next/link';
import type { AreaId, StatoSlot } from '@/domain/types';
import { coloreArea } from '@/domain/aree';

interface Props {
  /** Nome del meal_slot_def, es. "Colazione". */
  nomePasto: string;
  /** Stato dello slot: pilota etichetta e accensione della riga. */
  stato: StatoSlot;
  /** Nome del piatto assegnato, o null se nessuno (slot fuori casa, o repertorio vuoto per quel pasto). */
  nomePiatto: string | null;
  /** Le aree distinte del piatto, nell'ordine dell'utente. Vuoto se nomePiatto è null. */
  aree: AreaId[];
  /** Le opzioni scelte per i componenti del piatto ("Uova + Passata di pomodoro"), da `descriviScelte`. null = niente da mostrare (piatto senza componenti). */
  sottotitolo?: string | null;
  /** Zona sinistra 60px: accende/spegne. Un tap solo, sempre disponibile. */
  onToggleStato: () => void;
  /** Zona centrale: apre il dettaglio del piatto. Assente (nessun onClick) se non c'è un piatto da aprire. */
  onApriPiatto?: () => void;
  /** Zona destra 44px: apre "Scegli il piatto" per questo slot. */
  hrefScegli: string;
  /**
   * Se presente, la zona destra apre l'action sheet della spunta invece di
   * navigare a Scegli (giorni ≤ oggi a settimana non-bozza, spec §6).
   */
  onApriAzioni?: () => void;
}

/** Cosa dice la riga spenta, per ciascun modo di non mangiare il piatto. */
const ETICHETTA_SPENTO: Record<Exclude<StatoSlot, 'casa'>, string> = {
  fuori: 'Fuori casa',
  saltato: 'Saltato',
  sostituito: 'Ho mangiato altro',
};

/**
 * Una riga pasto della Settimana: tre zone, tre comportamenti — il punto
 * corretto due volte nel design (vedi il brief del Task 12). L'ordine e le
 * larghezze non sono negoziabili: casa a sinistra (60px, accende/spegne),
 * corpo centrale (apre il piatto), freccia a destra (44px, apre la scelta).
 *
 * Stato fuori casa: la casa è bianca con contorno #BFBFC9 a 1.3px. Senza quel
 * contorno l'icona sparisce sul fondo chiaro — è l'errore già commesso una
 * volta, non va ripetuto.
 */
export function RigaPasto({ nomePasto, stato, nomePiatto, aree, sottotitolo, onToggleStato, onApriPiatto, hrefScegli, onApriAzioni }: Props) {
  const aCasa = stato === 'casa';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 18,
        background: aCasa ? '#FFFFFF' : 'rgba(20,22,58,0.04)',
        border: aCasa ? '1px solid rgba(20,22,58,0.09)' : '1px solid transparent',
      }}
    >
      <button
        type="button"
        onClick={onToggleStato}
        aria-pressed={aCasa}
        aria-label={aCasa ? `${nomePasto}: a casa, tocca per segnare fuori` : `${nomePasto}: fuori casa, tocca per segnare a casa`}
        style={{
          width: 60,
          alignSelf: 'stretch',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {aCasa ? (
          <svg width="23" height="23" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.8 17.4 9.1v7.5a1 1 0 0 1-1 1h-3.6v-4.2H7.2v4.2H3.6a1 1 0 0 1-1-1V9.1Z" fill="#14163A" />
          </svg>
        ) : (
          <svg width="23" height="23" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2.8 17.4 9.1v7.5a1 1 0 0 1-1 1h-3.6v-4.2H7.2v4.2H3.6a1 1 0 0 1-1-1V9.1Z"
              fill="#FFFFFF"
              stroke="#BFBFC9"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={onApriPiatto}
        disabled={!onApriPiatto}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 5,
          padding: '13px 0',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.13em',
            color: aCasa ? '#8A8A96' : '#C4C4CE',
          }}
        >
          {nomePasto.toUpperCase()}
        </span>
        <span
          style={{
            fontSize: 17.5,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            color: aCasa ? 'var(--ink)' : '#B6B6C0',
            textDecoration: aCasa ? 'none' : 'line-through',
            textDecorationThickness: aCasa ? undefined : '1.5px',
          }}
        >
          {aCasa ? (nomePiatto ?? 'Nessun piatto assegnato') : ETICHETTA_SPENTO[stato as Exclude<StatoSlot, 'casa'>]}
        </span>
        {aCasa && sottotitolo && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              color: '#8A8A96',
            }}
          >
            {sottotitolo}
          </span>
        )}
        {aCasa && aree.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {aree.map((a) => (
              <span
                key={a}
                style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
              />
            ))}
          </div>
        )}
      </button>

      {onApriAzioni ? (
        <button
          type="button"
          onClick={onApriAzioni}
          aria-label={`Azioni per ${nomePasto}`}
          style={{
            width: 44,
            alignSelf: 'stretch',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="1.5" fill="#C4C4CE" />
            <circle cx="8" cy="8" r="1.5" fill="#C4C4CE" />
            <circle cx="8" cy="13" r="1.5" fill="#C4C4CE" />
          </svg>
        </button>
      ) : (
        <Link
          href={hrefScegli}
          aria-label={`Scegli il piatto per ${nomePasto}`}
          style={{
            width: 44,
            alignSelf: 'stretch',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="#C4C4CE" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </div>
  );
}
