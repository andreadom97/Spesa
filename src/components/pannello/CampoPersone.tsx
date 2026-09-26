'use client';

import { useState, type KeyboardEvent } from 'react';
import { MAX_PORZIONI, MIN_PORZIONI } from '@/data/impostazioni';
import { useDatiPannello } from './DatiPannello';
import { RigaImpostazione } from './RigaImpostazione';
import { ERRORE_SALVATAGGIO } from './pezzi';

const NOTA_PERSONE = 'Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.';
const ERRORE_RANGE = `Scrivi un numero da ${MIN_PORZIONI} a ${MAX_PORZIONI}.`;
// L'aria dal disegno (frame 04, 25), confermata da Andrea il 26/09.
const ARIA_CAMPO = `Per quante persone cucini, da ${MIN_PORZIONI} a ${MAX_PORZIONI}`;

/**
 * Per quante persone cucini (§C.10): campo numerico 78 × 44 con l'unità PERS.
 * Fuori da 1–4, o non intero, torna al valore di prima e sotto la riga compare
 * `Scrivi un numero da 1 a 4.`. L'errore sparisce al gesto successivo.
 */
export function CampoPersone() {
  const { stato, salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [testo, setTesto] = useState<string | null>(null);
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState<'range' | 'salva' | null>(null);
  if (stato.stato !== 'pronto') return null;
  const valore = stato.dati.impostazioni.moltiplicatorePorzioni;

  async function conferma() {
    if (volo || testo === null) return;
    const scritto = testo.trim();
    if (scritto === String(valore)) {
      setTesto(null);
      return;
    }
    const n = Number(scritto);
    if (!/^\d+$/.test(scritto) || n < MIN_PORZIONI || n > MAX_PORZIONI) {
      setTesto(null);
      setErrore('range');
      return;
    }
    setErrore(null);
    setVolo(true);
    const ok = await salvaImpostazioni({ moltiplicatorePorzioni: n });
    setVolo(false);
    setTesto(null);
    if (!ok) setErrore('salva');
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void conferma();
    }
  }

  const campo = (
    <label
      style={{
        height: 44, width: 78, flex: 'none', boxSizing: 'border-box', borderRadius: 14,
        background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, padding: '0 12px',
        opacity: volo ? 0.5 : 1,
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        aria-label={ARIA_CAMPO}
        value={testo ?? String(valore)}
        disabled={volo}
        onChange={(e) => {
          setErrore(null);
          setTesto(e.target.value);
        }}
        onBlur={() => void conferma()}
        onKeyDown={tasto}
        style={{
          width: '100%', minWidth: 0, border: 0, outline: 'none', background: 'transparent', padding: 0, textAlign: 'right',
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
        }}
      />
      <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ter)' }}>
        PERS
      </span>
    </label>
  );

  // Dopo un rifiuto RLS l'errore della riga non c'è: parla l'avviso sopra i blocchi (§B.5).
  const testoErrore = errore === 'range' ? ERRORE_RANGE : errore === 'salva' && !casaCambiata ? ERRORE_SALVATAGGIO : null;

  return (
    <RigaImpostazione
      nome="Per quante persone cucini"
      nota={
        <>
          <span>{NOTA_PERSONE}</span>
          {valore > 1 && <span>{`La lista compra per ${valore}. Le porzioni nel piatto restano quelle scritte.`}</span>}
        </>
      }
      finale={{ tipo: 'campo', campo }}
      errore={testoErrore}
    />
  );
}
