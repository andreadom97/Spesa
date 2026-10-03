'use client';

import { useEffect, useState } from 'react';
import type { Ingredient } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import {
  calcolaProposte, diRipiego, legataA, motiviBlocco, sceltiIniziali, sezioniIniziali, valoreRipiego,
} from '@/domain/import/ingredienti';
import { proponi } from '@/domain/import/formati-tipici';
import { nomeAreaFrase } from '@/domain/aree';
import { BloccoGruppo } from '@/components/pannello/pezzi';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { Dock } from '@/components/Dock';
import { useLivelliImporta } from './livelli';
import { SchedaIngrediente, numeroInTesto, type CampoSelettore } from './SchedaIngrediente';
import { TitoloSezione, plurale } from './sezione';

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  ingredientiEsistenti: Ingredient[];
  onStato: (s: StatoRevisione) => void;
}

/** La Scheda, bianca, raggio 22, bordo, padding 16 (DESIGN.md §8 Scheda). */
const STILE_SCHEDA = { background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, padding: 16 } as const;

/** L'Etichetta di sezione sopra le Schede aperte (DESIGN.md §8), come il titolo di un Blocco di gruppo. */
const STILE_TITOLO_SEZIONE = {
  margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--ink)',
};

function frase(nuovi: number, ripieghi: number): string {
  if (nuovi === 0) return 'Tutti gli ingredienti del piano abbinano già qualcosa che hai: niente da rivedere qui.';
  const quanti = plurale(nuovi, 'ingrediente nuovo', 'ingredienti nuovi');
  if (ripieghi === 0) return nuovi === 1 ? `${quanti}. L'ho proposto io: toccalo se non torna.` : `${quanti}. Li ho proposti io: tocca quello che non torna.`;
  if (ripieghi === nuovi) {
    return nuovi === 1
      ? `${quanti}. Non lo conosco: ho messo valori prudenti, controllalo.`
      : `${quanti}. Non li conosco: ho messo valori prudenti, controllali.`;
  }
  return `${quanti}. Ne conosco ${nuovi - ripieghi}; per ${ripieghi} ho messo valori prudenti: controllali.`;
}

function senza(scelti: Record<string, string>, alimento: string): Record<string, string> {
  if (scelti[alimento] === undefined) return scelti;
  const resto = { ...scelti };
  delete resto[alimento];
  return resto;
}

/**
 * Ingredienti (spec 8b §F), il passo 3 di Importa. Le proposte si calcolano all'ingresso e si
 * salvano subito con `onStato`, così un refresh non perde il calcolo; da lì lo stato locale è
 * la fonte di verità finché non si preme VAI AL RIEPILOGO.
 *
 * `sceltiEsistenti` (`alimento → id`) dice quali proposte sono legate per scelta in «È lo stesso
 * di…»: la scelta lo scrive, «No, è un ingrediente nuovo» e ogni modifica del Nome lo tolgono.
 * All'ingresso vale per le proposte col nome esatto di un esistente della stessa unità (le bozze
 * riprese dopo una scelta).
 *
 * Le sezioni si decidono all'ingresso e non cambiano sotto il dito. L'unica eccezione: una
 * proposta di «Proposti da me» che comincia a bloccare il passo (corretta dal foglio) entra in
 * «Da sistemare» e ci resta. Una Scheda già in pagina resta dov'è e mostra il suo avviso.
 */
