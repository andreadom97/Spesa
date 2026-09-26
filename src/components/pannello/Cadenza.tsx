'use client';

import { useState } from 'react';
import { Segmento } from '@/components/Segmento';
import { MessaggioErrore } from '@/components/controlli';
import { CADENZE, testoCadenza, type GiorniControllo } from '@/domain/pantry';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const OPZIONI = CADENZE.map((g) => ({ id: String(g), label: testoCadenza(g) }));
const NOTA_CADENZA = "Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.";

/**
 * Cadenza dei controlli (§C.6, frame 13D): OGNI MESE, OGNI 2 MESI, OGNI 3 MESI
 * = 30, 60, 90 giorni. Salva al tocco; vale dalla prossima lista costruita
 * (§E.1). Il segmento resta toccabile mentre salva: la coda serializzata del
 * provider tiene l'ordine dei tocchi.
 */
export function Cadenza() {
  return <StatoDatiPannello>{(dati) => <SceltaCadenza attuale={dati.impostazioni.giorniControllo} />}</StatoDatiPannello>;
}

function SceltaCadenza({ attuale }: { attuale: GiorniControllo }) {
  const { salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);

  async function cambia(id: string) {
    const scelta = Number(id) as GiorniControllo;
    if (scelta === attuale) return;
    setErrore(false);
    if (!(await salvaImpostazioni({ giorniControllo: scelta }))) setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Etichetta dal disegno (frame 13D), confermata da Andrea il 26/09. */}
        <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          OGNI QUANTO TI CHIEDO
        </h3>
        <Segmento variante="blocco" opzioni={OPZIONI} valore={String(attuale)} onCambia={(id) => void cambia(id)} />
        {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
        <Nota>{NOTA_CADENZA}</Nota>
      </section>
    </div>
  );
}
