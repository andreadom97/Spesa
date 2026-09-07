'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni, salvaSlotDefs, pastiDiDefault } from '@/data/impostazioni';
import { creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro, statoCasa, type StatoCasa } from '@/data/casa';
import { MAX_PASTI, MIN_PASTI } from '@/domain/pasti';
import { coloreArea, nomeArea } from '@/domain/aree';
import { MAX_SETTIMANE_CICLO, settimanaDelCiclo } from '@/domain/ciclo';
import { lunediDi } from '@/domain/date';
import { Segmento } from '@/components/Segmento';

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const ASSENZE_VUOTE = [false, false, false, false, false, false, false];

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "24 agosto": una data ISO in mezzo a una frase si legge come un codice, non come un giorno. */
function dataInParole(iso: string): string {
  const [, mese, giorno] = iso.split('-');
  return `${Number(giorno)} ${MESI[Number(mese) - 1]}`;
}

const OPZIONI_CICLO = Array.from({ length: MAX_SETTIMANE_CICLO }, (_, i) => ({
  id: String(i + 1),
  label: i === 0 ? 'NESSUNA' : `${i + 1} SETT.`,
}));

/** Reindicizza `posizione` sull'ordine effettivo dell'array: va rifatto a ogni aggiunta, rimozione o riordino. */
function conPosizioni(lista: MealSlotDef[]): MealSlotDef[] {
  return lista.map((p, i) => ({ ...p, posizione: i }));
}

/** Otto caratteri, come li genera `crea_invito` (migrazione 0012). */
const LUNGHEZZA_CODICE = 8;

/**
 * "Per quante persone cucini", nella sezione CASA. Il moltiplicatore era
 * stato tolto dall'interfaccia il 28/08/2026 (un moltiplicatore unico
 * presuppone che tutti a tavola mangino la stessa porzione); il 06/09 torna
 * a livello di casa, con quell'assunzione dichiarata nel copy invece che
 * taciuta. Vedi la spec casa condivisa §6. Il campo nello schema e in
 * list-builder non si era mai mosso.
 */
const MIN_PORZIONI = 1;
const MAX_PORZIONI = 4;

/**
 * Il messaggio da mostrare se `entraInCasa` fallisce. Solo un `raise
 * exception` della funzione SQL (SQLSTATE P0001) porta un messaggio scritto
 * per l'utente, in italiano (`codice non valido o scaduto`, `sei già in una
 * casa: esci prima`…): quello si mostra così com'è. Ogni altro errore
 * (violazione di vincolo, rete, permessi) è un messaggio grezzo di Postgres o
 * del client, che non va mostrato: dice cose che non aiutano e a volte cose
 * che non dovrebbe.
 */
function messaggioEntrata(errore: unknown): string {
  if (typeof errore === 'object' && errore !== null) {
    const { code, message } = errore as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message) return message;
  }
  return 'Non siamo riusciti a entrare. Riprova.';
}

/**
 * Ricarica l'app da capo su un percorso. Dopo entra/esci dalla casa l'id su
 * cui agisce il data layer cambia e ogni stato di pagina in memoria è di
 * un'altra casa: un reload completo è l'unico modo onesto di svuotarlo.
 * Incapsulato perché `window.location.assign` non si spia in jsdom.
 */
function ricaricaSu(percorso: string) {
  window.location.assign(percorso);
}

interface Dati {
  /**
   * Le impostazioni per intero, non i soli campi che questa schermata mostra:
   * `salvaImpostazioni` riscrive la riga tutta, quindi quello che non si
   * tiene qui si perde al primo salvataggio.
   */
  impostazioni: Impostazioni;
  pasti: MealSlotDef[];
}

/**
 * Impostazioni: editor dei pasti (da MIN_PASTI a MAX_PASTI, non i
 * quattro cablati nel mock — leggiSlotDefs() legge quelli reali), la
 * rotazione del piano su più settimane, e il link
 * all'ordine dei reparti (personalizzazione vera e propria delegata a
 * /impostazioni/reparti, che ha il proprio pulsante SALVA).
 *
 * Porzioni e pasti si salvano da soli a ogni interazione (niente pulsante
 * SALVA nell'artboard): ottimistico, con rollback se la scrittura fallisce.
 */
