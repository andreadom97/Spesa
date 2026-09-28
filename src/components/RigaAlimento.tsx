'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { UnitaBase } from '@/domain/types';
import { MessaggioErrore } from '@/components/controlli';
import { SceltaUnita } from '@/components/SceltaUnita';

const ERRORE_NUMERO = 'Scrivi un numero maggiore di zero.';

/** Numero positivo da testo, con la virgola o col punto; null se non lo è. */
function numeroPositivo(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') return null;
  const n = Number(pulito);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Da numero a testo del campo: con la virgola, come lo si scriverebbe. */
function inTesto(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',');
}

export interface PropsRigaAlimento {
  nome: string;
  /** L'alimento per i nomi accessibili: «Quantità di …», «Togli …», «Unità di …». */
  etichetta: string;
  nota?: ReactNode;
  /** Mono 10 sopra il nome: da dove viene la riga («Martedì · cena · Merluzzo», «In 14 pasti»). */
  provenienza?: string;
  quantita: number | null;
  unita: UnitaBase | null;
  /** Le pillole G / ML / PZ sotto la riga (spec 8b, decisione 8: solo se il piano non sa l'unità). */
  scegliUnita: boolean;
  /** Bordo 1,5 `--ink`: la riga va sistemata (DESIGN.md §5, «avviso sulla riga di revisione»). */
  dubbio: boolean;
  avviso?: string;
  onValore: (quantita: number, unita: UnitaBase) => void;
  /** Assente: niente X. */
  onTogli?: () => void;
}

/**
 * La Riga dell'alimento (spec 8b §G): una Riga di impostazione col campo numerico 78 × 44 e
 * l'unità come finale, più la X da 44. Salva all'uscita dal campo e con Invio, mai a ogni
 * tasto. Un valore non valido torna a quello di prima con la nota d'errore; un campo svuotato
 * torna a quello di prima senza errore (una riga si toglie con la X). Nel dubbio senza unità
 * il numero aspetta la pillola, e la pillola salva se il numero c'è: si danno in qualunque
 * ordine. Segue `quantita` e `unita` che cambiano da fuori, come `CampoConSalva`.
 */
export function RigaAlimento({
  nome, etichetta, nota, provenienza, quantita, unita, scegliUnita, dubbio, avviso, onValore, onTogli,
}: PropsRigaAlimento) {
  const [testo, setTesto] = useState(() => inTesto(quantita));
  const [quantitaVista, setQuantitaVista] = useState(quantita);
  const [unitaScelta, setUnitaScelta] = useState<UnitaBase | null>(unita);
  const [unitaVista, setUnitaVista] = useState(unita);
  const [errore, setErrore] = useState(false);
  if (quantitaVista !== quantita) {
    setQuantitaVista(quantita);
    setTesto(inTesto(quantita));
    setErrore(false);
  }
  if (unitaVista !== unita) {
    setUnitaVista(unita);
    setUnitaScelta(unita);
  }

  function salva() {
    if (testo.trim() === '') {
      setTesto(inTesto(quantita));
      setErrore(false);
      return;
    }
    const n = numeroPositivo(testo);
    if (n === null) {
      setTesto(inTesto(quantita));
      setErrore(true);
      return;
    }
    setErrore(false);
    if (unitaScelta === null) return;
    if (n === quantita && unitaScelta === unita) return;
    onValore(n, unitaScelta);
  }

  function scegli(u: UnitaBase) {
    setUnitaScelta(u);
    const n = numeroPositivo(testo);
    if (n !== null && (n !== quantita || u !== unita)) onValore(n, u);
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    // Invio esce dal campo: il salvataggio lo fa l'uscita, una volta sola.
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  return (
    <div style={{ border: `1.5px solid ${dubbio ? 'var(--ink)' : 'transparent'}`, borderRadius: 14, padding: '0 6px', margin: '2px -6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, padding: '8px 0' }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {provenienza && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sec)', overflowWrap: 'anywhere' }}>
              {provenienza}
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)', overflowWrap: 'anywhere' }}>{nome}</span>
          {nota && <span style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--testo-2)', overflowWrap: 'anywhere' }}>{nota}</span>}
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Quantità di ${etichetta}`}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onBlur={salva}
          onKeyDown={tasto}
          style={{
            width: 78, height: 44, flex: 'none', boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
            border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
          }}
        />
        <span aria-hidden="true" style={{ width: 22, flex: 'none', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ter)' }}>
          {unitaScelta ?? ''}
        </span>
        {onTogli && (
          <button type="button" aria-label={`Togli ${etichetta}`} onClick={onTogli} style={{ width: 44, height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 -8px 0 -6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 5l14 14M19 5 5 19" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {scegliUnita && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
          <SceltaUnita valore={unitaScelta} onCambia={scegli} etichetta={`Unità di ${etichetta}`} />
        </div>
      )}
      {avviso && (
        <p aria-live="polite" style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--avviso)' }}>{avviso}</p>
      )}
      {errore && (
        <div style={{ paddingBottom: 8 }}>
          <MessaggioErrore ruolo="alert">{ERRORE_NUMERO}</MessaggioErrore>
        </div>
      )}
    </div>
  );
}
