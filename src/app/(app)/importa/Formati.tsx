'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AreaId, ClasseResiduo, Ingredient, UnitaBase } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { abbina, ingredientiDaAbbinare } from '@/domain/import/mapping';
import { proponi } from '@/domain/import/formati-tipici';
import { AREE, nomeArea } from '@/domain/aree';

const UNITA: UnitaBase[] = ['g', 'ml', 'pz'];

const CLASSI: { id: ClasseResiduo; label: string }[] = [
  { id: 'porzionabile', label: 'Porzionabile' },
  { id: 'intero', label: 'Intero' },
  { id: 'stima', label: 'A stima' },
];

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  ingredientiEsistenti: Ingredient[];
  onStato: (s: StatoRevisione) => void;
}

/**
 * L'insieme necessario si ricalcola SEMPRE (non solo quando `ingredientiNuovi`
 * è vuoto): un ritorno da un `BozzaIncompletaError` al passo riepilogo può
 * portare in revisione una correzione che introduce un alimento mai visto
 * prima, e quell'alimento deve poter comparire qui — altrimenti l'import
 * resterebbe bloccato in un loop permanente fra riepilogo e revisione. Per
 * ogni alimento ancora necessario si conserva la proposta già in
 * `ingredientiNuovi` (comprese le correzioni fatte dall'utente in questo
 * passo); quelli non più necessari spariscono; quelli nuovi ricevono una
 * proposta fresca da `proponi`. La chiave di conservazione è `alimento` (il
 * nome estratto normalizzato), mai `nome` (che l'utente può aver rinominato
 * con "Usa l'ingrediente esistente").
 */
function calcolaProposte(
  piano: PianoEstratto,
  stato: StatoRevisione,
  ingredientiEsistenti: Ingredient[],
): IngredienteProposto[] {
  const giaProposti = new Map(stato.ingredientiNuovi.map((i) => [i.alimento, i]));
  return ingredientiDaAbbinare(piano, stato.correzioni)
    .filter(({ alimento, unita }) => !abbina(alimento, unita, ingredientiEsistenti))
    .map(({ alimento, unita }) => giaProposti.get(alimento) ?? proponi(alimento, unita));
}

/**
 * Il passo formati: una card per ogni ingrediente non abbinato, precompilata
 * da `proponi` (o conservata da un giro precedente per questo stesso passo) e
 * correggibile. Il risultato fuso si salva subito in `onStato`, così un
 * refresh non perde né il calcolo né le correzioni già fatte; da quel
 * momento lo stato locale del componente è l'unica fonte di verità finché non
 * si preme VAI AL RIEPILOGO.
 */
