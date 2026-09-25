'use client';

/** La tessera di un lotto nel widget Pronti (spec §A): apre il dettaglio del lotto. */
export function TesseraLotto({ nome, porzioni, congelato, onApri }: { nome: string; porzioni: number; congelato: boolean; onApri: () => void }) {
  return (
    <button
      type="button"
      onClick={onApri}
      aria-label={`Apri il lotto di ${nome}`}
      style={{
        minHeight: 104, boxSizing: 'border-box', borderRadius: 14, padding: '12px 14px 13px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
        background: 'rgba(20,22,58,0.04)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', borderRadius: 999, padding: '5px 10px', background: 'var(--superficie)',
        }}
      >
        {`${porzioni} porz.`}
      </span>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.032em', lineHeight: 1.1, marginTop: 'auto', paddingTop: 12, color: 'var(--ink)' }}>
        {nome}
      </span>
      {congelato && (
        <span
          style={{
            marginTop: 8, background: 'var(--superficie)', borderRadius: 999, padding: '4px 9px',
            fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: 'var(--freddo)',
          }}
        >
          Congelato
        </span>
      )}
    </button>
  );
}