export function Ingredienti({ piano, stato, ingredientiEsistenti, onStato }: Props) {
  const [ingredienti, setIngredienti] = useState<IngredienteProposto[]>(() => calcolaProposte(piano, stato, ingredientiEsistenti));
  const [scelti, setScelti] = useState<Record<string, string>>(() => sceltiIniziali(ingredienti, ingredientiEsistenti));
  const [sezioni] = useState(() => sezioniIniziali(ingredienti, ingredientiEsistenti, scelti));
  const [schedaAperta, setSchedaAperta] = useState<string | null>(null);
  // `inFoglio`: la stessa proposta può essere resa due volte (in «Da sistemare» e nel foglio), e
  // ogni istanza apre solo il suo selettore.
  const [selettore, setSelettore] = useState<{ alimento: string; campo: CampoSelettore; inFoglio: boolean } | null>(null);

  /** Lo stato da salvare uscendo dal passo, avanti o indietro. */
  function daSalvare(passo: StatoRevisione['passo']): StatoRevisione {
    return { ...stato, ingredientiNuovi: ingredienti, passo };
  }

  useEffect(() => {
    onStato({ ...stato, ingredientiNuovi: ingredienti });
    // Una volta sola, all'ingresso nel passo: come Formati prima di lui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un solo indietro per la bozza (spec 8c §F): prima il selettore, poi la scheda, poi Controlla.
  useLivelliImporta((schedaAperta ? 1 : 0) + (selettore ? 1 : 0), () => {
    if (selettore) setSelettore(null);
    else setSchedaAperta(null);
  }, () => onStato(daSalvare('revisione')));

  function aggiorna(alimento: string, cambio: Partial<IngredienteProposto>) {
    setIngredienti((prima) => prima.map((p) => (p.alimento === alimento ? { ...p, ...cambio } : p)));
  }

  function cambia(alimento: string, cambio: Partial<IngredienteProposto>) {
    aggiorna(alimento, cambio);
    if ('nome' in cambio) setScelti((prima) => senza(prima, alimento));
  }

  function scegliStesso(p: IngredienteProposto, id: string | null) {
    if (id === null) {
      aggiorna(p.alimento, { nome: proponi(p.alimento, p.unitaBase).nome });
      setScelti((prima) => senza(prima, p.alimento));
      return;
    }
    const esistente = ingredientiEsistenti.find((e) => e.id === id);
    if (!esistente) return;
    aggiorna(p.alimento, { nome: esistente.nome });
    setScelti((prima) => ({ ...prima, [p.alimento]: esistente.id }));
  }

  const motivi = motiviBlocco(ingredienti, ingredientiEsistenti, scelti);
  // Chi comincia a bloccare mentre sta in «Proposti da me» entra in «Da sistemare» e ci resta,
  // anche dopo la correzione. Aggiustamento durante il render, come in `CampoConSalva`, non un
  // effetto.
  const [entrati, setEntrati] = useState<string[]>([]);
  const nuoviBloccati = [...motivi.keys()].filter(
    (a) => !sezioni.daSistemare.includes(a) && !sezioni.daControllare.includes(a) && !entrati.includes(a),
  );
  if (nuoviBloccati.length > 0) setEntrati([...entrati, ...nuoviBloccati]);
  const inDaSistemare = new Set([...sezioni.daSistemare, ...entrati, ...nuoviBloccati]);
  const daSistemare = ingredienti.filter((p) => inDaSistemare.has(p.alimento));
  const daControllare = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && sezioni.daControllare.includes(p.alimento));
  const proposti = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && !sezioni.daControllare.includes(p.alimento));
  // Il contatore conta TUTTE le proposte che bloccano, anche una Scheda di «Da controllare» col
  // nome svuotato: «Fatto» col Dock spento sarebbe falso.
  const ancoraBloccate = motivi.size;
  const libere = ingredienti.filter((p) => !legataA(p, ingredientiEsistenti));
  const ripieghi = libere.filter(diRipiego).length;
  const bloccato = motivi.size > 0;

  function scheda(p: IngredienteProposto, inFoglio: boolean, notaRipiego?: string) {
    return (
      <SchedaIngrediente
        proposta={p}
        esistenti={ingredientiEsistenti}
        scelto={scelti[p.alimento] !== undefined}
        avvisi={motivi.get(p.alimento) ?? []}
        notaRipiego={notaRipiego}
        onCambia={(cambio) => cambia(p.alimento, cambio)}
        onStesso={(id) => scegliStesso(p, id)}
        selettore={selettore?.alimento === p.alimento && selettore.inFoglio === inFoglio ? selettore.campo : null}
        onApriSelettore={(campo) => setSelettore({ alimento: p.alimento, campo, inFoglio })}
        onChiudiSelettore={() => setSelettore(null)}
        livelloSelettori={inFoglio ? 2 : 1}
      />
    );
  }

  const aperta = ingredienti.find((p) => p.alimento === schedaAperta) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ margin: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{frase(libere.length, ripieghi)}</p>

        {daSistemare.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={STILE_TITOLO_SEZIONE}>
              <TitoloSezione testo="Da sistemare" contatore={ancoraBloccate === 0 ? 'Fatto' : String(ancoraBloccate)} />
            </h3>
            {daSistemare.map((p) => (
              <section key={p.alimento} aria-label={p.nome || p.alimento} style={STILE_SCHEDA}>{scheda(p, false)}</section>
            ))}
          </section>
        )}

        {daControllare.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={STILE_TITOLO_SEZIONE}>
              <TitoloSezione testo="Da controllare" contatore={String(daControllare.length)} />
            </h3>
            {daControllare.map((p) => (
              <section key={p.alimento} aria-label={p.nome || p.alimento} style={STILE_SCHEDA}>
                {scheda(p, false, `Non è nella mia tabella dei formati: ${valoreRipiego(p)} è un valore di ripiego.`)}
              </section>
            ))}
          </section>
        )}

        {proposti.length > 0 && (
          <BloccoGruppo titolo={<TitoloSezione testo="Proposti da me" contatore={String(proposti.length)} />}>
            {proposti.map((p) => {
              const legata = legataA(p, ingredientiEsistenti);
              const formato = Number.isFinite(p.formatoConfezione) ? numeroInTesto(p.formatoConfezione) : '—';
              return (
                <RigaImpostazione
                  key={p.alimento}
                  nome={p.nome || p.alimento}
                  nota={legata ? `Usa «${legata.nome}»` : `${nomeAreaFrase(p.area)}${p.deperibile ? ' · fresco' : ''}`}
                  etichetta={`Apri ${p.nome || p.alimento}`}
                  finale={{ tipo: 'valore', valore: legata ? '' : `${formato} ${p.unitaBase}`, onApri: () => setSchedaAperta(p.alimento) }}
                />
              );
            })}
          </BloccoGruppo>
        )}
      </div>

      <Dock>
        <button type="button" className="dock-primario" disabled={bloccato} onClick={() => onStato(daSalvare('riepilogo'))}>
          VAI AL RIEPILOGO
        </button>
      </Dock>

      {aperta && (
        <FoglioDalBasso etichetta={aperta.nome || aperta.alimento} onChiudi={() => { setSelettore(null); setSchedaAperta(null); }}>
          <TestataFoglio onChiudi={() => { setSelettore(null); setSchedaAperta(null); }} etichettaChiudi="Chiudi la scheda" />
          <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 26px' }}>
            {scheda(aperta, true)}
          </div>
        </FoglioDalBasso>
      )}
    </div>
  );
}
