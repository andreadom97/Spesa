'use client';

import type { MealSlot, MealSlotDef } from '@/domain/types';
import { parolaTemporale } from '@/domain/settimana-label';

const LABEL_GIORNO = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const NOME_GIORNO = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

interface Props {
  /** Le sette date della settimana, lunedì primo (vedi giorniDellaSettimana). */
  giorni: string[];
  /** Da 3 a 6, ordinati per posizione. */
  slotDefs: MealSlotDef[];
  slots: MealSlot[];
  /** ISO di oggi: decide l'inset 3px nel box-shadow, indipendente dalla selezione. */
  oggi: string;
  selezionato: number;
  onSeleziona: (indice: number) => void;
}

/** Le colonne della griglia dei pallini (spec fase 5 §H, frame 27). */
const COLONNE_PALLINI = 3;

/**
 * Dove sta il pallino `indice` (da 0) nella griglia: riga e colonna da 1, come
 * `gridRow` e `gridColumn`. Si riempie per righe, quindi la prima riga è sempre
 * piena e da quattro pasti la seconda comincia dalla prima colonna.
 */
export function posizionePallino(indice: number): { riga: number; colonna: number } {
  return { riga: Math.floor(indice / COLONNE_PALLINI) + 1, colonna: (indice % COLONNE_PALLINI) + 1 };
}

/** Le righe che occupano `n` pallini: una fino a tre, due da quattro a sei. */
export function righePallini(n: number): number {
  return Math.max(1, Math.ceil(n / COLONNE_PALLINI));
}

/**
 * I sette riquadri del giorno, con sotto un pallino per pasto in una griglia
 * di tre colonne (pieno se quel pasto è a casa e ha un piatto assegnato).
 * "Oggi" e "selezionato" sono due stati indipendenti, mai uno sostituto
 * dell'altro: entrambi vivono nel box-shadow (mai nel bordo, sempre 0) così le
 * sette celle restano identiche di ingombro qualunque sia la combinazione di
 * stati.
 */
export function StrisciaGiorni({ giorni, slotDefs, slots, oggi, selezionato, onSeleziona }: Props) {
  // Dalla fase 5 (spec §H, frame 27) i pallini stanno in una griglia di tre
  // colonne da 5 con gap 3: 21 px di larghezza a qualunque numero di pasti,
  // dentro un giorno che a 360 è largo 44,3 [misurato sul disegno]. Il gap 2 a sei
  // pasti (fase 2, deciso da una misura a 375) non serve più: la fila da 45 px non
  // c'è. Da quattro pasti la seconda riga alza il riquadro di 8 (3 + 5), da sé.
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {giorni.map((data, indice) => {
        const sel = indice === selezionato;
        const isOggi = data === oggi;
        const numero = String(Number(data.slice(8, 10)));
        const quando = parolaTemporale(data, oggi);
        const aCasa = slotDefs.filter((def) => {
          const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
          return !!slot && slot.stato === 'casa' && slot.dishId !== null;
        }).length;
        // "Venerdì 18, domani, 3 pasti a casa, selezionato": la stessa frase
        // dell'etichetta sotto la striscia, così chi legge con lo schermo
        // sente quello che gli altri vedono.
        const etichetta = [
          `${NOME_GIORNO[indice]} ${numero}`,
          quando ? quando.toLowerCase() : null,
          `${aCasa} ${aCasa === 1 ? 'pasto' : 'pasti'} a casa`,
          sel ? 'selezionato' : null,
        ].filter(Boolean).join(', ');

        // I quattro stati stanno tutti nel box-shadow, mai nel bordo: "oggi" come
        // bordo 3 px rimpiccioliva la cella dentro e i due stati insieme non
        // avevano forma. Con gli inset le sette celle restano identiche.
        //
        // Con la griglia a tre colonne (fase 5) i pallini partono a (44,3 − 21) / 2 =
        // 11,6 px dal bordo del giorno a 360 [calcolo]: l'inset da 4,5 px della cella
        // "oggi e selezionata" non li copre più. Il limite della fase 2 era della fila
        // da sei, che non c'è più.
        const ombra = sel
          ? (isOggi
            ? '0 2px 6px rgba(20,22,58,0.20), inset 0 0 0 3px #FFFFFF, inset 0 0 0 4.5px #14163A'
            : '0 2px 6px rgba(20,22,58,0.20)')
          : (isOggi
            ? 'var(--ombra-pannello), inset 0 0 0 3px #14163A'
            : 'var(--ombra-pannello)');

        return (
          <button
            key={data}
            type="button"
            onClick={() => onSeleziona(indice)}
            aria-pressed={sel}
            aria-label={etichetta}
            data-giorno={data}
            data-oggi={isOggi}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '9px 0 10px',
              borderRadius: 14,
              border: 0,
              background: sel ? '#14163A' : '#FFFFFF',
              boxShadow: ombra,
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
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${COLONNE_PALLINI}, 5px)`,
                // Righe esplicite (non lasciate all'auto-placement): righePallini
                // è la stessa regola che il test prova da sola, e che la sonda
                // del Task 15 confronta con l'altezza misurata del riquadro.
                gridTemplateRows: `repeat(${righePallini(slotDefs.length)}, 5px)`,
                gap: 3,
              }}
            >
              {slotDefs.map((def, i) => {
                const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
                const pieno = !!slot && slot.stato === 'casa' && slot.dishId !== null;
                const { riga, colonna } = posizionePallino(i);
                return (
                  <span
                    key={def.id}
                    data-pallino
                    style={{
                      gridRow: riga, gridColumn: colonna,
                      width: 5, height: 5, boxSizing: 'border-box', borderRadius: 999, display: 'block',
                      borderStyle: 'solid',
                      borderWidth: pieno ? 0 : 1,
                      // Vuoto: il contorno 0,20 del tratteggio (--bordo-tratteggio); sul giorno
                      // selezionato bianco 0,62, lo stesso valore di --banda-bordo (spec §H).
                      borderColor: sel ? 'var(--banda-bordo)' : 'var(--bordo-tratteggio)',
                      backgroundColor: pieno ? (sel ? 'var(--superficie)' : 'var(--ink)') : 'transparent',
                    }}
                  />
                );
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
