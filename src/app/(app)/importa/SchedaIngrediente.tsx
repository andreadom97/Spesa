'use client';

import { useState, type CSSProperties } from 'react';
import type { AreaId, ClasseResiduo, Ingredient } from '@/domain/types';
import type { IngredienteProposto } from '@/domain/import/types';
import { proponi } from '@/domain/import/formati-tipici';
import { legataA } from '@/domain/import/ingredienti';
import { AREE, coloreArea, nomeAreaFrase } from '@/domain/aree';
import { Blocco, Etichetta, STILE_PILLOLA } from '@/components/controlli';
import { Nota } from '@/components/pannello/pezzi';
import { Segmento } from '@/components/Segmento';
import { SelettoreFoglio } from '@/components/SelettoreFoglio';

const NUOVO = '__nuovo';
const OPZIONI_CLASSE: { id: ClasseResiduo; label: string }[] = [
  { id: 'porzionabile', label: 'Porzionabile' },
  { id: 'intero', label: 'Intero' },
  { id: 'stima', label: 'A stima' },
];
const UNITA_IN_PAROLE = { g: 'grammi', ml: 'millilitri', pz: 'pezzi' } as const;

export type CampoSelettore = 'area' | 'stesso';

function pillola(attiva: boolean): CSSProperties {
  return {
    ...STILE_PILLOLA, minWidth: 52,
    background: attiva ? 'var(--ink)' : 'var(--superficie)',
    color: attiva ? 'var(--superficie)' : 'var(--sec)',
    border: attiva ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
  };
}

/** Da testo del campo a numero: vuoto o non numerico è NaN, e `passoBloccato` spegne il Dock. */
function formatoDaTesto(testo: string): number {
  const pulito = testo.trim().replace(',', '.');
  return pulito === '' ? Number.NaN : Number(pulito);
}

interface Props {
  proposta: IngredienteProposto;
  esistenti: Ingredient[];
  /** Il nome doppio: avviso sotto il nome. */
  doppio: boolean;
  /** La nota del ripiego, se la scheda è fra quelle da controllare. */
  notaRipiego?: string;
  onCambia: (cambio: Partial<IngredienteProposto>) => void;
  selettore: CampoSelettore | null;
  onApriSelettore: (campo: CampoSelettore) => void;
  onChiudiSelettore: () => void;
  /** 2 quando la scheda sta in un foglio. */
  livelloSelettori: 1 | 2;
}

/**
 * La Scheda dell'ingrediente (spec 8b §F): i campi dell'editor dell'ingrediente meno il prezzo
 * (esce dal passo) e meno l'unità (è quella delle righe della dieta, decisione 7). Le modifiche
 * vanno in `onCambia` a ogni tasto: restano nello stato locale di Ingredienti, che le salva con
 * VAI AL RIEPILOGO. Scegliere un esistente in «È lo stesso di…» mette il suo nome nella
 * proposta e nasconde il resto: `traduciBozza` userà l'esistente.
 */
export function SchedaIngrediente({
  proposta, esistenti, doppio, notaRipiego, onCambia, selettore, onApriSelettore, onChiudiSelettore, livelloSelettori,
}: Props) {
  const [formatoTesto, setFormatoTesto] = useState(() => String(proposta.formatoConfezione).replace('.', ','));
  const legata = legataA(proposta, esistenti);
  const compatibili = esistenti
    .filter((e) => e.unitaBase === proposta.unitaBase)
    .sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));

  const stessoDi = compatibili.length > 0 && (
    <SelettoreFoglio
      nome="È lo stesso di…"
      voci={[{ id: NUOVO, nome: 'No, è un ingrediente nuovo' }, ...compatibili.map((e) => ({ id: e.id, nome: e.nome }))]}
      sceltaId={legata?.id ?? NUOVO}
      vuoto=""
      titolo={`${proposta.nome} è lo stesso di…`}
      notaFoglio={`Solo gli ingredienti che conti in ${UNITA_IN_PAROLE[proposta.unitaBase]}, come questo.`}
      aperto={selettore === 'stesso'}
      onApri={() => onApriSelettore('stesso')}
      onChiudi={onChiudiSelettore}
      onScegli={(id) => {
        if (id === NUOVO) onCambia({ nome: proponi(proposta.alimento, proposta.unitaBase).nome });
        else {
          const esistente = esistenti.find((e) => e.id === id);
          if (esistente) onCambia({ nome: esistente.nome });
        }
      }}
      livello={livelloSelettori}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sec)' }}>
          Dalla dieta: {proposta.alimento}
        </span>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)', overflowWrap: 'anywhere' }}>{proposta.nome || proposta.alimento}</span>
        {notaRipiego && !legata && <Nota>{notaRipiego}</Nota>}
      </div>

      {legata ? (
        <Blocco primo>
          {stessoDi}
          <Nota>Userò l&apos;ingrediente che hai già.</Nota>
        </Blocco>
      ) : (
        <>
          <Blocco primo>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Etichetta>Nome</Etichetta>
              <input
                type="text"
                aria-label="Nome"
                value={proposta.nome}
                onChange={(e) => onCambia({ nome: e.target.value })}
                style={{
                  height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px', border: '1px solid var(--bordo)',
                  background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)', fontSize: 14, color: 'var(--ink)',
                }}
              />
            </label>
            {doppio && (
              <p aria-live="polite" style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--avviso)' }}>
                Un altro ingrediente si chiama già così: cambia il nome.
              </p>
            )}
          </Blocco>

          <Blocco>
            <SelettoreFoglio
              nome="Area"
              voci={AREE.map((a) => ({ id: a.id, nome: nomeAreaFrase(a.id), colore: coloreArea(a.id) }))}
              sceltaId={proposta.area}
              titolo={`Area di ${proposta.nome || proposta.alimento}`}
              aperto={selettore === 'area'}
              onApri={() => onApriSelettore('area')}
              onChiudi={onChiudiSelettore}
              onScegli={(id) => onCambia({ area: id as AreaId })}
              livello={livelloSelettori}
            />
          </Blocco>

          <Blocco>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 4px' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Confezione</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Confezione"
                value={formatoTesto}
                onChange={(e) => {
                  setFormatoTesto(e.target.value);
                  onCambia({ formatoConfezione: formatoDaTesto(e.target.value) });
                }}
                style={{
                  width: 78, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
                  border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
                }}
              />
              <span style={{ width: 22, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ter)' }}>
                {proposta.unitaBase}
              </span>
            </div>
          </Blocco>

          <Blocco>
            <Etichetta>Come si consuma</Etichetta>
            <Segmento opzioni={OPZIONI_CLASSE} valore={proposta.classeResiduo} onCambia={(id) => onCambia({ classeResiduo: id as ClasseResiduo })} variante="blocco" />
          </Blocco>

          <Blocco>
            <div role="group" aria-label="Fresco" style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 4px' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Fresco</span>
              <button type="button" aria-pressed={proposta.deperibile} onClick={() => onCambia({ deperibile: true })} style={pillola(proposta.deperibile)}>SÌ</button>
              <button type="button" aria-pressed={!proposta.deperibile} onClick={() => onCambia({ deperibile: false })} style={pillola(!proposta.deperibile)}>NO</button>
            </div>
          </Blocco>

          {stessoDi && <Blocco>{stessoDi}</Blocco>}
        </>
      )}
    </div>
  );
}
