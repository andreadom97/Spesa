'use client';

import { useEffect, useState } from 'react';
import type { Dish, Ingredient } from '@/domain/types';
import type { DecisioneCambio, IngredienteProposto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { SCELTA_NUOVO } from '@/domain/import/types';
import {
  calcolaProposte, cambiDiretti, cambiUnita, diRipiego, esempioPiatto, esempioRiga, legataA, motiviBlocco, nomeProposto,
  pesiProposte, sceltiIniziali, sezioniIniziali, valoreRipiego, type CambioUnita, type PesoProposta,
} from '@/domain/import/ingredienti';
import { nomeAreaFrase } from '@/domain/aree';
import { BloccoGruppo } from '@/components/pannello/pezzi';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { Dock } from '@/components/Dock';
import { SchedaIngrediente, numeroInTesto, type CampoSelettore } from './SchedaIngrediente';
import { SchedaCambio, type EsempioCambio } from './SchedaCambio';
import { TitoloSezione, plurale } from './sezione';
import { useLivelliImporta } from './livelli';

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  ingredientiEsistenti: Ingredient[];
  /** I piatti attivi: l'esempio della Scheda del cambio («Pasta e zucchine»: 2 pz, quindi 400 g). */
  repertorio?: Dish[];
  onStato: (s: StatoRevisione) => void;
}

/** La Scheda, bianca, raggio 22, bordo, padding 16 (DESIGN.md §8 Scheda). */
const STILE_SCHEDA = { background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, padding: 16 } as const;

/** L'Etichetta di sezione sopra le Schede aperte (DESIGN.md §8), come il titolo di un Blocco di gruppo. */
const STILE_TITOLO_SEZIONE = {
  margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--ink)',
};

/**
 * La frase d'apertura. `cambi`: gli ingredienti che hai che passano all'unità della dieta;
 * `soloPeso`: quelli che restano nella loro unità ma aspettano il peso di un pezzo (`da === a`).
 */
