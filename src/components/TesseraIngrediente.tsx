'use client';

import { useId, useState } from 'react';
import type { AreaId, UnitaMisura } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';

interface Props {
  nome: string;
  area: AreaId;
  quantita: number;
  unita: UnitaMisura;
  onCambiaQuantita: (quantita: number) => void;
  onRimuovi: () => void;
}

/**
 * rgba(hex, alpha): stessa conversione usata in renderVals() di Piatto.dc.html,
 * riscritta qui perché la tessera è l'unico punto che ne ha bisogno.
 */
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// La pillola visibile è alta circa 26px (padding 5px + riga di testo mono
// 10.5px): sotto il minimo di 44px per un bersaglio tattile. Il <label>
// che la avvolge porta l'area di tap a 44px senza cambiare la pillola —
// stessa regola già applicata al Segmento nel Task 9. Niente margine
// negativo per "recuperare" lo spazio: sovrapporrebbe l'area di tap al
// nome sotto, che intercetterebbe metà dei tap (misurato — vedi il report
// del Task 10). Il gap della tessera è ridotto di 5px per assorbire la
// differenza, così la tessera resta a 108px come nell'artboard.
const ALTEZZA_TAP_QUANTITA = 44;

/**
 * Tessera di un ingrediente dentro il piatto: pillola della grammatura,
 * nome, nome dell'area. La grammatura è la porzione del piano per una
 * persona — mai moltiplicata qui: il moltiplicatore vive nelle Impostazioni
 * e agisce solo in list-builder.
 *
 * L'artboard disegna la tessera come un unico <button>, ma qui la pillola
 * deve essere modificabile (è il punto di questa schermata: scrivere le
 * grammature) e serve un modo per togliere l'ingrediente. Un <button> non
 * può contenere un <input>, quindi la tessera è un <div> con due controlli
 * interattivi dentro: il campo numerico della quantità e la rimozione.
 *
 * La rimozione resta un'area di tap da 44px anche se il segno è piccolo,
 * stesso principio già applicato da <Segmento> per il tap in corsia. La
 * pillola della grammatura usa lo stesso principio ma con un <label>:
 * cliccare ovunque nella fascia da 44px porta il focus sull'<input>
 * nativamente, senza bisogno di gestori di click aggiuntivi.
 */
export function TesseraIngrediente({ nome, area, quantita, unita, onCambiaQuantita, onRimuovi }: Props) {
  const colore = coloreArea(area);
  const [testoQuantita, setTestoQuantita] = useState(String(quantita));
  const idQuantita = useId();

  function cambiaTesto(valore: string) {
    setTestoQuantita(valore);
    const n = Number(valore);
    if (valore.trim() !== '' && !Number.isNaN(n)) onCambiaQuantita(n);
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 108,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        padding: '13px 14px 12px',
        borderRadius: 15,
        background: '#FFFFFF',
        border: `1px solid ${rgba(colore, 0.45)}`,
        boxShadow: '0 1px 2px rgba(20,22,58,0.05)',
      }}
    >
      <button
        type="button"
        onClick={onRimuovi}
        aria-label={`Rimuovi ${nome}`}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M5 5l14 14M19 5 5 19" stroke="#C4C4CE" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      <label
        htmlFor={idQuantita}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          minHeight: ALTEZZA_TAP_QUANTITA,
          cursor: 'text',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: 'var(--ink)',
            background: rgba(colore, 0.32),
            borderRadius: 999,
            padding: '5px 10px',
          }}
        >
          <input
            id={idQuantita}
            type="number"
            inputMode="decimal"
            min={0}
            value={testoQuantita}
            onChange={(e) => cambiaTesto(e.target.value)}
            aria-label={`Grammatura di ${nome}`}
            className="quantita-input"
            style={{
              width: 32,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
              color: 'inherit',
            }}
          />
          <span>{unita}</span>
        </span>
      </label>
      <style jsx>{`
        .quantita-input::-webkit-outer-spin-button,
        .quantita-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .quantita-input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>

      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.12, color: 'var(--ink)' }}>
        {nome}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          letterSpacing: '0.09em',
          lineHeight: 1.4,
          color: 'var(--ter)',
          marginTop: 'auto',
        }}
      >
        {nomeArea(area)}
      </span>
    </div>
  );
}
