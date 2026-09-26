'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import {
  leggiImpostazioni, leggiSlotDefs, pastiDiDefault,
  salvaImpostazioni as scriviImpostazioni, salvaSlotDefs,
} from '@/data/impostazioni';
import { dimenticaIdCasa, eRifiutoRls, statoCasa, type StatoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { riassumiEvitato, type RiassuntoEvitato } from '@/domain/risparmio';
import { leggiUtente } from '@/data/utente';
import { usePannello } from './PannelloProvider';
import { Carico, ErroreCaricamento, TESTO_ERRORE_IMPOSTAZIONI } from './pezzi';

export interface DatiPannello {
  /**
   * Le impostazioni per intero: `salvaImpostazioni` riscrive la riga tutta, quindi quello che
   * non si tiene qui si perde al primo salvataggio.
   */
  impostazioni: Impostazioni;
  slotDefs: MealSlotDef[];
  /** null se la lettura della casa fallisce (spec §C.7, frame 26): la tessera non mostra il valore. */
  casa: StatoCasa | null;
  /** null se il risparmio non si legge: la nota di §C.11 non c'è. */
  risparmio: RiassuntoEvitato | null;
  utente: { nome: string; email: string };
}

export type StatoDati = { stato: 'carico' } | { stato: 'errore' } | { stato: 'pronto'; dati: DatiPannello };

interface ValoreDati {
  stato: StatoDati;
  ricarica(): void;
  salvaImpostazioni(parziale: Partial<Impostazioni>): Promise<boolean>;
  salvaPasti(defs: MealSlotDef[]): Promise<boolean>;
  /** Vero dopo un rifiuto RLS, fino al prossimo salvataggio; si spegne anche a ogni apertura. */
  casaCambiata: boolean;
  /** Rilegge la casa. Non rigetta: se la rilettura fallisce e c'è `seFallisce`, vale quello. */
  ricaricaCasa(seFallisce?: StatoCasa): Promise<void>;
  /** Quando è riuscita Cancella la dispensa (spec §D): null a ogni chiusura del pannello. */
  cancellataIl: Date | null;
  segnaCancellata(quando: Date): void;
}

const Contesto = createContext<ValoreDati | null>(null);

/**
 * Impostazioni e pasti sono il nucleo: se non arrivano, il pannello mostra l'errore. Un utente
 * mai passato da seed.sql non ha pasti: si seminano i quattro di default e si salvano davvero,
 * altrimenti il primo AGGIUNGI PASTO produrrebbe una riga sola, sotto il minimo di 3.
 */
async function leggiNucleo(): Promise<Pick<DatiPannello, 'impostazioni' | 'slotDefs'>> {
  const [impostazioni, letti] = await Promise.all([leggiImpostazioni(), leggiSlotDefs()]);
  const slotDefs = letti.length > 0 ? letti : pastiDiDefault();
  if (letti.length === 0) await salvaSlotDefs(slotDefs);
  return { impostazioni, slotDefs };
}

/** La casa e il risparmio a parte: se falliscono, il resto del pannello resta usabile. */
async function leggiTutto(): Promise<DatiPannello> {
  const [nucleo, casa, risparmio, utente] = await Promise.all([
    leggiNucleo(),
    statoCasa().catch((errore: unknown) => {
      console.error('impostazioni: lettura della casa fallita.', errore);
      return null;
    }),
    leggiRisparmioTotale().then(riassumiEvitato).catch((errore: unknown) => {
      console.error('impostazioni: lettura del risparmio fallita.', errore);
      return null;
    }),
    leggiUtente(),
  ]);
  return { ...nucleo, casa, risparmio, utente };
}

/**
 * I dati del pannello (spec §B.5), uno per tutto il pannello. Si leggono all'apertura: la
 * prima volta con `CARICO…`, le volte dopo in silenzio sopra i dati che ci sono.
 *
 * Le scritture sono quelle della pagina delle Impostazioni di prima della fase 5, spostate qui:
 * - **ottimistiche con rollback.** Il valore nuovo va a schermo subito; se la scrittura
 *   fallisce, il valore a cui tornare si rilegge dal server; l'ultimo valore confermato vale
 *   solo se anche la rilettura fallisce;
 * - **in fila** (`coda`, review dell'11/09): ogni scrittura aspetta la precedente, così il
 *   rollback rilegge dopo tutte le scritture già partite, e l'ordine di arrivo al server è
 *   quello dei gesti. Dalla fase 5 la fila vale anche per i pasti (spec §L);
 * - **solo l'ultima richiesta tocca lo schermo**: una rilettura o un errore di una richiesta
 *   superata si ignorano, la più recente dirà l'ultima parola;
 * - **il rifiuto RLS** (la casa è cambiata sotto i piedi, prova del 15/09): si scarta l'id
 *   della casa, si chiude l'eventuale dialogo, si ricarica tutto e `casaCambiata` lo dice. Se
 *   la ricarica fallisce, il pannello va in errore di caricamento (con `RIPROVA`), senza
 *   `casaCambiata`. La scrittura non si riprova da sola: era un gesto su dati che l'utente deve
 *   prima rivedere;
 * - **le letture aspettano la fila**: una riapertura rilegge dopo le scritture in volo.
 *
 * `salvaImpostazioni` e `salvaPasti` tornano `false` solo quando la riga deve mostrare
 * `Non siamo riusciti a salvare. Riprova.`; una richiesta superata o un rifiuto RLS tornano
 * `true`. `casaCambiata` vale fino al prossimo salvataggio e si spegne a ogni apertura.
 *
 * `salvaSlotDefs` non è atomico (prima cancella i pasti tolti, poi scrive gli altri): se una
 * scrittura dei pasti fallisce, i pasti a cui tornare si rileggono dal server, non dalla copia
 * locale, che potrebbe avere un pasto già cancellato.
 *
 * `cancellataIl` (spec §D) vive qui e non nella cima: la nota della riga deve durare fino alla
 * chiusura del pannello anche se la cima si smonta.
 */
export function DatiPannelloProvider({ children }: { children: ReactNode }) {
  const { aperto, chiudiDialogo } = usePannello();
  const [stato, setStato] = useState<StatoDati>({ stato: 'carico' });
  const [casaCambiata, setCasaCambiata] = useState(false);
  const [cancellataIl, setCancellataIl] = useState<Date | null>(null);
  // «Fino alla chiusura del pannello» (spec §D): aggiustato durante il render, non in un effetto.
  const [apertoVisto, setApertoVisto] = useState(aperto);
  if (aperto !== apertoVisto) {
    setApertoVisto(aperto);
    if (!aperto) setCancellataIl(null);
  }
  // Lo specchio dello stato pronto: i gesti partono da qui, non da una chiusura vecchia.
  const dati = useRef<DatiPannello | null>(null);
  // L'ultimo stato confermato dal server: il valore a cui tornare se una scrittura fallisce.
  const impostazioniSalvate = useRef<Impostazioni | null>(null);
  const pastiSalvati = useRef<MealSlotDef[]>([]);
  const richiestaImpostazioni = useRef(0);
  const richiestaPasti = useRef(0);
  // La fila delle scritture. Non si rompe mai: un errore si ferma nel catch di chi l'ha fatto.
  const coda = useRef<Promise<void>>(Promise.resolve());
  // Ogni lettura ha un numero: una lettura superata non tocca lo schermo.
  const lettura = useRef(0);

  const metti = useCallback((d: DatiPannello) => {
    dati.current = d;
    setStato({ stato: 'pronto', dati: d });
  }, []);

  const aggiorna = useCallback((f: (d: DatiPannello) => DatiPannello) => {
    if (dati.current) metti(f(dati.current));
  }, [metti]);

  /**
   * Legge tutto. Prima aspetta la fila delle scritture: una riapertura con una scrittura in volo
   * rileggerebbe il valore di prima, e la sua lettura, più recente, lo rimetterebbe a schermo.
   * Dice com'è andata: `superata` se nel frattempo è partita una lettura più recente.
   */
  const carica = useCallback(async (silenziosa: boolean): Promise<'riuscita' | 'fallita' | 'superata'> => {
    const n = ++lettura.current;
    if (!silenziosa) setStato({ stato: 'carico' });
    try {
      await coda.current;
      const letti = await leggiTutto();
      if (n !== lettura.current) return 'superata';
      impostazioniSalvate.current = letti.impostazioni;
      pastiSalvati.current = letti.slotDefs;
      metti(letti);
      return 'riuscita';
    } catch (errore) {
      console.error('impostazioni: caricamento fallito.', errore);
      if (n !== lettura.current) return 'superata';
      if (silenziosa && dati.current) return 'fallita';
      dati.current = null;
      setStato({ stato: 'errore' });
      return 'fallita';
    }
  }, [metti]);

  useEffect(() => {
    if (!aperto) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCasaCambiata(false);
    void carica(dati.current !== null);
  }, [aperto, carica]);

  /**
   * La casa è cambiata: memoria dell'id scartata, dialogo chiuso, tutto riletto. Se la rilettura
   * fallisce, i dati a schermo sono di una casa che non è più la sua, e col valore appena
   * rifiutato: niente «dati ricaricati», il pannello va in errore con `RIPROVA`, come la pagina
   * di prima. Torna vero solo se la rilettura è riuscita.
   */
  const dopoRifiutoRls = useCallback(async (): Promise<boolean> => {
    dimenticaIdCasa();
    chiudiDialogo();
    const esito = await carica(true);
    if (esito === 'fallita') {
      dati.current = null;
      setStato({ stato: 'errore' });
    }
    return esito === 'riuscita';
  }, [carica, chiudiDialogo]);

  const salvaImpostazioni = useCallback(async (parziale: Partial<Impostazioni>): Promise<boolean> => {
    const attuali = dati.current;
    if (!attuali) return false;
    setCasaCambiata(false);
    const n = ++richiestaImpostazioni.current;
    const eUltima = () => n === richiestaImpostazioni.current;
    const nuove = { ...attuali.impostazioni, ...parziale };
    aggiorna((d) => ({ ...d, impostazioni: nuove }));
    const scrittura = coda.current.then(() => scriviImpostazioni(nuove));
    coda.current = scrittura.then(() => undefined, () => undefined);
    try {
      await scrittura;
      // salvaImpostazioni àncora da sé l'origine del ciclo: si rilegge sempre.
      const rilette = await leggiImpostazioni();
      if (!eUltima()) return true;
      impostazioniSalvate.current = rilette;
      aggiorna((d) => ({ ...d, impostazioni: rilette }));
      return true;
    } catch (errore) {
      console.error('impostazioni: salvataggio delle impostazioni fallito.', errore);
      if (!eUltima()) return true;
      if (eRifiutoRls(errore)) {
        const riletti = await dopoRifiutoRls();
        if (riletti && eUltima()) setCasaCambiata(true);
        return true;
      }
      // Il valore a cui tornare si rilegge dal server: con due gesti veloci la prima scrittura
      // può essere atterrata senza che la sua rilettura (superata) l'abbia registrata.
      let salvate = impostazioniSalvate.current;
      try {
        salvate = await leggiImpostazioni();
        if (!eUltima()) return true;
        impostazioniSalvate.current = salvate;
      } catch (erroreRilettura) {
        console.error('impostazioni: rilettura dopo il salvataggio fallito non riuscita.', erroreRilettura);
        if (!eUltima()) return true;
      }
      if (salvate) {
        const tornate = salvate;
        aggiorna((d) => ({ ...d, impostazioni: tornate }));
      }
      return false;
    }
  }, [aggiorna, dopoRifiutoRls]);

  const salvaPasti = useCallback(async (nuovi: MealSlotDef[]): Promise<boolean> => {
    if (!dati.current) return false;
    setCasaCambiata(false);
    const n = ++richiestaPasti.current;
    const eUltima = () => n === richiestaPasti.current;
    aggiorna((d) => ({ ...d, slotDefs: nuovi }));
    const scrittura = coda.current.then(() => salvaSlotDefs(nuovi));
    coda.current = scrittura.then(() => undefined, () => undefined);
    try {
      await scrittura;
      pastiSalvati.current = nuovi;
      return true;
    } catch (errore) {
      console.error('impostazioni: salvataggio dei pasti fallito.', errore);
      if (!eUltima()) return true;
      if (eRifiutoRls(errore)) {
        const riletti = await dopoRifiutoRls();
        if (riletti && eUltima()) setCasaCambiata(true);
        return true;
      }
      // salvaSlotDefs non è atomico: la cancellazione dei pasti tolti può essere già avvenuta.
      // Il valore a cui tornare si rilegge dal server; la copia locale solo se anche la
      // rilettura fallisce (decisione del 26/09).
      let salvati = pastiSalvati.current;
      try {
        salvati = await leggiSlotDefs();
        if (!eUltima()) return true;
        pastiSalvati.current = salvati;
      } catch (erroreRilettura) {
        console.error('impostazioni: rilettura dei pasti dopo il salvataggio fallito non riuscita.', erroreRilettura);
        if (!eUltima()) return true;
      }
      const tornati = salvati;
      aggiorna((d) => ({ ...d, slotDefs: tornati }));
      return false;
    }
  }, [aggiorna, dopoRifiutoRls]);

  const ricarica = useCallback(() => {
    setCasaCambiata(false);
    void carica(false);
  }, [carica]);

  const ricaricaCasa = useCallback(async (seFallisce?: StatoCasa) => {
    try {
      const casa = await statoCasa();
      aggiorna((d) => ({ ...d, casa }));
    } catch (errore) {
      console.error('impostazioni: rilettura della casa fallita.', errore);
      if (seFallisce) aggiorna((d) => ({ ...d, casa: seFallisce }));
    }
  }, [aggiorna]);

  const segnaCancellata = useCallback((quando: Date) => setCancellataIl(quando), []);

  const valore = useMemo<ValoreDati>(() => ({
    stato, ricarica, salvaImpostazioni, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata,
  }), [stato, ricarica, salvaImpostazioni, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata]);

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useDatiPannello(): ValoreDati {
  const valore = useContext(Contesto);
  if (valore === null) throw new Error('useDatiPannello va usato dentro DatiPannelloProvider');
  return valore;
}

/**
 * Gli stati dei dati al posto dei blocchi (spec §B.5, frame 23 e 24): `CARICO…` in mono `--sec`
 * con `role="status"`, oppure un Blocco con l'errore e la pillola `RIPROVA`, che rilegge.
 * Pronti, i figli. Lo usano la cima (Task 7) e le sotto-schermate che vivono dei dati del
 * pannello.
 */
export function StatoDatiPannello({ children }: { children: (dati: DatiPannello) => ReactNode }) {
  const { stato, ricarica } = useDatiPannello();
  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore') return <ErroreCaricamento testo={TESTO_ERRORE_IMPOSTAZIONI} onRiprova={ricarica} />;
  return <>{children(stato.dati)}</>;
}
