'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marchio } from './Marchio';
import { useAreeMancantiCorrenti } from './marchio-context';

/** Icone piene a 26 (DESIGN.md v3 §6): copiate da design/sistema/schermate/lista.html. */
const ICONE: Record<'piano' | 'piatti' | 'dispensa', (c: string) => React.ReactNode> = {
  piano: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15.5" rx="4.4" fill={c} />
      <rect x="6.2" y="8.4" width="11.6" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
      <rect x="6.2" y="12.6" width="7" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
  piatti: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={c} />
      <circle cx="12" cy="12" r="4.1" fill="#fff" opacity=".9" />
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

const VOCI = [
  { href: '/lista', etichetta: 'Lista' },
  { href: '/piano', etichetta: 'Piano', icona: 'piano' as const },
  { href: '/piatti', etichetta: 'Piatti', icona: 'piatti' as const },
  { href: '/dispensa', etichetta: 'Dispensa', icona: 'dispensa' as const },
];

/**
 * Tab bar flottante (versione B): pillola bianca 84 che scende a 66 quando il
 * Guscio segna data-barra="ridotta"; le etichette si nascondono ma la voce resta
 * alta 54 e cliccabile. La voce Lista porta il Marchio, che riflette le aree in
 * cui manca ancora qualcosa. Misure e movimento in globals.css.
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
            <span className="barra-segno">
              {voce.icona ? ICONE[voce.icona](colore) : <Marchio aree={aree} lato={9} gap={4} />}
            </span>
            <span className="barra-etichetta anim-barra-etichetta">{voce.etichetta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
