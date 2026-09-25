'use client';

import { useState } from 'react';
import { eanValido } from '@/domain/ean';
import { useLettoreCodici } from './useLettoreCodici';

interface Props {
  /** Il codice letto dalla camera o digitato: 8–14 cifre, già validato con `eanValido`. */
  onCodice: (ean: string) => void;
  onAnnulla: () => void;
}

const MAX_CIFRE = 14;

/**
 * Scanner del codice a barre (spec scan-confezione §3).
 *
 * Usa `BarcodeDetector` del browser perché la piattaforma della PWA è Chrome
 * Android, dove esiste: nessuna libreria di decodifica in v1 (peserebbe più
 * di tutta l'app e servirebbe solo a iOS/desktop, dove si scrive il codice).
 * Se il rilevatore c'è, apre la fotocamera posteriore e ogni 250 ms prova a
 * leggere il frame; al primo codice valido (`eanValido`) ferma intervallo e
 * stream e chiama `onCodice`. Se il rilevatore manca, o la camera è negata
 * o assente, resta solo il campo per scrivere il codice — che c'è sempre,
 * anche sotto il video: il codice stampato sotto le barre è il piano B che
 * non dipende da niente. La lettura vera e propria sta in `useLettoreCodici`
 * (Task 7): questo componente resta l'interfaccia di `/lista/confezioni`,
 * invariata.
 *
 * Il componente non parla mai con la rete: restituisce il codice e basta. È
 * la pagina che decide cosa farne (la route `/api/prodotto/[ean]`).
 *
 * Il ramo camera non si testa in jsdom (né `BarcodeDetector` né
 * `getUserMedia` esistono lì): dichiarato nella spec §6.
 */
export function Scanner({ onCodice, onAnnulla }: Props) {
  const { modo, videoRef } = useLettoreCodici(onCodice);
  const [codice, setCodice] = useState('');
  const valido = eanValido(codice);

  function cerca() {
    if (!valido) return;
    onCodice(codice.trim());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {modo === 'camera' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', borderRadius: 14, background: '#000' }}
        />
      )}
      {modo === 'fallback' && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--sec)' }}>
          La fotocamera non è disponibile: scrivi il codice sotto il codice a barre.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          cerca();
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          type="text"
          aria-label="Scrivi il codice"
          placeholder="Scrivi il codice"
          inputMode="numeric"
          maxLength={MAX_CIFRE}
          autoComplete="off"
          value={codice}
          onChange={(e) => setCodice(e.target.value.replace(/\D/g, '').slice(0, MAX_CIFRE))}
          style={{
            flex: 1, minWidth: 0, height: 46, padding: '0 14px', borderRadius: 14,
            border: '1px solid rgba(20,22,58,0.16)', background: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.06em', color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          disabled={!valido}
          style={{
            height: 46, padding: '0 18px', borderRadius: 14, border: 'none',
            background: '#14163A', color: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            opacity: valido ? 1 : 0.45,
          }}
        >
          CERCA
        </button>
      </form>

      <button
        type="button"
        onClick={onAnnulla}
        style={{
          alignSelf: 'flex-start', height: 40, padding: '0 14px', borderRadius: 999,
          background: 'transparent', border: '1.5px solid rgba(20,22,58,0.16)', color: 'var(--ink)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
        }}
      >
        ANNULLA
      </button>
    </div>
  );
}
