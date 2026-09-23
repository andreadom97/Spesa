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

/**
 * I sette riquadri del giorno, con sotto un pallino per pasto (pieno se quel
 * pasto è a casa e ha un piatto assegnato). "Oggi" e "selezionato" sono due
 * stati indipendenti, mai uno sostituto dell'altro: entrambi vivono nel
 * box-shadow (mai nel bordo, sempre 0) così le sette celle restano identiche
 * di ingombro qualunque sia la combinazione di stati.
 */
export function StrisciaGiorni({ giorni, slotDefs, slots, oggi, selezionato, onSeleziona }: Props) {
  // Solo a sei pasti i pallini si stringono. A sei, con gap 3, la fila misura
  // 6 × 5 + 5 × 3 = 45 px dentro una cella che a 375 di schermo è larga 46,43:
  // 0,71 px per lato, cioè dentro per caso — a 360 px la fila sbordava di 0,36 px
  // per lato e a 320 di 3,22 (misurato nel browser). Con gap 2 la fila scende a
  // 40 px: +3,21 px per lato a 375 e +2,14 a 360. A 320 sborda ancora, ma di
  // 0,71 px invece di 3,22, e 320 è sotto la larghezza minima dichiarata in
  // DESIGN.md §4 (375). Da tre a cinque pasti resta il 3 del file di disegno:
  // a cinque la fila fa 5 × 5 + 4 × 3 = 37 px, cioè 4,7 px per lato a 375 e
  // margine anche a 320 — la soglia misurata è sei, e abbandonare il valore del
  // file di disegno a cinque non era giustificato da nessuna misura.
  const gapPallini = slotDefs.length > 5 ? 2 : 3;
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
        // Limite noto dell'inset da 4,5 px, misurato nel browser a 375 px di
        // schermo con sei pasti: i pallini cominciano a 3,21 px dal bordo della
        // cella, quindi sulla cella "oggi E selezionata" l'anello copre i due
        // pallini esterni per 1,29 px — e col bianco dell'anello sotto un pallino
        // pieno, che è bianco anch'esso, là i sei pallini non si contano. Sulla
        // cella "oggi" non selezionata l'anello è 3 px e non li tocca (3,21 > 3).
        // Non è un difetto da riparare qui: 4,5 è il valore del file di disegno, e
        // il caso a sei pasti non è reso in nessuno di quei file. Chi cambia questo
        // numero sappia che sotto ci passano i pallini.
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
            <div style={{ display: 'flex', gap: gapPallini }}>
              {slotDefs.map((def) => {
                const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
                const pieno = !!slot && slot.stato === 'casa' && slot.dishId !== null;
                return (
                  <span
                    key={def.id}
                    data-pallino
                    style={{
                      width: 5, height: 5, borderRadius: 999, display: 'inline-block',
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
