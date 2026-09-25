'use client';

import { useState } from 'react';
import { dataCorta, dataScadenzaValida, maxScadenza, scadeVicino } from '@/domain/dispensa-vista';
import { Etichetta, MessaggioErrore, STILE_PILLOLA } from './controlli';

interface Props {
  nome: string;
  /** La scadenza effettiva (a mano o stimata). */
  scadenza: string;
  /** La stima di Dispesa, il default. */
  stima: string;
  /** La scadenza è scritta a mano. */
  manuale: boolean;
  oggi: string;
  /** null = USA LA STIMA. */
  onSalva: (data: string | null) => Promise<void>;
}

const ERRORE_SCRITTURA = 'Non siamo riusciti a salvare la correzione. Riprova.';
const ERRORE_INTERVALLO = 'Scegli una data fra oggi e i prossimi due anni.';

/**
 * La riga della scadenza nel dettaglio (spec §D.4, v2 06/07). Chiusa: la data,
 * l'origine (STIMA / MODIFICATA DA TE), MODIFICA. Aperta sul posto: il campo
 * data, SALVA, la stima e USA LA STIMA. La stima resta il default: la data a
 * mano la copre, non la cancella.
 */
export function RigaScadenza({ nome, scadenza, stima, manuale, oggi, onSalva }: Props) {
  const [aperta, setAperta] = useState(false);
  const [data, setData] = useState(scadenza);
  const [stato, setStato] = useState<'fermo' | 'volo' | 'errore'>('fermo');
  const [fuori, setFuori] = useState(false);

  function apri() {
    setData(scadenza);
    setStato('fermo');
    setFuori(false);
    setAperta(true);
  }

  async function scrivi(valore: string | null) {
    if (stato === 'volo') return;
    if (valore !== null && !dataScadenzaValida(valore, oggi)) {
      setFuori(true);
      return;
    }
    setFuori(false);
    setStato('volo');
    try {
      await onSalva(valore);
      setStato('fermo');
      setAperta(false);
    } catch {
      setStato('errore');
    }
  }

  const riga = {
    background: 'rgba(20,22,58,0.04)', borderRadius: 14, padding: '10px 8px 10px 14px',
    display: 'flex', flexDirection: 'column' as const, gap: 8,
  };

  if (!aperta) {
    return (
      <div style={{ ...riga, flexDirection: 'row', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: scadeVicino(scadenza, oggi) ? 'var(--avviso)' : 'var(--ink)' }}>
            {`Scade il ${dataCorta(scadenza)}`}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', marginTop: 3, color: manuale ? 'var(--ink)' : 'var(--testo-2)' }}>
            {manuale ? 'MODIFICATA DA TE' : 'STIMA'}
          </div>
        </div>
        <button
          type="button"
          onClick={apri}
          aria-label={`Modifica la scadenza di ${nome}`}
          style={{ ...STILE_PILLOLA, background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
        >
          MODIFICA
        </button>
      </div>
    );
  }

  const errore = stato === 'errore';
  const cambiata = data !== scadenza;
  return (
    <div style={riga}>
      <Etichetta>Scadenza</Etichetta>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="date"
          aria-label={`Scadenza di ${nome}`}
          value={data}
          min={oggi}
          max={maxScadenza(oggi)}
          autoFocus
          onChange={(e) => setData(e.target.value)}
          style={{
            width: 140, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 10px',
            border: '1.5px solid var(--ink)', background: 'var(--superficie)',
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink)',
          }}
        />
        <button
          type="button"
          onClick={() => void scrivi(data)}
          disabled={(!cambiata && !errore) || stato === 'volo'}
          style={{
            ...STILE_PILLOLA,
            background: errore ? 'var(--ink)' : cambiata ? 'var(--superficie)' : 'rgba(20,22,58,0.10)',
            color: errore ? 'var(--superficie)' : cambiata ? 'var(--ink)' : 'var(--ter)',
            border: cambiata && !errore ? '1px solid rgba(20,22,58,0.09)' : '1px solid transparent',
            opacity: stato === 'volo' ? 0.5 : 1,
          }}
        >
          {errore ? 'RIPROVA' : 'SALVA'}
        </button>
      </div>
      {fuori && <MessaggioErrore>{ERRORE_INTERVALLO}</MessaggioErrore>}
      {errore && <MessaggioErrore>{ERRORE_SCRITTURA}</MessaggioErrore>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ flex: 1, fontSize: 12.5, color: 'var(--testo-2)' }}>{`La stima di Dispesa è il ${dataCorta(stima)}.`}</span>
        {manuale && (
          <button
            type="button"
            onClick={() => void scrivi(null)}
            disabled={stato === 'volo'}
            style={{ ...STILE_PILLOLA, background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
          >
            USA LA STIMA
          </button>
        )}
      </div>
    </div>
  );
}