export default function Impostazioni() {
  const router = useRouter();

  const [dati, setDati] = useState<Dati | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [erroreSalvataggio, setErroreSalvataggio] = useState<string | null>(null);
  // Conferma in due tocchi di RIPARTI: il primo tap arma il bottone (il testo
  // diventa "SICURO?"), solo il secondo tap esegue davvero persistiImpostazioni. Un
  // tap fuori dal bottone o un cambio di stato altrove (es. la rotazione)
  // annullano l'armamento.
  const [ripartiArmato, setRipartiArmato] = useState(false);
  const bottoneRipartiRef = useRef<HTMLButtonElement>(null);
  // Tiene traccia dell'ultima settimaneCiclo vista per disarmare RIPARTI
  // quando cambia altrove (es. la rotazione): niente effect, si aggiusta lo
  // stato durante il render stesso (pattern React consigliato per "adjusting
  // state when a prop changes", evita il giro extra di un effect).
  const [settimaneCicloVista, setSettimaneCicloVista] = useState<number | undefined>(undefined);

  // Ultimo stato dei pasti confermato dal server: a differenza di `dati.pasti`
  // (che include anche le modifiche non ancora salvate, es. mentre si digita
  // un nome) è il valore a cui tornare se una scrittura fallisce.
  const pastiSalvatiRef = useRef<MealSlotDef[]>([]);
  const impostazioniSalvateRef = useRef<Impostazioni | null>(null);
  // Contatore delle chiamate a persistiImpostazioni: due tap veloci sullo
  // stepper (o sul ciclo) sono due salvataggi con due riletture, e la
  // rilettura del primo può arrivare dopo quella del secondo. Solo la
  // rilettura dell'ultima richiesta si applica: le altre descrivono uno
  // stato che a schermo è già stato superato.
  const richiestaImpostazioniRef = useRef(0);

  // La casa si legge a parte, non nel Promise.all: se la RPC fallisce la
  // sezione CASA lo dice, e il resto delle impostazioni resta usabile.
  const [casa, setCasa] = useState<StatoCasa | null>(null);
  const [erroreCasa, setErroreCasa] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    statoCasa()
      .then((stato) => {
        if (vivo) setCasa(stato);
      })
      .catch((errore) => {
        console.error('impostazioni: lettura della casa fallita.', errore);
        if (vivo) setErroreCasa('Non riusciamo a leggere la casa. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiImpostazioni(), leggiSlotDefs()])
      .then(async ([impostazioni, pastiLetti]) => {
        if (!vivo) return;
        // Utente nuovo, mai passato da seed.sql: leggiSlotDefs() torna vuoto.
        // Si seminano subito i quattro pasti di default e si salvano davvero
        // — non un fallback solo in memoria, altrimenti il primo "+" in
        // AGGIUNGI PASTO produrrebbe una sola riga, sotto il minimo di 3
        // richiesto da salvaSlotDefs (vedi C3).
        const pasti = pastiLetti.length > 0 ? pastiLetti : pastiDiDefault();
        if (pastiLetti.length === 0) await salvaSlotDefs(pasti);
        if (!vivo) return;
        pastiSalvatiRef.current = pasti;
        impostazioniSalvateRef.current = impostazioni;
        setDati({ impostazioni, pasti });
      })
      .catch((errore) => {
        console.error('impostazioni: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare le impostazioni. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Un cambio di stato altrove (es. la rotazione cambia da un'opzione del
  // Segmento) disarma RIPARTI: un tap "vecchio" non deve confermare
  // un'azione diversa da quella che l'utente aveva armato.
  if (dati && dati.impostazioni.settimaneCiclo !== settimaneCicloVista) {
    setSettimaneCicloVista(dati.impostazioni.settimaneCiclo);
    if (ripartiArmato) setRipartiArmato(false);
  }

  // Un tap fuori dal bottone RIPARTI, mentre è armato, annulla la conferma.
  useEffect(() => {
    if (!ripartiArmato) return;
    function fuoriDalBottone(e: MouseEvent) {
      if (bottoneRipartiRef.current && !bottoneRipartiRef.current.contains(e.target as Node)) {
        setRipartiArmato(false);
      }
    }
    document.addEventListener('click', fuoriDalBottone);
    return () => document.removeEventListener('click', fuoriDalBottone);
  }, [ripartiArmato]);

  /** Persiste l'insieme dei pasti; in caso di errore torna all'ultimo stato salvato dal server. */
  async function persistiPasti(nuovi: MealSlotDef[]) {
    setErroreSalvataggio(null);
    setDati((correnti) => (correnti ? { ...correnti, pasti: nuovi } : correnti));
    try {
      await salvaSlotDefs(nuovi);
      pastiSalvatiRef.current = nuovi;
    } catch (errore) {
      console.error('impostazioni: salvataggio dei pasti fallito.', errore);
      const salvati = pastiSalvatiRef.current;
      setDati((correnti) => (correnti ? { ...correnti, pasti: salvati } : correnti));
      setErroreSalvataggio('Non siamo riusciti a salvare. Riprova.');
    }
  }

  /**
   * Salva una patch delle impostazioni (il ciclo, le porzioni). Come i
   * pasti: ottimistico, con rollback all'ultimo stato confermato dal server
   * se la scrittura fallisce.
   *
   * `salvaImpostazioni` àncora da sé l'origine al lunedì corrente quando si
   * accende un ciclo che non ne ha una, quindi dopo la scrittura si rilegge:
   * vale per ogni patch, così lo stato in pagina è sempre quello del server.
   *
   * Solo l'ultima richiesta tocca lo stato: una rilettura (o un errore) di
   * una richiesta superata da una più recente si ignora, perché la più
   * recente riscrive la riga intera e la sua rilettura dirà l'ultima parola.
   */
  async function persistiImpostazioni(patch: Partial<Impostazioni>) {
    if (!dati) return;
    const richiesta = ++richiestaImpostazioniRef.current;
    const eUltima = () => richiesta === richiestaImpostazioniRef.current;
    setErroreSalvataggio(null);
    const nuove = { ...dati.impostazioni, ...patch };
    setDati((correnti) => (correnti ? { ...correnti, impostazioni: nuove } : correnti));
    try {
      await salvaImpostazioni(nuove);
      const rilette = await leggiImpostazioni();
      if (!eUltima()) return;
      impostazioniSalvateRef.current = rilette;
      setDati((correnti) => (correnti ? { ...correnti, impostazioni: rilette } : correnti));
    } catch (errore) {
      console.error('impostazioni: salvataggio delle impostazioni fallito.', errore);
      if (!eUltima()) return;
      const salvate = impostazioniSalvateRef.current;
      if (salvate) setDati((correnti) => (correnti ? { ...correnti, impostazioni: salvate } : correnti));
      setErroreSalvataggio('Non siamo riusciti a salvare. Riprova.');
    }
  }

  function spostaPasto(indice: number, delta: number) {
    if (!dati) return;
    const j = indice + delta;
    if (j < 0 || j >= dati.pasti.length) return;
    const copia = [...dati.pasti];
    const tmp = copia[indice];
    copia[indice] = copia[j];
    copia[j] = tmp;
    persistiPasti(conPosizioni(copia));
  }

  function aggiungiPasto() {
    if (!dati || dati.pasti.length >= MAX_PASTI) return;
    const nuovo: MealSlotDef = {
      id: crypto.randomUUID(),
      nome: 'Nuovo pasto',
      posizione: dati.pasti.length,
      assenzeAbituali: [...ASSENZE_VUOTE],
    };
    persistiPasti(conPosizioni([...dati.pasti, nuovo]));
  }

  function rimuoviPasto(id: string) {
    if (!dati || dati.pasti.length <= MIN_PASTI) return;
    persistiPasti(conPosizioni(dati.pasti.filter((p) => p.id !== id)));
  }

  function toggleGiorno(id: string, indiceGiorno: number) {
    if (!dati) return;
    const nuovi = dati.pasti.map((p) => {
      if (p.id !== id) return p;
      const assenze = [...p.assenzeAbituali];
      assenze[indiceGiorno] = !assenze[indiceGiorno];
      return { ...p, assenzeAbituali: assenze };
    });
    persistiPasti(nuovi);
  }

  /** Aggiorna solo lo stato locale mentre si digita: il salvataggio parte al blur, in confermaNome. */
  function cambiaNomeLocale(id: string, nome: string) {
    setDati((correnti) =>
      correnti ? { ...correnti, pasti: correnti.pasti.map((p) => (p.id === id ? { ...p, nome } : p)) } : correnti,
    );
  }

  function confermaNome(id: string) {
    setDati((correnti) => {
      if (!correnti) return correnti;
      const pasto = correnti.pasti.find((p) => p.id === id);
      if (!pasto) return correnti;
      const nomeCorretto = pasto.nome.trim() || 'Pasto';
      const aggiornati = correnti.pasti.map((p) => (p.id === id ? { ...p, nome: nomeCorretto } : p));
      const salvato = pastiSalvatiRef.current.find((p) => p.id === id);
      if (!salvato || salvato.nome !== nomeCorretto) {
        persistiPasti(aggiornati);
      }
      return { ...correnti, pasti: aggiornati };
    });
  }

  if (erroreCaricamento) {
    return (
      <Cornice router={router}>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (!dati) {
    // Nessuno stato di caricamento è nell'artboard: l'intestazione basta finché i dati non arrivano.
    return <Cornice router={router} />;
  }

  // L'artboard abbrevia i nomi ("MACELLERIA" invece di "MACELLERIA E
  // PESCHERIA"): sono stringhe inventate per stare su una riga, non dati
  // reali. Qui si usano i nomi veri di nomeArea() e si tronca con CSS
  // (nowrap + ellipsis), non con un taglio a 3 elementi + "…" fisso.
  const ordineTesto = dati.impostazioni.ordineAree.map(nomeArea).join(' · ');

  const oggi = new Date().toISOString().slice(0, 10);
  const lunediCorrente = lunediDi(oggi);
  const settimaneCiclo = dati.impostazioni.settimaneCiclo;
  const porzioni = dati.impostazioni.moltiplicatorePorzioni;
  const settimanaCorrente = settimanaDelCiclo({
    lunedi: lunediCorrente,
    origine: dati.impostazioni.cicloOrigine,
    settimaneCiclo,
  });

  return (
    <Cornice router={router}>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 18px' }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: 'var(--ink)', padding: '0 2px 14px' }}>
          Impostazioni
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 4px 10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            I TUOI PASTI
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--ter)' }}>
            {dati.pasti.length} DI {MAX_PASTI}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dati.pasti.map((p, i) => (
            <RigaPastoEditor
              key={p.id}
              pasto={p}
              indice={i}
              totale={dati.pasti.length}
              onSu={() => spostaPasto(i, -1)}
              onGiu={() => spostaPasto(i, 1)}
              onRimuovi={() => rimuoviPasto(p.id)}
              onCambiaNome={(nome) => cambiaNomeLocale(p.id, nome)}
              onConfermaNome={() => confermaNome(p.id)}
              onToggleGiorno={(gi) => toggleGiorno(p.id, gi)}
              rimozioneAttiva={dati.pasti.length > MIN_PASTI}
            />
          ))}
          <button
            type="button"
            onClick={aggiungiPasto}
            disabled={dati.pasti.length >= MAX_PASTI}
            style={{
              minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              borderRadius: 18, background: 'transparent', border: '1.5px dashed rgba(20,22,58,0.28)',
              opacity: dati.pasti.length >= MAX_PASTI ? 0.35 : 1,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em', color: 'var(--sec)' }}>
              AGGIUNGI PASTO
            </span>
          </button>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 8 }}>
          Da tre a sei pasti, nell’ordine in cui li fai. I giorni segnati qui vengono già spenti quando si
          apre una settimana nuova: nella Settimana correggi solo le eccezioni — le settimane già create non
          cambiano.
        </div>

        {erroreSalvataggio && <p style={{ margin: '10px 6px 0', fontSize: 13, color: 'var(--sec)' }}>{erroreSalvataggio}</p>}

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 4px 10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            ROTAZIONE DEL PIANO
          </span>
          {settimaneCiclo > 1 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--ter)' }}>
              ORA SEI ALLA {settimanaCorrente} DI {settimaneCiclo}
            </span>
          )}
        </div>

        <div style={{ background: 'var(--superficie)', borderRadius: 18, border: '1px solid var(--bordo)', padding: '14px 14px 15px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: 'var(--ter)', marginBottom: 9 }}>
            OGNI QUANTE SETTIMANE SI RIPETE
          </div>
          <Segmento
            variante="blocco"
            opzioni={OPZIONI_CICLO}
            valore={String(settimaneCiclo)}
            onCambia={(id) => persistiImpostazioni({ settimaneCiclo: Number(id) })}
          />
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 11 }}>
            {settimaneCiclo === 1
              ? 'I piatti ruotano uno dopo l’altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.'
              : (() => {
                  const origine = dati.impostazioni.cicloOrigine ?? lunediCorrente;
                  const verbo = origine > oggi ? 'comincia' : 'è cominciato';
                  return `Il giro ${verbo} lunedì ${dataInParole(origine)}. Ogni piatto può dire a quale delle ${settimaneCiclo} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.`;
                })()}
          </div>
          {settimaneCiclo > 1 && (
            <button
              ref={bottoneRipartiRef}
              type="button"
              onClick={() => {
                if (ripartiArmato) {
                  setRipartiArmato(false);
                  persistiImpostazioni({ cicloOrigine: lunediCorrente });
                } else {
                  setRipartiArmato(true);
                }
              }}
              disabled={dati.impostazioni.cicloOrigine === lunediCorrente}
              style={{
                marginTop: 11, minHeight: 44, width: '100%', borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(20,22,58,0.05)',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.09em', color: 'var(--sec)',
                opacity: dati.impostazioni.cicloOrigine === lunediCorrente ? 0.35 : 1,
              }}
            >
              {ripartiArmato ? 'SICURO? RIPARTI DA LUNEDÌ' : 'RIPARTI DALLA SETTIMANA 1'}
            </button>
          )}
        </div>

        <Etichetta margine="26px 4px 10px">REPERTORIO</Etichetta>
        <Link
          href="/impostazioni/ingredienti"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18,
            background: 'var(--superficie)', border: '1px solid var(--bordo)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Ingredienti</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--sec)', marginTop: 5 }}>
              AREA, CONFEZIONE, COME SI CONSUMA
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {/* La sezione CASA c'è sempre: la scheda della casa arriva quando
            statoCasa() risponde (o lascia un messaggio), le porzioni sono
            nelle impostazioni già caricate e non aspettano nessuno. */}
        <Etichetta margine="26px 4px 10px">CASA</Etichetta>
        {casa && <SezioneCasa casa={casa} onCambiata={setCasa} />}
        {!casa && erroreCasa && (
          <p style={{ margin: '0 6px', fontSize: 13, color: 'var(--sec)' }}>{erroreCasa}</p>
        )}
        <div style={{ ...SCHEDA, marginTop: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Per quante persone cucini</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)', marginTop: 6 }}>
            Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 12 }}>
            <BottoneStepper
              etichetta="Diminuisci porzioni"
              segno="−"
              disabled={porzioni <= MIN_PORZIONI}
              onClick={() => persistiImpostazioni({ moltiplicatorePorzioni: porzioni - 1 })}
            />
            <span
              aria-label="Porzioni"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', minWidth: 28, textAlign: 'center' }}
            >
              {porzioni}
            </span>
            <BottoneStepper
              etichetta="Aumenta porzioni"
              segno="+"
              disabled={porzioni >= MAX_PORZIONI}
              onClick={() => persistiImpostazioni({ moltiplicatorePorzioni: porzioni + 1 })}
            />
          </div>
          {porzioni > 1 && (
            <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', textAlign: 'center', marginTop: 10 }}>
              La lista compra per {porzioni}. Le porzioni nel piatto restano quelle scritte.
            </div>
          )}
        </div>

        <Etichetta margine="26px 4px 10px">SUPERMERCATO</Etichetta>
        <Link
          href="/impostazioni/reparti"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18,
            background: 'var(--superficie)', border: '1px solid var(--bordo)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 9px)', gap: 3, flex: 'none' }}>
            {dati.impostazioni.ordineAree.map((a) => (
              <span key={a} style={{ width: 9, height: 9, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }} />
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Ordine dei reparti</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--sec)', marginTop: 5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {ordineTesto}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Etichetta margine="26px 4px 10px">DIETA DEL NUTRIZIONISTA</Etichetta>
        <Link
          href="/importa"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18,
            background: 'var(--superficie)', border: '1px solid var(--bordo)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Importa la dieta</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--sec)', marginTop: 5 }}>
              DA FOTO O PDF, SOSTITUISCE IL PIANO ATTUALE
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </Cornice>
  );
}

