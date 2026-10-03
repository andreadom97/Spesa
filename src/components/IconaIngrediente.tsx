import { useId } from 'react';
import type { AreaId } from '@/domain/types';
import type { ChiaveIcona } from '@/domain/icone-ingredienti';
import { coloreArea, tonoMedioArea } from '@/domain/aree';
import { TRACCIATI } from './tracciati-ingredienti';

export type TonoIcona = 'area' | 'hero' | 'tinta' | 'spento';

/**
 * Righe a 45° ogni 1,2 che coprono tutta la griglia 24. Sono le stesse per ogni icona: la
 * maschera le riduce alla falce d'ombra della sagoma.
 */
export const RIGHE_OMBRA = Array.from({ length: 44 }, (_, i) => {
  const x = +(-2 + i * 1.2).toFixed(2);
  return `M${x} -1L${+(x - 26).toFixed(2)} 25`;
}).join('');

/** La sagoma spostata che si toglie per lasciare l'ombra: la luce viene da in alto a sinistra. */
const SPOSTA_OMBRA = 'translate(-2 -2.2)';

/** Stessa conversione di Tessera.tsx: ogni file che ne ha bisogno la ridefinisce, per scelta del progetto. */
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * L'icona ingrediente (DESIGN.md §6, due toni dal 03/10): sagoma piena, ombra a tratteggio, contorno e
 * dettagli a tratto. Come quella di tratto sta in basso a destra, tagliata dal bordo: la tessera
 * che la ospita ha `position: relative; overflow: hidden`. Decorativa: aria-hidden, nessun tocco.
 * La rotazione tocca sagoma, contorno e dettagli; l'ombra resta in basso a destra.
 */
export function IconaIngrediente({ chiave, area, tono, taglia }: {
  chiave: ChiaveIcona; area: AreaId; tono: TonoIcona; taglia: 60 | 96;
}) {
  // useId prima del ritorno anticipato (regola degli hook). I due punti e le virgolette che
  // React mette nell'id non vanno bene dentro url(#…): si tolgono.
  const maschera = 'ombra-' + useId().replace(/[^A-Za-z0-9_-]/g, '');
  const t = TRACCIATI[chiave];
  if (!t) return null;
  const spento = tono === 'spento';
  const tratto = spento ? '#9A9AA6' : tonoMedioArea(area);
  const pieno = spento ? 'rgba(20,22,58,0.06)' : tono === 'area' ? rgba(coloreArea(area), 0.72) : 'rgba(255,255,255,0.7)';
  const taglio = taglia === 96 ? -18 : -11;
  return (
    <svg
      data-icona={chiave}
      data-tono={tono}
      aria-hidden="true"
      width={taglia}
      height={taglia}
      viewBox="0 0 24 24"
      fill="none"
      stroke={tratto}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: taglio, bottom: taglio, pointerEvents: 'none' }}
    >
      <defs>
        <mask id={maschera} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">
          <path d={t.sil} transform={t.rot} fill="#FFFFFF" stroke="none" />
          <path d={t.sil} transform={t.rot ? `${SPOSTA_OMBRA} ${t.rot}` : SPOSTA_OMBRA} fill="#000000" stroke="none" />
        </mask>
      </defs>
      <path data-parte="pieno" d={t.sil} transform={t.rot} fill={pieno} stroke="none" />
      <g data-parte="tratti" opacity={spento ? 0.55 : 1}>
        <path data-parte="ombra" d={RIGHE_OMBRA} strokeWidth={0.34} mask={`url(#${maschera})`} />
        <path data-parte="contorno" d={t.d} transform={t.rot} strokeWidth={0.9} />
        <path data-parte="dettagli" d={t.dd.join('')} transform={t.rot} strokeWidth={0.5} />
      </g>
    </svg>
  );
}

/**
 * Alone sul nome: otto copie senza sfocatura più una sfocata, nel colore
 * opaco del fondo della tessera. Si vede solo dove interrompe il tratto
 * dell'icona; sul fondo nudo è invisibile.
 */
export function alone(colore: string, px: 2 | 3): string {
  const k = +(px * 0.707).toFixed(2);
  const dir: [number, number][] = [[px, 0], [-px, 0], [0, px], [0, -px], [k, k], [-k, k], [k, -k], [-k, -k]];
  return dir.map(([x, y]) => `${x}px ${y}px 0 ${colore}`).concat(`0 0 ${px + 1}px ${colore}`).join(',');
}
