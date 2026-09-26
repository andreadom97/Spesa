'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ORDINE_MARCHIO } from '@/domain/aree';
import { listaFinita, contaVoci } from '@/domain/lista-finita';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, chiudiSpesa } from '@/data/lista';
import { leggiRisparmioSettimana } from '@/data/risparmio';
import type { VoceEvitata } from '@/domain/list-builder';
import { riassumiEvitato, formattaQuantita, formattaEuro } from '@/domain/risparmio';
import { etichettaSettimana } from '@/domain/settimana-label';
import { GIORNI_CONTROLLO_DEFAULT, fraCadenza, type GiorniControllo } from '@/domain/pantry';
import { Testata } from '@/components/Testata';
import { Marchio } from '@/components/Marchio';
import { Dock } from '@/components/Dock';
import { MessaggioErrore } from '@/components/controlli';
import { Carico } from '@/components/pannello/pezzi';
import { GUARDIA_DOPPIO_TOCCO_MS, adesso } from './guardia';

interface Stato {
  weekId: string;
  settimanaLabel: string;
  totaleVoci: number;
  /** Il non ricomprato fissato alla generazione della lista; vuoto se la settimana non ha piano o la lettura è fallita. */
  evitato: VoceEvitata[];
  /** La cadenza dei controlli, per la frase di CHIUDENDO LA SPESA: viaggia con la lista (leggiListe). */
  giorniControllo: GiorniControllo;
}

/**
 * Il contatore è un di più rispetto a "Hai preso tutto": se la lettura
 * fallisce la scheda semplicemente non compare, e la chiusura resta possibile.
 */
async function leggiEvitatoSenzaBloccare(weekId: string): Promise<VoceEvitata[]> {
  try {
    return await leggiRisparmioSettimana(weekId);
  } catch (errore) {
    console.error('lista/fatta: lettura del non ricomprato fallita.', errore);
    return [];
  }
}

/**
 * La riga principale e quella secondaria della scheda "NON RICOMPRATO QUESTA
 * SETTIMANA" (spec §5). Il segmento in euro c'è solo se almeno un ingrediente
 * evitato ha un prezzo; la quantità solo se non è tutta a zero.
 */
function testoNonRicomprato(voci: VoceEvitata[]): { principale: string; secondaria: string | null } {
  const r = riassumiEvitato(voci);
  if (r.confezioni === 0) {
    return { principale: 'Niente, questa settimana: il residuo si costruisce spesa dopo spesa', secondaria: null };
  }
  const segmenti = [r.confezioni === 1 ? '1 confezione' : `${r.confezioni} confezioni`];
  const quantita = formattaQuantita(r.quantita);
  if (quantita) segmenti.push(quantita);
  if (r.euro !== null) segmenti.push(formattaEuro(r.euro));

  let secondaria: string | null = null;
  if (r.euro === null) {
    secondaria = 'metti un prezzo agli ingredienti per vederlo in euro';
  } else if (r.ingredientiConPrezzo < r.ingredientiEvitati) {
    secondaria = `su ${r.ingredientiConPrezzo} ingredienti con prezzo`;
  }
  return { principale: segmenti.join(' · '), secondaria };
}

/** Il ritorno alla Lista: la pillola della Testata in modo indietro (spec fase 6 §A.2). */
type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/**
 * Il traguardo, «Fine spesa»: l'unico momento in cui il residuo smette di essere previsto
 * e diventa reale. Senza CHIUDI LA SPESA la registrazione silenziosa non ha un istante in
 * cui avvenire — la settimana dopo la lista ricomprerebbe tutto da capo.
 *
 * Raggiungibile solo a spesa davvero finita: un link diretto o una ricarica a metà spunta
 * non deve mai mostrare "tutto pieno" quando non lo è, quindi si torna a /lista invece di
 * inventare un traguardo.
 *
 * CHIUDI LA SPESA non chiede conferma (DESIGN.md §9, eccezione del 26/09): si arriva qui
 * solo da HAI PRESO TUTTO, e questa pagina è il secondo passo. Sta nel Dock, dove era HAI
 * PRESO TUTTO, e per questo ignora i tocchi per GUARDIA_DOPPIO_TOCCO_MS da quando compare.
 */
