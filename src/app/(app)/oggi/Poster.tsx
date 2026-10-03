import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { AreaId } from '@/domain/types';
import type { ChiaveIcona } from '@/domain/icone-ingredienti';
import type { StatoCasella } from '@/domain/oggi';
import { IconaIngrediente } from '@/components/IconaIngrediente';

export interface IconaPiatto { chiave: ChiaveIcona; area: AreaId }

const STILE_POSTER: CSSProperties = {
  gridColumn: 'span 2', position: 'relative', overflow: 'hidden', background: 'var(--ink)',
  color: 'var(--superficie)', borderRadius: 18, padding: '13px 16px 16px', boxShadow: 'var(--ombra-pannello)',
};
const STILE_ETICHETTA: CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--poster-testo-2)',
};
const SOPRA: CSSProperties = { position: 'relative', zIndex: 1 };

/** Le quattro caselle di spec §B.3: 11 × 11, raggio 3. «futura» ha il bordo pieno, «fuori» tratteggiato. */
function stileCasella(stato: StatoCasella): CSSProperties {
  const base: CSSProperties = { width: 11, height: 11, borderRadius: 3, boxSizing: 'border-box' };
  if (stato === 'poster') return { ...base, background: 'var(--superficie)' };
  if (stato === 'passata') return { ...base, background: 'var(--poster-casella)' };
  if (stato === 'fuori') return { ...base, border: '2px dashed var(--poster-casella)' };
  return { ...base, border: '2px solid var(--poster-casella)' };
}

/** Il poster del prossimo pasto (spec §B.4): tessera piena in inchiostro, due colonne del bento. */
export function Poster(p: {
  etichetta: string; nomePiatto: string; sottotitolo: string | null;
  caselle: { slotDefId: string; stato: StatoCasella }[]; icona: IconaPiatto | null;
  hrefCambia: string; onComEAndata: (() => void) | null; onRimetti: (() => void) | null;
  inVolo: boolean; children?: ReactNode;
}) {
  return (
    <section aria-label="Prossimo pasto" style={STILE_POSTER}>
      <div style={{ ...SOPRA, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={STILE_ETICHETTA}>{p.etichetta}</span>
        <span data-caselle="" aria-hidden="true" style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {p.caselle.map((c) => <span key={c.slotDefId} data-stato={c.stato} style={stileCasella(c.stato)} />)}
        </span>
      </div>
      <h2 style={{ ...SOPRA, margin: '26px 0 0', maxWidth: '84%', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.04, color: 'var(--superficie)' }}>
        {p.nomePiatto}
      </h2>
      {p.sottotitolo && (
        <p style={{ ...SOPRA, margin: '6px 0 0', maxWidth: '80%', fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.06em', lineHeight: 1.5, textTransform: 'uppercase', color: 'var(--poster-testo-3)' }}>
          {p.sottotitolo}
        </p>
      )}
      <div style={{ ...SOPRA, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <Link href={p.hrefCambia} className="pillola-poster">Cambia</Link>
        {p.onComEAndata && (
          <button type="button" className="pillola-poster" onClick={p.onComEAndata}>Com&apos;è andata</button>
        )}
      </div>
      {p.onRimetti && (
        // Spec §C.6: «sotto le azioni» — una riga sua, mai accanto a CAMBIA.
        <div style={{ ...SOPRA, marginTop: 8 }}>
          <button type="button" className="pillola-poster" onClick={p.onRimetti} disabled={p.inVolo}>Rimetti quello del piano</button>
        </div>
      )}
      {p.children}
      {p.icona && <IconaIngrediente chiave={p.icona.chiave} area={p.icona.area} tono="hero" taglia={96} />}
    </section>
  );
}

/** Il poster senza pasto (spec §B.1, §F): domani non pianificato, o nessun pasto in programma. */
export function PosterVuoto({ etichetta, testo }: { etichetta: string; testo: string }) {
  return (
    <section aria-label="Prossimo pasto" style={STILE_POSTER}>
      <span style={STILE_ETICHETTA}>{etichetta}</span>
      <p style={{ margin: '20px 0 0', fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--superficie)' }}>
        {testo}
      </p>
      <div style={{ marginTop: 14 }}>
        <Link href="/piano" className="pillola-poster">Apri il piano</Link>
      </div>
    </section>
  );
}
