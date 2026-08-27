'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const VOCI = [
  {
    href: '/lista',
    etichetta: 'LISTA',
    icona: (colore: string) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path d="M4 6.5h16M4 12h16M4 17.5h11" stroke={colore} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/settimana',
    etichetta: 'SETTIMANA',
    icona: (colore: string) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <rect x="3.6" y="5" width="16.8" height="15" rx="3" stroke={colore} strokeWidth="1.8" />
        <path d="M3.6 10h16.8M9 3.4v3.2M15 3.4v3.2" stroke={colore} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/piatti',
    etichetta: 'PIATTI',
    icona: (colore: string) => (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path d="M7.6 3.4v4.2M10 3.4v4.2M12.4 3.4v4.2" stroke={colore} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M7.6 7.4a2.4 2.4 0 0 0 4.8 0" stroke={colore} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M10 10v10.4" stroke={colore} strokeWidth="1.7" strokeLinecap="round" />
        <path d="M16.6 3.4c2.1 2.3 2.5 6.2 1 8.8h-1v8.2" stroke={colore} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Tab bar fissa in fondo: LISTA / SETTIMANA / PIATTI. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', padding: '10px 16px 20px', gap: 4 }}>
      {VOCI.map((voce) => {
        const attiva = pathname?.startsWith(voce.href) ?? false;
        const colore = attiva ? 'var(--ink)' : 'var(--off)';
        return (
          <Link
            key={voce.href}
            href={voce.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '8px 0', borderRadius: 14,
              background: attiva ? 'rgba(20,22,58,0.06)' : 'transparent',
            }}
          >
            {voce.icona(colore)}
            <span
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 8.5,
                fontWeight: attiva ? 700 : 500, letterSpacing: '0.12em', color: colore,
              }}
            >
              {voce.etichetta}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