export default function ListaFatta() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [chiudendo, setChiudendo] = useState(false);
  const [erroreChiusura, setErroreChiusura] = useState<string | null>(null);
  /** Quando è comparso CHIUDI LA SPESA: la guardia del doppio tocco conta da qui. */
  const comparsoRef = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          router.replace('/lista');
          return;
        }
        // Spesa già chiusa (un link vecchio, il tasto indietro): il traguardo
        // è passato e CHIUDI sarebbe un no-op che sembra fare qualcosa.
        if (settimana.stato === 'chiusa') {
          router.replace('/piano');
          return;
        }
        const lista = await leggiListe(settimana.id);
        if (!lista || !listaFinita(lista)) {
          router.replace('/lista');
          return;
        }
        const evitato = await leggiEvitatoSenzaBloccare(settimana.id);
        if (!vivo) return;
        setStato({
          weekId: settimana.id,
          settimanaLabel: etichettaSettimana(settimana.dataInizio),
          totaleVoci: contaVoci(lista),
          evitato,
          giorniControllo: lista.giorniControllo ?? GIORNI_CONTROLLO_DEFAULT,
        });
      } catch (errore) {
        console.error('lista/fatta: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la spesa. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [router]);

  // Il Dock compare nel render in cui `stato` arriva: l'effetto di quel render segna l'istante.
  // Di layout, non passivo: `stato` arriva da una promessa, e un useEffect girerebbe in un task
  // dopo il commit, segnando la comparsa più tardi di quando il tasto è davvero a schermo (era la
  // causa del test intermittente «in volo il tasto è disabled»).
  useLayoutEffect(() => {
    if (stato && comparsoRef.current === null) comparsoRef.current = adesso();
  }, [stato]);

  async function onChiudi() {
    if (!stato || chiudendo) return;
    // Il secondo tocco di un doppio tocco su HAI PRESO TUTTO, che stava qui: si ignora.
    if (comparsoRef.current === null || adesso() - comparsoRef.current < GUARDIA_DOPPIO_TOCCO_MS) return;
    setChiudendo(true);
    setErroreChiusura(null);
    try {
      await chiudiSpesa(stato.weekId);
      router.push('/piano');
    } catch (errore) {
      console.error('lista/fatta: chiusura della spesa fallita.', errore);
      setErroreChiusura('Non siamo riusciti a chiudere la spesa. Riprova.');
      setChiudendo(false);
    }
  }

  const indietro: Indietro = { etichetta: 'LISTA', ariaLabel: 'Torna alla lista', onTorna: () => router.push('/lista') };

  if (erroreCaricamento) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore>{erroreCaricamento}</MessaggioErrore>
        </div>
      </Cornice>
    );
  }

  if (!stato) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </Cornice>
    );
  }

  const nonRicomprato = stato.evitato.length > 0 ? testoNonRicomprato(stato.evitato) : null;

  return (
    <Cornice settimana={stato.settimanaLabel} indietro={indietro}>
      <div
        className="sc scroll-app con-dock"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px',
          // 'safe center': a contenuto più alto dello spazio, la prima scheda parte dal
          // bordo invece di uscire sopra e restare irraggiungibile scorrendo (rilievo I1).
          display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: 12,
        }}
      >
        <div style={{ padding: '26px 20px', borderRadius: 22, background: 'var(--superficie)', border: '1px solid var(--bordo)', textAlign: 'center' }}>
          {/* Il Marchio pieno nella resa grande (DESIGN.md §8 Marchio): decorativo, il testo sotto dice lo stesso. */}
          <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Marchio aree={[]} lato={20} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }}>
            Hai preso tutto
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>
            {stato.totaleVoci} voci su {stato.totaleVoci}, {ORDINE_MARCHIO.length} aree finite. Il marchio in
            alto è tutto pieno: ogni area è a posto, non ti manca niente.
          </div>
        </div>

        {/* Il residuo derivato reso visibile: quante confezioni la lista non
            ha chiesto perché c'erano già. Assente senza righe (settimana
            senza piano): niente scheda vuota. */}
        {nonRicomprato && (
          <Riquadro etichetta="NON RICOMPRATO QUESTA SETTIMANA">
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>{nonRicomprato.principale}</div>
            {nonRicomprato.secondaria && (
              <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--testo-2)', marginTop: 3 }}>{nonRicomprato.secondaria}</div>
            )}
          </Riquadro>
        )}

        <Riquadro etichetta="CHIUDENDO LA SPESA">
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            {`L’app registra cosa hai comprato e quando. Serve solo a ricordarti ${fraCadenza(stato.giorniControllo)} che l’olio sta per finire: non lo vedi da nessuna parte finché non serve.`}
          </div>
        </Riquadro>

        {/* Prima di chiudere: le confezioni vere (spec scan-confezione §1).
            Dopo la chiusura il residuo è già accreditato e la correzione non
            avrebbe più effetto, per questo il link sta qui e non altrove. */}
        <Link
          href="/lista/confezioni"
          style={{
            alignSelf: 'center', minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 8px',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          CONFEZIONI DIVERSE? SCANSIONA
        </Link>

        {erroreChiusura && <MessaggioErrore ruolo="alert">{erroreChiusura}</MessaggioErrore>}
      </div>

      <Dock>
        <button type="button" className="dock-primario" onClick={() => void onChiudi()} disabled={chiudendo}>
          CHIUDI LA SPESA
        </button>
      </Dock>
    </Cornice>
  );
}

/** Le schede secondarie del traguardo: fondo a 0,035 (§2.5), etichetta mono in --testo-2. */
function Riquadro({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.035)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--testo-2)', marginBottom: 7 }}>
        {etichetta}
      </div>
      {children}
    </div>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ settimana, indietro, children }: { settimana?: string; indietro: Indietro; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Fine spesa" settimana={settimana} indietro={indietro} />
      {children}
    </div>
  );
}
