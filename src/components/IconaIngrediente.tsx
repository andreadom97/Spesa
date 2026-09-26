import type { AreaId } from '@/domain/types';
import type { ChiaveIcona } from '@/domain/icone-ingredienti';
import { tonoMedioArea } from '@/domain/aree';
import { TRACCIATI } from './tracciati-ingredienti';

export type TonoIcona = 'area' | 'hero' | 'spento';

/**
 * L'icona ingrediente (DESIGN.md §6, eccezione del 26/09): di tratto, in basso
 * a destra, tagliata dal bordo per il 20% — la tessera che la ospita deve
 * avere `position: relative; overflow: hidden`, e i testi sopra
 * `position: relative`. Decorativa: aria-hidden, nessun tocco.
 */
export function IconaIngrediente({ chiave, area, tono, taglia }: {
  chiave: ChiaveIcona; area: AreaId; tono: TonoIcona; taglia: 52 | 84;
}) {
  const t = TRACCIATI[chiave];
  if (!t) return null;
  const colore = tono === 'hero' ? '#FFFFFF' : tono === 'spento' ? '#9A9AA6' : tonoMedioArea(area);
  const opacita = tono === 'hero' ? 0.42 : tono === 'spento' ? 0.5 : 1;
  const taglio = taglia === 84 ? -17 : -10;
  return (
    <svg
      data-icona={chiave}
      aria-hidden="true"
      width={taglia}
      height={taglia}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colore}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: taglio, bottom: taglio, opacity: opacita, pointerEvents: 'none' }}
    >
      <path d={t.d} transform={t.rot} strokeWidth={2} />
      <path d={t.dd} transform={t.rot} strokeWidth={1.25} />
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
