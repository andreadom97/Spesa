'use client';

import type { ReactNode } from 'react';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';

export interface VoceSelettore {
  id: string;
  nome: string;
  /** Il pallino a sinistra della voce: il colore dell'area. */
  colore?: string;
  /** Una riga sotto il nome (12,5): cosa succede scegliendola («Lo conti in pezzi: passa a grammi…»). */
  nota?: string;
}

export interface PropsSelettoreFoglio {
  nome: string;
  nota?: ReactNode;
  /** Il nome accessibile della riga, se il testo visibile non basta. */
  etichetta?: string;
  voci: VoceSelettore[];
  sceltaId: string | null;
  /** Il valore della riga detto a parole, se non è il nome della voce scelta («Ingrediente nuovo»). */
  valore?: string;
  /** Il valore della riga quando non c'è una scelta. */
  vuoto?: string;
  /** Titolo del foglio, e suo nome accessibile. */
  titolo: string;
  notaFoglio?: string;
  aperto: boolean;
  onApri: () => void;
  onChiudi: () => void;
  onScegli: (id: string) => void;
  /** 2 sopra il foglio di una Scheda. */
  livello?: 1 | 2;
}

/**
 * Il Selettore a foglio (spec 8b §G): una Riga di impostazione a valore che apre un Foglio
 * dal basso con le voci; la voce scelta è piena `--ink` con la spunta nel tondo da 24,
 * «pieno = scelto» come la Riga piatto. Il tocco su una voce sceglie e chiude; il velo chiude
 * senza scegliere. Sostituisce ogni `<select>` di Importa. Dall'8c (§G) il foglio non va oltre
 * la cima del foglio alto, titolo e nota restano fermi e la lista delle voci scorre; una voce
 * può avere la sua nota, e la riga può dire il valore a parole.
 *
 * È controllato (`aperto`, `onApri`, `onChiudi`): l'indietro di Android lo gestisce l'unico
 * `useIndietroFogli` della schermata che lo monta.
 */
export function SelettoreFoglio({
  nome, nota, etichetta, voci, sceltaId, valore, vuoto = 'Scegli', titolo, notaFoglio, aperto, onApri, onChiudi, onScegli, livello = 1,
}: PropsSelettoreFoglio) {
  const scelta = voci.find((v) => v.id === sceltaId) ?? null;
  return (
    <>
      <RigaImpostazione nome={nome} nota={nota} etichetta={etichetta} finale={{ tipo: 'valore', valore: valore ?? scelta?.nome ?? vuoto, onApri }} />
      {aperto && (
        <FoglioDalBasso etichetta={titolo} onChiudi={onChiudi} altezza="contenuto" livello={livello}>
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <h2 style={{ margin: '0 4px', fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{titolo}</h2>
            {notaFoglio && <p style={{ margin: '0 4px 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>{notaFoglio}</p>}
          </div>
          <div
            role="radiogroup"
            aria-label={titolo}
            className="sc"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '9px 16px 26px', display: 'flex', flexDirection: 'column', gap: 9 }}
          >
            {voci.map((v) => {
              const selezionata = v.id === sceltaId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={selezionata}
                  onClick={() => {
                    onScegli(v.id);
                    onChiudi();
                  }}
                  style={{
                    minHeight: 50, flex: 'none', borderRadius: 14, padding: v.nota ? '8px 14px' : '0 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    background: selezionata ? 'var(--ink)' : 'rgba(20,22,58,0.04)', color: selezionata ? 'var(--superficie)' : 'var(--ink)',
                    fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.02em',
                  }}
                >
                  {v.colore && <span aria-hidden="true" style={{ width: 10, height: 10, flex: 'none', borderRadius: 999, background: v.colore }} />}
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{v.nome}</span>
                    {v.nota && (
                      <span style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: 0, lineHeight: 1.4, color: selezionata ? 'var(--superficie)' : 'var(--testo-2)' }}>
                        {v.nota}
                      </span>
                    )}
                  </span>
                  {selezionata && (
                    <span aria-hidden="true" style={{ width: 24, height: 24, flex: 'none', borderRadius: 999, border: '1.5px solid var(--superficie)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--superficie)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </FoglioDalBasso>
      )}
    </>
  );
}
