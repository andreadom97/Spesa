'use client';

import { useState, type CSSProperties } from 'react';
import type { AreaId, ClasseResiduo, Ingredient } from '@/domain/types';
import type { IngredienteProposto } from '@/domain/import/types';
import { legataA, type MotivoBlocco } from '@/domain/import/ingredienti';
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
const TESTO_AVVISO: Record<MotivoBlocco, string> = {
  nomeVuoto: "Scrivi il nome dell'ingrediente.",
  doppio: 'Un altro ingrediente si chiama già così: cambia il nome.',
  confezione: "Scrivi quanto c'è in una confezione.",
};

export type CampoSelettore = 'area' | 'stesso';

/** Un numero come lo si scrive: con la virgola («0,5»). */
export function numeroInTesto(n: number): string {
  return String(n).replace('.', ',');
}

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

/** Il testo del campo per una confezione: vuoto se non è un numero finito (niente «NaN»). */
function testoConfezione(n: number): string {
  return Number.isFinite(n) ? numeroInTesto(n) : '';
}

/**
 * Lo stesso valore di confezione: i non finiti (NaN, il campo vuoto o illeggibile) valgono tutti
 * uguali, così il riallineamento non riscrive «abc» e non gira all'infinito.
 */
function stessaConfezione(a: number, b: number): boolean {
  return a === b || (!Number.isFinite(a) && !Number.isFinite(b));
}

/** L'avviso in linea di una proposta che blocca il passo (12,5 `--avviso`, come nella Riga dell'alimento). */
function Avviso({ motivo }: { motivo: MotivoBlocco }) {
  return (
    <p aria-live="polite" style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--avviso)' }}>
      {TESTO_AVVISO[motivo]}
    </p>
  );
}

interface Props {
  proposta: IngredienteProposto;
  esistenti: Ingredient[];
  /** Legata per scelta in «È lo stesso di…»: la Scheda nasconde i campi. */
  scelto: boolean;
  /** Perché la proposta blocca il passo; vuoto se non blocca. */
  avvisi: MotivoBlocco[];
  /** La nota del ripiego, se la scheda è fra quelle da controllare. */
  notaRipiego?: string;
  onCambia: (cambio: Partial<IngredienteProposto>) => void;
  /** La scelta in «È lo stesso di…»: l'id dell'esistente, o `null` per «No, è un ingrediente nuovo». */
  onStesso: (id: string | null) => void;
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
 * VAI AL RIEPILOGO.
 *
 * La modalità legata («Userò l'ingrediente che hai già.», campi nascosti) la decide la SCELTA in
 * «È lo stesso di…» (`scelto`), non il nome: decisa dal nome, il campo Nome si smonterebbe a
 * metà parola appena il testo coincide con un esistente. Una proposta che `abbina` aggancia
 * senza una scelta (per inclusione, o scrivendo il nome esatto) tiene la Scheda intera con la
 * nota «Finirà su…»: si stacca rinominandola.
 */
export function SchedaIngrediente({
  proposta, esistenti, scelto, avvisi, notaRipiego, onCambia, onStesso, selettore, onApriSelettore, onChiudiSelettore, livelloSelettori,
}: Props) {
  const [formatoTesto, setFormatoTesto] = useState(() => testoConfezione(proposta.formatoConfezione));
  // La stessa proposta può essere resa due volte (in «Da sistemare» e nel foglio): se l'altra
  // istanza cambia la confezione, il testo si riallinea. Aggiustamento durante il render, come in
  // `CampoConSalva`, non un effetto. Si riscrive solo se il numero è diverso: «1,» resta «1,».
  if (!stessaConfezione(formatoDaTesto(formatoTesto), proposta.formatoConfezione)) {
    setFormatoTesto(testoConfezione(proposta.formatoConfezione));
  }
  const legata = legataA(proposta, esistenti);
  const compatibili = esistenti
    .filter((e) => e.unitaBase === proposta.unitaBase)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

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
      onScegli={(id) => onStesso(id === NUOVO ? null : id)}
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
        {notaRipiego && !scelto && <Nota>{notaRipiego}</Nota>}
      </div>

      {scelto ? (
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
            {avvisi.filter((m) => m !== 'confezione').map((m) => <Avviso key={m} motivo={m} />)}
            {legata && <Nota>Finirà su «{legata.nome}», che hai già: se è un altro ingrediente, cambia il nome.</Nota>}
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
            {avvisi.includes('confezione') && <Avviso motivo="confezione" />}
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
