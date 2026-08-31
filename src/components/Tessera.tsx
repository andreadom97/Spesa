'use client';

import type { AreaId, UnitaBase } from '@/domain/types';
import { coloreArea } from '@/domain/aree';

interface Props {
  nome: string;
  area: AreaId;
  unita: UnitaBase;
  fabbisogno: number;
  residuo: number;
  confezioni: number;
  quantitaTotale: number;
  spuntato: boolean;
  /** Solo sulle voci porzionabili: mostra "serve X · in casa Y". */
  mostraDettaglio: boolean;
  /** true sulla prima voce dell'area: due colonne, fondo pieno, nome a 25px. */
  protagonista: boolean;
  onToggle: () => void;
}

const INK = '#14163A';
const MUT = '#8A8A96';
const OFF_INK = 'rgba(20,22,58,0.34)';
const OFF_MUT = 'rgba(20,22,58,0.24)';

/** Stessa conversione usata in TesseraIngrediente ed in Piatto.dc.html — ogni file che ne ha bisogno la ridefinisce, per scelta del progetto. */
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * La tessera della Lista: variante "pillola" di Lista.dc.html, l'unica delle
 * cinque esplorazioni rimasta attiva (le altre quattro sono scartate, non
 * vanno riprese).
 *
 * Nessuna checkbox: la tessera intera è l'interruttore. Accesa (spuntato
 * false) = da prendere; spenta (spuntato true) = presa, con nome barrato e
 * fondo quasi trasparente. La pillola delle confezioni sta sempre in cima,
 * prima del nome — è "in cima alla tessera" nel brief, ordine invertito
 * rispetto al dato (che porta prima il nome): qui la pillola è renderizzata
 * per prima nel markup invece di usare `order: -1` in CSS, stesso risultato
 * visivo con meno stile da portare dietro.
 */
export function Tessera({
  nome, area, unita, fabbisogno, residuo, confezioni, quantitaTotale,
  spuntato, mostraDettaglio, protagonista, onToggle,
}: Props) {
  const colore = coloreArea(area);
  const acceso = !spuntato;
  const mostraSottotitolo = mostraDettaglio && acceso;

  let background: string;
  let border: string;
  let boxShadow: string | undefined;
  let nameColor: string;
  let qtyColor: string;
  let pillBg: string;
  let pillTxt: string;

  // La variante pillola (l'unica attiva in Lista.dc.html) mostra le
  // confezioni dentro la pillola, il cui colore è pillTxt/pillBg: non serve
  // un colore separato per un testo "conf" nudo, che esiste solo nelle altre
  // quattro varianti scartate.
  if (!acceso) {
    background = 'rgba(20,22,58,0.035)';
    border = '1px solid transparent';
    boxShadow = undefined;
    nameColor = OFF_INK; qtyColor = OFF_MUT;
    pillBg = 'rgba(20,22,58,0.06)'; pillTxt = OFF_INK;
  } else if (protagonista) {
    background = colore;
    border = `1px solid ${rgba(colore, 0.9)}`;
    boxShadow = undefined;
    nameColor = INK; qtyColor = rgba(INK, 0.55);
    pillBg = '#FFFFFF'; pillTxt = INK;
  } else {
    background = '#FFFFFF';
    border = `1px solid ${rgba(colore, 0.45)}`;
    boxShadow = '0 1px 2px rgba(20,22,58,0.05)';
    nameColor = INK; qtyColor = MUT;
    pillBg = rgba(colore, 0.32); pillTxt = INK;
  }

  const confLabel = unita === 'pz' ? `${confezioni} pz` : `${confezioni} conf`;
  const qtyLabel = `${quantitaTotale} ${unita}`;
  const subLabel = `serve ${Math.round(fabbisogno)} ${unita} · in casa ${Math.round(residuo)} ${unita}`;
  const subColor = protagonista ? rgba(INK, 0.55) : '#A6A6B2';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={spuntato}
      aria-label={`${nome}: ${acceso ? 'da prendere, tocca per segnare presa' : 'presa, tocca per rimetterla da prendere'}`}
      className="anim-stato"
      style={{
        gridColumn: protagonista ? 'span 2' : undefined,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 104,
        padding: protagonista ? '13px 16px 14px' : '12px 14px 13px',
        borderRadius: protagonista ? 18 : 15,
        background,
        border,
        boxShadow,
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10.5, letterSpacing: '0.07em',
            color: pillTxt, background: pillBg, borderRadius: 999, padding: '5px 10px',
          }}
        >
          {confLabel}
        </span>
        <span
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 10, letterSpacing: '0.04em', color: qtyColor }}
        >
          {qtyLabel}
        </span>
      </div>
      <div style={{ minWidth: 0, marginTop: 10 }}>
        <div
          style={{
            fontSize: protagonista ? 25 : 17, fontWeight: 700, letterSpacing: '-0.032em', lineHeight: 1.1,
            color: nameColor,
            textDecoration: acceso ? 'none' : 'line-through',
            textDecorationThickness: acceso ? undefined : '1.6px',
          }}
        >
          {nome}
        </div>
        {mostraSottotitolo && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.02em', marginTop: 5, color: subColor }}>
            {subLabel}
          </div>
        )}
      </div>
    </button>
  );
}
