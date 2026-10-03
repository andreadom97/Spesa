import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { AreaId } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { testoDispensaFerma } from '@/domain/oggi-testi';
import { IconaIngrediente, alone } from '@/components/IconaIngrediente';
import type { IconaPiatto } from './Poster';

/** Pillola di stato (non d'azione): 5/10, mono 10,5 (DESIGN.md §8 Tessera della Lista). */
const STILE_PILLOLA: CSSProperties = {
  alignSelf: 'flex-start', position: 'relative', zIndex: 1, borderRadius: 999, padding: '5px 10px',
  fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
};
const STILE_SOTTO: CSSProperties = {
  position: 'relative', zIndex: 1, marginTop: 6, maxWidth: '80%', fontFamily: 'var(--font-mono)', fontSize: 8.5,
  letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1.5,
};
/** Il guscio comune delle tessere: `relative` + `overflow: hidden` tengono dentro l'icona tagliata in basso a destra. */
const sopra = (larga?: boolean): CSSProperties => ({
  position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 18,
  padding: '13px 14px 14px', boxShadow: 'var(--ombra-pannello)', textDecoration: 'none', color: 'var(--ink)',
  gridColumn: larga ? 'span 2' : undefined,
});

/**
 * Tessera piena nel colore d'area (spec §D.1, §D.3); bianca se l'area manca. In coda dispari prende due
 * colonne (`larga`): solo l'altezza minima scende a 64, il contenuto decide il resto.
 */
export function TesseraPiena(p: {
  area: AreaId | null; pillola: string; nome: string; sottotitolo: string; icona: IconaPiatto | null;
  href: string; larga?: boolean;
}) {
  const fondo = p.area ? coloreArea(p.area) : 'var(--superficie)';
  return (
    <Link href={p.href} style={{ ...sopra(p.larga), minHeight: p.larga ? 64 : 140, background: fondo, border: p.area ? '1px solid transparent' : '1px solid var(--bordo)' }}>
      <span style={{ ...STILE_PILLOLA, background: 'var(--superficie)', color: 'var(--ink)' }}>{p.pillola}</span>
      {/* L'alone ha il colore del fondo, come la protagonista della Lista: qui il fondo è il colore d'area pieno,
          non la sua tinta al 26% (quella, `tintaOpacaArea`, è il fondo della tessera di dispensa). */}
      <span style={{ position: 'relative', zIndex: 1, marginTop: 10, maxWidth: '82%', fontSize: 25, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, textShadow: p.icona ? alone(p.area ? coloreArea(p.area) : '#FFFFFF', 3) : undefined }}>
        {p.nome}
      </span>
      {/* --ink-2 e non --testo-2 sul colore d'area: 4,6:1 o più su tutte e sei le aree, contro 4,1:1 al massimo [calcolato]. */}
      <span style={{ ...STILE_SOTTO, color: p.area ? 'var(--ink-2)' : 'var(--testo-2)' }}>{p.sottotitolo}</span>
      {p.icona && <IconaIngrediente chiave={p.icona.chiave} area={p.icona.area} tono="hero" taglia={96} />}
    </Link>
  );
}

/** Tessera bianca (spec §D.2, §D.4): con la pillola fredda o con l'etichetta mono. */
export function TesseraBianca(p: {
  pillola: { testo: string; tono: 'freddo' } | null; etichetta: string | null; nome: string;
  sottotitolo: string | null; icona: IconaPiatto | null; href: string; larga?: boolean;
}) {
  return (
    <Link href={p.href} style={{ ...sopra(p.larga), minHeight: p.larga ? 64 : 104, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      {p.pillola && <span style={{ ...STILE_PILLOLA, background: 'var(--tinta-freddo)', color: 'var(--freddo)' }}>{p.pillola.testo}</span>}
      {p.etichetta && (
        // --testo-2 e non --sec: l'etichetta («Poi · Cena») porta informazione, e --sec è solo decorazione (3,4:1 su bianco, DESIGN.md §2.1).
        <span style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--testo-2)' }}>
          {p.etichetta}
        </span>
      )}
      <span style={{ position: 'relative', zIndex: 1, marginTop: 8, maxWidth: '86%', fontSize: 17, fontWeight: 700, letterSpacing: '-0.032em', lineHeight: 1.12, textShadow: p.icona ? alone('#FFFFFF', 2) : undefined }}>
        {p.nome}
      </span>
      {p.sottotitolo && <span style={{ ...STILE_SOTTO, color: 'var(--testo-2)' }}>{p.sottotitolo}</span>}
      {p.icona && <IconaIngrediente chiave={p.icona.chiave} area={p.icona.area} tono="area" taglia={60} />}
    </Link>
  );
}

/** La tessera tratteggiata della dispensa non aggiornata (spec §D.5). */
export function TesseraDispensaFerma({ ultimaChiusura }: { ultimaChiusura: string | null }) {
  const { forte, resto } = testoDispensaFerma(ultimaChiusura);
  return (
    <div style={{ gridColumn: 'span 2', border: '2px dashed var(--bordo-tratteggio)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--testo-2)' }}>
        {forte && <strong style={{ color: 'var(--ink)' }}>{forte}</strong>}
        {resto}
      </p>
      {/* Pillola d'azione (DESIGN.md §8): disegno 38, area di tap 44 data dal Link. */}
      <Link href="/lista" style={{ alignSelf: 'flex-start', minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
        <span style={{
          height: 38, padding: '0 15px', borderRadius: 999, display: 'inline-flex', alignItems: 'center',
          background: 'var(--ink)', color: 'var(--superficie)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Apri la lista
        </span>
      </Link>
    </div>
  );
}
