import { notFound } from 'next/navigation';
import { CATALOGO_ICONE, CHIAVI_ICONE, type ChiaveIcona } from '@/domain/icone-ingredienti';
import { AREE } from '@/domain/aree';
import type { AreaId } from '@/domain/types';
import { IconaIngrediente } from '@/components/IconaIngrediente';
import { FoglioTessere } from './FoglioTessere';

/**
 * Foglio di controllo delle icone ingrediente (spec 2026-09-26, passo 3):
 * ogni icona in tono medio sulle sei aree e in bianco sui sei colori pieni,
 * poi le tessere vere con nomi corti e lunghi. Non esiste in produzione.
 */
export default function FoglioIcone() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
        <tbody>
          {CHIAVI_ICONE.map((k) => (
            <tr key={k}>
              <th style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textAlign: 'left', verticalAlign: 'middle' }}>
                {k}<br /><span style={{ fontWeight: 400, color: 'var(--testo-2)' }}>{CATALOGO_ICONE[k].slice(0, 3).join(', ')}</span>
              </th>
              {AREE.map((a) => <Cella key={`t-${a.id}`} chiave={k} area={a.id} sfondo="#FFFFFF" bordo={a.colore} tono="area" />)}
              {AREE.map((a) => <Cella key={`h-${a.id}`} chiave={k} area={a.id} sfondo={a.colore} bordo={a.colore} tono="hero" />)}
            </tr>
          ))}
        </tbody>
      </table>
      <FoglioTessere />
    </main>
  );
}

function Cella({ chiave, area, sfondo, bordo, tono }: { chiave: ChiaveIcona; area: AreaId; sfondo: string; bordo: string; tono: 'area' | 'hero' }) {
  return (
    <td>
      <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 12, background: sfondo, border: `1px solid ${bordo}`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 6 }}>
          <IconaIngrediente chiave={chiave} area={area} tono={tono} taglia={52} />
        </div>
      </div>
    </td>
  );
}
