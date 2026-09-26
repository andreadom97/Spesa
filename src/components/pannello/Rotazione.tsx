'use client';

import { useState } from 'react';
import type { Impostazioni } from '@/domain/types';
import { Segmento } from '@/components/Segmento';
import { MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { MAX_SETTIMANE_CICLO, settimanaDelCiclo } from '@/domain/ciclo';
import { lunediDi } from '@/domain/date';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "24 agosto": una data ISO in mezzo a una frase si legge come un codice, non come un giorno. */
export function dataInParole(iso: string): string {
  const [, mese, giorno] = iso.split('-');
  return `${Number(giorno)} ${MESI[Number(mese) - 1]}`;
}

const OPZIONI_CICLO = Array.from({ length: MAX_SETTIMANE_CICLO }, (_, i) => ({
  id: String(i + 1),
  label: i === 0 ? 'NESSUNA' : `${i + 1} SETT.`,
}));

const NOTA_SENZA_GIRO = 'I piatti ruotano uno dopo l’altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.';

/** La nota col giro, di oggi: «è cominciato» se il lunedì è passato (o è oggi), «comincia» se è futuro. */
export function notaGiro(origine: string, oggi: string, settimane: number): string {
  const verbo = origine > oggi ? 'comincia' : 'è cominciato';
  return `Il giro ${verbo} lunedì ${dataInParole(origine)}. Ogni piatto può dire a quale delle ${settimane} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.`;
}

/**
 * Rotazione del piano (§C.3, frame 08–10). Il segmento salva al tocco
 * `settimane_ciclo`; `salvaImpostazioni` del data layer àncora da sé l'origine
 * al lunedì corrente quando il ciclo passa sopra 1. RIPARTI apre il dialogo
 * `riparti` (§D), ed è spento se l'origine è già il lunedì corrente.
 */
export function Rotazione() {
  return <StatoDatiPannello>{(dati) => <Ciclo imp={dati.impostazioni} />}</StatoDatiPannello>;
}

function Ciclo({ imp }: { imp: Impostazioni }) {
  const { mostraDialogo } = usePannello();
  const { salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);
  // La stessa «oggi» della pagina di oggi (UTC), perché la stessa di salvaImpostazioni.
  const oggi = new Date().toISOString().slice(0, 10);
  const lunediCorrente = lunediDi(oggi);
  const n = imp.settimaneCiclo;
  const k = settimanaDelCiclo({ lunedi: lunediCorrente, origine: imp.cicloOrigine, settimaneCiclo: n });
  const giaDaQuestoLunedi = imp.cicloOrigine === lunediCorrente;

  async function cambia(id: string) {
    const scelto = Number(id);
    if (scelto === n) return;
    setErrore(false);
    if (!(await salvaImpostazioni({ settimaneCiclo: scelto }))) setErrore(true);
  }

  function apriRiparti() {
    mostraDialogo({
      titolo: 'Ripartire dalla settimana 1?',
      testo: `Da lunedì ${dataInParole(lunediCorrente)} il piano riparte dalla settimana 1 di ${n}. Le settimane già create non cambiano.`,
      azione: 'RIPARTI DA LUNEDÌ',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a ripartire. Riprova.',
      onConferma: async () => {
        if (!(await salvaImpostazioni({ cicloOrigine: lunediCorrente }))) throw new Error('riparti: salvataggio fallito');
      },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          OGNI QUANTE SETTIMANE SI RIPETE
        </h3>
        <Segmento variante="blocco" opzioni={OPZIONI_CICLO} valore={String(n)} onCambia={(id) => void cambia(id)} />
        {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
        {n > 1 && (
          <div style={{ borderRadius: 14, background: 'rgba(20,22,58,0.04)', padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--ink)' }}>
            {`SETTIMANA ${k} DI ${n}`}
          </div>
        )}
        <Nota>{n > 1 ? notaGiro(imp.cicloOrigine ?? lunediCorrente, oggi, n) : NOTA_SENZA_GIRO}</Nota>
        {n > 1 && (
          <TastoSecondario onClick={apriRiparti} disabled={giaDaQuestoLunedi} style={{ marginTop: 2 }}>
            RIPARTI DALLA SETTIMANA 1
          </TastoSecondario>
        )}
      </section>
    </div>
  );
}
