'use client';

import { useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';

/** Pillola d'azione (DESIGN.md §8): disegno 44 nei Sì/No e nei SALVA, mono 11/700/0.08em. */
export const STILE_PILLOLA = {
  minHeight: 44, padding: '0 15px', borderRadius: 999,
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
};

const STILE_TASTO = {
  height: 54, borderRadius: 18, width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const,
};

export function TastoPrimario({ children, style, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const spento = Boolean(resto.disabled);
  return (
    <button
      type="button"
      {...resto}
      style={{
        ...STILE_TASTO,
        background: spento ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
        color: spento ? 'var(--ter)' : 'var(--superficie)',
        boxShadow: spento ? 'none' : 'var(--ombra-tasto)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function TastoSecondario({ children, style, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      {...resto}
      style={{ ...STILE_TASTO, background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid var(--bordo)', opacity: resto.disabled ? 0.5 : 1, ...style }}
    >
      {children}
    </button>
  );
}

/** Un blocco del dettaglio: filetto 1 px sopra e 16 di distacco (tranne il primo). */
export function Blocco({ children, primo = false }: { children: ReactNode; primo?: boolean }) {
  return (
    <div style={{ borderTop: primo ? 'none' : '1px solid var(--bordo)', paddingTop: primo ? 0 : 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  );
}

export function Etichetta({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
      {children}
    </span>
  );
}

export function MessaggioErrore({ children, ruolo }: { children: ReactNode; ruolo?: 'alert' }) {
  return <p role={ruolo} style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)' }}>{children}</p>;
}

const ERRORE_TOCCO = 'Non siamo riusciti a salvare. Riprova.';

interface OpzioneSiNo {
  testo: string;
  aria: string;
  premuto: boolean;
}

/**
 * Riga di impostazione con la coppia Sì / No (DESIGN.md §8). Salva al tocco:
 * è reversibile (§9). Il tocco sul tasto già premuto non fa niente. Mentre la
 * scrittura è in volo i due tasti sono a 0,5 e `disabled`; se fallisce, sotto
 * la riga compare l'errore dei tocchi che salvano subito.
 */
export function RigaSiNo({ nome, si, no, onSi, onNo }: {
  nome: string; si: OpzioneSiNo; no: OpzioneSiNo; onSi: () => Promise<void>; onNo: () => Promise<void>;
}) {
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);
  async function tocca(premuto: boolean, azione: () => Promise<void>) {
    if (premuto || volo) return;
    setVolo(true);
    setErrore(false);
    try {
      await azione();
    } catch {
      setErrore(true);
    } finally {
      setVolo(false);
    }
  }
  const tasto = (o: OpzioneSiNo, azione: () => Promise<void>) => (
    <button
      type="button"
      aria-label={o.aria}
      aria-pressed={o.premuto}
      disabled={volo}
      onClick={() => void tocca(o.premuto, azione)}
      style={{
        ...STILE_PILLOLA, minWidth: 56,
        background: o.premuto ? 'var(--ink)' : 'var(--superficie)',
        color: o.premuto ? 'var(--superficie)' : 'var(--sec)',
        border: o.premuto ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
        opacity: volo ? 0.5 : 1,
      }}
    >
      {o.testo}
    </button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 52 }}>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>{nome}</span>
        {tasto(si, onSi)}
        {tasto(no, onNo)}
      </div>
      {errore && <MessaggioErrore>{ERRORE_TOCCO}</MessaggioErrore>}
    </div>
  );
}

function numeroDa(testo: string, intero: boolean): number | null {
  const t = testo.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  if (intero && !Number.isInteger(n)) return null;
  return n;
}

/**
 * Campo numerico con `SALVA` (spec §D.2, v1 04/05): spenta finché il numero non
 * cambia; Invio = SALVA; in volo 0,5 e `disabled`; in errore il campo prende il
 * bordo 1,5, SALVA diventa RIPROVA pieno, e sotto compare `messaggioErrore`.
 * Un valore non valido riporta il campo al valore salvato. Se `valore` cambia
 * da fuori (SÌ di In casa, la nota AI), il campo lo segue: aggiustamento dello
 * stato durante il render, come in `Guscio`, non un effetto.
 */
export function CampoConSalva({ aria, valore, unita, intero = false, messaggioErrore, onSalva }: {
  aria: string; valore: number; unita: string; intero?: boolean; messaggioErrore: string; onSalva: (n: number) => Promise<void>;
}) {
  const [testo, setTesto] = useState(String(valore));
  const [visto, setVisto] = useState(valore);
  const [stato, setStato] = useState<'fermo' | 'volo' | 'errore'>('fermo');
  if (visto !== valore) {
    setVisto(valore);
    setTesto(String(valore));
  }
  const cambiato = testo !== String(valore);

  async function salva() {
    if (!cambiato || stato === 'volo') return;
    const n = numeroDa(testo, intero);
    if (n === null) {
      setTesto(String(valore));
      return;
    }
    setStato('volo');
    try {
      await onSalva(n);
      setStato('fermo');
    } catch {
      setStato('errore');
    }
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void salva();
    }
  }

  const errore = stato === 'errore';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <input
          type="text"
          inputMode="decimal"
          aria-label={aria}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={tasto}
          style={{
            width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
            border: errore ? '1.5px solid var(--ink)' : '1px solid var(--bordo)', background: 'var(--superficie)',
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ter)', minWidth: 22 }}>{unita}</span>
        <button
          type="button"
          onClick={() => void salva()}
          disabled={!cambiato || stato === 'volo'}
          style={{
            ...STILE_PILLOLA,
            background: errore ? 'var(--ink)' : cambiato ? 'var(--superficie)' : 'rgba(20,22,58,0.10)',
            color: errore ? 'var(--superficie)' : cambiato ? 'var(--ink)' : 'var(--ter)',
            border: cambiato && !errore ? '1px solid rgba(20,22,58,0.09)' : '1px solid transparent',
            opacity: stato === 'volo' ? 0.5 : 1,
          }}
        >
          {errore ? 'RIPROVA' : 'SALVA'}
        </button>
      </div>
      {errore && <MessaggioErrore>{messaggioErrore}</MessaggioErrore>}
    </div>
  );
}