const SCHEDA: CSSProperties = {
  background: 'var(--superficie)', borderRadius: 18, border: '1px solid var(--bordo)', padding: 16,
};

const BOTTONE_PIENO: CSSProperties = {
  height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
  background: 'var(--ink)', color: '#FFFFFF',
};

const BOTTONE_LEGGERO: CSSProperties = {
  minHeight: 44, width: '100%', borderRadius: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(20,22,58,0.05)',
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.09em', color: 'var(--sec)',
};

/**
 * La scheda CASA (spec P6 §4), che si ramifica sul ruolo di chi è loggato:
 * da solo invita a creare un codice o a inserirne uno; da proprietario
 * elenca chi c'è, lascia togliere ognuno (TOGLI, due tocchi) e offre un
 * altro codice; da membro dice di chi è la casa e lascia uscire. Entrare o
 * uscire ricaricano l'app su /lista: il data layer ha già scartato la
 * memoria dell'id della casa. Togliere invece non cambia l'id di chi chiama:
 * niente reload, si rilegge `statoCasa()` e la scheda si aggiorna da sé
 * tramite `onCambiata` (senza più membri torna allo stato "da solo").
 *
 * TOGLI usa `casa.id[i]`, accoppiato per indice a `casa.email[i]`: è
 * `stato_casa` a garantire l'ordine, e `statoCasa()` a verificare che le
 * lunghezze coincidano.
 */
