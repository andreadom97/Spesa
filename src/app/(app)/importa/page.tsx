'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport, eseguiScritture, type BozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { validaEsito } from '@/domain/import/valida';
import { proponiSlot, normalizza } from '@/domain/import/mapping';
import { traduciBozza, BozzaIncompletaError, type ScrittureImport } from '@/domain/import/commit';
import { client } from '@/data/supabase';
import { Testata } from '@/components/Testata';
import { indirizzoRitorno } from '@/components/pannello/indirizzi';
import { Camera } from './Camera';
import { Acquisizione } from './Acquisizione';
import { Revisione } from './Revisione';
import { Formati } from './Formati';

type Vista =
  | 'caricamento'
  | 'ripresa'
  | 'acquisizione'
  | 'estrazione'
  | 'rifiuto'
  | 'errore'
  | 'bozza';

const SPIEGAZIONE_RIFIUTO =
  'Prescrive obiettivi nutrizionali, non alimenti: Dispesa costruisce la lista dai piatti, e qui non ci sono piatti da cui partire.';

const MESSAGGIO_503 = "L'estrazione non è disponibile su questo ambiente.";
const MESSAGGIO_ERRORE_GENERICO = 'Non siamo riusciti a leggere la dieta. Riprova.';
const MESSAGGIO_422 = 'Non ho capito la dieta: riprova, magari con foto più nitide.';
const MESSAGGIO_SENZA_SESSIONE = 'Serve l’accesso: riapri l’app ed entra di nuovo.';

/**
 * Per quanto tempo, dopo che la fotocamera si è chiusa, i tocchi sulla pagina si ignorano.
 * Il tondo indietro della fotocamera sta sopra la pillola indietro della testata: il
 * `popstate` arriva 16–33 ms dopo `history.back()` (misurato nel browser il 23/09), e un
 * doppio tocco umano dura circa 100–250 ms [ipotesi, non misurato], quindi il secondo tocco
 * cadrebbe sulla pillola e uscirebbe da /importa perdendo i fogli presi.
 */
const TOCCHI_IGNORATI_DOPO_CHIUSURA_MS = 400;

/**
 * La data di oggi in locale, come yyyy-mm-dd: `toISOString` converte a UTC, quindi vicino
 * alla mezzanotte (in un fuso più avanti di UTC, come l'Italia) darebbe il giorno sbagliato.
 * Costruita dai campi locali di `Date`, mai da una stringa UTC.
 */
function dataLocaleOggi(): string {
  const d = new Date();
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Costruisce la mappatura pasti iniziale da proporre in revisione: uno slot
 * proposto per ogni `nomeOriginale` distinto del piano (chiave normalizzata),
 * i `null` di `proponiSlot` (condimenti, nomi ignoti) restano fuori dalla
 * mappa — li assegna l'utente nel passo di revisione.
 */
function mappaturaPastiIniziale(
  piano: BozzaImport['piano'],
  slotDefs: MealSlotDef[],
): Record<string, string> {
  const mappa: Record<string, string> = {};
  const visti = new Set<string>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      for (const pasto of giorno.pasti) {
        const chiave = normalizza(pasto.nomeOriginale);
        if (visti.has(chiave)) continue;
        visti.add(chiave);
        const slotId = proponiSlot(pasto.nomeOriginale, slotDefs);
        if (slotId) mappa[chiave] = slotId;
      }
    }
  }
  return mappa;
}

/**
 * Il wizard di importazione: acquisizione delle pagine della dieta (foto o
 * PDF), estrazione via `/api/import/estrai`, e smistamento fra piano
 * (bozza salvata, passo revisione) e rifiuto onesto (dieta solo-macro, senza
 * un menu da cui partire).
 *
 * Al mount legge una bozza già in corso: se c'è, propone di riprenderla
 * invece di ripartire da zero — un'estrazione va persa solo su conferma
 * esplicita, mai in silenzio.
 */
