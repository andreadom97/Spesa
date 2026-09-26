'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { Dish, MealSlotDef } from '@/domain/types';
import { MAX_PASTI, MIN_PASTI } from '@/domain/pasti';
import { leggiRepertorio } from '@/data/repertorio';
import { MessaggioErrore } from '@/components/controlli';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import {
  AvvisoCasaCambiata, ERRORE_SALVATAGGIO, IconaCroce, IconaFreccia, Nota, STILE_BLOCCO, TondoIcona,
} from './pezzi';

const ASSENZE_VUOTE = [false, false, false, false, false, false, false];
// La nota di oggi, con «nel Piano» al posto di «nella Settimana» (§I).
const NOTA_GESTIONE = 'Da tre a sei pasti, nell’ordine in cui li fai. I giorni segnati qui vengono già spenti quando si apre una settimana nuova: nel Piano correggi solo le eccezioni — le settimane già create non cambiano.';

/** Reindicizza `posizione` sull'ordine dell'array: a ogni aggiunta, rimozione o riordino. */
function conPosizioni(lista: MealSlotDef[]): MealSlotDef[] {
  return lista.map((p, i) => ({ ...p, posizione: i }));
}

/**
 * Quanti piatti attivi ha ogni pasto. `leggiRepertorio` restituisce solo i
 * piatti attivi: quelli disattivati se ne vanno a cascata anche loro, ma
 * l'utente non li vede e non si contano (§C.2).
 */
export function contaPerPasto(piatti: Dish[]): Map<string, number> {
  const conta = new Map<string, number>();
  for (const p of piatti) conta.set(p.slotDefId, (conta.get(p.slotDefId) ?? 0) + 1);
  return conta;
}

/** Il testo del dialogo `rimuovi-pasto` (§D). */
export function testoRimuoviPasto(n: number): string {
  return n === 1
    ? 'Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.'
    : `Se ne vanno anche i suoi ${n} piatti, e il pasto sparisce dal piano. Non si può annullare.`;
}

/**
 * Gestione dei pasti (§C.2, frame 06–07): nome, ordine, aggiunta e rimozione,
 * da MIN_PASTI a MAX_PASTI. Ogni gesto salva l'insieme intero con `salvaPasti`
 * (che riscrive con `salvaSlotDefs`, cancellando solo i pasti tolti a schermo:
 * review finale I4). Togliere un pasto cancella a cascata i
 * suoi piatti e le sue righe del piano (0001_schema.sql): con piatti chiede il
 * dialogo, senza si toglie al tocco (decisione 12).
 */
export function GestionePasti() {
  return <StatoDatiPannello>{(dati) => <ElencoPasti defs={dati.slotDefs} />}</StatoDatiPannello>;
}