function SezioneCasa({ casa, onCambiata }: { casa: StatoCasa; onCambiata: (stato: StatoCasa) => void }) {
  const [codiceCreato, setCodiceCreato] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [erroreCodice, setErroreCodice] = useState<string | null>(null);

  const [codiceScritto, setCodiceScritto] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroreEntrata, setErroreEntrata] = useState<string | null>(null);

  const [erroreUscita, setErroreUscita] = useState<string | null>(null);

  const [togliendo, setTogliendo] = useState<string | null>(null);
  const [erroreRimozione, setErroreRimozione] = useState<string | null>(null);

  async function crea() {
    setCreando(true);
    setErroreCodice(null);
    try {
      setCodiceCreato(await creaInvito());
    } catch (errore) {
      console.error('impostazioni: creazione del codice fallita.', errore);
      setErroreCodice('Non siamo riusciti a creare il codice. Riprova.');
    } finally {
      setCreando(false);
    }
  }

  async function entra() {
    if (codiceScritto.length < LUNGHEZZA_CODICE) return;
    setEntrando(true);
    setErroreEntrata(null);
    try {
      await entraInCasa(codiceScritto);
      ricaricaSu('/lista');
    } catch (errore) {
      console.error('impostazioni: entrata nella casa fallita.', errore);
      setErroreEntrata(messaggioEntrata(errore));
      setEntrando(false);
    }
  }

  async function esci() {
    setErroreUscita(null);
    try {
      await esciDallaCasa();
      ricaricaSu('/lista');
    } catch (errore) {
      console.error('impostazioni: uscita dalla casa fallita.', errore);
      setErroreUscita('Non siamo riusciti a uscire. Riprova.');
    }
  }

  async function togli(id: string) {
    setTogliendo(id);
    setErroreRimozione(null);
    try {
      await rimuoviMembro(id);
    } catch (errore) {
      console.error('impostazioni: rimozione del membro fallita.', errore);
      setErroreRimozione('Non siamo riusciti a togliere. Riprova.');
      setTogliendo(null);
      return;
    }
    // Tolto davvero: la scheda si riallinea al server. Se la rilettura
    // fallisce non si dice "non siamo riusciti" (sarebbe falso): si toglie
    // la riga in locale, e senza membri si torna allo stato "da solo".
    try {
      onCambiata(await statoCasa());
    } catch (errore) {
      console.error('impostazioni: rilettura della casa dopo la rimozione fallita.', errore);
      const resta = casa.id.map((_, i) => i).filter((i) => casa.id[i] !== id);
      onCambiata(resta.length > 0
        ? { ruolo: 'proprietario', email: resta.map((i) => casa.email[i]), id: resta.map((i) => casa.id[i]) }
        : { ruolo: 'solo', email: [], id: [] });
    } finally {
      setTogliendo(null);
    }
  }

  const creaUnCodice = (
    <>
      {codiceCreato ? (
        <div style={{ marginTop: 14 }}>
          <div
            aria-label="Codice della casa"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 28, letterSpacing: '0.2em', fontWeight: 700,
              color: 'var(--ink)', textAlign: 'center', padding: '6px 0 4px',
            }}
          >
            {codiceCreato}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', textAlign: 'center', marginTop: 6 }}>
            Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.
          </div>
        </div>
      ) : (
        <button type="button" onClick={crea} disabled={creando} style={{ ...BOTTONE_PIENO, width: '100%', marginTop: 14 }}>
          CREA UN CODICE
        </button>
      )}
      {erroreCodice && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreCodice}</p>}
    </>
  );

  if (casa.ruolo === 'membro') {
    return (
      <div style={SCHEDA}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Sei nella casa di {casa.email[0]}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)', marginTop: 6 }}>
          Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.
        </div>
        <BottoneDueTocchi testo="ESCI DALLA CASA" onConferma={esci} style={{ ...BOTTONE_LEGGERO, marginTop: 14 }} />
        {erroreUscita && <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreUscita}</p>}
      </div>
    );
  }

  if (casa.ruolo === 'proprietario') {
    return (
      <div style={SCHEDA}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>La tua casa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {casa.email.map((email, i) => (
            <div key={casa.id[i]} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
              <BottoneDueTocchi
                testo="TOGLI"
                onConferma={() => togli(casa.id[i])}
                disabled={togliendo !== null}
                style={{ ...BOTTONE_LEGGERO, width: 'auto', flex: 'none', padding: '0 14px', opacity: togliendo === casa.id[i] ? 0.35 : 1 }}
              />
            </div>
          ))}
        </div>
        {erroreRimozione && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreRimozione}</p>}
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)', marginTop: 10 }}>
          Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.
        </div>
        {creaUnCodice}
      </div>
    );
  }

  return (
    <>
      <div style={SCHEDA}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Fai la spesa con qualcuno?</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--sec)', marginTop: 6 }}>
          Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.
        </div>
        {creaUnCodice}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          type="text"
          value={codiceScritto}
          onChange={(e) => setCodiceScritto(e.target.value.toUpperCase())}
          aria-label="Ho un codice"
          placeholder="Ho un codice"
          maxLength={LUNGHEZZA_CODICE}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, height: 48, padding: '0 14px', borderRadius: 14,
            border: '1px solid var(--bordo)', background: 'var(--superficie)', color: 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, letterSpacing: '0.12em',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={entra}
          disabled={codiceScritto.length < LUNGHEZZA_CODICE || entrando}
          style={{
            ...BOTTONE_PIENO, flex: 'none', width: 96,
            opacity: codiceScritto.length < LUNGHEZZA_CODICE ? 0.35 : 1,
          }}
        >
          ENTRA
        </button>
      </div>
      {erroreEntrata && <p style={{ margin: '10px 6px 0', fontSize: 12.5, color: 'var(--sec)' }}>{erroreEntrata}</p>}
    </>
  );
}