export function Formati({ piano, stato, ingredientiEsistenti, onStato }: Props) {
  const [ingredienti, setIngredienti] = useState<IngredienteProposto[]>(() =>
    calcolaProposte(piano, stato, ingredientiEsistenti),
  );

  useEffect(() => {
    onStato({ ...stato, ingredientiNuovi: ingredienti });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambia(indice: number, cambio: Partial<IngredienteProposto>) {
    setIngredienti((prev) => prev.map((ing, i) => (i !== indice ? ing : { ...ing, ...cambio })));
  }

  /** "Usa l'ingrediente esistente": rinomina la proposta col nome esatto dell'esistente scelto, così `abbina` la aggancerà per match esatto e `traduciBozza` la escluderà dai nuovi da creare. */
  function usaEsistente(indice: number, ingredientId: string) {
    const esistente = ingredientiEsistenti.find((i) => i.id === ingredientId);
    if (esistente) cambia(indice, { nome: esistente.nome });
  }

  function vaiAlRiepilogo() {
    onStato({ ...stato, ingredientiNuovi: ingredienti, passo: 'riepilogo' });
  }

  const bloccato = ingredienti.some((i) => !i.nome.trim() || !Number.isFinite(i.formatoConfezione) || i.formatoConfezione <= 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {ingredienti.length === 0 && (
          <p style={{ margin: '20px 4px', fontSize: 13.5, color: 'var(--sec)' }}>
            Tutti gli ingredienti del piano abbinano già qualcosa che hai in repertorio: niente da rivedere qui.
          </p>
        )}

        {ingredienti.map((ing, indice) => {
          const compatibili = ingredientiEsistenti.filter((e) => e.unitaBase === ing.unitaBase);
          return (
            <CardIngrediente
              key={ing.alimento}
              proposto={ing}
              compatibili={compatibili}
              onCambia={(cambio) => cambia(indice, cambio)}
              onUsaEsistente={(id) => usaEsistente(indice, id)}
            />
          );
        })}
      </div>

      <div style={{ padding: '4px 16px 22px' }}>
        <button
          type="button"
          disabled={bloccato}
          onClick={vaiAlRiepilogo}
          style={{
            width: '100%', height: 54, borderRadius: 18,
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: bloccato ? 'rgba(20,22,58,0.08)' : 'var(--ink)',
            color: bloccato ? 'var(--ter)' : '#FFFFFF',
          }}
        >
          VAI AL RIEPILOGO
        </button>
      </div>
    </div>
  );
}

function CardIngrediente({
  proposto,
  compatibili,
  onCambia,
  onUsaEsistente,
}: {
  proposto: IngredienteProposto;
  compatibili: Ingredient[];
  onCambia: (cambio: Partial<IngredienteProposto>) => void;
  onUsaEsistente: (ingredientId: string) => void;
}) {
  return (
    <section
      style={{
        marginBottom: 12, padding: '14px 14px 15px', borderRadius: 18,
        border: '1px solid var(--bordo)', background: 'var(--superficie)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.09em', color: 'var(--ter)', marginBottom: 6 }}>
        DALLA DIETA: {proposto.alimento}
      </div>

      <input
        type="text"
        value={proposto.nome}
        aria-label={`Nome dell'ingrediente: ${proposto.alimento}`}
        onChange={(e) => onCambia({ nome: e.target.value })}
        style={{
          width: '100%', height: 42, padding: '0 10px', borderRadius: 10, border: '1px solid var(--bordo)',
          background: 'var(--fondo)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8,
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Campo etichetta="Unità base">
          <select
            value={proposto.unitaBase}
            aria-label={`Unità base di ${proposto.alimento}`}
            onChange={(e) => onCambia({ unitaBase: e.target.value as UnitaBase })}
            style={STILE_SELECT}
          >
            {UNITA.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Campo>

        <Campo etichetta="Area">
          <select
            value={proposto.area}
            aria-label={`Area di ${proposto.alimento}`}
            onChange={(e) => onCambia({ area: e.target.value as AreaId })}
            style={STILE_SELECT}
          >
            {AREE.map((a) => (
              <option key={a.id} value={a.id}>{nomeArea(a.id)}</option>
            ))}
          </select>
        </Campo>

        <Campo etichetta="Classe residuo">
          <select
            value={proposto.classeResiduo}
            aria-label={`Classe residuo di ${proposto.alimento}`}
            onChange={(e) => onCambia({ classeResiduo: e.target.value as ClasseResiduo })}
            style={STILE_SELECT}
          >
            {CLASSI.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Campo>

        <Campo etichetta="Formato confezione">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              min={0}
              value={proposto.formatoConfezione}
              aria-label={`Formato confezione di ${proposto.alimento}`}
              onChange={(e) => onCambia({ formatoConfezione: Number(e.target.value) })}
              style={{ ...STILE_SELECT, flex: 1 }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sec)' }}>{proposto.unitaBase}</span>
          </div>
        </Campo>
      </div>

      <button
        type="button"
        onClick={() => onCambia({ deperibile: !proposto.deperibile })}
        aria-pressed={proposto.deperibile}
        aria-label={`Deperibile: ${proposto.alimento}`}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 40, padding: '0 12px', borderRadius: 12, background: 'var(--fondo)', border: '1px solid var(--bordo)',
          marginBottom: compatibili.length > 0 ? 10 : 0,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>Deperibile</span>
        <span
          style={{
            width: 40, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', padding: 2,
            background: proposto.deperibile ? 'var(--ink)' : 'rgba(20,22,58,0.14)',
            justifyContent: proposto.deperibile ? 'flex-end' : 'flex-start',
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: 999, background: '#FFFFFF' }} />
        </span>
      </button>

      {compatibili.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ter)' }}>
            È LO STESSO DI…
          </span>
          <select
            value=""
            aria-label={`Usa l'ingrediente esistente per ${proposto.alimento}`}
            onChange={(e) => {
              if (e.target.value) onUsaEsistente(e.target.value);
            }}
            style={STILE_SELECT}
          >
            <option value="">Usa l&apos;ingrediente esistente</option>
            {compatibili.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}

const STILE_SELECT = {
  width: '100%', height: 38, padding: '0 8px', borderRadius: 9,
  border: '1px solid var(--bordo)', background: 'var(--fondo)', fontSize: 13,
  color: 'var(--ink)',
};

function Campo({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: 'var(--ter)' }}>
        {etichetta.toUpperCase()}
      </span>
      {children}
    </label>
  );
}
