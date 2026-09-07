'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Dish } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiRepertorio } from '@/data/repertorio';
import { leggiListe, spunta, allineaTopUp, type ListaSalvata, type SezioneSalvata, type VoceSalvata } from '@/data/lista';
import { rispondiControllo } from '@/data/dispensa';
import { idCasa } from '@/data/casa';
import { client } from '@/data/supabase';
import { accodaSpunta, leggiCoda, rimuoviConfermate, applicaCodaSuVoci, type Spunta } from '@/offline/coda';
import { leggiIstantaneaLista, salvaIstantaneaLista, cancellaIstantaneaLista } from '@/offline/lista-cache';
import { Testata } from '@/components/Testata';
import { Tessera } from '@/components/Tessera';
import { RigaControllo } from '@/components/RigaControllo';

const INK = '#14163A';
const MUT = '#8A8A96';

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/**
 * Cosa distingue le due liste. La regola esiste nella spec (riga 15: base
 * settimanale sui non deperibili, top-up per il fresco) ed e' nel codice — e'
 * il flag `deperibile` dell'ingrediente a smistare — ma non era scritta da
 * nessuna parte nell'app: due parole in un selettore non spiegano perche' la
 * stessa spesa sia divisa in due, e chi apre la lista in corsia deve capirlo
 * a colpo d'occhio, non dedurlo.
 */
const SPIEGA_TAB: Record<'base' | 'topup', string> = {
  base: 'La spesa grossa, una volta a settimana: quello che si conserva.',
  topup: 'Il fresco, e quello che si aggiunge strada facendo se il piano cambia.',
};

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

/**
 * Il repertorio serve solo nel ramo "lista non trovata", per scegliere fra
 * le due schede vuote (spec due-porte §2.4): senza piatti "vai alla
 * settimana" sarebbe un vicolo cieco. Lettura tollerante: se fallisce si
 * mostra la scheda di sempre, che è meglio di una schermata di errore per
 * una lettura che non serve alla lista.
 */
async function leggiRepertorioSenzaBloccare(): Promise<Dish[] | null> {
  try {
    return await leggiRepertorio();
  } catch (e) {
    console.error('lista: lettura del repertorio fallita.', e);
    return null;
  }
}

/**
 * L'id dell'account loggato, per l'istantanea offline (spec lista-offline
 * §1): `getSession` legge il token locale, quindi funziona anche senza rete
 * finché il token è valido. null se la sessione non si legge (token scaduto
 * senza rete, storage bloccato): chi chiama salva `''` o legge senza
 * verificare l'account. Non propaga mai: l'istantanea non deve far fallire
 * la lista.
 */
