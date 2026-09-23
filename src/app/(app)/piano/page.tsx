'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AreaId, Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, PantryState, StatoSlot } from '@/domain/types';
import { applicaStato } from '@/domain/week-shape';
import { descriviScelte } from '@/domain/opzioni';
import { giorniDellaSettimana, lunediDi, sommaGiorni } from '@/domain/date';
import { porzioniUtilizzabili } from '@/domain/pronti';
import { avvisiScadenza, etichettaScadenza, type AvvisoScadenza } from '@/domain/scadenza';
import { etichettaSettimana, parolaTemporale } from '@/domain/settimana-label';
import {
  leggiSettimanaCorrente, leggiSettimana, creaSettimana, completaAssegnazioni, aggiornaSlot, confermaSettimana,
} from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiPronti } from '@/data/pronti';
import { leggiDispensa } from '@/data/dispensa';
import { generaListe } from '@/data/lista';
import { Testata } from '@/components/Testata';
import { StrisciaGiorni } from '@/components/StrisciaGiorni';
import { RigaPasto } from '@/components/RigaPasto';
import { FoglioAzioniPasto } from '@/components/FoglioAzioniPasto';
import { Dock } from '@/components/Dock';

const LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * La dispensa serve solo agli avvisi di scadenza del fresco (spec
 * scadenza-fresco §3.1): un di più. Se la lettura fallisce, nessun avviso e
 * la Settimana resta usabile — come fa la Dispensa col non ricomprato.
 */
async function leggiDispensaSenzaBloccare(): Promise<PantryState[]> {
  try {
    return await leggiDispensa();
  } catch (e) {
    console.error('settimana: lettura della dispensa fallita.', e);
    return [];
  }
}

interface Repertorio {
  settimana: {
    id: string;
    dataInizio: string;
    stato: 'bozza' | 'confermata' | 'chiusa';
    slots: MealSlot[];
  };
  slotDefs: MealSlotDef[];
  piatti: Dish[];
  ingredienti: Ingredient[];
  dispensa: PantryState[];
  ordineAree: AreaId[];
}

/**
 * Settimana: il piano alimentare. Nasceva come check-in ("sarò a casa?"), ora
 * mostra anche cosa si mangia — ogni pasto acceso mostra il piatto in
 * programma. Il marchio è sempre tutto pieno qui: solo la Lista calcola le
 * aree mancanti.
 */