export default function Importa() {
  const [vista, setVista] = useState<Vista>('caricamento');
  const [bozza, setBozza] = useState<BozzaImport | null>(null);
  // Servono alla revisione (etichette e opzioni dello slot per pasto) e al passo
  // formati (ingredienti esistenti da abbinare o proporre come "è lo stesso di…"):
  // letti una volta al mount, indipendentemente dalla vista corrente, così sono già
  // pronti quando si riprende una bozza salvata (che non rifà il giro di estrazione).
  const [slotDefs, setSlotDefs] = useState<MealSlotDef[]>([]);
  const [ingredientiEsistenti, setIngredientiEsistenti] = useState<Ingredient[]>([]);

  // Acquisizione: stato indipendente dalla vista corrente, così un errore o
  // un giro di estrazione non fanno perdere le foto già scelte. Foto e PDF
  // convivono: ognuno parte dal proprio tasto (spec fase 3 §D).
  const [fotocameraAperta, setFotocameraAperta] = useState(false);
  const [foto, setFoto] = useState<Blob[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);

  const [messaggioErrore, setMessaggioErrore] = useState<string | null>(null);
  const [motivazioneRifiuto, setMotivazioneRifiuto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiBozzaImport(), leggiSlotDefs(), leggiIngredienti()])
      .then(([b, defs, ingredienti]) => {
        if (!vivo) return;
        setSlotDefs(defs);
        setIngredientiEsistenti(ingredienti);
        if (b) {
          setBozza(b);
          setVista('ripresa');
        } else {
          setVista('acquisizione');
        }
      })
      .catch((e) => {
        console.error('importa: lettura della bozza fallita.', e);
        if (vivo) setVista('acquisizione');
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Fra `history.back()` e il suo `popstate` la fotocamera resta montata: un
  // doppio tocco sul tondo chiamerebbe `back()` due volte, e il secondo
  // uscirebbe da /importa perdendo i fogli presi (misurato nel browser il 23/09).
  const inChiusura = useRef(false);
  // Quando la fotocamera si è chiusa l'ultima volta (`performance.now()`). Parte da
  // -Infinity, non da 0: così nessun tocco dei primi istanti dopo il caricamento si perde.
  const chiusaAlle = useRef(-Infinity);

  /**
   * Il gesto indietro del telefono dentro la fotocamera (spec fase 3 §G). A
   * tutto schermo e senza tab bar è il modo naturale di uscirne: senza una voce
   * nella cronologia uscirebbe da /importa e perderebbe i fogli presi. Aprire la
   * fotocamera aggiunge una voce sullo stesso URL (Next 16 integra `pushState`
   * nativo col router); ogni uscita la consuma con `history.back()`, e chi
   * chiude davvero è sempre questo ascoltatore.
   *
   * Chiusa la fotocamera, per `TOCCHI_IGNORATI_DOPO_CHIUSURA_MS` un ascoltatore in
   * cattura su `window` scarta ogni click prima che arrivi a React o al link: il
   * secondo tocco di un doppio tocco sul tondo non esce da /importa.
   */
  useEffect(() => {
    const chiudi = () => {
      inChiusura.current = false;
      chiusaAlle.current = performance.now();
      setFotocameraAperta(false);
    };
    const scartaTroppoPresto = (e: MouseEvent) => {
      if (performance.now() - chiusaAlle.current < TOCCHI_IGNORATI_DOPO_CHIUSURA_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('popstate', chiudi);
    window.addEventListener('click', scartaTroppoPresto, true);
    return () => {
      window.removeEventListener('popstate', chiudi);
      window.removeEventListener('click', scartaTroppoPresto, true);
    };
  }, []);

  function apriFotocamera() {
    inChiusura.current = false;
    window.history.pushState(null, '');
    setFotocameraAperta(true);
  }

  /** Il tondo indietro: consuma la voce, e il `popstate` chiude. Una volta sola. */
  function chiudiFotocamera() {
    if (inChiusura.current) return;
    inChiusura.current = true;
    window.history.back();
  }

  /**
   * `Ho finito`: l'estrazione porta subito la vista a `estrazione` (il primo
   * setState di `estrai` è sincrono); poi la voce si consuma, e quando il
   * `popstate` arriva chiude una fotocamera che la vista non mostra già più.
   */
  function finito() {
    void estrai('foto');
    window.history.back();
  }

  /**
   * `onStato` di `<Revisione>`: ogni modifica che deve sopravvivere (conferma
   * pasto, cambio mappatura, cambio giorno — mai a ogni tasto, vedi Revisione.tsx)
   * aggiorna subito lo stato della pagina e persiste con `salvaBozzaImport`.
   * Nessun debounce: Revisione già decide quando chiamare questa funzione.
   */
  async function aggiornaStatoRevisione(statoRevisione: StatoRevisione) {
    setBozza((prev) => {
      if (!prev) return prev;
      const nuova = { ...prev, statoRevisione };
      salvaBozzaImport(nuova).catch((e) => {
        console.error('importa: salvataggio della revisione fallito.', e);
      });
      return nuova;
    });
  }

  async function ricomincia() {
    try {
      await cancellaBozzaImport();
    } catch (e) {
      console.error('importa: cancellazione della bozza fallita.', e);
    }
    setBozza(null);
    setVista('acquisizione');
  }

  async function estrai(sorgente: 'foto' | 'pdf') {
    setMessaggioErrore(null);
    setVista('estrazione');
    try {
      const { data } = await client().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setMessaggioErrore(MESSAGGIO_SENZA_SESSIONE);
        setVista('errore');
        return;
      }
      // Solo la sorgente scelta finisce nel FormData: le due modalità non si
      // mescolano mai. Lo decide il tasto premuto — `Ho finito` nella fotocamera,
      // `ESTRAI LA DIETA` nel Dock col PDF — e non più una tab (spec fase 3 §D).
      // L'altra resta in memoria, semplicemente non parte con questa richiesta.
      const body = new FormData();
      if (sorgente === 'foto') {
        foto.forEach((f) => body.append('immagini', f));
      } else if (pdf) {
        body.append('documento', pdf);
      }
      const res = await fetch('/api/import/estrai', {
        method: 'POST',
        body,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 503) {
        setMessaggioErrore(MESSAGGIO_503);
        setVista('errore');
        return;
      }
      // 400 (PDF che non si apre), 413 (cap) e 429 (tetto di import): il messaggio
      // della route dice già cosa fare e da quando, si mostra così com'è; senza un
      // corpo leggibile, il generico.
      if (res.status === 400 || res.status === 413 || res.status === 429) {
        const corpo = await res.json().catch(() => null);
        setMessaggioErrore((corpo as { errore?: string } | null)?.errore ?? MESSAGGIO_ERRORE_GENERICO);
        setVista('errore');
        return;
      }
      if (res.status === 422) {
        setMessaggioErrore(MESSAGGIO_422);
        setVista('errore');
        return;
      }
      // Il token era valido a getSession() ma è scaduto prima che il server lo
      // controllasse: stesso messaggio del caso "niente token", non l'errore generico.
      if (res.status === 401) {
        setMessaggioErrore(MESSAGGIO_SENZA_SESSIONE);
        setVista('errore');
        return;
      }
      if (!res.ok) {
        setMessaggioErrore(MESSAGGIO_ERRORE_GENERICO);
        setVista('errore');
        return;
      }
      // Rivalidato lato client: la risposta 200 non è mai attendibile solo
      // perché ha lo status giusto — la forma va verificata di nuovo qui.
      const esito = validaEsito(await res.json());
      if (esito.tipo === 'rifiuto') {
        setMotivazioneRifiuto(esito.rifiuto.motivazione);
        setVista('rifiuto');
        return;
      }
      const slotDefs = await leggiSlotDefs();
      const statoRevisione: StatoRevisione = {
        passo: 'revisione',
        mappaturaPasti: mappaturaPastiIniziale(esito.piano, slotDefs),
        pastiConfermati: [],
        correzioni: {},
        ingredientiNuovi: [],
      };
      const nuovaBozza: BozzaImport = { piano: esito.piano, statoRevisione };
      await salvaBozzaImport(nuovaBozza);
      setBozza(nuovaBozza);
      setVista('bozza');
    } catch (e) {
      console.error('importa: estrazione fallita.', e);
      setMessaggioErrore(MESSAGGIO_ERRORE_GENERICO);
      setVista('errore');
    }
  }

  if (vista === 'caricamento') return <Cornice />;

  if (vista === 'ripresa' && bozza) {
    return (
      <Cornice>
        <SchermataRipresa onRiprendi={() => setVista('bozza')} onRicomincia={ricomincia} />
      </Cornice>
    );
  }

  if (vista === 'rifiuto') {
    return (
      <Cornice>
        <SchermataRifiuto motivazione={motivazioneRifiuto ?? ''} />
      </Cornice>
    );
  }

  if (vista === 'errore') {
    return (
      <Cornice>
        <SchermataErrore
          messaggio={messaggioErrore ?? MESSAGGIO_ERRORE_GENERICO}
          onRiprova={() => setVista('acquisizione')}
        />
      </Cornice>
    );
  }

  if (vista === 'estrazione') {
    return (
      <Cornice>
        <p style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--sec)', fontSize: 14 }}>
          Sto leggendo la dieta…
        </p>
      </Cornice>
    );
  }

  if (vista === 'bozza' && bozza) {
    return (
      <Cornice>
        <ContenutoBozza
          bozza={bozza}
          slotDefs={slotDefs}
          ingredientiEsistenti={ingredientiEsistenti}
          onStatoRevisione={aggiornaStatoRevisione}
        />
      </Cornice>
    );
  }

  // vista === 'acquisizione'. La Camera si monta solo a fotocamera aperta: in un
  // browser vero `getUserMedia` parte al mount, quindi deve accendersi solo quando
  // serve, mai in sottofondo mentre si mostrano le porte o il banner di ripresa. Il
  // cleanup di Camera ferma le tracce a ogni uscita. A tutto schermo, senza Cornice:
  // niente testata, e la tab bar la toglie Camera stessa (spec §E, §G).
  if (fotocameraAperta) {
    // `iniziali={foto}`: Camera si smonta e rimonta a ogni chiusura e riapertura
    // (per esempio dopo un errore di estrazione, RIPROVA torna alle porte) —
    // senza seminare lo stato, la galleria ripartirebbe vuota e il primo foglio
    // successivo sovrascriverebbe in silenzio, via onFoto, quelli già presi.
    return <Camera onFoto={setFoto} iniziali={foto} onIndietro={chiudiFotocamera} onFinito={finito} />;
  }

  return (
    <Cornice>
      <Acquisizione pdf={pdf} onPdf={setPdf} onApriFotocamera={apriFotocamera} onEstraiPdf={() => void estrai('pdf')} />
    </Cornice>
  );
}

function SchermataRipresa({ onRiprendi, onRicomincia }: { onRiprendi: () => void; onRicomincia: () => void }) {
  const [confermaRicomincia, setConfermaRicomincia] = useState(false);

  if (confermaRicomincia) {
    return (
      <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          Ricominciare da capo?
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', marginBottom: 16 }}>
          La bozza salvata andrà persa: la revisione fatta finora non si recupera più.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setConfermaRicomincia(false)}
            style={{
              flex: 1, height: 48, borderRadius: 14, border: '1px solid var(--bordo)', background: 'transparent',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)',
            }}
          >
            ANNULLA
          </button>
          <button
            type="button"
            onClick={onRicomincia}
            style={{
              flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'var(--ink)',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF',
            }}
          >
            Sì, ricomincia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
        Hai un import in corso
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', marginBottom: 16 }}>
        C&apos;è una dieta già estratta in attesa di revisione: puoi riprenderla da dove l&apos;hai lasciata, oppure ricominciare da capo.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => setConfermaRicomincia(true)}
          style={{
            flex: 1, height: 48, borderRadius: 14, border: '1px solid var(--bordo)', background: 'transparent',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)',
          }}
        >
          RICOMINCIA
        </button>
        <button
          type="button"
          onClick={onRiprendi}
          style={{
            flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF',
          }}
        >
          RIPRENDI
        </button>
      </div>
    </div>
  );
}

