'use client';

import { useState, type CSSProperties } from 'react';
import type { UnitaBase } from '@/domain/types';
import type { DecisioneCambio } from '@/domain/import/types';
import type { CambioUnita } from '@/domain/import/ingredienti';
import { UNITA_IN_PAROLE, convertiPezzi, numeroInParole, testoCambio, testoConversione } from '@/domain/import/formati-tipici';
import { STILE_PILLOLA } from '@/components/controlli';
import { Nota } from '@/components/pannello/pezzi';

/** Gli esempi dei due valori: un tuo piatto che usa l'ingrediente, e la prima riga della dieta. */
export interface EsempioCambio {
  piatto: { nome: string; quantita: number } | null;
  riga: { quantita: number; unita: UnitaBase } | null;
}

const AVVISO_PESO = 'Scrivi quanto pesa un pezzo: serve a convertire le quantità.';

/** Le pillole SÌ / NO di una riga a scelta («Fresco», «Tienile a pezzi»). Unica copia: SchedaIngrediente la importa da qui (correzione D5). */
export function pillola(attiva: boolean): CSSProperties {
  return {
    ...STILE_PILLOLA, minWidth: 52,
    background: attiva ? 'var(--ink)' : 'var(--superficie)',
    color: attiva ? 'var(--superficie)' : 'var(--sec)',
    border: attiva ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
  };
}

/** Un peso da testo: un numero positivo, con la virgola o col punto; null altrimenti. */
function pesoDaTesto(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') return null;
  const n = Number(pulito);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface Props {
  cambio: CambioUnita;
  esempio: EsempioCambio;
  /** Nome e «Dalla dieta: …» in testa: false dentro la Scheda di una proposta, che ha i suoi. */
  conTestata: boolean;
  onDecisione: (d: Partial<DecisioneCambio>) => void;
}

/**
 * La Scheda del cambio di unità (spec 8c §A.3): un ingrediente che hai passa all'unità della
 * dieta, già scelto (il nuovo piano prevale). Dice sempre i due valori. «Tienile a pezzi» lo
 * rifiuta: l'ingrediente resta com'è e si convertono le righe della dieta, con lo stesso peso. Il
 * peso di un pezzo si corregge qui; senza tabella si chiede, e finché manca il passo è bloccato.
 * Il campo salva all'uscita e con Invio, mai a ogni tasto, e segue il peso che cambia da fuori.
 *
 * Con `da === a` (ruling 8c Task 8: l'unità resta, ma alcune righe sono nell'altra; o una proposta
 * nuova con righe in g e in pz) non c'è un cambio da accettare: niente «passa a» e niente
 * «Tienile…», solo il peso di un pezzo.
 */
export function SchedaCambio({ cambio, esempio, conTestata, onDecisione }: Props) {
  const peso = cambio.pesoPezzo;
  const [testoPeso, setTestoPeso] = useState(peso === null ? '' : numeroInParole(peso));
  const [pesoVisto, setPesoVisto] = useState(peso);
  if (pesoVisto !== peso) {
    setPesoVisto(peso);
    setTestoPeso(peso === null ? '' : numeroInParole(peso));
  }
  const cambiaUnita = cambio.da !== cambio.a;
  const nomeTieni = cambio.da === 'pz' ? 'Tienile a pezzi' : 'Tienile in grammi';

  let testo: string | null = null;
  if (peso !== null && cambiaUnita && !cambio.tieni) {
    const delPiatto = esempio.piatto ? convertiPezzi(esempio.piatto.quantita, cambio.da, cambio.a, peso) : null;
    testo = testoCambio(cambio.nome, cambio.a, peso)
      + (esempio.piatto && delPiatto !== null
        ? ` «${esempio.piatto.nome}»: ${testoConversione({ quantita: esempio.piatto.quantita, unita: cambio.da }, { quantita: delPiatto, unita: cambio.a })}.`
        : '');
  } else if (peso !== null) {
    const riga = esempio.riga && esempio.riga.unita !== cambio.da ? esempio.riga : null;
    const dellaRiga = riga ? convertiPezzi(riga.quantita, riga.unita, cambio.da, peso) : null;
    testo = `Le righe della dieta passano a ${UNITA_IN_PAROLE[cambio.da]}`
      + (riga && dellaRiga !== null ? `: ${testoConversione(riga, { quantita: dellaRiga, unita: cambio.da })}.` : '.');
  }

  function salvaPeso() {
    const n = pesoDaTesto(testoPeso);
    if (n === null) {
      setTestoPeso(peso === null ? '' : numeroInParole(peso));
      return;
    }
    if (n !== peso) onDecisione({ pesoPezzo: n });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {conTestata && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sec)' }}>
            Dalla dieta: {cambio.alimenti.join(', ')}
          </span>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', overflowWrap: 'anywhere' }}>{cambio.nome}</span>
        </div>
      )}
      {testo && <Nota>{testo}</Nota>}
      {cambiaUnita && (
        <div role="group" aria-label={nomeTieni} style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 4px' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>{nomeTieni}</span>
          <button type="button" aria-pressed={cambio.tieni} onClick={() => onDecisione({ tieni: true })} style={pillola(cambio.tieni)}>SÌ</button>
          <button type="button" aria-pressed={!cambio.tieni} onClick={() => onDecisione({ tieni: false })} style={pillola(!cambio.tieni)}>NO</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 4px' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>{`Quanto pesa 1 pz di ${cambio.nome}?`}</span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="Peso di un pezzo"
            value={testoPeso}
            onChange={(e) => setTestoPeso(e.target.value)}
            onBlur={salvaPeso}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            style={{
              width: 78, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
              border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
            }}
          />
          <span style={{ width: 22, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ter)' }}>g</span>
        </div>
        {peso === null && (
          <p aria-live="polite" style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--avviso)' }}>{AVVISO_PESO}</p>
        )}
        {peso !== null && cambio.pesoDaTabella && <Nota>È un peso medio: correggilo se serve.</Nota>}
      </div>
    </div>
  );
}
