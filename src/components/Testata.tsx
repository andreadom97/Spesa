import Link from 'next/link';
import type { AreaId } from '@/domain/types';
import { Marchio } from './Marchio';

interface Props {
  titolo: string;
  /** Etichetta della pillola settimana (es. "31 AGO — 6 SET"). Assente = niente pillola. */
  settimana?: string;
  /** Le aree in cui manca ancora qualcosa. Solo la Lista la calcola: altrove il default è marchio pieno. */
  aree?: AreaId[];
}

/**
 * Testata condivisa: marchio + titolo a sinistra, burger verso le impostazioni
 * a destra, ed eventualmente sotto la pillola della settimana.
 *
 * La pillola ha una freccetta ma è debito dichiarato: la v1 conosce solo la
 * settimana corrente, quindi non naviga e non ha onClick.
 */
export function Testata({ titolo, settimana, aree = [] }: Props) {
  return (
    <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
          <div style={{ marginTop: 8 }}>
            <Marchio aree={aree} />
          </div>
          <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
            {titolo}
          </span>
        </div>
        <Link
          href="/impostazioni"
          style={{ width: 44, height: 44, margin: '-4px -10px 0 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="25" height="25" viewBox="0 0 25 25" fill="none">
            <path d="M3.5 7.2h18M3.5 12.5h18M3.5 17.8h18" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
      {settimana && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
            height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--ink)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', color: '#FFFFFF' }}>
            {settimana}
          </span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 6.2 8 10.2 12 6.2" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