function SchermataRifiuto({ motivazione }: { motivazione: string }) {
  const router = useRouter();
  return (
    <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 10 }}>
        Questa dieta non ha un menu
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', marginBottom: 10 }}>{motivazione}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--sec)', marginBottom: 18 }}>{SPIEGAZIONE_RIFIUTO}</div>
      {/* Lo stesso della pillola della testata: il pannello sopra la pagina d'origine (spec fase 5 §G.3). */}
      <button
        type="button"
        onClick={() => router.push(indirizzoRitorno())}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 48, borderRadius: 14,
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em',
          border: '1px solid var(--bordo)', color: 'var(--ink)', background: 'none',
        }}
      >
        TORNA A IMPOSTAZIONI
      </button>
    </div>
  );
}

function SchermataErrore({ messaggio, onRiprova }: { messaggio: string; onRiprova: () => void }) {
  return (
    <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', marginBottom: 16 }}>{messaggio}</div>
      <button
        type="button"
        onClick={onRiprova}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 48, borderRadius: 14,
          border: 'none', background: 'var(--ink)',
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF',
        }}
      >
        RIPROVA
      </button>
    </div>
  );
}

function ContenutoBozza({
  bozza,
  slotDefs,
  ingredientiEsistenti,
  onStatoRevisione,
}: {
  bozza: BozzaImport;
  slotDefs: MealSlotDef[];
  ingredientiEsistenti: Ingredient[];
  onStatoRevisione: (s: StatoRevisione) => void;
}) {
  switch (bozza.statoRevisione.passo) {
    case 'revisione':
      return (
        <Revisione piano={bozza.piano} stato={bozza.statoRevisione} slotDefs={slotDefs} onStato={onStatoRevisione} />
      );
    case 'formati':
      return (
        <Formati
          piano={bozza.piano}
          stato={bozza.statoRevisione}
          ingredientiEsistenti={ingredientiEsistenti}
          onStato={onStatoRevisione}
        />
      );
    case 'riepilogo':
      return <Riepilogo piano={bozza.piano} stato={bozza.statoRevisione} onStato={onStatoRevisione} />;
  }
}

