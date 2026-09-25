'use client';

import { coloreArea, nomeArea } from '@/domain/aree';
import { TESTO_AVVISO, scadenzaVoce, stimaVoce, type AvvisoVoce, type VoceDispensa } from '@/domain/dispensa-vista';
import { TestataFoglio } from '@/components/FoglioDalBasso';
import { IconaScansione } from './icone';
import { Blocco, CampoConSalva, RigaSiNo, TastoSecondario } from './controlli';
import { RigaScadenza } from './RigaScadenza';

interface Props {
  voce: VoceDispensa;
  avviso: AvvisoVoce;
  oggi: string;
  /** SÌ da residuo 0: una confezione, con la regola d'entrata (la pagina). */
  onInCasa: () => Promise<void>;
  onFinito: () => Promise<void>;
  onResiduo: (n: number) => Promise<void>;
  onCongelato: (congelato: boolean) => Promise<void>;
  onScadenza: (data: string | null) => Promise<void>;
  onScansiona: () => void;
  onChiudi: () => void;
}

/**
 * Il dettaglio di un ingrediente (spec §D, v2 06, v1 04/05): il posto dove si
 * corregge a mano. Un livello solo: la X chiude, niente freccia. Va dentro un
 * `FoglioDalBasso` alto, che la pagina apre col nome dell'ingrediente.
 */
export function DettaglioIngrediente({
  voce, avviso, oggi, onInCasa, onFinito, onResiduo, onCongelato, onScadenza, onScansiona, onChiudi,
}: Props) {
  const { ingrediente: ing } = voce;
  const inCasa = voce.residuo > 0;
  const stima = stimaVoce(voce);
  const scadenza = scadenzaVoce(voce);

  return (
    <>
      <TestataFoglio onChiudi={onChiudi}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(ing.area), flex: 'none' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            {nomeArea(ing.area)}
          </span>
        </span>
      </TestataFoglio>

      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)' }}>{ing.nome}</h2>
          {avviso && (
            <p aria-live="polite" style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.45, color: 'var(--avviso)' }}>{TESTO_AVVISO[avviso]}</p>
          )}
        </div>

        <Blocco primo>
          <RigaSiNo
            nome="In casa"
            si={{ testo: 'SÌ', aria: `${ing.nome}: segna in casa`, premuto: inCasa }}
            no={{ testo: 'FINITO', aria: `${ing.nome}: segna finito`, premuto: !inCasa }}
            onSi={onInCasa}
            onNo={onFinito}
          />
        </Blocco>

        <Blocco>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Residuo</span>
            <CampoConSalva
              aria={`Residuo di ${ing.nome}`}
              valore={voce.residuo}
              unita={ing.unitaBase}
              messaggioErrore="Non siamo riusciti a salvare la correzione. Riprova."
              onSalva={onResiduo}
            />
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>
            Calcolato da spesa e piano: correggi solo se non torna con la realtà.
          </p>
        </Blocco>

        {ing.deperibile && (
          <Blocco>
            <RigaSiNo
              nome="In congelatore"
              si={{ testo: 'SÌ', aria: `${ing.nome}: metti in congelatore`, premuto: voce.congelato }}
              no={{ testo: 'NO', aria: `${ing.nome}: togli dal congelatore`, premuto: !voce.congelato }}
              onSi={() => onCongelato(true)}
              onNo={() => onCongelato(false)}
            />
          </Blocco>
        )}

        {stima !== null && scadenza !== null && (
          <Blocco>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Scadenza</span>
            <RigaScadenza
              nome={ing.nome}
              scadenza={scadenza}
              stima={stima}
              manuale={voce.scadenzaManuale !== null}
              oggi={oggi}
              onSalva={onScadenza}
            />
          </Blocco>
        )}

        <TastoSecondario onClick={onScansiona}>
          <IconaScansione />
          SCANSIONA UNA CONFEZIONE
        </TastoSecondario>
      </div>
    </>
  );
}
