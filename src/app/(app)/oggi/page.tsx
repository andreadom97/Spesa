'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, PantryState } from '@/domain/types';
import type { SettimanaCorrente } from '@/data/settimana';
import { lunediDi, sommaGiorni } from '@/domain/date';
import { avvisiScadenza, etichettaScadenza } from '@/domain/scadenza';
import { porzioniUtilizzabili } from '@/domain/pronti';
import { trovaIcona } from '@/domain/icone-ingredienti';
import {
  alternative, caselleGiornata, daFare, dispensaAggiornata, inScadenzaEntro, ingredientePrincipale,
  oggiLocale, pastoDopo, prossimoPasto, type PastoScelto, type Prossimo,
} from '@/domain/oggi';
import {
  etichettaPoi, etichettaPoster, etichettaUso, pillolaPronti, sottotitoloPoster, testoScongela,
} from '@/domain/oggi-testi';
import { aggiornaSlot, leggiSettimana } from '@/data/settimana';
import { apriSettimanaCorrente } from '@/data/apertura';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiPronti } from '@/data/pronti';
import { leggiDispensa, leggiUltimaChiusura } from '@/data/dispensa';
import { Testata } from '@/components/Testata';
import { FoglioAzioniPasto } from '@/components/FoglioAzioniPasto';
import { MessaggioErrore, STILE_PILLOLA, TastoSecondario } from '@/components/controlli';
import { Carico } from '@/components/pannello/pezzi';
import { Poster, PosterVuoto, type IconaPiatto } from './Poster';
import { Alternative } from './Alternative';
import { TesseraBianca, TesseraDispensaFerma, TesseraPiena } from './TesseraOggi';
import { dimenticaPianoPrima, leggiPianoPrima, salvaPianoPrima, type PianoPrima } from './piano-prima';

/** Quello che si legge dal server in un colpo solo. */
interface Letti {
  oggi: string;
  minuti: number;
  settimana: SettimanaCorrente;
  /** La settimana che contiene domani: la stessa, un'altra, o null se non è stata creata. */
  settimanaDomani: SettimanaCorrente | null;
  defs: MealSlotDef[];
  dishes: Dish[];
  ingredients: Ingredient[];
  persone: number;
  lotti: LottoPronto[];
  pantry: PantryState[];
  ultimaChiusura: string | null;
}

interface Dati extends Letti {
  /** Il piatto che il pasto del poster aveva prima dello scambio fatto da Oggi (spec §C.6), se c'è. */
  pianoPrima: PianoPrima | null;
}

/** Una lettura che non deve bloccare la home: se fallisce vale `ripiego` (come la dispensa nel Piano). */
function tollera<T>(ripiego: T, cosa: string) {
  return (errore: unknown): T => {
    console.error(`oggi: lettura ${cosa} fallita.`, errore);
    return ripiego;
  };
}

async function caricaDati(): Promise<Letti> {
  const { data: oggi, minuti } = oggiLocale(new Date());
  const settimana = await apriSettimanaCorrente(oggi);
  const domani = sommaGiorni(oggi, 1);
  const settimanaDomani = lunediDi(domani) === settimana.dataInizio ? settimana : await leggiSettimana(lunediDi(domani));
  const [defs, dishes, ingredients, impostazioni, lotti, pantry, ultimaChiusura] = await Promise.all([
    leggiSlotDefs(),
    leggiRepertorio(),
    leggiIngredienti(),
    leggiImpostazioni(),
    leggiPronti().catch(tollera<LottoPronto[]>([], 'dei Pronti')),
    leggiDispensa().catch(tollera<PantryState[]>([], 'della dispensa')),
    leggiUltimaChiusura().catch(tollera<string | null>(null, "dell'ultima chiusura")),
  ]);
  return {
    oggi, minuti, settimana, settimanaDomani, defs, dishes, ingredients,
    persone: impostazioni.moltiplicatorePorzioni, lotti, pantry, ultimaChiusura,
  };
}

/**
 * I pasti di oggi e di domani e il pasto del poster. Un pasto il cui piatto non è più nel
 * repertorio (eliminato con `attivo = false`: il Piano lo mostra senza piatto) vale come un
 * pasto senza piatto, e il poster lo salta: niente titolo vuoto.
 */