function frase(nuovi: number, ripieghi: number, cambi: number, soloPeso: number): string {
  if (nuovi === 0) {
    if (cambi > 0) {
      return `Tutti gli ingredienti del piano abbinano già qualcosa che hai; ${cambi === 1 ? 'uno passa' : `${cambi} passano`} all'unità della dieta: controlla.`;
    }
    if (soloPeso > 0) {
      return `Tutti gli ingredienti del piano abbinano già qualcosa che hai; per ${soloPeso === 1 ? 'uno' : soloPeso} mi serve il peso di un pezzo.`;
    }
    return 'Tutti gli ingredienti del piano abbinano già qualcosa che hai: niente da rivedere qui.';
  }
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
 * Il peso di una proposta nuova con righe in g e in pz (ruling 8c, Task 8) nella forma di un
 * cambio con `da === a`: la Scheda del cambio mostra solo il campo del peso, e la decisione si
 * salva con la chiave `alimento` (la proposta non ha un id).
 */
function cambioDelPeso(p: IngredienteProposto, peso: PesoProposta): CambioUnita | null {
  if (p.unitaBase !== 'g' && p.unitaBase !== 'pz') return null;
  return {
    ingredientId: p.alimento, nome: p.nome || p.alimento, da: p.unitaBase, a: p.unitaBase, alimenti: [p.alimento],
    pesoPezzo: peso.pesoPezzo, pesoDaTabella: peso.pesoDaTabella, tieni: false,
  };
}

/**
 * Ingredienti (spec 8b §F, 8c §A.3, §G), il passo 3 di Importa. Le proposte si calcolano
 * all'ingresso e si salvano subito con `onStato`, così un refresh non perde il calcolo; da lì lo
 * stato locale è la fonte di verità finché non si esce dal passo (VAI AL RIEPILOGO o l'indietro),
 * che salva proposte, scelte (`scelti`) e decisioni sui cambi di unità (`cambiUnita`).
 *
 * `scelti` (`alimento → id`, o `SCELTA_NUOVO`) dice le scelte in «È lo stesso di…». All'ingresso
 * viene dalla bozza; per una bozza di prima dell'8c si ricostruisce dai nomi. Rinominare toglie la
 * scelta di un ingrediente che hai, non la scelta «nuovo».
 *
 * I cambi di unità diretti (un alimento della dieta che finisce su un ingrediente che hai con
 * un'altra unità) hanno la loro Scheda: in «Da sistemare» se manca il peso di un pezzo, in «Da
 * controllare» altrimenti. Un diretto con `da === a` (l'unità resta, alcune righe si convertono)
 * ha la Scheda solo se manca il peso. Il peso di una proposta nuova con righe in g e in pz si
 * scrive nella sua Scheda e si salva in `cambiUnita[alimento]`. Le sezioni si decidono
 * all'ingresso, coi cambi e i pesi, e non cambiano sotto il dito.
 */
export function Ingredienti({ piano, stato, ingredientiEsistenti, repertorio = [], onStato }: Props) {
  const [ingredienti, setIngredienti] = useState<IngredienteProposto[]>(() => calcolaProposte(piano, stato, ingredientiEsistenti));
  const [scelti, setScelti] = useState<Record<string, string>>(() => stato.scelti ?? sceltiIniziali(ingredienti, ingredientiEsistenti));
  const [decisioni, setDecisioni] = useState<Record<string, DecisioneCambio>>(() => stato.cambiUnita ?? {});
  const [{ sezioni, sezioniCambi }] = useState(() => {
    const iniziale: StatoRevisione = { ...stato, ingredientiNuovi: ingredienti, scelti, cambiUnita: decisioni };
    const cambi = cambiUnita(piano, iniziale, ingredientiEsistenti);
    const pesi = pesiProposte(piano, iniziale, ingredientiEsistenti);
    const diretti = cambiDiretti(cambi, ingredienti);
    return {
      sezioni: sezioniIniziali(ingredienti, ingredientiEsistenti, scelti, cambi, pesi),
      sezioniCambi: {
        daSistemare: diretti.filter((c) => c.pesoPezzo === null).map((c) => c.ingredientId),
        daControllare: diretti.filter((c) => c.pesoPezzo !== null && c.da !== c.a).map((c) => c.ingredientId),
      },
    };
  });
  const [schedaAperta, setSchedaAperta] = useState<string | null>(null);
  // `inFoglio`: la stessa proposta può essere resa due volte (in «Da sistemare» e nel foglio), e
  // ogni istanza apre solo il suo selettore.
  const [selettore, setSelettore] = useState<{ alimento: string; campo: CampoSelettore; inFoglio: boolean } | null>(null);

  /** Lo stato da salvare uscendo dal passo, avanti o indietro. */
  function daSalvare(passo: StatoRevisione['passo']): StatoRevisione {
    return { ...stato, ingredientiNuovi: ingredienti, scelti, cambiUnita: decisioni, passo };
  }

  useEffect(() => {
    onStato({ ...stato, ingredientiNuovi: ingredienti, scelti });
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
    if ('nome' in cambio) setScelti((prima) => (prima[alimento] === SCELTA_NUOVO ? prima : senza(prima, alimento)));
  }

  function scegliStesso(p: IngredienteProposto, id: string | null) {
    if (id === null) {
      // «No, è nuovo» (spec 8c §G): il nome della dieta con gli accenti, e la scelta resta.
      aggiorna(p.alimento, { nome: nomeProposto(piano, stato, p.alimento, p.unitaBase) });
      setScelti((prima) => ({ ...prima, [p.alimento]: SCELTA_NUOVO }));
      return;
    }
    const esistente = ingredientiEsistenti.find((e) => e.id === id);
    if (!esistente) return;
    aggiorna(p.alimento, { nome: esistente.nome });
    setScelti((prima) => ({ ...prima, [p.alimento]: esistente.id }));
  }

  /** `chiave`: l'id dell'ingrediente che hai, o l'`alimento` di una proposta nuova (solo il peso). */
  function decidi(chiave: string, cambio: Partial<DecisioneCambio>) {
    setDecisioni((prima) => ({
      ...prima,
      [chiave]: { tieni: prima[chiave]?.tieni ?? false, pesoPezzo: prima[chiave]?.pesoPezzo ?? null, ...cambio },
    }));
  }

  const statoVivo: StatoRevisione = { ...stato, ingredientiNuovi: ingredienti, scelti, cambiUnita: decisioni };
  const cambi = cambiUnita(piano, statoVivo, ingredientiEsistenti);
  const pesi = pesiProposte(piano, statoVivo, ingredientiEsistenti);
  const diretti = cambiDiretti(cambi, ingredienti);
  const motivi = motiviBlocco(ingredienti, ingredientiEsistenti, scelti, cambi, pesi);
  // Chi comincia a bloccare mentre sta in «Proposti da me» entra in «Da sistemare» e ci resta,
  // anche dopo la correzione. Aggiustamento durante il render, come in `CampoConSalva`.
  const [entrati, setEntrati] = useState<string[]>([]);
  const nuoviBloccati = [...motivi.keys()].filter(
    (a) => !sezioni.daSistemare.includes(a) && !sezioni.daControllare.includes(a) && !entrati.includes(a),
  );
  if (nuoviBloccati.length > 0) setEntrati([...entrati, ...nuoviBloccati]);
  const inDaSistemare = new Set([...sezioni.daSistemare, ...entrati, ...nuoviBloccati]);
  const daSistemare = ingredienti.filter((p) => inDaSistemare.has(p.alimento));
  const daControllare = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && sezioni.daControllare.includes(p.alimento));
  const proposti = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && !sezioni.daControllare.includes(p.alimento));
  const cambiDaSistemare = diretti.filter((c) => sezioniCambi.daSistemare.includes(c.ingredientId));
  const cambiDaControllare = diretti.filter((c) => sezioniCambi.daControllare.includes(c.ingredientId));
  // Il contatore conta TUTTO quello che blocca, anche fuori sezione: «Fatto» col Dock spento sarebbe falso.
  const ancoraBloccate = motivi.size + diretti.filter((c) => c.pesoPezzo === null).length;
  const libere = ingredienti.filter((p) => !legataA(p, ingredientiEsistenti, scelti));
  const ripieghi = libere.filter(diRipiego).length;
  const bloccato = ancoraBloccate > 0;
  const cambiVeri = diretti.filter((c) => c.da !== c.a).length;
  const soloPeso = cambiDaSistemare.filter((c) => c.da === c.a).length;

  function esempioDi(c: CambioUnita): EsempioCambio {
    return { piatto: esempioPiatto(c.ingredientId, c.da, repertorio), riga: esempioRiga(piano, statoVivo, c.alimenti) };
  }

  function schedaCambio(c: CambioUnita) {
    return (
      <section key={c.ingredientId} aria-label={c.nome} style={STILE_SCHEDA}>
        <SchedaCambio cambio={c} esempio={esempioDi(c)} conTestata onDecisione={(d) => decidi(c.ingredientId, d)} />
      </section>
    );
  }

  function scheda(p: IngredienteProposto, inFoglio: boolean, notaRipiego?: string) {
    const peso = pesi.find((x) => x.alimento === p.alimento);
    const cambio = cambi.find((c) => c.alimenti.includes(p.alimento)) ?? (peso ? cambioDelPeso(p, peso) : null);
    return (
      <SchedaIngrediente
        proposta={p}
        esistenti={ingredientiEsistenti}
        scelta={scelti[p.alimento]}
        avvisi={motivi.get(p.alimento) ?? []}
        notaRipiego={notaRipiego}
        cambio={cambio}
        esempioCambio={cambio ? esempioDi(cambio) : { piatto: null, riga: null }}
        onCambia={(c) => cambia(p.alimento, c)}
        onStesso={(id) => scegliStesso(p, id)}
        onDecisione={(d) => { if (cambio) decidi(cambio.ingredientId, d); }}
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
        <p style={{ margin: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{frase(libere.length, ripieghi, cambiVeri, soloPeso)}</p>

        {(daSistemare.length > 0 || cambiDaSistemare.length > 0) && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={STILE_TITOLO_SEZIONE}>
              <TitoloSezione testo="Da sistemare" contatore={ancoraBloccate === 0 ? 'Fatto' : String(ancoraBloccate)} />
            </h3>
            {daSistemare.map((p) => (
              <section key={p.alimento} aria-label={p.nome || p.alimento} style={STILE_SCHEDA}>{scheda(p, false)}</section>
            ))}
            {cambiDaSistemare.map(schedaCambio)}
          </section>
        )}

        {(daControllare.length > 0 || cambiDaControllare.length > 0) && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={STILE_TITOLO_SEZIONE}>
              <TitoloSezione testo="Da controllare" contatore={String(daControllare.length + cambiDaControllare.length)} />
            </h3>
            {daControllare.map((p) => (
              <section key={p.alimento} aria-label={p.nome || p.alimento} style={STILE_SCHEDA}>
                {scheda(p, false, `Non è nella mia tabella dei formati: ${valoreRipiego(p)} è un valore di ripiego.`)}
              </section>
            ))}
            {cambiDaControllare.map(schedaCambio)}
          </section>
        )}

        {proposti.length > 0 && (
          <BloccoGruppo titolo={<TitoloSezione testo="Proposti da me" contatore={String(proposti.length)} />}>
            {proposti.map((p) => {
              const legata = legataA(p, ingredientiEsistenti, scelti);
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
