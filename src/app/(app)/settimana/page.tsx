'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AreaId, Dish, Ingredient, LottoPronto, MealSlot, MealSlotDef, StatoSlot } from '@/domain/types';
import { applicaStato } from '@/domain/week-shape';
import { descriviScelte } from '@/domain/opzioni';
import { giorniDellaSettimana, lunediDi, sommaGiorni } from '@/domain/date';
import { porzioniUtilizzabili } from '@/domain/pronti';
import { leggiSettimanaCorrente, leggiSettimana, creaSettimana, aggiornaSlot, confermaSettimana } from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiPronti } from '@/data/pronti';
import { generaListe } from '@/data/lista';
import { Testata } from '@/components/Testata';
import { StrisciaGiorni } from '@/components/StrisciaGiorni';
import { RigaPasto } from '@/components/RigaPasto';
import { FoglioAzioniPasto } from '@/components/FoglioAzioniPasto';

const LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

function oggiIso(): string {
  return new Date().toISOString().slice(0, 10);
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
        }

        const [slotDefs, piatti, ingredienti, impostazioni, lottiCaricati] = await Promise.all([
          leggiSlotDefs(),
          leggiRepertorio(),
          leggiIngredienti(),
          leggiImpostazioni(),
          leggiPronti(),
        ]);
        if (!vivo) return;

        setDati({
          settimana: { id: corrente.id, dataInizio: corrente.dataInizio, stato: corrente.stato, slots: corrente.slots },
          slotDefs,
          piatti,
          ingredienti,
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
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
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

  const { settimana, slotDefs, piatti, ingredienti, ordineAree } = dati;
  const giorni = giorniDellaSettimana(settimana.dataInizio);
  const dataSelezionata = giorni[selezionato];
  const oggi = oggiIso();

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

  async function preparaPorzioni(slot: MealSlot, n: number, congelato: boolean) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, porzioniPreparate: n });
    try {
      await aggiornaSlot(slot.id, { porzioniPreparate: n, prontiCongelato: congelato }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: preparazione porzioni fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function usaPronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: true, stato: 'casa' });
    try {
      await aggiornaSlot(slot.id, { daPronti: true, stato: 'casa' }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: uso porzione pronta fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function nonUsarePronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: false });
    try {
      await aggiornaSlot(slot.id, { daPronti: false }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: restituzione porzione fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function cucinatoNonMangiato(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'saltato', 'checkin'), porzioniPreparate: slot.porzioniPreparate + 1 };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'saltato', porzioniPreparate: slot.porzioniPreparate + 1 }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: cucinato-non-mangiato fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function tornaAlPiano(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'casa', 'checkin'), daPronti: false };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'casa', daPronti: false }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: torna al piano fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
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
  const nCasaSettimana = settimana.slots.filter((s) => s.stato === 'casa' && s.dishId !== null).length;
  const testoConferma = settimana.stato === 'bozza' ? 'CONFERMA E CREA LA LISTA' : 'VAI ALLA LISTA';

  return (
    <Cornice>
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

      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 0 10px' }}>
          <button
            type="button"
            onClick={() => setSelezionato((s) => (s + 6) % 7)}
            aria-label="Giorno precedente"
            style={{
              width: 36, height: 36, flex: 'none', borderRadius: 999,
              background: 'rgba(20,22,58,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3.2 5.6 8 10 12.8" stroke="#14163A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>
              {LUNGHI[selezionato]} {Number(dataSelezionata.slice(8, 10))}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelezionato((s) => (s + 1) % 7)}
            aria-label="Giorno successivo"
            style={{
              width: 36, height: 36, flex: 'none', borderRadius: 999,
              background: 'rgba(20,22,58,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3.2 10.4 8 6 12.8" stroke="#14163A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {erroreCheckin && (
          <p style={{ margin: '0 4px 9px', fontSize: 12.5, color: 'var(--sec)' }}>{erroreCheckin}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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
                sottotitolo={[
                  slot.daPronti ? 'Porzione pronta' : null,
                  piatto ? descriviScelte(piatto, slot.scelte, nomePerIngrediente) : null,
                  slot.porzioniPreparate > 0 ? `+${slot.porzioniPreparate} porzioni` : null,
                ].filter(Boolean).join(' · ') || null}
                onToggleStato={() => toggleStato(slot)}
                onApriPiatto={piatto ? () => apriPiatto(piatto.id) : undefined}
                hrefScegli={`/settimana/${dataSelezionata}/${def.id}/scegli`}
                onApriAzioni={apribile ? () => setFoglio({ slot, def }) : undefined}
              />
            );
          })}
        </div>
      </div>

      {vista === 'corrente' && (
        <div style={{ padding: '6px 16px 0', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', color: 'var(--ink)' }}>
              {nCasaSettimana} PASTI A CASA IN SETTIMANA
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.09em', color: 'var(--ter)' }}>
              CASA = A CASA · › APRE IL PIATTO
            </span>
          </div>
          {erroreConferma && (
            <p style={{ margin: '0 4px', fontSize: 12.5, color: 'var(--sec)' }}>{erroreConferma}</p>
          )}
          <button
            type="button"
            onClick={confermaEVaiLista}
            disabled={confermando}
            style={{
              width: '100%', height: 54, borderRadius: 18, textAlign: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: '#14163A', boxShadow: '0 3px 10px rgba(20,22,58,0.24)', color: '#FFFFFF',
              opacity: confermando ? 0.7 : 1,
            }}
          >
            {testoConferma}
          </button>
        </div>
      )}

      {foglio && (
        <FoglioAzioniPasto
          nomePasto={foglio.def.nome}
          spuntato={foglio.slot.stato === 'saltato' || foglio.slot.stato === 'sostituito'}
          passato={foglio.slot.data <= oggi}
          aCasa={foglio.slot.stato === 'casa'}
          porzioniPreparate={foglio.slot.porzioniPreparate}
          daPronti={foglio.slot.daPronti}
          prontiDisponibili={foglio.slot.dishId ? prontiPerPiatto.get(foglio.slot.dishId) ?? 0 : 0}
          hrefScegli={`/settimana/${foglio.slot.data}/${foglio.def.id}/scegli`}
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
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Settimana" aree={[]} />
      {children}
    </div>
  );
}