async function idUtenteSessione(): Promise<string | null> {
  try {
    return (await client().auth.getSession()).data.session?.user.id ?? null;
  } catch (e) {
    console.error('lista: lettura della sessione fallita.', e);
    return null;
  }
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
  /**
   * Vero quando la lettura dal server è fallita e quella mostrata è
   * l'istantanea salvata l'ultima volta (lista-cache.ts). Torna falso alla
   * prima rilettura riuscita.
   */
  offline: boolean;
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
  const [repertorioVuoto, setRepertorioVuoto] = useState(false);
  const [settimanaLabelVuoto, setSettimanaLabelVuoto] = useState<string | undefined>(undefined);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [tab, setTab] = useState<'base' | 'topup'>('base');
  const [rigaInVolo, setRigaInVolo] = useState<string | null>(null);
  // Quante volte l'utente ha toccato la lista (spunte e risposte ai
  // controlli) da quando la pagina è montata. Serve a `rileggi` e a
  // `carica`: una lettura partita prima di un tocco e arrivata dopo descrive
  // una lista più vecchia di quella a schermo, e va scartata. La coda
  // offline da sola non basta: se la scrittura del tocco è già stata
  // confermata, la coda è vuota e non ha nulla da riapplicare sopra la
  // risposta stantia.
  const versioneTocchi = useRef(0);
  // Il caricamento intero, dichiarato nell'effetto di montaggio (dove vive
  // il flag `vivo`) e pubblicato qui perché serva anche ai listener: al
  // ritorno della rete con l'istantanea a schermo si rifà tutto, non si
  // rilegge solo (vedi il commento sui listener).
  const caricaRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let vivo = true;

    /**
     * Il caricamento intero: settimana corrente, allineamento del top-up,
     * liste, istantanea. È lo stesso al montaggio e al ritorno della rete
     * quando quella a schermo è l'istantanea (spec lista-offline §1): in
     * quel caso NON basta rileggere la settimana dell'istantanea, perché
     * potrebbe non essere più quella corrente (lunedì mattina senza rete:
     * l'istantanea è della settimana chiusa, le cui liste restano sul
     * server e si rileggerebbero come vive). Solo il giro intero passa da
     * `leggiSettimanaCorrente`, da `allineaTopUp` e dai rami che cancellano
     * l'istantanea quando la lista non c'è più.
     */
    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          // Lettura riuscita, lista assente: l'istantanea non deve
          // ricomparire più (spec lista-offline §1).
          cancellaIstantaneaLista();
          const repertorio = await leggiRepertorioSenzaBloccare();
          if (vivo) {
            setRepertorioVuoto(repertorio !== null && repertorio.length === 0);
            setNonTrovata(true);
          }
          return;
        }
        const label = formattaPillola(settimana.dataInizio);
        // Prima di leggere, non dopo: se il piano è cambiato da quando la
        // lista è stata creata (un pasto spostato, un piatto aggiunto), qui
        // il mancante entra nel top-up. È il solo punto in cui serve —
        // qualunque strada tu abbia preso per cambiare il piano, la lista è
        // dove vai a vedere cosa comprare. Non blocca il caricamento: se
        // fallisce si mostra comunque la lista che c'è, che è meglio di una
        // schermata di errore in corsia.
        try {
          await allineaTopUp(settimana.id);
        } catch (errore) {
          console.error('lista: allineamento del top-up fallito.', errore);
        }
        // Come in `rileggi`: un tocco arrivato mentre la lettura è in volo
        // (possibile al ritorno della rete, con l'istantanea già a schermo)
        // rende la risposta più vecchia di quella mostrata, e si scarta.
        const versione = versioneTocchi.current;
        const lista = await leggiListe(settimana.id);
        if (!lista) {
          cancellaIstantaneaLista();
          const repertorio = await leggiRepertorioSenzaBloccare();
          if (vivo) {
            setSettimanaLabelVuoto(label);
            setRepertorioVuoto(repertorio !== null && repertorio.length === 0);
            setNonTrovata(true);
          }
          return;
        }
        // L'istantanea porta l'id della casa (spec lista-offline §1), così un
        // membro tolto dal proprietario non si rilegge la lista della casa che
        // ha lasciato, e quello dell'account, così un altro account sullo
        // stesso browser non se la rilegge. `idCasa` è memorizzata per
        // sessione e `getSession` legge il token locale: costano niente.
        const casaId = await idCasa();
        const userId = (await idUtenteSessione()) ?? '';
        if (!vivo || versioneTocchi.current !== versione) return;
        // L'istantanea è la lista come letta, senza la coda: la coda si
        // riapplica quando la si mostra, così una spunta in volo non viene
        // né disfatta né contata due volte.
        salvaIstantaneaLista({ casaId, userId, weekId: settimana.id, settimanaLabel: label, lista });
        setStato({ weekId: settimana.id, settimanaLabel: label, lista: applicaCodaLista(lista), offline: false });
        void sincronizzaCoda();
      } catch (errore) {
        console.error('lista: caricamento fallito.', errore);
        if (!vivo) return;
        // La rete decide, la copia ripara: senza risposta dal server si
        // mostra l'ultima lista vista con rete, dicendo che è una copia. Se
        // l'istantanea è di un'altra settimana si mostra lo stesso: la
        // settimana corrente non è nota e non si tenta di indovinarla.
        //
        // La casa invece si verifica quando si può: `idCasa()` è memorizzata
        // dopo il primo successo nella sessione, ma a freddo senza rete la
        // RPC fallisce. In quel caso si legge senza id — la casa non è
        // verificabile e l'istantanea è la migliore informazione disponibile
        // (limite dichiarato in spec lista-offline §5). Lo stesso per
        // l'account: `getSession` legge il token locale e funziona offline
        // finché è valido; se non si legge, non si verifica. Con gli id, se
        // l'istantanea è di un'altra casa o di un altro account lista-cache
        // la cancella e si mostra l'errore di sempre.
        let casaId: string | null = null;
        try {
          casaId = await idCasa();
        } catch {
          // Casa non verificabile: si legge senza id.
        }
        const userId = await idUtenteSessione();
        if (!vivo) return;
        const istantanea = leggiIstantaneaLista({ casaId: casaId ?? undefined, userId: userId ?? undefined });
        if (istantanea) {
          setStato({
            weekId: istantanea.weekId,
            settimanaLabel: istantanea.settimanaLabel,
            lista: applicaCodaLista(istantanea.lista),
            offline: true,
          });
        } else {
          setErroreCaricamento('Non riusciamo a caricare la lista. Riprova più tardi.');
        }
      }
    }

    caricaRef.current = carica;
    void carica();
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

  // La lista in due (spec casa-condivisa §5): due telefoni che spuntano la
  // stessa lista non si accorgono l'uno dell'altro finché non ricaricano.
  // Quando la pagina torna in primo piano si rileggono le liste — solo
  // leggiListe, non allineaTopUp: il piano non è cambiato, sono cambiate le
  // spunte — con la coda offline applicata sopra come al caricamento, così
  // una spunta locale ancora in volo non viene "disfatta" dal server.
  // Tollerante: se la rilettura fallisce la lista che c'è resta.
  //
  // Quando quella mostrata è l'istantanea (`offline`, spec lista-offline
  // §1), al ritorno della rete e al ritorno in primo piano NON si rilegge
  // la sua settimana: si rifà `carica()` intero. L'istantanea può essere
  // di una settimana ormai chiusa (lunedì mattina senza rete), le cui liste
  // restano sul server: rilette da sole, tornerebbero come vive, senza
  // `allineaTopUp` e senza il ramo "lista non trovata" che cancella la
  // copia. Al successo la riga "Sei offline" sparisce e l'istantanea si
  // aggiorna; se `carica()` fallisce di nuovo, ripiega sull'istantanea come
  // al montaggio. I listener vivono solo a lista caricata (dipendono da
  // `weekId`) e se ne vanno allo smontaggio.
  //
  // Prima di leggere si sincronizza la coda, e si aspetta che finisca: una
  // spunta fallita in secondo piano (rete andata via a metà) si ritenta
  // così, e la lettura parte dopo che le scritture in attesa sono arrivate
  // al server — letta prima, tornerebbe senza quelle spunte e con la coda
  // già svuotata dalla conferma, e le disfarebbe a schermo. Lo stesso
  // scarto si guarda anche per un tocco arrivato *durante* la
  // sincronizzazione o la lettura: `versioneTocchi` si fissa PRIMA di
  // `sincronizzaCoda()`, non dopo, perché chi arriva mentre un giro è in
  // volo aspetta solo quel giro, non quello coalescente che un tocco nel
  // frattempo ha chiesto — e la lettura partirebbe senza quella spunta, con
  // la coda poi svuotata dalla sua conferma. Se la versione è cambiata la
  // risposta si butta in silenzio: al prossimo ritorno in primo piano si
  // rilegge.
  const weekId = stato?.weekId ?? null;
  const settimanaLabel = stato?.settimanaLabel ?? null;
  const offline = stato?.offline ?? false;
  useEffect(() => {
    if (!weekId || settimanaLabel === null) return;
    let attivo = true;
    async function rileggi(motivo: string) {
      try {
        const versione = versioneTocchi.current;
        await sincronizzaCoda();
        // Prima della lettura, non dopo: se fallisce (niente rete) la
        // rilettura fallisce tutta intera, com'è giusto, invece di buttare
        // una lista fresca già arrivata.
        const casaId = await idCasa();
        const userId = (await idUtenteSessione()) ?? '';
        const fresca = await leggiListe(weekId!);
        if (!attivo || !fresca) return;
        if (versioneTocchi.current !== versione) return;
        salvaIstantaneaLista({ casaId, userId, weekId: weekId!, settimanaLabel: settimanaLabel!, lista: fresca });
        setStato((p) => (p ? { ...p, lista: applicaCodaLista(fresca), offline: false } : p));
      } catch (errore) {
        console.error(`lista: rilettura ${motivo} fallita.`, errore);
      }
    }
    function alRitornoInPrimoPiano() {
      if (document.visibilityState !== 'visible') return;
      if (offline) void caricaRef.current();
      else void rileggi('al ritorno in primo piano');
    }
    function alRitornoOnline() {
      if (offline) void caricaRef.current();
    }
    document.addEventListener('visibilitychange', alRitornoInPrimoPiano);
    window.addEventListener('online', alRitornoOnline);
    return () => {
      attivo = false;
      document.removeEventListener('visibilitychange', alRitornoInPrimoPiano);
      window.removeEventListener('online', alRitornoOnline);
    };
  }, [weekId, settimanaLabel, offline]);

  function toggleVoce(voce: VoceSalvata) {
    const nuovo = !voce.spuntato;
    versioneTocchi.current += 1;
    setStato((prev) => (prev ? { ...prev, lista: conSpuntaLocale(prev.lista, voce.id, nuovo) } : prev));
    accodaSpunta(voce.id, nuovo);
    void sincronizzaCoda();
  }

  async function rispondi(controllo: VoceSalvata, listaId: string | null, ancora: boolean) {
    if (!listaId || rigaInVolo) return;
    versioneTocchi.current += 1;
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
      // Anche dopo la RPC, non solo prima: una rilettura partita mentre la
      // risposta era in volo può essere stata servita prima che il server
      // la registrasse, e riporterebbe il controllo (o la voce vecchia).
      versioneTocchi.current += 1;
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
    // Due schede per lo stesso vuoto (spec due-porte §2.4): senza piatti la
    // settimana non avrebbe nulla da assegnare, quindi la porta è /piatti.
    const vuoto = repertorioVuoto
      ? {
        titolo: 'Prima servono i piatti',
        testo: 'La lista nasce dai piatti che mangi: dicci quali sono e da lì la settimana e la spesa si costruiscono da sole.',
        href: '/piatti',
        bottone: 'COMINCIA DAI PIATTI',
      }
      : {
        titolo: 'La lista non c’è ancora',
        testo: 'Nasce dalla settimana: appena confermi quali pasti farai a casa, qui trovi cosa comprare e quante confezioni.',
        href: '/settimana',
        bottone: 'VAI ALLA SETTIMANA',
      };
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
              {vuoto.titolo}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: '#8A8A96' }}>
              {vuoto.testo}
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 16px 0' }}>
          <Link
            href={vuoto.href}
            style={{
              width: '100%', height: 54, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
              background: '#14163A', boxShadow: '0 3px 10px rgba(20,22,58,0.24)', color: '#FFFFFF',
            }}
          >
            {vuoto.bottone}
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
        {stato.offline && (
          <p style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--sec)' }}>
            {`Sei offline: questa è la lista di ${stato.settimanaLabel} salvata l'ultima volta che l'hai aperta. Le spunte si sincronizzano appena torna la rete.`}
          </p>
        )}
        {erroreAzione && (
          <p style={{ margin: '0 4px', fontSize: 12.5, color: 'var(--sec)' }}>{erroreAzione}</p>
        )}
        <p style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--sec)' }}>
          {SPIEGA_TAB[tab]}
        </p>
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

