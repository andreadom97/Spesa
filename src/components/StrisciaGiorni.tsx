'use client';

import type { MealSlot, MealSlotDef } from '@/domain/types';

const LABEL_GIORNO = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const NOME_GIORNO = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface Props {
  /** Le sette date della settimana, lunedì primo (vedi giorniDellaSettimana). */
  giorni: string[];
  /** Da 3 a 5, ordinati per posizione: un pallino per elemento, non quattro fissi. */
  slotDefs: MealSlotDef[];
  slots: MealSlot[];
  /** ISO di oggi: decide il bordo 3px, indipendente dalla selezione. */
  oggi: string;
  selezionato: number;
  onSeleziona: (indice: number) => void;
}

/**
 * I sette riquadri del giorno, con sotto un pallino per pasto (pieno se quel
 * pasto è a casa e ha un piatto assegnato). Il bordo di "oggi" è sul riquadro
 * stesso e vale sempre, anche quando non è il giorno selezionato: due stati
 * indipendenti, mai uno sostituto dell'altro.
 */
export function StrisciaGiorni({ giorni, slotDefs, slots, oggi, selezionato, onSeleziona }: Props) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {giorni.map((data, indice) => {
        const sel = indice === selezionato;
        const isOggi = data === oggi;
        const numero = String(Number(data.slice(8, 10)));

        return (
          <button
            key={data}
            type="button"
            onClick={() => onSeleziona(indice)}
            aria-pressed={sel}
            aria-label={`${NOME_GIORNO[indice]} ${numero}${sel ? ', selezionato' : ''}`}
            data-giorno={data}
            data-oggi={isOggi}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '9px 0 10px',
              borderRadius: 14,
              border: isOggi ? '3px solid #14163A' : '1px solid rgba(20,22,58,0.07)',
              background: sel ? '#14163A' : '#FFFFFF',
              boxShadow: sel ? '0 2px 6px rgba(20,22,58,0.20)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: sel ? 'rgba(255,255,255,0.62)' : 'var(--ter)',
              }}
            >
              {LABEL_GIORNO[indice]}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                color: sel ? '#FFFFFF' : 'var(--ink)',
              }}
            >
              {numero}
            </span>
            <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
              {slotDefs.map((def) => {
                const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
                const pieno = !!slot && slot.stato === 'casa' && slot.dishId !== null;
                return (
                  <span
                    key={def.id}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      display: 'inline-block',
                      background: pieno
                        ? (sel ? '#FFFFFF' : '#14163A')
                        : (sel ? 'rgba(255,255,255,0.32)' : 'rgba(20,22,58,0.18)'),
                    }}
                  />
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
