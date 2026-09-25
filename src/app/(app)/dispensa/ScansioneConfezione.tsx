'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Ingredient } from '@/domain/types';
import { dataCorta, etichettaQuantita, stimaNuovaConfezione } from '@/domain/dispensa-vista';
import { esitoDaCatalogo, esitoLocale, type EsitoCodice } from '@/domain/scansione-dispensa';
import { FORMATO_MAX, FORMATO_MIN } from '@/data/confezioni';
import { TestataFoglio } from '@/components/FoglioDalBasso';
import { MessaggioErrore, TastoPrimario, TastoSecondario } from './controlli';
import { LettoreCodice, cercaProdotto } from './LettoreCodice';

interface Props {
  ingrediente: Ingredient;
  congelato: boolean;
  ingredienti: Ingredient[];
  oggi: string;
  onIndietro: () => void;
  onChiudi: () => void;
  /** AGGIUNGI: la pagina scrive e, se va, torna al dettaglio. */
  onAggiungi: (formato: number, ean: string) => Promise<void>;
  onApri: (altro: Ingredient) => void;
}

type Fase = { tipo: 'leggo' } | { tipo: 'cerco'; ean: string } | { tipo: 'esito'; esito: EsitoCodice };

/**
 * La scansione dal dettaglio (spec §F.1, §F.2, v2 08): la lettura, poi
 * l'esito con la tabella di §F.2. Niente parte da solo: si aggiunge col tasto.
 */
export function ScansioneConfezione({ ingrediente, congelato, ingredienti, oggi, onIndietro, onChiudi, onAggiungi, onApri }: Props) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ tipo: 'leggo' });
  const [formatoAMano, setFormatoAMano] = useState('');
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);

  async function letto(ean: string) {
    const locale = esitoLocale(ean, ingrediente, ingredienti);
    if (locale) {
      setFase({ tipo: 'esito', esito: locale });
      return;
    }
    setFase({ tipo: 'cerco', ean });
    const risposta = await cercaProdotto(ean);
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    setFase({ tipo: 'esito', esito: esitoDaCatalogo(ean, ingrediente, risposta) });
  }

  function riprendi() {
    setFormatoAMano('');
    setErrore(false);
    setFase({ tipo: 'leggo' });
  }

  async function aggiungi(formato: number, ean: string) {
    if (volo) return;
    setVolo(true);
    setErrore(false);
    try {
      await onAggiungi(formato, ean);
    } catch {
      setErrore(true);
      setVolo(false);
    }
  }

  const n = Number(formatoAMano.replace(',', '.'));
  const formatoValido = formatoAMano.trim() !== '' && Number.isFinite(n) && n >= FORMATO_MIN && n <= FORMATO_MAX;
  const stima = ingrediente.deperibile ? stimaNuovaConfezione(ingrediente, congelato, oggi) : null;

  return (
    <>
      <TestataFoglio onChiudi={onChiudi} indietro={{ etichetta: `Torna a ${ingrediente.nome}`, onClick: onIndietro }}>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{ingrediente.nome}</span>
      </TestataFoglio>
      <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fase.tipo === 'leggo' && <LettoreCodice onCodice={(ean) => void letto(ean)} />}
        {fase.tipo !== 'leggo' && (
          <div style={{ background: 'rgba(20,22,58,0.04)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)' }}>
              {`CODICE ${fase.tipo === 'cerco' ? fase.ean : fase.esito.ean}`}
            </span>
            {fase.tipo === 'esito' && fase.esito.tipo === 'confezione' && (
              <>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{`Confezione da ${etichettaQuantita(fase.esito.formato, ingrediente.unitaBase)}`}</span>
                {stima && <span style={{ fontSize: 12.5, color: 'var(--testo-2)' }}>{`Scade il ${dataCorta(stima)}, stima: la correggi dopo, qui nel dettaglio.`}</span>}
              </>
            )}
            {fase.tipo === 'esito' && fase.esito.tipo === 'altroIngrediente' && (
              <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{`Questo codice è di ${fase.esito.ingrediente.nome}.`}</span>
            )}
            {fase.tipo === 'esito' && fase.esito.tipo === 'aMano' && (
              <>
                <span style={{ fontSize: 12.5, color: 'var(--testo-2)' }}>{fase.esito.messaggio}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Formato della confezione di ${ingrediente.nome}`}
                    value={formatoAMano}
                    onChange={(e) => setFormatoAMano(e.target.value)}
                    style={{
                      width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
                      border: '1px solid var(--bordo)', background: 'var(--superficie)',
                      fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ink)',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ter)' }}>{ingrediente.unitaBase}</span>
                </div>
              </>
            )}
          </div>
        )}
        {errore && <MessaggioErrore>Non siamo riusciti a salvare. Riprova.</MessaggioErrore>}
        {fase.tipo === 'esito' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TastoSecondario onClick={riprendi} disabled={volo} style={{ flex: 1 }}>NON È QUESTA</TastoSecondario>
            {fase.esito.tipo === 'altroIngrediente' ? (
              <TastoPrimario onClick={() => onApri((fase.esito as Extract<EsitoCodice, { tipo: 'altroIngrediente' }>).ingrediente)} style={{ flex: 1 }}>
                {`APRI ${fase.esito.ingrediente.nome.toUpperCase()}`}
              </TastoPrimario>
            ) : (
              <TastoPrimario
                disabled={volo || (fase.esito.tipo === 'aMano' && !formatoValido)}
                onClick={() => {
                  const e = fase.esito;
                  if (e.tipo === 'confezione') void aggiungi(e.formato, e.ean);
                  else if (e.tipo === 'aMano' && formatoValido) void aggiungi(n, e.ean);
                }}
                style={{ flex: 1 }}
              >
                AGGIUNGI
              </TastoPrimario>
            )}
          </div>
        )}
      </div>
    </>
  );
}
