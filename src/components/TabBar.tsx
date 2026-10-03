'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marchio } from './Marchio';
import { useAreeMancantiCorrenti } from './marchio-context';

/** Icone piene a 26 (DESIGN.md v3 §6): copiate da design/sistema/schermate/lista.html. */
const ICONE: Record<'oggi' | 'piano' | 'dispensa', (c: string) => React.ReactNode> = {
  // Il piatto visto dall'alto (spec Oggi §A.2): non è usato altrove in src/.
  oggi: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={c} />
      <circle cx="12" cy="12" r="4.1" fill="#fff" opacity=".92" />
    </svg>
  ),
  // piano e dispensa: le due icone di oggi, invariate.
  piano: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15.5" rx="4.4" fill={c} />
      <rect x="6.2" y="8.4" width="11.6" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
      <rect x="6.2" y="12.6" width="7" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
  dispensa: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.4" width="14" height="3.6" rx="1.8" fill={c} />
      <path d="M6 9.4h12a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8.6a1 1 0 0 1 1-1Z" fill={c} />
      <rect x="8.6" y="12.6" width="6.8" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
};

/** Quattro voci dal 03/10 (spec Oggi §A.2): Oggi è la prima e la pagina d'ingresso. */
const VOCI = [
  { href: '/oggi', etichetta: 'Oggi', icona: 'oggi' as const },
  { href: '/lista', etichetta: 'Lista' },
  { href: '/piano', etichetta: 'Piano', icona: 'piano' as const },
  { href: '/dispensa', etichetta: 'Dispensa', icona: 'dispensa' as const },
];

/**
 * Tab bar flottante: pillola bianca larga 338, centrata, alta 84, con quattro voci
 * 80 × 72 (flex: 4 × 80 + 3 × 2 + 2 × 6 = 338). Quando il Guscio segna
 * data-barra="ridotta" scende a 274 × 66 con voci 64 × 54: le etichette si nascondono,
 * la voce resta cliccabile. Si anima la larghezza, non più `left/right` (spec Oggi §A.2).
 * La voce Lista porta il Marchio, che riflette le aree in cui manca ancora
 * qualcosa. Su Piatti, su Importa e nell'editor dell'ingrediente nessuna voce
 * è attiva: nessun href è prefisso di quei percorsi. Misure e movimento in
 * globals.css.
 *
 * `inerte`: col Pannello impostazioni aperto la barra sta sotto il velo, e non deve prendere
 * il fuoco dalla tastiera (spec fase 5 §A.2).
 */
export function TabBar({ inerte = false }: { inerte?: boolean }) {
  const pathname = usePathname();
  const aree = useAreeMancantiCorrenti();

  return (
    <nav className="barra anim-barra" aria-label="Sezioni" inert={inerte}>
      {VOCI.map((voce) => {
        const attiva = pathname?.startsWith(voce.href) ?? false;
        const colore = attiva ? 'var(--ink)' : 'var(--off)';
        return (
          <Link
            key={voce.href}
            href={voce.href}
            aria-current={attiva ? 'page' : undefined}
            className={`barra-voce anim-barra-voce${attiva ? ' attiva' : ''}`}
          >
            {/* data-marchio-barra: il bersaglio dell'avvio del Marchio (spec fase 5 §J). */}
            <span className="barra-segno" data-marchio-barra={voce.icona ? undefined : ''}>
              {voce.icona ? ICONE[voce.icona](colore) : <Marchio aree={aree} lato={9} gap={4} />}
            </span>
            <span className="barra-etichetta anim-barra-etichetta">{voce.etichetta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
