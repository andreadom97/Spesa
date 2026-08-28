import type { AreaId } from '@/domain/types';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';

interface Props {
  /** Le aree in cui manca ancora qualcosa. Vuoto = marchio tutto pieno. */
  aree: AreaId[];
  lato?: number;
}

/**
 * Griglia 3×2 nell'ordine fisso del marchio. Ogni casella è sempre nel colore
 * della sua area: piena quando in quell'area non manca niente — o l'hai
 * completata, o non era in questa spesa — contornata quando manca qualcosa.
 * Mai grigia.
 */
export function Marchio({ aree, lato = 16 }: Props) {
  const manca = new Set(aree);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${lato}px)`, gap: 4, flex: 'none' }}>
      {ORDINE_MARCHIO.map((area) => {
        const vuoto = manca.has(area);
        const colore = coloreArea(area);
        return (
          <div
            key={area}
            data-area={area}
            data-stato={vuoto ? 'vuoto' : 'pieno'}
            style={{
              width: lato, height: lato, borderRadius: lato * 0.28, boxSizing: 'border-box',
              border: `2px solid ${colore}`,
              background: vuoto ? 'transparent' : colore,
            }}
          />
        );
      })}
    </div>
  );
}
