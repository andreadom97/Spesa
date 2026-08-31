import Link from 'next/link';
import type { AreaId } from '@/domain/types';
import { Marchio } from './Marchio';

interface Props {
  titolo: string;
  /** Etichetta della pillola settimana (es. "31 AGO — 6 SET"). Assente = niente pillola. */
  settimana?: string;
  /** Le aree in cui manca ancora qualcosa. Solo la Lista la calcola: altrove il default è marchio pieno. */
  aree?: AreaId[];
  /** Modalità indietro: mostra freccia di ritorno invece del marchio, niente ingranaggio. */
  indietro?: boolean;
}

/**
 * Testata condivisa: marchio (avvolto in link a /lista) + titolo a sinistra,
 * ingranaggio verso le impostazioni a destra, ed eventualmente sotto la pillola
 * della settimana.
 *
 * Modalità `indietro`: mostra una freccia di ritorno a /impostazioni al posto del
 * marchio, niente ingranaggio. Usata da Importa per tornare da Impostazioni.
 *
 * La pillola è testo informativo: niente freccetta (non è un selettore naviga).
 */
export function Testata({ titolo, settimana, aree = [], indietro = false }: Props) {
  return (
    <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
          <div style={{ marginTop: 8 }}>
            {indietro ? (
              <Link
                href="/impostazioni"
                aria-label="Indietro"
                style={{ width: 44, height: 44, margin: '-4px -10px 0 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m12 4-8 6 8 6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/lista"
                aria-label="Vai alla lista"
                style={{ display: 'flex', alignItems: 'flex-start' }}
              >
                <Marchio aree={aree} />
              </Link>
            )}
          </div>
          <span style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
            {titolo}
          </span>
        </div>
        {!indietro && (
          <Link
            href="/impostazioni"
            aria-label="Impostazioni"
            style={{ width: 44, height: 44, margin: '-4px -10px 0 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3.1" stroke="var(--ink)" strokeWidth="1.9" />
              <path
                d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
                stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round"
              />
            </svg>
          </Link>
        )}
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
        </div>
      )}
    </div>
  );
}
