'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AreaId, Dish, Ingredient, MealSlot, MealSlotDef, StatoSlot } from '@/domain/types';
import { applicaStato } from '@/domain/week-shape';
import { descriviScelte } from '@/domain/opzioni';
import { giorniDellaSettimana, lunediDi } from '@/domain/date';
import { leggiSettimanaCorrente, creaSettimana, aggiornaSlot, confermaSettimana } from '@/data/settimana';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { generaListe } from '@/data/lista';
import { Testata } from '@/components/Testata';
import { StrisciaGiorni } from '@/components/StrisciaGiorni';
import { RigaPasto } from '@/components/RigaPasto';

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

  // Tiene la promise di creaSettimana in corso, condivisa fra le due
  // esecuzioni dell'effetto che React Strict Mode innesca in sviluppo: senza
  // questo, entrambe leggerebbero "nessuna settimana" e proverebbero a
  // crearla insieme. Non protegge dal caso di due schede o di una ricarica a
  // metà creazione (istanze diverse, ref diversi) — per quello serve il
  // fallback nel catch qui sotto, che è la vera rete di sicurezza.
  const creazioneInCorsoRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        let corrente = await leggiSettimanaCorrente();
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

        const [slotDefs, piatti, ingredienti, impostazioni] = await Promise.all([
          leggiSlotDefs(),
          leggiRepertorio(),
          leggiIngredienti(),
          leggiImpostazioni(),
        ]);
        if (!vivo) return;

        setDati({
          settimana: { id: corrente.id, dataInizio: corrente.dataInizio, stato: corrente.stato, slots: corrente.slots },
          slotDefs,
          piatti,
          ingredienti,
          ordineAree: impostazioni.ordineAree,
        });

        const giorni = giorniDellaSettimana(corrente.dataInizio);
        const indiceOggi = giorni.indexOf(oggiIso());
        setSelezionato(indiceOggi >= 0 ? indiceOggi : 0);
      } catch (errore) {
        console.error('settimana: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la settimana. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, []);

  if (erroreCaricamento) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
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
            return (
              <RigaPasto
                key={def.id}
                nomePasto={def.nome}
                aCasa={slot.stato === 'casa'}
                nomePiatto={piatto?.nome ?? null}
                aree={piatto ? areeDelPiatto(piatto) : []}
                sottotitolo={piatto ? descriviScelte(piatto, slot.scelte, nomePerIngrediente) : null}
                onToggleStato={() => toggleStato(slot)}
                onApriPiatto={piatto ? () => apriPiatto(piatto.id) : undefined}
                hrefScegli={`/settimana/${dataSelezionata}/${def.id}/scegli`}
              />
            );
          })}
        </div>
      </div>

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
