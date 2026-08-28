'use client';

import type { AreaId } from '@/domain/types';
import { coloreArea } from '@/domain/aree';

interface Props {
  nome: string;
  area: AreaId;
  onSi: () => void;
  onNo: () => void;
  /** Disabilita i due pulsanti mentre la risposta precedente è ancora in volo. */
  disabilitato?: boolean;
}

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const INK = '#14163A';

// height:44 esplicito e padding verticale 0: l'altezza resa del pulsante è
// 44px per costruzione aritmetica (44 + 0 + 0), non per una regola di
// box-sizing globale — vale sia in content-box sia in border-box. min-width
// 52 tiene anche la larghezza sopra soglia. Questi sono i due pulsanti SÌ/NO
// citati nei vincoli globali: quelli già misurati "in negativo" tre volte
// altrove nel progetto quando un elemento decorativo diventava tappabile.
const ALTEZZA_BOTTONE = 44;

/**
 * Riga di controllo di uno staple ("Olio: ne hai ancora?"), sotto le tessere
 * della sua area. Indipendente dal piano: puoi vederla anche se l'olio non è
 * in nessun piatto questa settimana — è proprio il punto.
 *
 * "SÌ" scrive ultimo_check = oggi e la riga sparisce dallo schermo (il fatto
 * vive in pantry_state, non in questa lista congelata). "NO" la trasforma in
 * una voce d'acquisto vera e propria di una confezione: chi chiama ricarica
 * la lista dal server dopo, perché il formato della confezione non è mai
 * arrivato al client.
 */
export function RigaControllo({ nome, area, onSi, onNo, disabilitato = false }: Props) {
  const colore = coloreArea(area);
  const bottone = {
    minWidth: 52,
    height: ALTEZZA_BOTTONE,
    padding: '0 14px',
    textAlign: 'center' as const,
    borderRadius: 999,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    background: '#FFFFFF',
    color: INK,
    opacity: disabilitato ? 0.5 : 1,
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '0 12px 12px', padding: '14px 15px', borderRadius: 18,
        background: rgba(colore, 0.26),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.024em', color: INK }}>
          {nome}: ne hai ancora?
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: rgba(INK, 0.5), marginTop: 4 }}>
          CONTROLLO OGNI 90 GIORNI · SCADUTO
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button type="button" onClick={onSi} disabled={disabilitato} style={bottone} aria-label={`Sì, hai ancora ${nome}`}>
          SÌ
        </button>
        <button type="button" onClick={onNo} disabled={disabilitato} style={bottone} aria-label={`No, comprane una confezione di ${nome}`}>
          NO
        </button>
      </div>
    </div>
  );
}
