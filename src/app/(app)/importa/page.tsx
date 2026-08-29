'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { MealSlotDef } from '@/domain/types';
import type { StatoRevisione } from '@/domain/import/types';
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport, type BozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { validaEsito } from '@/domain/import/valida';
import { proponiSlot, normalizza } from '@/domain/import/mapping';
import { Testata } from '@/components/Testata';
import { Segmento } from '@/components/Segmento';
import { Camera } from './Camera';
import { Revisione } from './Revisione';

type Vista =
  | 'caricamento'
  | 'ripresa'
  | 'acquisizione'
  | 'estrazione'
  | 'rifiuto'
  | 'errore'
  | 'bozza';

const SPIEGAZIONE_RIFIUTO =
  'Prescrive obiettivi nutrizionali, non alimenti: Spesa costruisce la lista dai piatti, e qui non ci sono piatti da cui partire.';

const MESSAGGIO_503 = "L'estrazione non è disponibile su questo ambiente.";
const MESSAGGIO_ERRORE_GENERICO = 'Non siamo riusciti a leggere la dieta. Riprova.';

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
  // Servono alla revisione (etichette e opzioni dello slot per pasto): letti una volta
  // al mount, indipendentemente dalla vista corrente, così sono già pronti quando si
  // riprende una bozza salvata (che non rifà il giro di estrazione).
  const [slotDefs, setSlotDefs] = useState<MealSlotDef[]>([]);

  // Acquisizione: stato indipendente dalla vista corrente, così un errore o
  // un giro di estrazione non fanno perdere le foto già scelte.
  const [tab, setTab] = useState<'foto' | 'pdf'>('foto');
  const [foto, setFoto] = useState<Blob[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);

  const [messaggioErrore, setMessaggioErrore] = useState<string | null>(null);
  const [motivazioneRifiuto, setMotivazioneRifiuto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiBozzaImport(), leggiSlotDefs()])
      .then(([b, defs]) => {
        if (!vivo) return;
        setSlotDefs(defs);
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

  async function estrai() {
    setMessaggioErrore(null);
    setVista('estrazione');
    try {
      // Solo la tab attiva finisce nel FormData: le due modalità non si
      // mescolano mai (un PDF scelto e poi abbandonato per tornare alle foto
      // non deve rispuntare in un invio successivo, e viceversa). Lo stato
      // dell'altra tab resta comunque in memoria — tornare indietro non lo
      // perde — semplicemente non parte con questa richiesta.
      const body = new FormData();
      if (tab === 'foto') {
        foto.forEach((f) => body.append('immagini', f));
      } else if (pdf) {
        body.append('documento', pdf);
      }
      const res = await fetch('/api/import/estrai', { method: 'POST', body });
      if (res.status === 503) {
        setMessaggioErrore(MESSAGGIO_503);
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
        <ContenutoBozza bozza={bozza} slotDefs={slotDefs} onStatoRevisione={aggiornaStatoRevisione} />
      </Cornice>
    );
  }

  // vista === 'acquisizione': la Camera si monta solo qui (e solo con la tab
  // FOTO attiva) — in un browser vero `getUserMedia` parte al mount, quindi
  // deve accendersi solo quando serve davvero, mai in sottofondo mentre si
  // mostra il banner di ripresa o il caricamento. Il cleanup di Camera ferma
  // le tracce ogni volta che si esce da questa vista.
  return (
    <Cornice>
      <SchermataAcquisizione
        tab={tab}
        onTab={setTab}
        foto={foto}
        onFoto={setFoto}
        pdf={pdf}
        onPdf={setPdf}
        onEstrai={estrai}
      />
    </Cornice>
  );
}

interface PropsAcquisizione {
  tab: 'foto' | 'pdf';
  onTab: (tab: 'foto' | 'pdf') => void;
  foto: Blob[];
  onFoto: (foto: Blob[]) => void;
  pdf: File | null;
  onPdf: (pdf: File | null) => void;
  onEstrai: () => void;
}

function SchermataAcquisizione({ tab, onTab, foto, onFoto, pdf, onPdf, onEstrai }: PropsAcquisizione) {
  // Solo la tab attiva conta: uno stato residuo nell'altra tab (una foto
  // scattata prima di passare al PDF, o viceversa) non deve abilitare
  // l'estrazione finché non è quella la modalità scelta — `estrai()` invia
  // comunque solo il payload della tab attiva, quindi il bottone deve
  // riflettere esattamente quello.
  const abilitato = tab === 'foto' ? foto.length >= 1 : pdf !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '0 16px 10px' }}>
        <Segmento
          opzioni={[
            { id: 'foto', label: 'FOTO' },
            { id: 'pdf', label: 'PDF' },
          ]}
          valore={tab}
          onCambia={(id) => onTab(id as 'foto' | 'pdf')}
          variante="blocco"
        />
      </div>

      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 16px' }}>
        {tab === 'foto' ? (
          // `iniziali={foto}`: Camera si smonta e rimonta a ogni uscita/rientro
          // in questa vista (es. dopo un errore di estrazione, RIPROVA torna
          // qui da capo) — senza seminare lo stato, la galleria ripartirebbe
          // vuota e il primo scatto successivo sovrascriverebbe in silenzio,
          // via onFoto, gli scatti già presenti nel genitore.
          <Camera onFoto={onFoto} iniziali={foto} />
        ) : (
          <label
            style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: 16, borderRadius: 14,
              border: '1px solid var(--bordo)', background: 'var(--superficie)',
              color: 'var(--sec)', fontSize: 13,
            }}
          >
            {pdf ? pdf.name : 'Scegli il PDF della dieta'}
            <input
              type="file"
              accept="application/pdf"
              aria-label="scegli il PDF della dieta"
              onChange={(e) => onPdf(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13 }}
            />
          </label>
        )}
      </div>

      <div style={{ padding: '4px 16px 0' }}>
        <button
          type="button"
          disabled={!abilitato}
          onClick={onEstrai}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 54, borderRadius: 18, border: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            background: abilitato ? 'var(--ink)' : 'var(--bordo)',
            color: abilitato ? '#FFFFFF' : 'var(--sec)',
          }}
        >
          ESTRAI LA DIETA
        </button>
      </div>
    </div>
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
  return (
    <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 10 }}>
        Questa dieta non ha un menu
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', marginBottom: 10 }}>{motivazione}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--sec)', marginBottom: 18 }}>{SPIEGAZIONE_RIFIUTO}</div>
      <Link
        href="/impostazioni"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14,
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em',
          border: '1px solid var(--bordo)', color: 'var(--ink)',
        }}
      >
        TORNA A IMPOSTAZIONI
      </Link>
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

/**
 * Segnaposto per i passi successivi: Task 11 sostituisce 'formati'. 'riepilogo'
 * non ha ancora un task assegnato.
 */
function ContenutoBozza({
  bozza,
  slotDefs,
  onStatoRevisione,
}: {
  bozza: BozzaImport;
  slotDefs: MealSlotDef[];
  onStatoRevisione: (s: StatoRevisione) => void;
}) {
  switch (bozza.statoRevisione.passo) {
    case 'revisione':
      return (
        <Revisione piano={bozza.piano} stato={bozza.statoRevisione} slotDefs={slotDefs} onStato={onStatoRevisione} />
      );
    case 'formati':
      return <p style={{ margin: '20px 16px', color: 'var(--sec)' }}>Formati — in arrivo.</p>;
    case 'riepilogo':
      return <p style={{ margin: '20px 16px', color: 'var(--sec)' }}>Riepilogo — in arrivo.</p>;
  }
}

/** Colonna a tutta altezza con la testata fissa in cima, come le altre pagine dell'app. */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Importa la dieta" />
      {children}
    </div>
  );
}