/**
 * Conferma in due tocchi, come RIPARTI: il primo tap arma il bottone (il
 * testo diventa "SICURO?"), solo il secondo chiama `onConferma`. Un tap
 * fuori dal bottone disarma. A differenza di RIPARTI non dipende da altro
 * stato della pagina, quindi vive da sé. `disabled` serve mentre una
 * conferma è in corso (TOGLI su un membro mentre un altro sta sparendo).
 */
function BottoneDueTocchi({ testo, onConferma, disabled, style }: {
  testo: string; onConferma: () => void; disabled?: boolean; style?: CSSProperties;
}) {
  const [armato, setArmato] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armato) return;
    function fuoriDalBottone(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setArmato(false);
    }
    document.addEventListener('click', fuoriDalBottone);
    return () => document.removeEventListener('click', fuoriDalBottone);
  }, [armato]);

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armato) {
          setArmato(false);
          onConferma();
        } else {
          setArmato(true);
        }
      }}
      style={style}
    >
      {armato ? 'SICURO?' : testo}
    </button>
  );
}

/** Un tasto dello stepper delle porzioni: 44px di tap, dimming al 35% al limite come le frecce dei pasti. */
function BottoneStepper({ etichetta, segno, disabled, onClick }: {
  etichetta: string; segno: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etichetta}
      style={{
        width: 44, height: 44, borderRadius: 14, background: 'rgba(20,22,58,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 600, color: 'var(--ink)', opacity: disabled ? 0.35 : 1,
      }}
    >
      {segno}
    </button>
  );
}

