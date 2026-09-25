/** Le icone della Dispensa (DESIGN.md §6). Decorative: `aria-hidden`, il nome sta sul tasto. */

export function IconaAI({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 3.5c.5 4.1 2.4 6 6.5 6.5-4.1.5-6 2.4-6.5 6.5-.5-4.1-2.4-6-6.5-6.5 4.1-.5 6-2.4 6.5-6.5Z" fill="var(--ink)" />
      <path d="M18.5 14.5c.25 2 1.1 2.85 3 3.1-1.9.25-2.75 1.1-3 3.1-.25-2-1.1-2.85-3-3.1 1.9-.25 2.75-1.1 3-3.1Z" fill="var(--ink)" />
    </svg>
  );
}

export function IconaScansione() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M7.5 8v8M10.5 8v8M13.5 8v8M16.5 8v8" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconaMicrofono({ colore = '#FFFFFF' }: { colore?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={colore} />
      <path d="M6 11.4a6 6 0 0 0 12 0" stroke={colore} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M12 17.6V21" stroke={colore} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconaX({ size = 16, colore = 'var(--sec)' }: { size?: number; colore?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke={colore} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconaLente() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="var(--sec)" strokeWidth="2.1" />
      <path d="m16 16 4 4" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/** Il barattolo dello stato vuoto, spento (`--icona-spenta`). */
export function IconaBarattolo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3h8M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6Z" stroke="var(--icona-spenta)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 10h10" stroke="var(--icona-spenta)" strokeWidth="1.8" />
    </svg>
  );
}
