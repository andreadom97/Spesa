'use client';

import { useEffect, useState } from 'react';
import { eanValido } from '@/domain/ean';
import type { RispostaProdotto } from '@/domain/scansione-dispensa';
import { useLettoreCodici } from '@/components/useLettoreCodici';
import { TastoPrimario, TastoSecondario } from '@/components/controlli';

const MAX_CIFRE = 14;

/**
 * `GET /api/prodotto/[ean]`, come in /lista/confezioni: 'sessione' se la
 * sessione è scaduta (redirect a /entra o 401), 'errore' per rete e catalogo.
 */
export async function cercaProdotto(ean: string): Promise<RispostaProdotto | 'errore' | 'sessione'> {
  try {
    const res = await fetch(`/api/prodotto/${ean}`);
    if (res.redirected || res.status === 401) return 'sessione';
    if (!res.ok) return 'errore';
    return (await res.json()) as RispostaProdotto;
  } catch (e) {
    console.error('dispensa: catalogo non raggiungibile.', e instanceof Error ? e.name : 'errore');
    return 'errore';
  }
}

function Anteprima({ onCodice, onAssente }: { onCodice: (ean: string) => void; onAssente: () => void }) {
  const { modo, videoRef } = useLettoreCodici(onCodice);
  useEffect(() => {
    // Notifica il genitore dentro un effect, non durante il render: `onAssente`
    // cambia lo stato di `LettoreCodice` (il genitore), e farlo nel corpo del
    // render di `Anteprima` è un effetto collaterale su un altro componente
    // che React (e la regola react-hooks/set-state-in-effect, letta al
    // contrario) segnala. Con la guardia su `modo`, scatta una sola volta.
    if (modo === 'fallback') onAssente();
  }, [modo, onAssente]);
  return (
    <div aria-label="Anteprima della fotocamera" role="img" style={{ position: 'relative', flex: 1, minHeight: 220, borderRadius: 14, overflow: 'hidden', background: 'var(--ink)' }}>
      {modo === 'camera' && (
        <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div aria-hidden="true" style={{ position: 'absolute', left: 40, right: 40, top: '34%', bottom: '34%' }}>
        <span className="guida-angolo alto-sx" />
        <span className="guida-angolo alto-dx" />
        <span className="guida-angolo basso-sx" />
        <span className="guida-angolo basso-dx" />
      </div>
    </div>
  );
}

/**
 * La vista di lettura della Dispensa (v1 12 e 13): l'anteprima con la cornice
 * guida e `DIGITA IL CODICE`, oppure il codice da digitare. Senza fotocamera
 * si parte dal campo, con la riga che lo dice.
 */
export function LettoreCodice({ onCodice }: { onCodice: (ean: string) => void }) {
  const [vista, setVista] = useState<'camera' | 'digita'>('camera');
  const [assente, setAssente] = useState(false);
  const [codice, setCodice] = useState('');
  const valido = eanValido(codice);

  if (vista === 'camera' && !assente) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <Anteprima onCodice={onCodice} onAssente={() => { setAssente(true); setVista('digita'); }} />
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--testo-2)' }}>Inquadra il codice a barre: si legge da solo.</p>
        <TastoSecondario onClick={() => setVista('digita')}>DIGITA IL CODICE</TastoSecondario>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valido) onCodice(codice.trim()); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {assente && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--testo-2)' }}>La fotocamera non è disponibile: digita il codice sotto la confezione.</p>
      )}
      <input
        type="text"
        aria-label="Codice a barre"
        inputMode="numeric"
        autoComplete="off"
        maxLength={MAX_CIFRE}
        value={codice}
        onChange={(e) => setCodice(e.target.value.replace(/\D/g, '').slice(0, MAX_CIFRE))}
        style={{
          height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px', border: '1px solid var(--bordo)',
          background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
        }}
      />
      <TastoPrimario type="submit" disabled={!valido}>CERCA IL CODICE</TastoPrimario>
      {!assente && <TastoSecondario onClick={() => setVista('camera')}>USA LA FOTOCAMERA</TastoSecondario>}
    </form>
  );
}