function giornata(d: Letti) {
  const domani = sommaGiorni(d.oggi, 1);
  const noti = new Set(d.dishes.map((x) => x.id));
  const senzaPiattiSpariti = (slots: MealSlot[]) =>
    slots.map((s) => (s.dishId !== null && !noti.has(s.dishId) ? { ...s, dishId: null } : s));
  const slotsOggi = senzaPiattiSpariti(d.settimana.slots.filter((s) => s.data === d.oggi));
  const slotsDomani = d.settimanaDomani
    ? senzaPiattiSpariti(d.settimanaDomani.slots.filter((s) => s.data === domani))
    : null;
  const prossimo = prossimoPasto({ slotsOggi, slotsDomani, defs: d.defs, minuti: d.minuti });
  return { slotsOggi, slotsDomani, prossimo };
}

/**
 * L'annotazione dell'annullo per il pasto del poster (spec §C.6). Si legge e si pulisce qui, alla
 * lettura dei dati, e non nel render: l'annotazione di un altro pasto si cancella da sé (il poster
 * è passato oltre), e quella che descrive già il piatto in programma non serve più.
 */
function pianoPrimaDi(prossimo: Prossimo): PianoPrima | null {
  if (prossimo.tipo !== 'pasto') return null;
  const prima = leggiPianoPrima(prossimo.slot.id);
  if (prima && prima.dishId === prossimo.slot.dishId) {
    dimenticaPianoPrima();
    return null;
  }
  return prima;
}

/** L'icona di un ingrediente (tessere «Scade» e «Scongela»): la stessa ricerca per nome dell'icona del piatto. */
function iconaIngrediente(ingrediente: Ingredient): IconaPiatto | null {
  const chiave = trovaIcona(ingrediente.nome);
  return chiave ? { chiave, area: ingrediente.area } : null;
}

type Patch = Parameters<typeof aggiornaSlot>[1];
/** Una tessera della griglia: la chiave, e come si disegna (`larga` = la dispari in coda, spec §D). */
interface Tessera { chiave: string; mostra: (larga: boolean) => ReactNode }

const ERRORE_SCAMBIO = 'Non siamo riusciti a scambiare il piatto. Riprova.';
const ERRORE_AZIONE = 'Non siamo riusciti a salvare il cambiamento. Riprova.';

