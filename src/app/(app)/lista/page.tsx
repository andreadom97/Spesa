'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, spunta, type ListaSalvata, type SezioneSalvata, type VoceSalvata } from '@/data/lista';
import { rispondiControllo } from '@/data/dispensa';
import { accodaSpunta, leggiCoda, rimuoviConfermate, applicaCodaSuVoci, type Spunta } from '@/offline/coda';
import { Testata } from '@/components/Testata';
import { Tessera } from '@/components/Tessera';
import { RigaControllo } from '@/components/RigaControllo';

const INK = '#14163A';
const MUT = '#8A8A96';

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/** "31 AGO — 6 SET": il lunedì e la domenica della settimana, come nell'artboard. */
function formattaPillola(dataInizio: string): string {
  const inizio = new Date(`${dataInizio}T00:00:00Z`);
  const fine = new Date(inizio.getTime() + 6 * 86_400_000);
  const g = (d: Date) => `${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
  return `${g(inizio)} — ${g(fine)}`;
}

/** Voci totali e voci spuntate della sola classe "voci" (i controlli non contano, come in Lista.dc.html). */
function tally(sezioni: SezioneSalvata[]): { totale: number; fatte: number } {
  let totale = 0;
  let fatte = 0;
  for (const s of sezioni) {
    for (const v of s.voci) {
      totale += 1;
      if (v.spuntato) fatte += 1;
    }
  }
  return { totale, fatte };
}

/**
 * Vero solo quando non resta più nulla da fare: ogni voce spuntata *e*
 * nessun controllo ancora in sospeso (un controllo si risponde, non si
 * spunta — finché non ha risposta la spesa non è finita). Guida solo il tap
 * verso /lista/fatta: quella schermata non si fida di questo calcolo e lo
 * rifà per conto suo prima di mostrare "hai preso tutto".
 */
function tuttoFatto(lista: ListaSalvata): boolean {
  const sezioni = [...lista.base, ...lista.topup];
  const haVoci = sezioni.some((s) => s.voci.length > 0);
  return haVoci && sezioni.every((s) => s.controlli.length === 0 && s.voci.every((v) => v.spuntato));
}

/**
 * Le aree con almeno una voce non spuntata *o* un controllo ancora in
 * sospeso, considerando base e topup insieme. Solo qui si calcolano le aree
 * mancanti: un'area assente dalla spesa non entra in questo insieme, quindi
 * resta piena nel marchio.
 *
 * I controlli contano quanto le voci (I10): tuttoFatto() già richiede zero
 * controlli in sospeso oltre a ogni voce spuntata, quindi un'area con solo
 * un controllo aperto non è "a posto" — se il marchio la segnasse piena,
 * l'utente vedrebbe tutto completo senza capire perché HAI PRESO TUTTO non
 * compare.
 */
function areeMancanti(lista: ListaSalvata): AreaId[] {
  const mancanti = new Set<AreaId>();
  for (const sezione of [...lista.base, ...lista.topup]) {
    if (sezione.voci.some((v) => !v.spuntato) || sezione.controlli.length > 0) mancanti.add(sezione.area);
  }
  return [...mancanti];
}

function conSpuntaLocale(lista: ListaSalvata, itemId: string, spuntato: boolean): ListaSalvata {
  const applica = (sezioni: SezioneSalvata[]): SezioneSalvata[] => sezioni.map((s) => ({
    ...s,
    voci: s.voci.map((v) => (v.id === itemId ? { ...v, spuntato } : v)),
    controlli: s.controlli.map((c) => (c.id === itemId ? { ...c, spuntato } : c)),
  }));
  return { ...lista, base: applica(lista.base), topup: applica(lista.topup) };
}

function conControlloRimosso(lista: ListaSalvata, itemId: string): ListaSalvata {
  const applica = (sezioni: SezioneSalvata[]): SezioneSalvata[] => sezioni.map((s) => ({
    ...s,
    controlli: s.controlli.filter((c) => c.id !== itemId),
  }));
  return { ...lista, base: applica(lista.base), topup: applica(lista.topup) };
}

/** Lo stato locale in attesa ha sempre ragione: applicato a voci e controlli di entrambe le liste. */
function applicaCodaLista(lista: ListaSalvata): ListaSalvata {
  const applica = (sezioni: SezioneSalvata[]): SezioneSalvata[] => sezioni.map((s) => ({
    ...s,
    voci: applicaCodaSuVoci(s.voci),
    controlli: applicaCodaSuVoci(s.controlli),
  }));
  return { ...lista, base: applica(lista.base), topup: applica(lista.topup) };
}

// Lucchetto modulo: sincronizzaCoda parte da ogni tap (oltre che al
// montaggio e al ritorno online), senza debounce. Senza un lucchetto due
// chiamate sovrapposte leggerebbero la coda due volte con istantanee
// diverse, e la prima a risolvere svuoterebbe voci che la seconda ha ancora
// in volo — è il bug critico trovato in review. `inVolo` fa sì che una
// chiamata che arriva mentre un giro è già in corso si limiti ad aspettarlo,
// invece di partire in parallelo con un'istantanea vecchia; `richiestaAncora`
// fa sì che, se durante quel giro è arrivato un nuovo tap, si rifaccia
// subito un altro giro invece di lasciare quella voce ferma fino al
// prossimo trigger esterno.
let inVolo: Promise<void> | null = null;
let richiestaAncora = false;

/**
 * Un giro: tenta di scrivere ogni voce ancora in coda, e toglie dalla coda
 * *solo* quelle che quella scrittura ha davvero confermato — mai un
 * `svuotaCoda()` incondizionato. Un fallimento (offline, blip di rete) sulla
 * singola voce non tocca le altre: `Promise.allSettled`, non `Promise.all`,
 * perché una voce fallita non deve far sembrare fallite anche le sorelle
 * riuscite nello stesso giro.
 */
async function eseguiGiroDiSincronizzazione(): Promise<void> {
  const istantanea = leggiCoda();
  if (istantanea.length === 0) return;
  const esiti = await Promise.allSettled(
    istantanea.map((s) => spunta(s.itemId, s.spuntato).then(() => s)),
  );
  const confermate = esiti
    .filter((e): e is PromiseFulfilledResult<Spunta> => e.status === 'fulfilled')
    .map((e) => e.value);
  if (confermate.length > 0) rimuoviConfermate(confermate);
}

async function sincronizzaCoda(): Promise<void> {
  if (inVolo) {
    richiestaAncora = true;
    return inVolo;
  }
  inVolo = eseguiGiroDiSincronizzazione();
  try {
    await inVolo;
  } finally {
    inVolo = null;
  }
  if (richiestaAncora) {
    richiestaAncora = false;
    await sincronizzaCoda();
  }
}

interface StatoCarico {
  weekId: string;
  settimanaLabel: string;
  lista: ListaSalvata;
}

/**
 * Lista: la schermata per cui il prodotto esiste. Genera niente da sola —
 * generaListe l'ha già congelata in shopping_list_item quando la Settimana è
 * stata confermata — legge solo, e ogni spunta passa dalla coda offline
 * prima di provare il server.
 */
export default function Lista() {
  const [stato, setStato] = useState<StatoCarico | null>(null);
  const [nonTrovata, setNonTrovata] = useState(false);
  const [settimanaLabelVuoto, setSettimanaLabelVuoto] = useState<string | undefined>(undefined);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [tab, setTab] = useState<'base' | 'topup'>('base');
  const [rigaInVolo, setRigaInVolo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          if (vivo) setNonTrovata(true);
          return;
        }
        const label = formattaPillola(settimana.dataInizio);
        const lista = await leggiListe(settimana.id);
        if (!lista) {
          if (vivo) {
            setSettimanaLabelVuoto(label);
            setNonTrovata(true);
          }
          return;
        }
        if (!vivo) return;
        setStato({ weekId: settimana.id, settimanaLabel: label, lista: applicaCodaLista(lista) });
        void sincronizzaCoda();
      } catch (errore) {
        console.error('lista: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la lista. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    function alRitornoOnline() {
      void sincronizzaCoda();
    }
    window.addEventListener('online', alRitornoOnline);
    return () => window.removeEventListener('online', alRitornoOnline);
  }, []);

  function toggleVoce(voce: VoceSalvata) {
    const nuovo = !voce.spuntato;
    setStato((prev) => (prev ? { ...prev, lista: conSpuntaLocale(prev.lista, voce.id, nuovo) } : prev));
    accodaSpunta(voce.id, nuovo);
    void sincronizzaCoda();
  }

  async function rispondi(controllo: VoceSalvata, listaId: string | null, ancora: boolean) {
    if (!listaId || rigaInVolo) return;
    setErroreAzione(null);
    setRigaInVolo(controllo.id);
    try {
      await rispondiControllo(controllo.ingredientId, listaId, ancora);
      if (ancora) {
        setStato((prev) => (prev ? { ...prev, lista: conControlloRimosso(prev.lista, controllo.id) } : prev));
      } else if (stato) {
        // "No" trasforma la riga in una voce vera (formato_confezione non è
        // mai arrivato al client): si ricarica dal server per avere i numeri
        // giusti, invece di indovinarli qui.
        try {
          const fresca = await leggiListe(stato.weekId);
          if (fresca) setStato((p) => (p ? { ...p, lista: applicaCodaLista(fresca) } : p));
        } catch (errore) {
          console.error('lista: ricaricamento dopo "no" fallito.', errore);
          setErroreAzione('Risposta salvata, ma non siamo riusciti a ricaricare la lista. Ricarica la pagina.');
        }
      }
    } catch (errore) {
      console.error('lista: risposta al controllo fallita.', errore);
      setErroreAzione('Non siamo riusciti a salvare la risposta. Riprova.');
    } finally {
      setRigaInVolo(null);
    }
  }

  if (erroreCaricamento) {
    return (
      <Cornice titolo="Spesa" aree={[]}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (nonTrovata) {
    return (
      <Cornice titolo="Spesa" settimana={settimanaLabelVuoto} aree={[]}>
        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ padding: '26px 20px', borderRadius: 22, background: '#FFFFFF', border: '1px solid rgba(20,22,58,0.07)', textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, margin: '0 auto 20px', borderRadius: 14, border: '2px dashed rgba(20,22,58,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 6.5h16M4 12h16M4 17.5h11" stroke="#C4C4CE" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }}>
              La lista non c’è ancora
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: '#8A8A96' }}>
              Nasce dalla settimana: appena confermi quali pasti farai a casa, qui trovi cosa comprare e quante confezioni.
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 16px 0' }}>
          <Link
            href="/settimana"
            style={{
              width: '100%', height: 54, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: '#14163A', boxShadow: '0 3px 10px rgba(20,22,58,0.24)', color: '#FFFFFF',
            }}
          >
            VAI ALLA SETTIMANA
          </Link>
        </div>
      </Cornice>
    );
  }

  if (!stato) {
    // Nessuno stato di caricamento nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice titolo="Spesa" aree={[]} />;
  }

  const { lista } = stato;
  const sezioniAttive = (tab === 'base' ? lista.base : lista.topup)
    .filter((s) => s.voci.length > 0 || s.controlli.length > 0);
  const listaIdAttiva = tab === 'base' ? lista.baseListaId : lista.topupListaId;
  const tallyBase = tally(lista.base);
  const tallyTopup = tally(lista.topup);

  return (
    <Cornice titolo="Spesa" settimana={stato.settimanaLabel} aree={areeMancanti(lista)}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {erroreAzione && (
          <p style={{ margin: '0 4px', fontSize: 12.5, color: 'var(--sec)' }}>{erroreAzione}</p>
        )}
        {sezioniAttive.length === 0 && (
          <p style={{ margin: '20px 4px', fontSize: 14, color: 'var(--sec)', textAlign: 'center' }}>
            Niente da comprare qui.
          </p>
        )}
        {sezioniAttive.map((sezione) => (
          <CartaSezione
            key={sezione.area}
            sezione={sezione}
            rigaInVolo={rigaInVolo}
            onToggleVoce={toggleVoce}
            onSi={(c) => rispondi(c, listaIdAttiva, true)}
            onNo={(c) => rispondi(c, listaIdAttiva, false)}
          />
        ))}
      </div>

      <SelettoreTab
        tab={tab}
        daPrendereBase={tallyBase.totale - tallyBase.fatte}
        daPrendereTopup={tallyTopup.totale - tallyTopup.fatte}
        onCambia={setTab}
      />

      {tuttoFatto(lista) && (
        <div style={{ padding: '8px 16px 0' }}>
          <Link
            href="/lista/fatta"
            style={{
              width: '100%', height: 54, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: '#14163A', boxShadow: '0 3px 10px rgba(20,22,58,0.24)', color: '#FFFFFF',
            }}
          >
            HAI PRESO TUTTO
          </Link>
        </div>
      )}
    </Cornice>
  );
}

function CartaSezione({
  sezione, rigaInVolo, onToggleVoce, onSi, onNo,
}: {
  sezione: SezioneSalvata;
  rigaInVolo: string | null;
  onToggleVoce: (v: VoceSalvata) => void;
  onSi: (c: VoceSalvata) => void;
  onNo: (c: VoceSalvata) => void;
}) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 22, border: '1px solid rgba(20,22,58,0.07)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, flex: 'none', background: coloreArea(sezione.area), display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: INK }}>
            {nomeArea(sezione.area)}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: MUT }}>
          {sezione.voci.length} VOCI
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, padding: '0 12px 12px' }}>
        {sezione.voci.map((v, i) => (
          <Tessera
            key={v.id}
            nome={v.nome}
            area={v.area}
            unita={v.unita}
            fabbisogno={v.fabbisogno}
            residuo={v.residuo}
            confezioni={v.confezioni}
            quantitaTotale={v.quantitaTotale}
            spuntato={v.spuntato}
            mostraDettaglio={v.mostraDettaglio}
            protagonista={i === 0}
            onToggle={() => onToggleVoce(v)}
          />
        ))}
      </div>
      {sezione.controlli.map((c) => (
        <RigaControllo
          key={c.id}
          nome={c.nome}
          area={c.area}
          onSi={() => onSi(c)}
          onNo={() => onNo(c)}
          disabilitato={rigaInVolo === c.id}
        />
      ))}
    </div>
  );
}

function SelettoreTab({
  tab, daPrendereBase, daPrendereTopup, onCambia,
}: {
  tab: 'base' | 'topup';
  daPrendereBase: number;
  daPrendereTopup: number;
  onCambia: (t: 'base' | 'topup') => void;
}) {
  const acceso = { flex: 1, padding: '13px 16px', borderRadius: 18, background: INK };
  const spento = { flex: 'none' as const, width: 96, padding: '13px 12px', borderRadius: 18, background: 'rgba(20,22,58,0.05)' };
  const rigaAccesa = { display: 'flex', alignItems: 'baseline' as const, justifyContent: 'space-between' as const, gap: 10 };
  const rigaSpenta = { display: 'flex', alignItems: 'baseline' as const, justifyContent: 'center' as const, gap: 6 };
  const etichettaAccesa = { fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF' };
  const etichettaSpenta = { fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: MUT };
  const contoAcceso = { fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.62)' };
  const contoSpento = { fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'rgba(20,22,58,0.34)' };

  return (
    <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
      <button type="button" onClick={() => onCambia('base')} style={tab === 'base' ? acceso : spento}>
        <div style={tab === 'base' ? rigaAccesa : rigaSpenta}>
          <span style={tab === 'base' ? etichettaAccesa : etichettaSpenta}>BASE</span>
          <span style={tab === 'base' ? contoAcceso : contoSpento}>
            {tab === 'base' ? `${daPrendereBase} DA PRENDERE` : String(daPrendereBase)}
          </span>
        </div>
      </button>
      <button type="button" onClick={() => onCambia('topup')} style={tab === 'topup' ? acceso : spento}>
        <div style={tab === 'topup' ? rigaAccesa : rigaSpenta}>
          <span style={tab === 'topup' ? etichettaAccesa : etichettaSpenta}>TOP-UP</span>
          <span style={tab === 'topup' ? contoAcceso : contoSpento}>
            {tab === 'topup' ? `${daPrendereTopup} DA PRENDERE` : String(daPrendereTopup)}
          </span>
        </div>
      </button>
    </div>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ titolo, settimana, aree, children }: { titolo: string; settimana?: string; aree?: AreaId[]; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo={titolo} settimana={settimana} aree={aree} />
      {children}
    </div>
  );
}