function Etichetta({ children, margine }: { children: ReactNode; margine: string }) {
  return (
    <div style={{ margin: margine, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
      {children}
    </div>
  );
}

interface PropsRigaPasto {
  pasto: MealSlotDef;
  indice: number;
  totale: number;
  onSu: () => void;
  onGiu: () => void;
  onRimuovi: () => void;
  onCambiaNome: (nome: string) => void;
  onConfermaNome: () => void;
  onToggleGiorno: (indiceGiorno: number) => void;
  rimozioneAttiva: boolean;
}

/**
 * Una riga pasto: nome modificabile, frecce di riordino, rimozione, e sotto
 * le sette pastiglie dei giorni "abitualmente fuori casa". Il pulsante di
 * rimozione non è nell'artboard (il mock non copre il vincolo 3-5): 34px
 * come su/giu, per coerenza visiva con il resto della riga.
 */
function RigaPastoEditor({
  pasto, indice, totale, onSu, onGiu, onRimuovi, onCambiaNome, onConfermaNome, onToggleGiorno, rimozioneAttiva,
}: PropsRigaPasto) {
  return (
    <div style={{ background: 'var(--superficie)', borderRadius: 18, border: '1px solid var(--bordo)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px 11px' }}>
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
          <path d="M6.6 6h6.8M6.6 10h6.8M6.6 14h6.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={pasto.nome}
          onChange={(e) => onCambiaNome(e.target.value)}
          onBlur={onConfermaNome}
          aria-label="Nome del pasto"
          style={{
            flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
            color: 'var(--ink)', border: 'none', outline: 'none', background: 'transparent', padding: 0,
          }}
        />
        <button
          type="button"
          onClick={onRimuovi}
          disabled={!rimozioneAttiva}
          aria-label={`Rimuovi ${pasto.nome}`}
          style={{
            width: 34, height: 34, borderRadius: 11, background: 'rgba(20,22,58,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rimozioneAttiva ? 1 : 0.35,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onSu}
          disabled={indice === 0}
          aria-label={`Sposta ${pasto.nome} in alto`}
          style={{
            width: 34, height: 34, borderRadius: 11, background: 'rgba(20,22,58,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: indice === 0 ? 0.35 : 1,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M3.6 10 8 5.6 12.4 10" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onGiu}
          disabled={indice === totale - 1}
          aria-label={`Sposta ${pasto.nome} in basso`}
          style={{
            width: 34, height: 34, borderRadius: 11, background: 'rgba(20,22,58,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: indice === totale - 1 ? 0.35 : 1,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M3.6 6 8 10.4 12.4 6" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div style={{ padding: '0 14px 13px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: 'var(--ter)', marginBottom: 7 }}>
          ABITUALMENTE FUORI CASA
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {pasto.assenzeAbituali.map((acceso, gi) => (
            <button
              key={gi}
              type="button"
              onClick={() => onToggleGiorno(gi)}
              aria-pressed={acceso}
              aria-label={`${GIORNI_LUNGHI[gi]}, abitualmente fuori casa`}
              style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
            >
              <span
                style={{
                  width: '100%', height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  background: acceso ? 'var(--ink)' : 'rgba(20,22,58,0.05)',
                  color: acceso ? '#FFFFFF' : 'var(--ter)',
                }}
              >
                {GIORNI[gi]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Header minimale: freccia indietro (torna a dove si veniva, via il burger della Testata), etichetta centrale. */
function Cornice({ children, router }: { children?: ReactNode; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Indietro"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* Niente eyebrow "IMPOSTAZIONI" qui: il titolo grande sotto (H1
            "Impostazioni") basta, il doppio titolo era ridondante. */}
        <div style={{ width: 44, height: 44 }} />
      </div>
      {children}
    </div>
  );
}
