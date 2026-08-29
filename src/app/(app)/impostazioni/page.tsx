'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni, salvaSlotDefs, pastiDiDefault } from '@/data/impostazioni';
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

  // Ultimo stato dei pasti confermato dal server: a differenza di `dati.pasti`
  // (che include anche le modifiche non ancora salvate, es. mentre si digita
  // un nome) è il valore a cui tornare se una scrittura fallisce.
  const pastiSalvatiRef = useRef<MealSlotDef[]>([]);
  const impostazioniSalvateRef = useRef<Impostazioni | null>(null);

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
   * Salva il ciclo. Come i pasti: ottimistico, con rollback all'ultimo stato
   * confermato dal server se la scrittura fallisce.
   *
   * `salvaImpostazioni` àncora da sé l'origine al lunedì corrente quando si
   * accende un ciclo che non ne ha una, quindi qui basta rileggere.
   */
  async function persistiCiclo(patch: Partial<Impostazioni>) {
    if (!dati) return;
    setErroreSalvataggio(null);
    const nuove = { ...dati.impostazioni, ...patch };
    setDati((correnti) => (correnti ? { ...correnti, impostazioni: nuove } : correnti));
    try {
      await salvaImpostazioni(nuove);
      const rilette = await leggiImpostazioni();
      impostazioniSalvateRef.current = rilette;
      setDati((correnti) => (correnti ? { ...correnti, impostazioni: rilette } : correnti));
    } catch (errore) {
      console.error('impostazioni: salvataggio del ciclo fallito.', errore);
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

        {/* Il moltiplicatore porzioni è tolto dall'interfaccia, non dal
            modello: `settings.moltiplicatore_porzioni` resta nello schema e
            list-builder continua a usarlo, fermo a 1. Un moltiplicatore
            unico presuppone che tutti a tavola mangino la stessa porzione,
            che è falso appena qualcuno mangia meno — e la lista sbagliata
            per eccesso non si nota, si nota solo la spesa più cara. Chi
            cucina per due scriva due banane nel piatto: è più lavoro una
            volta sola, ma dice la verità. Diverge dalla spec riga 166, dove
            la voce risulta "Chiusa"; la rimozione è richiesta esplicita di
            Andrea del 28/08/2026 dopo la prova sul campo. Rimetterlo è una
            riga di interfaccia, non una migrazione. */}

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
            onCambia={(id) => persistiCiclo({ settimaneCiclo: Number(id) })}
          />
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--sec)', marginTop: 11 }}>
            {settimaneCiclo === 1
              ? 'I piatti ruotano uno dopo l’altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.'
              : `Il giro è cominciato lunedì ${dataInParole(dati.impostazioni.cicloOrigine ?? lunediCorrente)}. Ogni piatto può dire a quale delle ${settimaneCiclo} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.`}
          </div>
          {settimaneCiclo > 1 && (
            <button
              type="button"
              onClick={() => persistiCiclo({ cicloOrigine: lunediCorrente })}
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
              RIPARTI DALLA SETTIMANA 1
            </button>
          )}
        </div>

        <Etichetta margine="26px 4px 10px">DISPENSA</Etichetta>
        <Link
          href="/dispensa"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18,
            background: 'var(--superficie)', border: '1px solid var(--bordo)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Cosa hai in casa</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--sec)', marginTop: 5 }}>
              CALCOLATO DALL’APP · CORREGGILO SE NON TORNA
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--ter)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          IMPOSTAZIONI
        </span>
        <div style={{ width: 44, height: 44 }} />
      </div>
      {children}
    </div>
  );
}
