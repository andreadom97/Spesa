'use client';

import { useState } from 'react';
import { MessaggioErrore, TastoPrimario } from '@/components/controlli';
import { preparaEsportazione } from '@/data/esporta';
import { salvaFile } from '@/components/salva-file';
import { PiedePannello } from './PiedePannello';
import { STILE_BLOCCO } from './pezzi';

type Fase = { tipo: 'ferma' } | { tipo: 'prepara' } | { tipo: 'pronta'; file: File } | { tipo: 'errore' };

const TESTO = 'Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.';

/**
 * Esporta i tuoi dati (§C.8, frame 19, 19A–C). Non parte da sola: serve il
 * tocco. Un primario con quattro stati nel piede fisso: PREPARA IL FILE →
 * PREPARO IL FILE… → SALVA IL FILE, oppure l'errore con RIPROVA, che
 * riprepara. Il file preparato vive nello stato della sotto-schermata:
 * uscendo si perde.
 *
 * La riga «Il file è pronto…» sta dentro il piede fisso, sopra il tasto (la
 * spec dice «sopra il piede»: scarto registrato, P3). Il nome mostrato è
 * `file.name`, quello che decide `preparaEsportazione`: nome mostrato e nome
 * salvato non possono divergere.
 *
 * Se `salvaFile` rigetta (un annullamento non rigetta: torna `'annullato'`) si
 * va all'errore: la spec non ha un testo per il salvataggio fallito, e questo è
 * il più vicino fra quelli che ha.
 */
export function Esporta() {
  const [fase, setFase] = useState<Fase>({ tipo: 'ferma' });
  const [salvando, setSalvando] = useState(false);

  async function prepara() {
    setFase({ tipo: 'prepara' });
    try {
      setFase({ tipo: 'pronta', file: await preparaEsportazione() });
    } catch (e) {
      console.error('pannello/esporta: preparazione del file fallita.', e);
      setFase({ tipo: 'errore' });
    }
  }

  async function salva(file: File) {
    if (salvando) return;
    setSalvando(true);
    try {
      // 'annullato' non è un errore: il tasto resta SALVA IL FILE (§E.3).
      await salvaFile(file);
    } catch (e) {
      console.error('pannello/esporta: salvataggio del file fallito.', e);
      setFase({ tipo: 'errore' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px' }}>
        <p style={{ margin: 0, padding: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{TESTO}</p>
      </section>
      <PiedePannello>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fase.tipo === 'pronta' && (
            <p role="status" style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--testo-2)', overflowWrap: 'anywhere' }}>
              {`Il file è pronto: ${fase.file.name}.`}
            </p>
          )}
          {fase.tipo === 'errore' && <MessaggioErrore ruolo="alert">Non siamo riusciti a preparare il file. Riprova.</MessaggioErrore>}
          {fase.tipo === 'ferma' && <TastoPrimario onClick={() => void prepara()}>PREPARA IL FILE</TastoPrimario>}
          {fase.tipo === 'prepara' && (
            // §C.8: il primario a opacità 0,5, `disabled` e `aria-busy`; non il grigio dei tasti spenti.
            <TastoPrimario disabled aria-busy="true" style={{ background: 'var(--ink)', color: 'var(--superficie)', boxShadow: 'none', opacity: 0.5 }}>
              PREPARO IL FILE…
            </TastoPrimario>
          )}
          {fase.tipo === 'pronta' && (
            <TastoPrimario onClick={() => void salva(fase.file)} disabled={salvando}>SALVA IL FILE</TastoPrimario>
          )}
          {fase.tipo === 'errore' && <TastoPrimario onClick={() => void prepara()}>RIPROVA</TastoPrimario>}
        </div>
      </PiedePannello>
    </div>
  );
}
