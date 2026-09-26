'use client';

import { useState } from 'react';
import type { AreaId } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { MessaggioErrore, TastoPrimario } from '@/components/controlli';
import { useDatiPannello } from './DatiPannello';
import { PiedePannello } from './PiedePannello';
import { AvvisoCasaCambiata, BloccoGruppo, Carico, ErroreCaricamento, IconaFreccia, Nota, TondoIcona } from './pezzi';

// La nota di oggi (impostazioni/reparti/page.tsx:103-107), invariata.
const NOTA_ORDINE = 'Mettili nell’ordine in cui li incontri camminando nel tuo supermercato. La lista della spesa comparirà in quest’ordine, così non torni indietro fra le corsie. Le sei aree sono fisse: si cambia solo la sequenza.';

/** «LATTICINI, UOVA E SALUMI» → «Latticini, uova e salumi» (frame 13). */
export function nomeAreaInFrase(a: AreaId): string {
  const n = nomeArea(a);
  return n.charAt(0) + n.slice(1).toLocaleLowerCase('it');
}

function stessoOrdine(a: AreaId[], b: AreaId[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * Ordine delle aree (§C.5, frame 13–13C). Le frecce cambiano solo l'ordine
 * locale; `SALVA ORDINE`, nel piede fisso, lo scrive. Dopo il salvataggio il
 * pannello resta qui: è l'unica sotto-schermata che non torna in cima da sola.
 * Uscire senza salvare perde l'ordine, senza chiedere.
 */
export function OrdineAree() {
  const { stato, salvaImpostazioni, casaCambiata } = useDatiPannello();
  // null = l'ordine salvato, quello del provider.
  const [ordine, setOrdine] = useState<AreaId[] | null>(null);
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);
  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore') return <ErroreCaricamento testo="Non riusciamo a caricare l'ordine delle aree. Riprova più tardi." />;
  const salvato = stato.dati.impostazioni.ordineAree;
  const corrente = ordine ?? salvato;
  const invariato = stessoOrdine(corrente, salvato);

  function sposta(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= corrente.length) return;
    const copia = [...corrente];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setErrore(false);
    setOrdine(copia);
  }

  async function salva() {
    if (invariato || volo) return;
    setErrore(false);
    setVolo(true);
    const ok = await salvaImpostazioni({ ordineAree: corrente });
    setVolo(false);
    if (ok) setOrdine(null);
    else setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <Nota>{NOTA_ORDINE}</Nota>
      <BloccoGruppo>
        {corrente.map((area, i) => {
          const primo = i === 0;
          const ultimo = i === corrente.length - 1;
          return (
            <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 0 6px 4px' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, flex: 'none', borderRadius: 4, background: coloreArea(area) }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>
                {nomeAreaInFrase(area)}
              </span>
              <TondoIcona etichetta={`Sposta ${nomeArea(area)} in alto`} spento={primo} onClick={() => sposta(i, -1)}>
                <IconaFreccia verso="su" spenta={primo} />
              </TondoIcona>
              <TondoIcona etichetta={`Sposta ${nomeArea(area)} in basso`} spento={ultimo} onClick={() => sposta(i, 1)}>
                <IconaFreccia verso="giu" spenta={ultimo} />
              </TondoIcona>
            </div>
          );
        })}
      </BloccoGruppo>
      <PiedePannello>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errore && !casaCambiata && <MessaggioErrore ruolo="alert">Non siamo riusciti a salvare l&apos;ordine. Riprova.</MessaggioErrore>}
          <TastoPrimario
            onClick={() => void salva()}
            disabled={invariato || volo}
            // In volo: primario pieno a 0,5 (frame 13C), non lo spento grigio.
            style={volo ? { background: 'var(--ink)', color: 'var(--superficie)', boxShadow: 'none', opacity: 0.5 } : undefined}
          >
            {volo ? 'SALVATAGGIO…' : 'SALVA ORDINE'}
          </TastoPrimario>
        </div>
      </PiedePannello>
    </div>
  );
}
