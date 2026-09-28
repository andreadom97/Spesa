'use client';

import { useEffect, useState } from 'react';
import type { Ingredient } from '@/domain/types';
import type { IngredienteProposto, PianoEstratto, StatoRevisione } from '@/domain/import/types';
import {
  calcolaProposte, diRipiego, legataA, nomiDoppi, passoBloccato, sezioniIniziali, valoreRipiego,
} from '@/domain/import/ingredienti';
import { nomeAreaFrase } from '@/domain/aree';
import { BloccoGruppo } from '@/components/pannello/pezzi';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { Dock } from '@/components/Dock';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { SchedaIngrediente, type CampoSelettore } from './SchedaIngrediente';
import { TitoloSezione, plurale } from './sezione';

interface Props {
  piano: PianoEstratto;
  stato: StatoRevisione;
  ingredientiEsistenti: Ingredient[];
  onStato: (s: StatoRevisione) => void;
}

/** La Scheda, bianca, raggio 22, bordo, padding 16 (DESIGN.md §8 Scheda). */
const STILE_SCHEDA = { background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, padding: 16 } as const;

function frase(nuovi: number, ripieghi: number): string {
  if (nuovi === 0) return 'Tutti gli ingredienti del piano abbinano già qualcosa che hai: niente da rivedere qui.';
  const quanti = plurale(nuovi, 'ingrediente nuovo', 'ingredienti nuovi');
  if (ripieghi === 0) return nuovi === 1 ? `${quanti}. L'ho proposto io: toccalo se non torna.` : `${quanti}. Li ho proposti io: tocca quello che non torna.`;
  return `${quanti}. Ne conosco ${nuovi - ripieghi}; per ${ripieghi} ho messo valori prudenti: controllali.`;
}

/**
 * Ingredienti (spec 8b §F), il passo 3 di Importa. Le proposte si calcolano all'ingresso e si
 * salvano subito con `onStato`, così un refresh non perde il calcolo; da lì lo stato locale è
 * la fonte di verità finché non si preme VAI AL RIEPILOGO. Le sezioni si decidono all'ingresso
 * e non cambiano sotto il dito; l'unica eccezione è una proposta che diventa un nome doppio
 * mentre si è nel passo, che entra in «Da sistemare».
 */
export function Ingredienti({ piano, stato, ingredientiEsistenti, onStato }: Props) {
  const [ingredienti, setIngredienti] = useState<IngredienteProposto[]>(() => calcolaProposte(piano, stato, ingredientiEsistenti));
  const [sezioni] = useState(() => sezioniIniziali(ingredienti, ingredientiEsistenti));
  const [schedaAperta, setSchedaAperta] = useState<string | null>(null);
  const [selettore, setSelettore] = useState<{ alimento: string; campo: CampoSelettore } | null>(null);

  useEffect(() => {
    onStato({ ...stato, ingredientiNuovi: ingredienti });
    // Una volta sola, all'ingresso nel passo: come Formati prima di lui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un solo indietro per la schermata: prima il selettore, poi la scheda nel foglio.
  useIndietroFogli((schedaAperta ? 1 : 0) + (selettore ? 1 : 0), () => {
    if (selettore) setSelettore(null);
    else setSchedaAperta(null);
  });

  function cambia(alimento: string, cambio: Partial<IngredienteProposto>) {
    setIngredienti((prima) => prima.map((p) => (p.alimento === alimento ? { ...p, ...cambio } : p)));
  }

  const doppi = nomiDoppi(ingredienti, ingredientiEsistenti);
  // Chi diventa doppio mentre si è nel passo entra in «Da sistemare» e ci resta, anche dopo la
  // correzione: la sezione non cambia sotto il dito. Aggiustamento durante il render, come in
  // `CampoConSalva`, non un effetto.
  const [entrati, setEntrati] = useState<string[]>([]);
  const nuoviDoppi = [...doppi].filter((a) => !sezioni.daSistemare.includes(a) && !entrati.includes(a));
  if (nuoviDoppi.length > 0) setEntrati([...entrati, ...nuoviDoppi]);
  const inDaSistemare = new Set([...sezioni.daSistemare, ...entrati, ...doppi]);
  const daSistemare = ingredienti.filter((p) => inDaSistemare.has(p.alimento));
  const daControllare = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && sezioni.daControllare.includes(p.alimento));
  const proposti = ingredienti.filter((p) => !inDaSistemare.has(p.alimento) && !sezioni.daControllare.includes(p.alimento));
  const libere = ingredienti.filter((p) => !legataA(p, ingredientiEsistenti));
  const ripieghi = libere.filter(diRipiego).length;
  const bloccato = passoBloccato(ingredienti, ingredientiEsistenti);

  function scheda(p: IngredienteProposto, inFoglio: boolean, notaRipiego?: string) {
    return (
      <SchedaIngrediente
        proposta={p}
        esistenti={ingredientiEsistenti}
        doppio={doppi.has(p.alimento)}
        notaRipiego={notaRipiego}
        onCambia={(cambio) => cambia(p.alimento, cambio)}
        selettore={selettore?.alimento === p.alimento ? selettore.campo : null}
        onApriSelettore={(campo) => setSelettore({ alimento: p.alimento, campo })}
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
            <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
              <TitoloSezione testo="Da sistemare" contatore={doppi.size === 0 ? 'Fatto' : String(doppi.size)} />
            </h3>
            {daSistemare.map((p) => (
              <section key={p.alimento} aria-label={p.nome || p.alimento} style={STILE_SCHEDA}>{scheda(p, false)}</section>
            ))}
          </section>
        )}

        {daControllare.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
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
              return (
                <RigaImpostazione
                  key={p.alimento}
                  nome={p.nome || p.alimento}
                  nota={legata ? `Usa «${legata.nome}»` : `${nomeAreaFrase(p.area)}${p.deperibile ? ' · fresco' : ''}`}
                  etichetta={`Apri ${p.nome || p.alimento}`}
                  finale={{ tipo: 'valore', valore: legata ? '' : `${p.formatoConfezione} ${p.unitaBase}`, onApri: () => setSchedaAperta(p.alimento) }}
                />
              );
            })}
          </BloccoGruppo>
        )}
      </div>

      <Dock>
        <button type="button" className="dock-primario" disabled={bloccato} onClick={() => onStato({ ...stato, ingredientiNuovi: ingredienti, passo: 'riepilogo' })}>
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