/**
 * Da prendere in cima, gia' prese in fondo — dentro ognuno dei due gruppi
 * l'ordine di generazione resta.
 *
 * La tessera grande in cima e' la prossima cosa da mettere nel carrello:
 * senza questo riordino restava grande la prima voce dell'area anche dopo
 * averla spuntata, e in corsia si continuava a leggere in grande una cosa
 * gia' fatta. `sort` su una copia: l'array arriva dallo stato di React.
 */
function ordinaPerCarrello(voci: VoceSalvata[]): VoceSalvata[] {
  return [...voci].sort((a, b) => Number(a.spuntato) - Number(b.spuntato));
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
    // flexShrink: 0 non e' cosmetico. La carta sta in un contenitore flex in
    // colonna, e i figli flex si comprimono quando lo spazio non basta:
    // sommato a overflow hidden, il risultato e' una tessera tagliata a meta'
    // invece di una lista che scorre. Su uno schermo alto lo spazio bastava e
    // il difetto non si vedeva; su un telefono si vede subito.
    <div
      style={{
        background: '#FFFFFF', borderRadius: 22, border: '1px solid rgba(20,22,58,0.07)',
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, flex: 'none', background: coloreArea(sezione.area), display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: INK }}>
            {nomeArea(sezione.area)}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: MUT }}>
          {sezione.voci.length} {sezione.voci.length === 1 ? 'VOCE' : 'VOCI'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, padding: '0 12px 12px' }}>
        {ordinaPerCarrello(sezione.voci).map((v, i) => (
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
            // Grande a piena larghezza solo se e' la prossima da prendere.
            // Una voce gia' nel carrello non merita il posto d'onore.
            protagonista={i === 0 && !v.spuntato}
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
      <button
        type="button"
        onClick={() => onCambia('base')}
        aria-label={`Base, ${daPrendereBase} da prendere`}
        style={tab === 'base' ? acceso : spento}
      >
        <div style={tab === 'base' ? rigaAccesa : rigaSpenta}>
          <span style={tab === 'base' ? etichettaAccesa : etichettaSpenta}>BASE</span>
          <span style={tab === 'base' ? contoAcceso : contoSpento}>
            {tab === 'base' ? `${daPrendereBase} DA PRENDERE` : String(daPrendereBase)}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onCambia('topup')}
        aria-label={`Top-up, ${daPrendereTopup} da prendere`}
        style={tab === 'topup' ? acceso : spento}
      >
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