function ElencoPasti({ defs }: { defs: MealSlotDef[] }) {
  const { mostraDialogo } = usePannello();
  const { salvaPasti, casaCambiata } = useDatiPannello();
  const [bozze, setBozze] = useState<Record<string, string>>({});
  const [inVolo, setInVolo] = useState<string | null>(null);
  const [errore, setErrore] = useState(false);
  // null = il repertorio non è (ancora) letto: la ✕ lo rilegge al tocco.
  const [piatti, setPiatti] = useState<Map<string, number> | null>(null);
  // Dopo un rifiuto RLS i pasti a schermo sono quelli di un'altra casa, riletti in silenzio senza
  // smontare questa sotto-schermata: il conteggio letto al montaggio non conosce i loro id, e
  // un pasto con piatti varrebbe 0 e si toglierebbe al tocco. Si scarta, e la ✕ rilegge.
  // Aggiustato durante il render, non in un effetto.
  const [casaVista, setCasaVista] = useState(casaCambiata);
  if (casaCambiata !== casaVista) {
    setCasaVista(casaCambiata);
    if (casaCambiata) setPiatti(null);
  }
  const daMettereAFuoco = useRef<string | null>(null);
  // I pasti dell'ultimo render: la rimozione che aspetta (la rilettura del repertorio, il
  // dialogo) parte da questi, non da quelli del tocco, così non riscrive un gesto fatto nel
  // frattempo né un ritorno ai dati del server dopo un salvataggio fallito.
  //
  // `ultimi` e `generazione` si aggiornano in un effetto di layout, non in `useEffect`: gli
  // effetti passivi di un render nato da una promessa (la ricarica dopo un rifiuto RLS) partono
  // in un task dopo il commit, e una lettura del repertorio che risponde in quella finestra
  // (un microtask) troverebbe la generazione di prima e i pasti ottimistici della casa di prima:
  // la rimozione andrebbe avanti e riscriverebbe quei pasti nella casa nuova, cancellando senza
  // dialogo un suo pasto coi suoi piatti (visto il 26/09, CI della PR #9). L'effetto di layout
  // gira dentro il commit, prima di qualunque microtask: la finestra non c'è.
  const ultimi = useRef(defs);
  useLayoutEffect(() => {
    ultimi.current = defs;
  }, [defs]);

  // La generazione della casa: sale quando `casaCambiata` diventa vero. Una lettura del
  // repertorio partita prima (al montaggio, o dalla ✕) e arrivata dopo è della casa di prima:
  // non rimette il conteggio appena scartato (review del Task 8, minor 2).
  const generazione = useRef(0);
  useLayoutEffect(() => {
    if (casaCambiata) generazione.current += 1;
  }, [casaCambiata]);
  // Una rimozione alla volta (review del Task 8, minor 1): vedi `rimuovi`.
  const rimozioneInCorso = useRef(false);

  // Di layout, non passivo: la sotto-schermata si monta in un render nato da una promessa (i dati
  // del pannello), e un useEffect partirebbe in un task dopo il commit. Una ✕ toccata in quel
  // frattempo farebbe lei la prima lettura, e questa partirebbe dopo: era la causa del test
  // intermittente «la ✕ lo rilegge e poi decide». Così la lettura parte col commit delle righe.
  useLayoutEffect(() => {
    let vivo = true;
    const mia = generazione.current;
    leggiRepertorio()
      .then((r) => {
        if (vivo && generazione.current === mia) setPiatti(contaPerPasto(r));
      })
      .catch((e) => console.error('gestione pasti: lettura del repertorio fallita.', e));
    return () => {
      vivo = false;
    };
  }, []);

  const alMinimo = defs.length <= MIN_PASTI;
  const alMassimo = defs.length >= MAX_PASTI;

  async function salva(nuovi: MealSlotDef[], riga: string): Promise<boolean> {
    setErrore(false);
    setInVolo(riga);
    const ok = await salvaPasti(nuovi);
    setInVolo(null);
    if (!ok) setErrore(true);
    return ok;
  }

  function sposta(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= defs.length) return;
    const copia = [...defs];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    void salva(conPosizioni(copia), defs[i].id);
  }

  function aggiungi() {
    if (alMassimo) return;
    const nuovo: MealSlotDef = { id: crypto.randomUUID(), nome: 'Nuovo pasto', posizione: defs.length, assenzeAbituali: [...ASSENZE_VUOTE] };
    daMettereAFuoco.current = nuovo.id;
    void salva(conPosizioni([...defs, nuovo]), nuovo.id);
  }

  function confermaNome(d: MealSlotDef) {
    const bozza = bozze[d.id];
    if (bozza === undefined) return;
    const nome = bozza.trim() || 'Pasto';
    setBozze((b) => {
      const copia = { ...b };
      delete copia[d.id];
      return copia;
    });
    if (nome !== d.nome) void salva(defs.map((p) => (p.id === d.id ? { ...p, nome } : p)), d.id);
  }

  /**
   * Una rimozione alla volta: una seconda ✕ mentre la prima non ha finito (rilettura del
   * repertorio e salvataggio) si ignora. Con due riletture in volo le due continuazioni
   * ripartono nello stesso giro, prima che React ridisegni: la seconda leggerebbe in `ultimi` i
   * pasti di prima della prima rimozione e riscriverebbe il pasto appena cancellato, vuoto (i
   * suoi piatti se ne sono andati a cascata). Un ref e non le ✕ spente: il ref chiude la
   * finestra subito, senza aspettare un render, e le ✕ non lampeggiano in `--icona-spenta`, che
   * nel disegno vuol dire «al minimo». Col dialogo la guardia si libera appena il dialogo è
   * aperto: da lì il velo copre il pannello finché la conferma non ha finito o si annulla.
   */
  async function rimuovi(d: MealSlotDef) {
    if (alMinimo || rimozioneInCorso.current) return;
    rimozioneInCorso.current = true;
    try {
      await decidiRimozione(d);
    } finally {
      rimozioneInCorso.current = false;
    }
  }

  async function decidiRimozione(d: MealSlotDef) {
    setErrore(false);
    let conta = piatti;
    if (conta === null) {
      // Senza sapere se il pasto ha piatti non si toglie niente: si rilegge ora.
      setInVolo(d.id);
      const mia = generazione.current;
      try {
        conta = contaPerPasto(await leggiRepertorio());
        if (generazione.current !== mia) {
          // La casa è cambiata durante la lettura: il conteggio e il pasto sono della casa di prima.
          setInVolo(null);
          return;
        }
        setPiatti(conta);
      } catch (e) {
        console.error('gestione pasti: lettura del repertorio fallita.', e);
        setInVolo(null);
        setErrore(true);
        return;
      }
      setInVolo(null);
    }
    const n = conta.get(d.id) ?? 0;
    /**
     * I pasti senza `d`, dagli ultimi a schermo; null se `d` non c'è più (tolto o tornato ai
     * dati del server nel frattempo) o se toglierlo scenderebbe sotto il minimo.
     */
    const senza = (): MealSlotDef[] | null => {
      const adesso = ultimi.current;
      if (!adesso.some((p) => p.id === d.id) || adesso.length <= MIN_PASTI) return null;
      return conPosizioni(adesso.filter((p) => p.id !== d.id));
    };
    if (n === 0) {
      const nuovi = senza();
      if (nuovi) await salva(nuovi, d.id);
      return;
    }
    mostraDialogo({
      titolo: `Togliere ${d.nome}?`,
      testo: testoRimuoviPasto(n),
      azione: 'TOGLI',
      tono: 'distruttivo',
      erroreTesto: ERRORE_SALVATAGGIO,
      onConferma: async () => {
        const nuovi = senza();
        // Il pasto non c'è più, o è rimasto al minimo: niente da togliere, il dialogo si chiude.
        if (!nuovi) return;
        if (!(await salvaPasti(nuovi))) throw new Error('rimuovi pasto: salvataggio fallito');
        setPiatti((m) => {
          if (!m) return m;
          const copia = new Map(m);
          copia.delete(d.id);
          return copia;
        });
      },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 2px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em' }}>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>I TUOI PASTI</span>
          <span style={{ fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>{`${defs.length} DI ${MAX_PASTI}`}</span>
        </div>
        {defs.map((d, i) => {
          const primo = i === 0;
          const ultimo = i === defs.length - 1;
          return (
            <div key={d.id} data-testid={`riga-pasto-${d.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: inVolo === d.id ? 0.5 : 1 }}>
              <input
                type="text"
                aria-label="Nome del pasto"
                value={bozze[d.id] ?? d.nome}
                onChange={(e) => setBozze((b) => ({ ...b, [d.id]: e.target.value }))}
                onBlur={() => confermaNome(d)}
                ref={(el) => {
                  if (el && daMettereAFuoco.current === d.id) {
                    daMettereAFuoco.current = null;
                    el.focus();
                    el.select();
                  }
                }}
                style={{
                  flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
                  background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: 'var(--ink)', outline: 'none',
                }}
              />
              <span style={{ display: 'flex', gap: 4, flex: 'none' }}>
                <TondoIcona etichetta={`Sposta ${d.nome} in alto`} spento={primo} onClick={() => sposta(i, -1)}>
                  <IconaFreccia verso="su" spenta={primo} />
                </TondoIcona>
                <TondoIcona etichetta={`Sposta ${d.nome} in basso`} spento={ultimo} onClick={() => sposta(i, 1)}>
                  <IconaFreccia verso="giu" spenta={ultimo} />
                </TondoIcona>
                <TondoIcona etichetta={`Rimuovi ${d.nome}`} spento={alMinimo} onClick={() => void rimuovi(d)}>
                  <IconaCroce spenta={alMinimo} />
                </TondoIcona>
              </span>
            </div>
          );
        })}
        {alMinimo && <Nota>Tre pasti sono il minimo.</Nota>}
        {alMassimo ? (
          <Nota>Sei pasti sono il massimo.</Nota>
        ) : (
          <button
            type="button"
            onClick={aggiungi}
            style={{
              height: 56, marginTop: 4, boxSizing: 'border-box', borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)',
              background: 'none', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            AGGIUNGI PASTO
          </button>
        )}
      </section>
      {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
      <p style={{ margin: 0, padding: '0 8px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>{NOTA_GESTIONE}</p>
    </div>
  );
}