/**
 * Il riepilogo finale: traduce la bozza in scritture concrete (`traduciBozza`,
 * con ingredienti e repertorio riletti freschi — non quelli in memoria dal
 * mount del wizard, che potrebbero essere stati superati da un commit
 * parziale precedente) e mostra il conto prima di eseguirle davvero.
 *
 * `BozzaIncompletaError` è un difetto di dati risolvibile solo tornando alla
 * revisione (una mappatura mancante, una quantità mai risolta…): si mostra il
 * messaggio esatto dell'errore, con un link indietro, invece di un errore
 * generico che non direbbe cosa correggere.
 */
function Riepilogo({
  piano,
  stato,
  onStato,
}: {
  piano: PianoEstratto;
  stato: StatoRevisione;
  onStato: (s: StatoRevisione) => void;
}) {
  const router = useRouter();
  const [scritture, setScritture] = useState<ScrittureImport | null>(null);
  const [erroreBozza, setErroreBozza] = useState<string | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [confermaSostituzione, setConfermaSostituzione] = useState(false);
  const [eseguendo, setEseguendo] = useState(false);
  const [erroreEsecuzione, setErroreEsecuzione] = useState<string | null>(null);
  // Incrementato a ogni retry dopo un errore di eseguiScritture: forza l'effect sotto a
  // rileggere ingredienti/repertorio e ricalcolare `scritture` da zero prima del nuovo
  // tentativo — l'idempotenza vive in traduciBozza (riusaDishId, ingredienti già creati
  // agganciati per nome), quindi un retry che riusa lo stesso oggetto `scritture` calcolato
  // una volta salterebbe quella rivalutazione e duplicherebbe ingredienti e piatti sul DB.
  const [tentativo, setTentativo] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      // Azzera subito le scritture precedenti: sia al primo giro (già null) sia a un retry
      // dopo un errore di eseguiScritture, SOSTITUISCI/Sì, sostituisci devono restare
      // disabilitati (vedi `pronto` più sotto) finché questo ricalcolo non è finito, mai
      // riabilitarsi su un oggetto ormai stantio.
      setScritture(null);
      try {
        const [ingredientiEsistenti, repertorioEsistente] = await Promise.all([leggiIngredienti(), leggiRepertorio()]);
        if (!vivo) return;
        const s = traduciBozza(piano, stato, ingredientiEsistenti, repertorioEsistente, dataLocaleOggi());
        setScritture(s);
      } catch (e) {
        if (!vivo) return;
        if (e instanceof BozzaIncompletaError) {
          setErroreBozza(e.message);
        } else {
          console.error('importa: preparazione del riepilogo fallita.', e);
          setErroreCaricamento('Non siamo riusciti a preparare il riepilogo. Riprova più tardi.');
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [piano, stato, tentativo]);

  async function confermaSostituisci() {
    if (!scritture) return;
    setEseguendo(true);
    setErroreEsecuzione(null);
    try {
      await eseguiScritture(scritture);
      router.push('/piano');
    } catch (e) {
      console.error('importa: esecuzione dell’import fallita.', e);
      setErroreEsecuzione('Qualcosa si è fermato: riprova, l’import riprende da dove era.');
      setEseguendo(false);
      // Il prossimo tentativo deve ripartire da scritture ricalcolate, non dallo stesso
      // oggetto: bumpare `tentativo` fa ripartire l'effect sopra, che azzera `scritture` e
      // rilegge ingredienti/repertorio freschi prima di ricalcolare — SOSTITUISCI/Sì,
      // sostituisci restano disabilitati (vedi `pronto` più sotto) finché non è pronto di nuovo.
      setTentativo((n) => n + 1);
    }
  }

  if (erroreBozza) {
    return (
      <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
          C&apos;è ancora qualcosa da sistemare
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', marginBottom: 16 }}>{erroreBozza}</div>
        <button
          type="button"
          onClick={() => onStato({ ...stato, passo: 'revisione' })}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: 'none', background: 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF',
          }}
        >
          TORNA ALLA REVISIONE
        </button>
      </div>
    );
  }

  if (erroreCaricamento) {
    return <p style={{ margin: '20px 16px', color: 'var(--sec)' }}>{erroreCaricamento}</p>;
  }

  // `scritture` è null sia al primo caricamento sia durante il ricalcolo dopo un errore
  // di eseguiScritture (vedi effect sopra): il primo caso non ha ancora nulla da mostrare
  // (schermo vuoto, come sempre), il secondo deve invece continuare a mostrare il messaggio
  // di errore e il dialogo di conferma — solo con SOSTITUISCI/Sì, sostituisci disabilitati
  // finché il ricalcolo non è pronto, mai un ritorno a null che li farebbe sparire.
  if (!scritture && !erroreEsecuzione) return null;

  const pronto = scritture !== null;
  const nPiatti = scritture?.piattiDaCreare.length ?? 0;
  const mSettimane = scritture?.impostazioni.settimaneCiclo ?? 0;
  const kIngredienti = scritture?.ingredientiDaCreare.length ?? 0;
  const xDisattivati = scritture?.piattiDaDisattivare.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* La coda ridotta si applica solo senza il dialogo di conferma sotto: con il
          dialogo aperto il tasto SOSTITUISCI IL PIANO non è renderizzato e lo scroller
          resta l'ultimo elemento, quindi gli serve la coda intera. */}
      <div className={`sc scroll-app${confermaSostituzione ? '' : ' con-piede'}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {pronto && (
          <div style={{ padding: '16px 15px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)', fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            {nPiatti} piatti su {mSettimane} settimane · {kIngredienti} ingredienti nuovi · {xDisattivati} piatti del piano attuale verranno disattivati
          </div>
        )}

        {confermaSostituzione && (
          <div style={{ marginTop: 14, padding: '15px 15px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Sostituire il piano attuale?</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)', marginBottom: 14 }}>
              I piatti del nutrizionista non più presenti nella nuova dieta verranno disattivati; questa azione non si annulla.
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button
                type="button"
                onClick={() => setConfermaSostituzione(false)}
                disabled={eseguendo}
                style={{
                  flex: 1, height: 48, borderRadius: 14, border: '1px solid var(--bordo)', background: 'transparent',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)',
                }}
              >
                ANNULLA
              </button>
              <button
                type="button"
                onClick={confermaSostituisci}
                disabled={eseguendo || !pronto}
                style={{
                  flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'var(--ink)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#FFFFFF',
                }}
              >
                Sì, sostituisci
              </button>
            </div>
          </div>
        )}

        {erroreEsecuzione && <p style={{ margin: '14px 4px 0', fontSize: 13, color: 'var(--sec)' }}>{erroreEsecuzione}</p>}
      </div>

      {!confermaSostituzione && (
        <div className="coda-barra" style={{ padding: '4px 16px 22px' }}>
          <button
            type="button"
            disabled={!pronto}
            onClick={() => setConfermaSostituzione(true)}
            style={{
              width: '100%', height: 54, borderRadius: 18,
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: pronto ? 'var(--ink)' : 'var(--bordo)', color: pronto ? '#FFFFFF' : 'var(--sec)',
            }}
          >
            SOSTITUISCI IL PIANO
          </button>
        </div>
      )}
    </div>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima. La pillola riapre il pannello sopra la
 *  pagina da cui si era partiti (spec fase 5 §G.3, §A.5). */
function Cornice({ children }: { children?: ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata
        titolo="Importa la dieta"
        indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => router.push(indirizzoRitorno()) }}
      />
      {children}
    </div>
  );
}
