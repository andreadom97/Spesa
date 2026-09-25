'use client';

import type { LottoPronto } from '@/domain/types';
import { dataBreve } from '@/domain/dispensa-vista';
import { TestataFoglio } from '@/components/FoglioDalBasso';
import { Blocco, CampoConSalva, RigaSiNo, TastoSecondario } from './controlli';

interface Props {
  lotto: LottoPronto;
  /** Il nome del piatto, o `Piatto eliminato`. */
  nome: string;
  /** Le porzioni già promesse a pasti futuri. */
  impegnate: number;
  onPorzioni: (n: number) => Promise<void>;
  onCongelato: (congelato: boolean) => Promise<void>;
  /** Apre il dialogo: la pagina lo mostra sopra. */
  onElimina: () => void;
  onChiudi: () => void;
}

/** Il dettaglio di un lotto Pronto (spec §G, v1 06), aperto dalla pagina: un livello, la sola X. */
export function DettaglioLotto({ lotto, nome, impegnate, onPorzioni, onCongelato, onElimina, onChiudi }: Props) {
  const dati = `PREPARATO IL ${dataBreve(lotto.preparataIl).toUpperCase()}${lotto.congelato ? ' · IN CONGELATORE' : ''}`;
  return (
    <>
      <TestataFoglio onChiudi={onChiudi}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>PRONTI</span>
      </TestataFoglio>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)' }}>{nome}</h2>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)' }}>{dati}</p>
        </div>
        <Blocco primo>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Porzioni</span>
            <CampoConSalva
              aria={`Porzioni di ${nome}`}
              valore={lotto.porzioni}
              unita="porz."
              intero
              messaggioErrore="Non siamo riusciti a salvare la correzione. Riprova."
              onSalva={onPorzioni}
            />
          </div>
          {impegnate > 0 && (
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--testo-2)' }}>{impegnate === 1 ? '1 impegnata' : `${impegnate} impegnate`}</p>
          )}
        </Blocco>
        <Blocco>
          <RigaSiNo
            nome="In congelatore"
            si={{ testo: 'SÌ', aria: `${nome}: metti in congelatore`, premuto: lotto.congelato }}
            no={{ testo: 'NO', aria: `${nome}: togli dal congelatore`, premuto: !lotto.congelato }}
            onSi={() => onCongelato(true)}
            onNo={() => onCongelato(false)}
          />
        </Blocco>
        <TastoSecondario onClick={onElimina} aria-label={`Elimina il lotto di ${nome}`}>ELIMINA IL LOTTO</TastoSecondario>
      </div>
    </>
  );
}