export default function Settimana() {
  const router = useRouter();

  const [dati, setDati] = useState<Repertorio | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [erroreCheckin, setErroreCheckin] = useState<string | null>(null);
  const [selezionato, setSelezionato] = useState(0);
  const [confermando, setConfermando] = useState(false);
  const [erroreConferma, setErroreConferma] = useState<string | null>(null);

  // 'corrente' | 'precedente': la spunta arriva fino alla settimana scorsa
  // (spec spunta-pasti §6) — il lunedì "ieri" è domenica, e senza la
  // precedente il weekend sarebbe incorreggibile.
  const [vista, setVista] = useState<'corrente' | 'precedente'>('corrente');
  const [precedenteVuota, setPrecedenteVuota] = useState(false);
  const [foglio, setFoglio] = useState<{ slot: MealSlot; def: MealSlotDef } | null>(null);
  const [lotti, setLotti] = useState<LottoPronto[]>([]);

  // Tiene la promise di creaSettimana in corso, condivisa fra le due
  // esecuzioni dell'effetto che React Strict Mode innesca in sviluppo: senza
  // questo, entrambe leggerebbero "nessuna settimana" e proverebbero a
  // crearla insieme. Non protegge dal caso di due schede o di una ricarica a
  // metà creazione (istanze diverse, ref diversi) — per quello serve il
  // fallback nel catch qui sotto, che è la vera rete di sicurezza.
  const creazioneInCorsoRef = useRef<Promise<void> | null>(null);

  /**
   * Unico punto che cambia `vista`: azzera tutto lo stato derivato dal
   * caricamento precedente PRIMA di far scattare l'effetto (non dentro,
   * dove `react-hooks/set-state-in-effect` lo vieta — lo setState va nella
   * risposta all'evento, non nel corpo dell'effetto). Include
   * `erroreCaricamento`: senza azzerarlo qui, un fallimento di leggiSettimana
   * sulla precedente lascerebbe la schermata d'errore senza via d'uscita, dato
   * che il selettore di vista non è renderizzato nei rami erroreCaricamento
   * e !dati.
   */
  function cambiaVista(v: 'corrente' | 'precedente') {
    setDati(null);
    setPrecedenteVuota(false);
    setFoglio(null);
    setErroreCaricamento(null);
    // Anche l'errore di conferma: da quando vive nello scroller — reso in
    // entrambe le viste — resterebbe a schermo sopra il piano della settimana
    // scorsa, dove il tasto che lo genera non esiste nemmeno.
    setErroreConferma(null);
    setVista(v);
  }

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        let corrente: Awaited<ReturnType<typeof leggiSettimanaCorrente>> = null;
        if (vista === 'precedente') {
          // Mai creaSettimana per il passato: se non esiste, non c'è nulla
          // da correggere (spec §6).
          corrente = await leggiSettimana(sommaGiorni(lunediDi(oggiIso()), -7));
          if (!corrente) {
            if (vivo) setPrecedenteVuota(true);
            return;
          }
        } else {
          corrente = await leggiSettimanaCorrente();
          if (!corrente) {
            if (!creazioneInCorsoRef.current) {
              // Primo accesso della settimana: creaSettimana genera i default
              // (ogni pasto a casa tranne le assenze abituali) e assegna i
              // piatti. L'utente trova la settimana già compilata.
              creazioneInCorsoRef.current = creaSettimana(lunediDi(oggiIso())).then(() => undefined);
            }
            try {
              await creazioneInCorsoRef.current;
              corrente = await leggiSettimanaCorrente();
            } catch (erroreCreazione) {
              // L'unique (user_id, data_inizio) blocca un doppione lato
              // database: se la settimana esiste già — creata da un'altra
              // scheda, o da un tentativo precedente dopo una ricarica a metà —
              // si rilegge e si prosegue in silenzio invece di mostrare un
              // errore bloccante quando in realtà non c'è nulla di rotto.
              corrente = await leggiSettimanaCorrente();
              if (!corrente) throw erroreCreazione;
            }
          }
          if (!corrente) throw new Error('Settimana non disponibile dopo la creazione.');

          // Una bozza con righe a casa ancora senza piatto (nata a repertorio
          // vuoto, spec due-porte §2.4): si prova a compilarla adesso, così
          // le righe si riempiono da sole appena i piatti ci sono, senza
          // aspettare il lunedì dopo. Tollerante: se fallisce si mostra la
          // settimana com'è, non è un errore di caricamento.
          if (corrente.stato === 'bozza' && corrente.slots.some((s) => s.stato === 'casa' && s.dishId === null)) {
            try {
              const compilati = await completaAssegnazioni(corrente.id);
              if (compilati > 0) corrente = (await leggiSettimanaCorrente()) ?? corrente;
            } catch (erroreCompletamento) {
              console.error('settimana: completamento delle assegnazioni fallito.', erroreCompletamento);
            }
          }
        }

        const [slotDefs, piatti, ingredienti, impostazioni, lottiCaricati, dispensa] = await Promise.all([
          leggiSlotDefs(),
          leggiRepertorio(),
          leggiIngredienti(),
          leggiImpostazioni(),
          leggiPronti(),
          leggiDispensaSenzaBloccare(),
        ]);
        if (!vivo) return;

        setDati({
          settimana: { id: corrente.id, dataInizio: corrente.dataInizio, stato: corrente.stato, slots: corrente.slots },
          slotDefs,
          piatti,
          ingredienti,
          dispensa,
          ordineAree: impostazioni.ordineAree,
        });
        setLotti(lottiCaricati);

        const giorni = giorniDellaSettimana(corrente.dataInizio);
        if (vista === 'precedente') {
          // Si arriva qui quasi sempre per il weekend appena passato.
          setSelezionato(6);
        } else {
          const indiceOggi = giorni.indexOf(oggiIso());
          setSelezionato(indiceOggi >= 0 ? indiceOggi : 0);
        }
      } catch (errore) {
        console.error('settimana: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la settimana. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [vista]);

  if (erroreCaricamento) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--errore)' }}>{erroreCaricamento}</p>
        {vista === 'precedente' && (
          <div style={{ padding: '0 16px' }}>
            <button
              type="button"
              onClick={() => cambiaVista('corrente')}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.11em', color: 'var(--ter)', padding: '4px 2px',
              }}
            >
              SETTIMANA CORRENTE ›
            </button>
          </div>
        )}
      </Cornice>
    );
  }

  if (precedenteVuota) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>
          Questa settimana non è mai stata creata: non c&rsquo;è nulla da correggere.
        </p>
        <div style={{ padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => cambiaVista('corrente')}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.11em', color: 'var(--ter)', padding: '4px 2px',
            }}
          >
            SETTIMANA CORRENTE ›
          </button>
        </div>
      </Cornice>
    );
  }

  if (!dati) {
    // Nessuno stato di caricamento nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice />;
  }

  const { settimana, slotDefs, piatti, ingredienti, dispensa, ordineAree } = dati;
  const giorni = giorniDellaSettimana(settimana.dataInizio);
  const dataSelezionata = giorni[selezionato];
  const oggi = oggiIso();

  // Avvisi di scadenza del fresco (spec scadenza-fresco §1.2, §3.1): un
  // residuo che oggi conta ma che, per il modello, non ci sarà più il giorno
  // di un pasto che lo usa. Una volta per render, non per riga. Solo nella
  // vista corrente: il passato non si avvisa. Per un giorno già passato la
  // lista è vuota per costruzione (avvisiScadenza guarda solo data ≥ oggi).
  const avvisi: AvvisoScadenza[] = vista === 'corrente'
    ? avvisiScadenza({ slots: settimana.slots, dishes: piatti, ingredients: ingredienti, pantry: dispensa, oggi })
    : [];

  /**
   * Le righe di avviso per il pasto (dataSelezionata, slotDefId): copy esatto
   * della spec §3.1. L'id è l'ingrediente: un avviso per ingrediente, mai due.
   */
  function avvisiDelPasto(slotDefId: string): { id: string; testo: string }[] {
    return avvisi
      .filter((a) => a.pastiDopo.some((p) => p.data === dataSelezionata && p.slotDefId === slotDefId))
      .map((a) => ({
        id: a.ingredientId,
        testo: `${a.nome} in casa: scade ${etichettaScadenza(a.scadenza, oggi)}, prima di questo pasto`,
      }));
  }

  const piattiPerId = new Map(piatti.map((p) => [p.id, p]));
  const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
  const nomePerIngrediente = new Map(ingredienti.map((i) => [i.id, i.nome]));

  const prontiPerPiatto = new Map<string, number>();
  for (const lotto of lotti) {
    prontiPerPiatto.set(
      lotto.dishId,
      (prontiPerPiatto.get(lotto.dishId) ?? 0) + porzioniUtilizzabili(lotto, oggi),
    );
  }

  function areeDelPiatto(piatto: Dish): AreaId[] {
    const presenti = new Set(
      piatto.ingredienti
        .map((i) => areaPerIngrediente.get(i.ingredientId))
        .filter((a): a is AreaId => a !== undefined),
    );
    return ordineAree.filter((a) => presenti.has(a));
  }

  function aggiornaSlotLocale(slotAggiornato: MealSlot) {
    setDati((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settimana: {
          ...prev.settimana,
          slots: prev.settimana.slots.map((s) => (s.id === slotAggiornato.id ? slotAggiornato : s)),
        },
      };
    });
  }

  async function toggleStato(slot: MealSlot) {
    const nuovoStato: StatoSlot = slot.stato === 'casa' ? 'fuori' : 'casa';
    const risultato = applicaStato(slot, nuovoStato, 'checkin');
    // Ottimistico: spegnere/accendere un pasto è un'azione di massa, deve
    // sentirsi immediata. In caso di errore si torna allo stato precedente.
    // L'errore è uno stato inline separato da erroreCaricamento apposta: un
    // singolo check-in fallito per un blip di rete non deve rimpiazzare
    // striscia dei giorni, righe pasto e pulsante finale con un gate d'errore
    // — l'utente sta spegnendo molti pasti di fila, non deve perdere la
    // schermata a metà.
    setErroreCheckin(null);
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: nuovoStato }, 'checkin');
    } catch (errore) {
      console.error('settimana: check-in fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  /**
   * La spunta: saltato / sostituito / ritorno a casa, fonte 'checkin'.
   * Ottimistico come toggleStato; aggiornaSlot scrive da solo ledger e
   * residuo quando la settimana non è bozza (spec spunta-pasti §5.1).
   */
  async function spuntaStato(slot: MealSlot, stato: StatoSlot) {
    setFoglio(null);
    const risultato = applicaStato(slot, stato, 'checkin');
    setErroreCheckin(null);
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato }, 'checkin');
    } catch (errore) {
      console.error('settimana: spunta fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  /**
   * Ricarica i lotti dopo un gesto prep riuscito. Fuori dal try/catch del
   * salvataggio apposta: se aggiornaSlot va a buon fine ma questa ricarica
   * fallisce, lo slot NON va revertito e non deve comparire l'errore di
   * salvataggio — sarebbe falso, lo slot è salvato. Un fallimento qui è solo
   * una vista sui pronti non aggiornata, non una scrittura persa; lo si logga
   * e basta, la prossima ricarica di pagina o gesto la sistema da sola.
   */
  async function ricaricaLotti() {
    try {
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: ricarica lotti pronti fallita.', errore);
    }
  }

  async function preparaPorzioni(slot: MealSlot, n: number, congelato: boolean) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, porzioniPreparate: n });
    try {
      await aggiornaSlot(slot.id, { porzioniPreparate: n, prontiCongelato: congelato }, 'checkin');
    } catch (errore) {
      console.error('settimana: preparazione porzioni fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
      return;
    }
    await ricaricaLotti();
  }

  async function usaPronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: true, stato: 'casa' });
    try {
      await aggiornaSlot(slot.id, { daPronti: true, stato: 'casa' }, 'checkin');
    } catch (errore) {
      console.error('settimana: uso porzione pronta fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
      return;
    }
    await ricaricaLotti();
  }

  async function nonUsarePronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: false });
    try {
      await aggiornaSlot(slot.id, { daPronti: false }, 'checkin');
    } catch (errore) {
      console.error('settimana: restituzione porzione fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
      return;
    }
    await ricaricaLotti();
  }

  async function cucinatoNonMangiato(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'saltato', 'checkin'), porzioniPreparate: slot.porzioniPreparate + 1 };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'saltato', porzioniPreparate: slot.porzioniPreparate + 1 }, 'checkin');
    } catch (errore) {
      console.error('settimana: cucinato-non-mangiato fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
      return;
    }
    await ricaricaLotti();
  }

  async function tornaAlPiano(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'casa', 'checkin'), daPronti: false };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'casa', daPronti: false }, 'checkin');
    } catch (errore) {
      console.error('settimana: torna al piano fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
      return;
    }
    await ricaricaLotti();
  }

  function apriPiatto(dishId: string) {
    router.push(`/piatti/${dishId}`);
  }

  /**
   * Una settimana già confermata o chiusa NON deve mai rifare confermaSettimana
   * + generaListe: generaListe cancella e reinserisce shopping_list_item,
   * perdendo ogni spunta e risposta ai controlli già dati, e confermaSettimana
   * riporterebbe una settimana 'chiusa' a 'confermata', disarmando il guard
   * di idempotenza di chiudiSpesa — una seconda chiusura duplicherebbe le
   * righe purchase e sottrarrebbe di nuovo il fabbisogno dal residuo (C4).
   * Il pulsante qui sotto diventa un semplice "VAI ALLA LISTA": naviga e
   * basta, non tocca mai il server.
   */
  async function confermaEVaiLista() {
    if (confermando) return;
    if (settimana.stato !== 'bozza') {
      router.push('/lista');
      return;
    }
    setConfermando(true);
    setErroreConferma(null);
    try {
      await confermaSettimana(settimana.id);
      await generaListe(settimana.id);
      router.push('/lista');
    } catch (errore) {
      console.error('settimana: conferma o generazione della lista fallita.', errore);
      setErroreConferma('Non siamo riusciti a confermare la settimana. Riprova.');
      setConfermando(false);
    }
  }

  const pastiOrdinati = [...slotDefs].sort((a, b) => a.posizione - b.posizione);
  // Il conteggio del giorno scelto, non della settimana: decisione del 21/09.
  // Il totale settimanale sparisce con la riga che lo conteneva.
  const nCasaGiorno = settimana.slots
    .filter((s) => s.data === dataSelezionata && s.stato === 'casa' && s.dishId !== null).length;
  const quandoSelezionato = parolaTemporale(dataSelezionata, oggi);
  const testoConferma = settimana.stato === 'bozza' ? 'CONFERMA E CREA LA LISTA' : 'VAI ALLA LISTA';

  return (
    <Cornice settimana={etichettaSettimana(settimana.dataInizio)}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 16px 0' }}>
        <button
          type="button"
          onClick={() => cambiaVista(vista === 'corrente' ? 'precedente' : 'corrente')}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.11em', color: 'var(--ter)', padding: '4px 2px',
          }}
        >
          {vista === 'corrente' ? '‹ SETTIMANA SCORSA' : 'SETTIMANA CORRENTE ›'}
        </button>
      </div>

      <div style={{ padding: '2px 16px 14px' }}>
        <StrisciaGiorni
          giorni={giorni}
          slotDefs={pastiOrdinati}
          slots={settimana.slots}
          oggi={oggi}
          selezionato={selezionato}
          onSeleziona={setSelezionato}
        />
      </div>

      {/* La coda del Dock si applica solo dove il Dock c'è (vista corrente): nella
          precedente lo scroller resta l'ultimo elemento e gli serve la coda intera
          per non finire sotto la barra. */}
      <div className={`sc scroll-app${vista === 'corrente' ? ' con-dock' : ''}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 12px' }}>
        {/* L'etichetta di sezione titola il giorno scelto: nome, parola temporale per
            ieri/oggi/domani, e a destra i pasti a casa di QUEL giorno. Le frecce non
            servono più — la striscia sopra fa la stessa cosa con sette bersagli. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '0 0 10px' }}>
          {/* Maiuscola dal `text-transform`, non nelle stringhe: "Lunedì" e "Oggi" si
              scrivono in sentence case come nell'etichetta accessibile della striscia,
              e a leggerle VENERDÌ 18 · DOMANI è l'etichetta (DESIGN.md §Etichetta di sezione). */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            {`${LUNGHI[selezionato]} ${Number(dataSelezionata.slice(8, 10))}`}
            {quandoSelezionato && (
              <span style={{ color: 'var(--testo-2)' }}>{` · ${quandoSelezionato}`}</span>
            )}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>
            {`${nCasaGiorno} ${nCasaGiorno === 1 ? 'PASTO' : 'PASTI'} A CASA`}
          </span>
        </div>

        {erroreCheckin && (
          <p style={{ margin: '0 4px 9px', fontSize: 12.5, color: 'var(--errore)' }}>{erroreCheckin}</p>
        )}

        {/* L'errore di conferma sta nello scroller accanto a quello di check-in, non
            accanto al tasto: nel Dock non c'è posto per un paragrafo. */}
        {erroreConferma && (
          <p style={{ margin: '0 4px 9px', fontSize: 12.5, color: 'var(--errore)' }}>{erroreConferma}</p>
        )}

        {vista === 'corrente' && piatti.length === 0 && (
          // Repertorio vuoto (spec due-porte §2.4): ogni riga sotto direbbe
          // solo "Nessun piatto assegnato", senza dire dove andare. Solo nella
          // vista corrente: il passato non si compila.
          <div style={{ marginBottom: 10, padding: '14px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 4 }}>
              Nessun piatto ancora
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)' }}>
              Le righe si riempiono da sole appena ce n’è qualcuno.
            </div>
            <Link
              href="/piatti"
              style={{
                display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 2,
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', color: 'var(--ink)',
              }}
            >
              COMINCIA DAI PIATTI ›
            </Link>
          </div>
        )}

        <div key={dataSelezionata} className="anim-giorno" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {pastiOrdinati.map((def) => {
            const slot = settimana.slots.find((s) => s.data === dataSelezionata && s.slotDefId === def.id);
            if (!slot) return null;
            const piatto = slot.dishId ? piattiPerId.get(slot.dishId) ?? null : null;
            const apribile = settimana.stato !== 'bozza';
            return (
              <RigaPasto
                key={def.id}
                nomePasto={def.nome}
                stato={slot.stato}
                nomePiatto={piatto?.nome ?? null}
                aree={piatto ? areeDelPiatto(piatto) : []}
                sottotitolo={(slot.stato === 'casa'
                  ? [
                    slot.daPronti ? 'Porzione pronta' : null,
                    piatto ? descriviScelte(piatto, slot.scelte, nomePerIngrediente) : null,
                    slot.porzioniPreparate > 0 ? `+${slot.porzioniPreparate} ${slot.porzioniPreparate === 1 ? 'porzione' : 'porzioni'}` : null,
                  ]
                  // Riga spenta (fuori/saltato/sostituito): niente scelte né
                  // "Porzione pronta" (senza senso fuori da 'casa'), ma le
                  // porzioni preparate restano visibili — consumano a
                  // prescindere dallo stato (fattoreConsumo, spec §6).
                  : [slot.porzioniPreparate > 0 ? `+${slot.porzioniPreparate} ${slot.porzioniPreparate === 1 ? 'porzione' : 'porzioni'}` : null]
                ).filter(Boolean).join(' · ') || null}
                avvisi={avvisiDelPasto(def.id)}
                onToggleStato={() => toggleStato(slot)}
                onApriPiatto={piatto ? () => apriPiatto(piatto.id) : undefined}
                hrefScegli={`/piano/${dataSelezionata}/${def.id}/scegli`}
                onApriAzioni={apribile ? () => setFoglio({ slot, def }) : undefined}
              />
            );
          })}
        </div>
      </div>

      {vista === 'corrente' && (
        <Dock>
          <button type="button" onClick={confermaEVaiLista} disabled={confermando} className="dock-primario">
            {testoConferma}
          </button>
        </Dock>
      )}

      {foglio && (
        <FoglioAzioniPasto
          nomePasto={foglio.def.nome}
          spuntato={foglio.slot.stato === 'saltato' || foglio.slot.stato === 'sostituito'}
          passato={foglio.slot.data <= oggi}
          aCasa={foglio.slot.stato === 'casa'}
          haPiatto={foglio.slot.dishId !== null}
          porzioniPreparate={foglio.slot.porzioniPreparate}
          prontiCongelato={lotti.find((l) => l.mealSlotId === foglio.slot.id)?.congelato ?? false}
          daPronti={foglio.slot.daPronti}
          prontiDisponibili={foglio.slot.dishId ? prontiPerPiatto.get(foglio.slot.dishId) ?? 0 : 0}
          hrefScegli={`/piano/${foglio.slot.data}/${foglio.def.id}/scegli`}
          onSaltato={() => spuntaStato(foglio.slot, 'saltato')}
          onMangiatoAltro={() => spuntaStato(foglio.slot, 'sostituito')}
          onTornaAlPiano={() => tornaAlPiano(foglio.slot)}
          onCucinatoNonMangiato={() => cucinatoNonMangiato(foglio.slot)}
          onPreparaPorzioni={(n, congelato) => preparaPorzioni(foglio.slot, n, congelato)}
          onUsaPronta={() => usaPronta(foglio.slot)}
          onNonUsarePronta={() => nonUsarePronta(foglio.slot)}
          onChiudi={() => setFoglio(null)}
        />
      )}
    </Cornice>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ settimana, children }: { settimana?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Piano" settimana={settimana} />
      {children}
    </div>
  );
}