/** Oggi, la home (spec 2026-10-03-oggi-design.md). */
export default function Oggi() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState(false);
  const [inVolo, setInVolo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [foglio, setFoglio] = useState<MealSlot | null>(null);
  /** L'ultima lettura partita: una risposta più vecchia (ritorno in primo piano, Strict Mode) si scarta. */
  const ultimaLettura = useRef(0);

  /**
   * `silenziosa` è la rilettura al ritorno in primo piano: se fallisce la giornata a schermo resta
   * (come la rilettura silenziosa del Piano); dopo una scrittura invece no, perché il poster
   * mostrerebbe un piatto che non c'è più.
   */
  const carica = useCallback(async (silenziosa = false) => {
    const mia = ++ultimaLettura.current;
    try {
      const letti = await caricaDati();
      if (mia !== ultimaLettura.current) return;
      setDati({ ...letti, pianoPrima: pianoPrimaDi(giornata(letti).prossimo) });
      setErroreCaricamento(false);
    } catch (e) {
      if (mia !== ultimaLettura.current) return;
      console.error('oggi: caricamento fallito.', e);
      if (!silenziosa) setErroreCaricamento(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carica();
    // La PWA resta in memoria: tornando in primo piano il pasto giusto può essere cambiato.
    const alRitorno = () => { if (document.visibilityState === 'visible') void carica(true); };
    document.addEventListener('visibilitychange', alRitorno);
    return () => document.removeEventListener('visibilitychange', alRitorno);
  }, [carica]);

  if (erroreCaricamento) {
    return (
      <Cornice>
        <div style={{ padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <MessaggioErrore ruolo="alert">Non riusciamo a caricare la giornata.</MessaggioErrore>
          <TastoSecondario type="button" onClick={() => { setErroreCaricamento(false); void carica(); }}>Riprova</TastoSecondario>
          {/* Pillola d'azione (DESIGN.md §8): regge offline, dove Oggi non ha una copia sua (spec §F). */}
          <Link
            href="/lista"
            style={{
              ...STILE_PILLOLA, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center',
              background: 'var(--ink)', color: 'var(--superficie)', textDecoration: 'none',
            }}
          >
            Apri la lista
          </Link>
        </div>
      </Cornice>
    );
  }
  if (!dati) {
    return (
      <Cornice>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </Cornice>
    );
  }

  const { oggi, minuti, settimana, settimanaDomani, defs, dishes, ingredients, persone, lotti, pantry, ultimaChiusura, pianoPrima } = dati;
  const { slotsOggi, slotsDomani, prossimo } = giornata(dati);
  // Domani può cadere nella settimana dopo (la domenica): daFare e gli avvisi guardano le due.
  const tuttiGliSlot = settimanaDomani && settimanaDomani !== settimana ? [...settimana.slots, ...settimanaDomani.slots] : settimana.slots;
  const dishPerId = new Map(dishes.map((d) => [d.id, d]));
  const defPerId = new Map(defs.map((d) => [d.id, d]));
  const nomeDef = (id: string) => defPerId.get(id)?.nome ?? '';
  const aggiornata = dispensaAggiornata(ultimaChiusura, oggi);
  const avvisi = aggiornata ? avvisiScadenza({ slots: tuttiGliSlot, dishes, ingredients, pantry, oggi }) : [];

  /** L'icona dell'ingrediente principale di un piatto (spec §C.4), con le scelte dello slot se ci sono. */
  const iconaDi = (dish: Dish, slot?: MealSlot): IconaPiatto | null => {
    const p = ingredientePrincipale(dish, ingredients, slot?.scelte ?? {});
    return p ? { chiave: p.icona, area: p.ingrediente.area } : null;
  };

  async function scambia(slot: MealSlot, dishId: string) {
    setInVolo(true);
    setErrore(null);
    try {
      await aggiornaSlot(slot.id, { dishId }, 'correzione');
    } catch (e) {
      console.error('oggi: scambio fallito.', e);
      setErrore(ERRORE_SCAMBIO);
      setInVolo(false);
      return;
    }
    if (slot.dishId) salvaPianoPrima({ slotId: slot.id, dishId: slot.dishId, scelte: slot.scelte });
    await carica();
    setInVolo(false);
  }

  async function rimetti(slotId: string, prima: PianoPrima) {
    setInVolo(true);
    setErrore(null);
    try {
      await aggiornaSlot(slotId, { dishId: prima.dishId, scelte: prima.scelte }, 'correzione');
    } catch (e) {
      console.error('oggi: rimetti fallito.', e);
      setErrore(ERRORE_SCAMBIO);
      setInVolo(false);
      return;
    }
    dimenticaPianoPrima();
    await carica();
    setInVolo(false);
  }

  /** Le scritture del foglio azioni, coi patch del Piano (spec §B.5). */
  async function scriviDalFoglio(slot: MealSlot, patch: Patch) {
    setFoglio(null);
    setErrore(null);
    try {
      await aggiornaSlot(slot.id, patch, 'checkin');
    } catch (e) {
      console.error('oggi: azione sul pasto fallita.', e);
      setErrore(ERRORE_AZIONE);
      return;
    }
    await carica();
  }

  // ── Il poster ────────────────────────────────────────────────────────────
  let poster: ReactNode;
  let scelto: PastoScelto | null = null;
  if (prossimo.tipo === 'pasto') {
    scelto = { slot: prossimo.slot, giorno: prossimo.giorno };
    const { slot, giorno } = scelto;
    const dish = slot.dishId ? dishPerId.get(slot.dishId) : undefined;
    const settimanaDelPasto = giorno === 'oggi' ? settimana : (settimanaDomani ?? settimana);
    // Spec §C.1: la banda c'è con la dispensa aggiornata, per un pasto di oggi non dai Pronti, e non
    // dopo uno scambio fatto da qui (§C.6: per altro c'è CAMBIA).
    const voci = aggiornata && giorno === 'oggi' && !slot.daPronti && !pianoPrima && dish
      ? alternative({
        slot, statoSettimana: settimana.stato, slotsSettimana: settimana.slots, dishes, ingredients, pantry,
        persone, oggi, inScadenza: inScadenzaEntro(avvisi, oggi),
      }).map((a) => ({ dishId: a.dish.id, nome: a.dish.nome, stato: a.stato, icona: iconaDi(a.dish) }))
      : [];
    poster = (
      <Poster
        etichetta={etichettaPoster(giorno, slot.data, nomeDef(slot.slotDefId))}
        nomePiatto={dish?.nome ?? ''}
        sottotitolo={sottotitoloPoster(slot, persone)}
        caselle={caselleGiornata({
          slots: giorno === 'oggi' ? slotsOggi : (slotsDomani ?? []), defs,
          minuti: giorno === 'oggi' ? minuti : null, slotPosterId: slot.id,
        })}
        // Con la banda il poster non ha un'icona sua: starebbe sotto le carte (mockup B1).
        icona={voci.length > 0 || !dish ? null : iconaDi(dish, slot)}
        hrefCambia={`/piano/${slot.data}/${slot.slotDefId}/scegli?da=oggi`}
        onComEAndata={settimanaDelPasto.stato !== 'bozza' ? () => setFoglio(slot) : null}
        onRimetti={pianoPrima ? () => void rimetti(slot.id, pianoPrima) : null}
        inVolo={inVolo}
      >
        <Alternative voci={voci} inVolo={inVolo} onScambia={(id) => void scambia(slot, id)} />
      </Poster>
    );
  } else if (prossimo.tipo === 'domaniNonCreato') {
    poster = <PosterVuoto etichetta="Domani" testo="Il piano di domani non c'è ancora." />;
  } else {
    poster = <PosterVuoto etichetta="Oggi" testo="Nessun pasto in programma." />;
  }

  // ── La griglia: Scade, Scongela, Pronti, Poi (spec §D) ───────────────────
  const tessere: Tessera[] = [];
  if (aggiornata) {
    const fare = daFare({ avvisi, slots: tuttiGliSlot, defs, dishes, ingredients, pantry, lotti, oggi, minuti });
    for (const s of fare.scade) {
      const uso = s.uso ? { data: s.uso.data, nomePasto: nomeDef(s.uso.slotDefId) } : null;
      tessere.push({
        chiave: `scade-${s.ingrediente.id}`,
        mostra: (larga) => (
          <TesseraPiena
            larga={larga}
            area={s.ingrediente.area}
            pillola={`Scade ${etichettaScadenza(s.scadenza, oggi)}`}
            nome={s.ingrediente.nome}
            sottotitolo={etichettaUso(uso, oggi)}
            icona={iconaIngrediente(s.ingrediente)}
            href={`/dispensa?ingrediente=${s.ingrediente.id}`}
          />
        ),
      });
    }
    for (const c of fare.scongela) {
      const sottotitolo = testoScongela(nomeDef(c.slotDefId));
      const pillola = { testo: 'Scongela', tono: 'freddo' } as const;
      tessere.push(c.tipo === 'ingrediente'
        ? {
          chiave: `freddo-${c.ingrediente.id}`,
          mostra: (larga) => (
            <TesseraBianca
              larga={larga} pillola={pillola} etichetta={null} nome={c.ingrediente.nome} sottotitolo={sottotitolo}
              icona={iconaIngrediente(c.ingrediente)} href={`/dispensa?ingrediente=${c.ingrediente.id}`}
            />
          ),
        }
        : {
          chiave: `freddo-${c.lotto.id}`,
          mostra: (larga) => (
            <TesseraBianca
              larga={larga} pillola={pillola} etichetta={null} nome={c.dish.nome} sottotitolo={sottotitolo}
              icona={iconaDi(c.dish)} href={`/dispensa?lotto=${c.lotto.id}`}
            />
          ),
        });
    }
    for (const pr of fare.pronti) {
      const icona = iconaDi(pr.dish);
      tessere.push({
        chiave: `pronti-${pr.dish.id}`,
        mostra: (larga) => (
          <TesseraPiena
            larga={larga}
            area={icona?.area ?? null}
            pillola={pillolaPronti(pr.libere)}
            nome={pr.dish.nome}
            sottotitolo={pr.congelato ? 'In congelatore' : 'In frigo'}
            icona={icona}
            href={`/dispensa?lotto=${pr.lottoDaAprire.id}`}
          />
        ),
      });
    }
  }
  /** «Poi» e «Domani»: il pasto con la sua etichetta, che porta al Piano. */
  const tesseraPasto = (chiave: string, pasto: PastoScelto): Tessera => {
    const dish = pasto.slot.dishId ? dishPerId.get(pasto.slot.dishId) : undefined;
    return {
      chiave,
      mostra: (larga) => (
        <TesseraBianca
          larga={larga} pillola={null} etichetta={etichettaPoi(pasto.giorno, nomeDef(pasto.slot.slotDefId))}
          nome={dish?.nome ?? ''} sottotitolo={null} icona={dish ? iconaDi(dish, pasto.slot) : null} href="/piano"
        />
      ),
    };
  };
  const poi = scelto ? pastoDopo({ dopo: scelto, slotsOggi, slotsDomani, defs }) : null;
  if (poi) tessere.push(tesseraPasto('poi', poi));
  if (!aggiornata && slotsDomani) {
    // Spec §D.5: la dispensa ferma lascia posto, e la griglia si riempie col piano di domani.
    const primoDomani = prossimoPasto({ slotsOggi: [], slotsDomani, defs, minuti: 0 });
    if (primoDomani.tipo === 'pasto' && primoDomani.slot.id !== poi?.slot.id && primoDomani.slot.id !== scelto?.slot.id) {
      tessere.push(tesseraPasto('domani', primoDomani));
    }
  }
  // Una tessera dispari in coda prende due colonne, in forma compatta (spec §D).
  const griglia = tessere.map((t, n) => (
    <Fragment key={t.chiave}>{t.mostra(tessere.length % 2 === 1 && n === tessere.length - 1)}</Fragment>
  ));

  const foglioDef = foglio ? defPerId.get(foglio.slotDefId) : undefined;
  const prontiDelFoglio = foglio?.dishId
    ? lotti.filter((l) => l.dishId === foglio.dishId).reduce((n, l) => n + porzioniUtilizzabili(l, oggi), 0)
    : 0;

  return (
    <Cornice>
      <div className="sc scroll-app" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {poster}
          {errore && (
            // Spec §C.6: sul fondo chiaro, subito sotto il poster.
            <div style={{ gridColumn: 'span 2' }}>
              <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>
            </div>
          )}
          {!aggiornata && <TesseraDispensaFerma ultimaChiusura={ultimaChiusura} />}
          {griglia}
        </div>
      </div>
      {foglio && foglioDef && (
        <FoglioAzioniPasto
          nomePasto={foglioDef.nome}
          spuntato={foglio.stato === 'saltato' || foglio.stato === 'sostituito'}
          passato={foglio.data <= oggi}
          aCasa={foglio.stato === 'casa'}
          haPiatto={foglio.dishId !== null}
          porzioniPreparate={foglio.porzioniPreparate}
          prontiCongelato={lotti.find((l) => l.mealSlotId === foglio.id)?.congelato ?? false}
          daPronti={foglio.daPronti}
          prontiDisponibili={prontiDelFoglio}
          hrefScegli={`/piano/${foglio.data}/${foglio.slotDefId}/scegli?da=oggi`}
          onSaltato={() => void scriviDalFoglio(foglio, { stato: 'saltato' })}
          onMangiatoAltro={() => void scriviDalFoglio(foglio, { stato: 'sostituito' })}
          onTornaAlPiano={() => void scriviDalFoglio(foglio, { stato: 'casa', daPronti: false })}
          onCucinatoNonMangiato={() => void scriviDalFoglio(foglio, { stato: 'saltato', porzioniPreparate: foglio.porzioniPreparate + 1 })}
          onPreparaPorzioni={(n, congelato) => void scriviDalFoglio(foglio, { porzioniPreparate: n, prontiCongelato: congelato })}
          onUsaPronta={() => void scriviDalFoglio(foglio, { daPronti: true, stato: 'casa' })}
          onNonUsarePronta={() => void scriviDalFoglio(foglio, { daPronti: false })}
          onChiudi={() => setFoglio(null)}
        />
      )}
    </Cornice>
  );
}

/** Colonna a tutta altezza con la testata fissa: scorre solo il corpo. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Oggi" />
      {children}
    </div>
  );
}
