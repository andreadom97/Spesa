'use client';

import { useState } from 'react';
import type { MealSlotDef } from '@/domain/types';
import { MessaggioErrore } from '@/components/controlli';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { fuoriCasa } from './Cima';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const SIGLE = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const NOTA_MATRICE = 'La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.';

/**
 * Il riepilogo sotto la matrice (§C.1, frame 05), ricalcolato a ogni tocco.
 * Testo dal disegno e varianti del piano, confermati da Andrea il 26/09 (§I).
 */
export function riepilogoMatrice(defs: MealSlotDef[]): string {
  const totale = defs.length * 7;
  const fuori = fuoriCasa(defs);
  const aCasa = totale - fuori;
  if (fuori === 0) return `Di base sei a casa per tutti i ${totale} pasti.`;
  const prima = aCasa === 1 ? `Di base sei a casa per 1 pasto su ${totale}.` : `Di base sei a casa per ${aCasa} pasti su ${totale}.`;
  const seconda = fuori === 1
    ? "La Lista conta solo quelli: l'unico fuori casa non entra nella spesa."
    : `La Lista conta solo quelli: i ${fuori} fuori casa non entrano nella spesa.`;
  return `${prima} ${seconda}`;
}

/** La casetta della Riga pasto, bianca a 16 (§C.1). */
function Casetta() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.8 17.4 9.1v7.5a1 1 0 0 1-1 1h-3.6v-4.2H7.2v4.2H3.6a1 1 0 0 1-1-1V9.1Z" fill="var(--superficie)" />
    </svg>
  );
}

/**
 * Pasti a casa (§C.1, frame 05): i pasti in riga, i giorni in colonna, sulla
 * larghezza piena del corpo. Le sigle dei giorni stanno una volta sola in cima,
 * ferme mentre il corpo scorre. Ogni tocco salva `assenze_abituali` del pasto;
 * se il salvataggio fallisce la cella torna com'era (il provider) e sotto la
 * matrice compare l'errore.
 */
export function PastiACasa() {
  return <StatoDatiPannello>{(dati) => <Matrice defs={dati.slotDefs} />}</StatoDatiPannello>;
}

function Matrice({ defs }: { defs: MealSlotDef[] }) {
  const { salvaPasti, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);

  async function tocca(id: string, giorno: number) {
    setErrore(false);
    const nuovi = defs.map((d) => {
      if (d.id !== id) return d;
      const assenze = [...d.assenzeAbituali];
      assenze[giorno] = !assenze[giorno];
      return { ...d, assenzeAbituali: assenze };
    });
    if (!(await salvaPasti(nuovi))) setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <div
        aria-hidden="true"
        data-testid="sigle-giorni"
        style={{
          position: 'sticky', top: 0, zIndex: 1, background: 'var(--fondo)', padding: '4px 0',
          display: 'flex', gap: 4, textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ter)',
        }}
      >
        {SIGLE.map((s, i) => <span key={i} style={{ flex: 1 }}>{s}</span>)}
      </div>
      {defs.map((d) => (
        <div key={d.id} role="group" aria-label={d.nome} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            {d.nome}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {d.assenzeAbituali.map((fuori, g) => {
              const aCasa = !fuori;
              return (
                <button
                  key={g}
                  type="button"
                  className="anim-stato"
                  aria-pressed={aCasa}
                  aria-label={`${GIORNI_LUNGHI[g]} ${d.nome}: ${aCasa ? 'di base a casa, tocca per mettere fuori casa' : 'di base fuori casa, tocca per mettere a casa'}`}
                  onClick={() => void tocca(d.id, g)}
                  style={{
                    flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: aCasa ? 'var(--ink)' : 'var(--superficie)',
                    border: aCasa ? '1px solid var(--ink)' : '1px solid var(--bordo)',
                    boxShadow: aCasa ? 'var(--ombra-casetta)' : 'none',
                  }}
                >
                  {aCasa && <Casetta />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
      <section style={{ ...STILE_BLOCCO, marginTop: 4, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Nota>{NOTA_MATRICE}</Nota>
        <Nota ruolo="status">{riepilogoMatrice(defs)}</Nota>
      </section>
    </div>
  );
}
