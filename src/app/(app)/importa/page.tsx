'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import type { StatoRevisione } from '@/domain/import/types';
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport, type BozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti } from '@/data/repertorio';
import { validaEsito } from '@/domain/import/valida';
import { proponiSlot, normalizza } from '@/domain/import/mapping';
import { client } from '@/data/supabase';
import { Testata } from '@/components/Testata';
import { indirizzoRitorno } from '@/components/pannello/indirizzi';
import { Dock } from '@/components/Dock';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { TastoSecondario } from '@/components/controlli';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { StatoImporta } from './StatoImporta';
import { Riepilogo } from './Riepilogo';
import { Camera } from './Camera';
import { Acquisizione } from './Acquisizione';
import { Controlla } from './Controlla';
import { Ingredienti } from './Ingredienti';
import { tornaA } from '@/components/tornaA';

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
  // Ingredienti (ingredienti esistenti da abbinare o proporre come "è lo stesso di…"):
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
  // Se la fotocamera è aperta davvero: l'ascoltatore qui sotto agisce solo allora. Anche i
  // dialoghi di Importa (Ricominciare, Sostituire) mettono voci di cronologia, e chiuderli fa un
  // popstate: senza questa guardia scarterebbe per 400 ms il tocco dopo (fase 8a).
  const fotocameraApertaRef = useRef(false);

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
      if (!fotocameraApertaRef.current) return;
      fotocameraApertaRef.current = false;
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
    fotocameraApertaRef.current = true;
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
   * `onStato` di `<Controlla>`: ogni risposta a un dubbio, ogni abbinamento, la
   * chiusura del foglio del giorno, la conferma — mai a ogni tasto, vedi Controlla.tsx.
   * Aggiorna subito lo stato della pagina e persiste con `salvaBozzaImport`.
   * Nessun debounce: Controlla già decide quando chiamare questa funzione.
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
    // Subito, prima della cancellazione: la Cornice resta vuota, e un RIPRENDI toccato mentre
    // `cancellaBozzaImport` è in volo non riapre una bozza che sta per sparire.
    setVista('caricamento');
    try {
      await cancellaBozzaImport();
    } catch (e) {
      console.error('importa: cancellazione della bozza fallita.', e);
    }
    setBozza(null);
    setVista('acquisizione');
  }

  /** Il rifiuto (spec fase 8a §B): si riparte da un file nuovo, quindi senza PDF né fogli. */
  function provaUnAltroFile() {
    setPdf(null);
    setFoto([]);
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
        <SchermataRifiuto motivazione={motivazioneRifiuto ?? ''} onAltroFile={provaUnAltroFile} />
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
    // La bozza si salva quando arriva la risposta, anche se nel frattempo si è lasciata la pagina:
    // la `fetch` non si annulla, e la bozza si ritrova in «Hai un import in corso». Si perde solo
    // chiudendo o ricaricando l'app.
    return (
      <Cornice>
        <StatoImporta
          titolo="Sto leggendo la dieta…"
          testo="Se chiudi l'app prima che abbia finito, la lettura si perde."
          luce
          stato
        />
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

/** La ripresa (spec fase 8a §B, §D): RIPRENDI nel Dock, RICOMINCIA nella scheda e poi il dialogo. */
function SchermataRipresa({ onRiprendi, onRicomincia }: { onRiprendi: () => void; onRicomincia: () => Promise<void> }) {
  const [conferma, setConferma] = useState(false);
  // L'indietro di sistema chiude il dialogo invece di lasciare Importa.
  const { chiudiTuttoPoi } = useIndietroFogli(conferma ? 1 : 0, () => setConferma(false));

  return (
    <>
      <StatoImporta
        titolo="Hai un import in corso"
        testo="C'è una dieta già estratta in attesa di revisione: puoi riprenderla da dove l'hai lasciata, oppure ricominciare da capo."
        conDock
      >
        <TastoSecondario onClick={() => setConferma(true)}>RICOMINCIA</TastoSecondario>
      </StatoImporta>
      <Dock>
        <button type="button" className="dock-primario" onClick={onRiprendi}>RIPRENDI</button>
      </Dock>
      {conferma && (
        <FoglioDalBasso
          etichetta="Ricominciare da capo?"
          onChiudi={() => setConferma(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
        >
          <DialogoConferma
            titolo="Ricominciare da capo?"
            testo="La bozza salvata andrà persa: la revisione fatta finora non si recupera più."
            azione="RICOMINCIA"
            tono="distruttivo"
            // `ricomincia` oggi non lancia mai (spec §D): il testo c'è perché è obbligatorio.
            erroreTesto="Non siamo riusciti a ricominciare. Riprova."
            onConferma={async () => {
              // Prima si consuma la voce del dialogo, poi si riparte dalle porte (useIndietroFogli).
              chiudiTuttoPoi(() => void onRicomincia());
              setConferma(false);
            }}
            onAnnulla={() => setConferma(false)}
          />
        </FoglioDalBasso>
      )}
    </>
  );
}

/** Il rifiuto (spec fase 8a §B, decisione 4): alle Impostazioni si torna con la pillola. */
function SchermataRifiuto({ motivazione, onAltroFile }: { motivazione: string; onAltroFile: () => void }) {
  return (
    <>
      <StatoImporta
        titolo="Questa dieta non ha un menu"
        testo={motivazione || SPIEGAZIONE_RIFIUTO}
        testo2={motivazione ? SPIEGAZIONE_RIFIUTO : undefined}
        conDock
      />
      <Dock>
        <button type="button" className="dock-primario" onClick={onAltroFile}>PROVA UN ALTRO FILE</button>
      </Dock>
    </>
  );
}

/** L'errore (spec fase 8a §B): RIPROVA torna alle porte tenendo PDF e fogli, come oggi. */
function SchermataErrore({ messaggio, onRiprova }: { messaggio: string; onRiprova: () => void }) {
  return (
    <>
      <StatoImporta titolo="La lettura si è fermata" testo={messaggio} conDock />
      <Dock>
        <button type="button" className="dock-primario" onClick={onRiprova}>RIPROVA</button>
      </Dock>
    </>
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
        <Controlla piano={bozza.piano} stato={bozza.statoRevisione} slotDefs={slotDefs} onStato={onStatoRevisione} />
      );
    case 'formati':
      return (
        <Ingredienti piano={bozza.piano} stato={bozza.statoRevisione} ingredientiEsistenti={ingredientiEsistenti} onStato={onStatoRevisione} />
      );
    case 'riepilogo':
      return <Riepilogo piano={bozza.piano} stato={bozza.statoRevisione} onStato={onStatoRevisione} />;
  }
}

/** Colonna a tutta altezza con la testata fissa in cima. La pillola riapre il pannello sopra la
 *  pagina da cui si era partiti (spec fase 5 §G.3, §A.5). */
function Cornice({ children }: { children?: ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata
        titolo="Importa la dieta"
        indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => tornaA(router, indirizzoRitorno()) }}
      />
      {children}
    </div>
  );
}
