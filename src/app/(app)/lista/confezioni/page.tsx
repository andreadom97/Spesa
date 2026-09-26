'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UnitaBase } from '@/domain/types';
import { formatoProposto } from '@/domain/ean';
import { confezioniNecessarie } from '@/domain/confezioni';
import { listaFinita } from '@/domain/lista-finita';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe } from '@/data/lista';
import {
  leggiVociComprate, aggiornaFormatoDaScansione, FORMATO_MAX, CONFEZIONI_MAX, type VoceComprata,
} from '@/data/confezioni';
import { Testata } from '@/components/Testata';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { TastoPrimario, TastoSecondario, MessaggioErrore, STILE_PILLOLA } from '@/components/controlli';
import { Carico } from '@/components/pannello/pezzi';
import { LettoreCodice, cercaProdotto } from '@/app/(app)/dispensa/LettoreCodice';

/**
 * "500 g", "1250 g", "750 ml", "6 pz": il valore esatto, senza arrotondare
 * a "1,3 kg". Qui si confrontano formati e si scrive quello che si è
 * comprato: un arrotondamento nasconderebbe proprio la differenza che la
 * pagina serve a vedere.
 */
function quantita(valore: number, unita: UnitaBase): string {
  return `${valore} ${unita}`;
}

/** Cosa mostra il foglio di una voce dopo la lettura del codice. */
type Esito =
  | { tipo: 'cerco' }
  | { tipo: 'unita-diversa'; unitaOff: UnitaBase }
  /** Formato uguale: il codice si sta memorizzando (o la scrittura è fallita e si può riprovare). */
  | { tipo: 'confermo'; formato: number; ean: string }
  /** Formato uguale e codice memorizzato. */
  | { tipo: 'confermato'; formato: number }
  | { tipo: 'proposta'; marca: string; nome: string; formato: number; ean: string }
  | {
      /** Non trovato (o senza quantità) oppure catalogo non raggiungibile: si scrive a mano. */
      tipo: 'manuale';
      messaggio: string;
      marca: string;
      nome: string;
      /** Il codice si memorizza solo se il catalogo lo conosce. */
      ean: string | null;
    };

interface Attiva {
  itemId: string;
  /** Il codice letto, per il riquadro; null finché si sta leggendo. */
  codice: string | null;
  esito: Esito | null;
}

interface Stato {
  weekId: string;
  voci: VoceComprata[];
}

/** "Barilla · Spaghetti n. 5 · 500 g": i segmenti vuoti si omettono. */
function rigaProdotto(marca: string, nome: string, coda?: string): string {
  return [marca, nome, coda].filter((s): s is string => Boolean(s)).join(' · ');
}

/**
 * Il formato scritto a mano: un intero da 1 a FORMATO_MAX, solo cifre. Il
 * data layer accetta da un millesimo in su (un tetto generico contro lo zero
 * e i refusi), ma qui le unità sono grammi, millilitri e pezzi: sotto il
 * grammo o il millilitro non c'è nessuna confezione in vendita, e un pezzo
 * non si spezza. Perciò niente decimali né notazioni: "1.000" all'italiana
 * è mille, non un grammo (`Number` lo leggerebbe come 1), "1,5" e "1e3" e
 * "0x10" non sono formati che qualcuno scrive apposta.
 */
function numeroDaCampo(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= FORMATO_MAX ? n : null;
}

/** Le confezioni comprate: un intero da 0 (non l'ho preso) a CONFEZIONI_MAX. */
function interoDaCampo(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n <= CONFEZIONI_MAX ? n : null;
}

/**
 * Quante confezioni del formato nuovo servirebbero per lo stesso fabbisogno
 * e residuo congelati nella riga: la stessa aritmetica di costruisciLista
 * (`ceil(daComprare / formato)`), così la proposta è quella che la lista
 * avrebbe scritto se avesse saputo il formato vero. Solo `porzionabile`: la
 * pagina non offre lo scan alle altre classi.
 */
function necessarieCon(voce: VoceComprata, formato: number): number {
  return confezioniNecessarie({
    fabbisogno: voce.fabbisogno, residuo: voce.residuo, classeResiduo: 'porzionabile', formatoConfezione: formato,
  }).confezioni;
}

/**
 * Le confezioni vere (spec 2026-09-07-scan-confezione-design.md §0–§1).
 *
 * Il formato confezione di un ingrediente è deciso a mano (o dal seed) e vale
 * per sempre: se compri una confezione diversa, il residuo derivato sbaglia di
 * quella differenza per sempre. Qui, alla chiusura della spesa, il codice a
 * barre del prodotto comprato dice la quantità reale della confezione e la
 * sostituisce a quella assunta — sull'ingrediente (le settimane prossime) e
 * sulle righe congelate di questa settimana (il residuo che `chiudiSpesa`
 * accrediterà). Con un formato diverso cambia anche il numero di confezioni
 * che aveva senso comprare, e la lista lo aveva calcolato sul formato
 * vecchio: perciò si chiede quante se ne sono comprate davvero, proponendo
 * il numero che la lista avrebbe scritto col formato nuovo. Solo le voci
 * `porzionabile`: le `intero` si contano, non si pesano, e le `stima` non
 * hanno un formato da correggere (spec §4).
 *
 * Raggiungibile solo a lista tutta spuntata, come "Hai preso tutto": prima
 * non si sa cosa si è comprato, dopo la chiusura il residuo è già
 * accreditato e la correzione non cambierebbe niente (si rimanda a
 * /piano). Lo scanner non parla con la rete: è questa pagina che chiama
 * `/api/prodotto/[ean]` e decide cosa proporre.
 *
 * La scansione si apre in un foglio dal basso con `LettoreCodice`, come nella
 * Dispensa (spec fase 6 §B.4): un foglio alla volta, quindi una sola voce
 * aperta.
 */
export default function Confezioni() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [attiva, setAttiva] = useState<Attiva | null>(null);
  // La voce aperta, leggibile in modo sincrono da chi torna da una fetch:
  // lo stato React arriva solo al render dopo.
  const attivaRef = useRef<string | null>(null);
  // Il codice della lettura in corso su quella voce, accanto ad attivaRef per
  // lo stesso motivo: chi si riapre sulla stessa voce con un altro codice deve
  // poter distinguere la risposta buona da quella di una lettura precedente.
  const codiceRef = useRef<string | null>(null);
  const [aggiornati, setAggiornati] = useState<Set<string>>(() => new Set());
  const [manuale, setManuale] = useState('');
  /** Il campo "quante ne hai comprate": null finché non lo tocca, e vale il proposto. */
  const [comprate, setComprate] = useState<string | null>(null);
  /**
   * L'itemId della voce la cui scrittura è in volo, null se nessuna. Per voce
   * e non un booleano: chi ha premuto AGGIORNA sulla pasta può intanto
   * scansionare il riso, e un "formato uguale" sul riso deve poter scrivere
   * — con un flag unico uscirebbe in silenzio da `scrivi` e resterebbe
   * appeso su "Memorizzo il codice…" senza RIPROVA.
   */
  const [scrivendo, setScrivendo] = useState<string | null>(null);
  const [erroreScrittura, setErroreScrittura] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          router.replace('/lista');
          return;
        }
        // A spesa chiusa il residuo è già accreditato: correggere qui non
        // cambierebbe niente (spec §1), e il data layer rifiuterebbe comunque.
        if (settimana.stato === 'chiusa') {
          router.replace('/piano');
          return;
        }
        const lista = await leggiListe(settimana.id);
        if (!lista || !listaFinita(lista)) {
          router.replace('/lista');
          return;
        }
        const voci = (await leggiVociComprate(settimana.id)).filter((v) => v.classeResiduo === 'porzionabile');
        if (!vivo) return;
        setStato({ weekId: settimana.id, voci });
      } catch (errore) {
        console.error('lista/confezioni: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare le confezioni. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [router]);

  function apri(a: Attiva | null) {
    attivaRef.current = a?.itemId ?? null;
    codiceRef.current = a?.codice ?? null;
    setAttiva(a);
    setManuale('');
    setComprate(null);
    setErroreScrittura(null);
  }

  function apriScanner(itemId: string) {
    apri({ itemId, codice: null, esito: null });
  }

  function chiudi() {
    apri(null);
  }

  /**
   * Un esito arrivato da una fetch: vale solo se la voce è ancora quella aperta *con
   * quel codice*. Se intanto si è chiuso il foglio e riaperta la stessa voce con
   * un'altra lettura, la risposta in ritardo della lettura precedente non deve
   * coprire quella nuova (itemId da solo non basta: la voce è la stessa).
   */
  function seAncoraAperta(voce: VoceComprata, ean: string | null, esito: Esito) {
    setAttiva((a) => (a && a.itemId === voce.itemId && a.codice === ean ? { ...a, esito } : a));
  }

  /**
   * Scrive formato e confezioni comprate e allinea la scheda come fa il
   * dato: tutte le voci dello stesso ingrediente (una può stare in base e in
   * top-up) prendono il nuovo formato; le confezioni vanno sulla prima (le
   * voci arrivano già in ordine base → top-up) e 0 sulle altre.
   *
   * La scheda si chiude (o passa a "confermato") solo se la voce è ancora
   * quella aperta: se intanto si è premuto SCANSIONA su un'altra, la
   * scrittura che torna non deve chiuderle lo scanner.
   */
  async function scrivi(
    voce: VoceComprata,
    formato: number,
    ean: string | null,
    confezioni: number,
    poi: 'chiudi' | 'confermato',
  ) {
    if (!stato || scrivendo === voce.itemId) return;
    setScrivendo(voce.itemId);
    setErroreScrittura(null);
    try {
      await aggiornaFormatoDaScansione({ ingredientId: voce.ingredientId, weekId: stato.weekId, formato, ean, confezioni });
      setStato((s) => {
        if (!s) return s;
        const prima = s.voci.findIndex((v) => v.ingredientId === voce.ingredientId);
        return {
          ...s,
          voci: s.voci.map((v, indice) => {
            if (v.ingredientId !== voce.ingredientId) return v;
            const c = indice === prima ? confezioni : 0;
            return { ...v, formato, confezioni: c, quantitaTotale: c * formato, ean: ean ?? v.ean };
          }),
        };
      });
      if (formato !== voce.formato || confezioni !== voce.confezioni) {
        setAggiornati((a) => {
          const n = new Set(a);
          for (const v of stato.voci) if (v.ingredientId === voce.ingredientId) n.add(v.itemId);
          return n;
        });
      }
      if (poi === 'chiudi') {
        if (attivaRef.current === voce.itemId) chiudi();
      } else {
        seAncoraAperta(voce, ean, { tipo: 'confermato', formato });
      }
    } catch (errore) {
      if (errore instanceof Error && errore.message === 'spesa già chiusa') {
        router.replace('/piano');
        return;
      }
      console.error('lista/confezioni: aggiornamento del formato fallito.', errore);
      if (attivaRef.current === voce.itemId) setErroreScrittura('Non siamo riusciti ad aggiornare. Riprova.');
    } finally {
      setScrivendo((s) => (s === voce.itemId ? null : s));
    }
  }

  async function onCodice(voce: VoceComprata, ean: string) {
    apri({ itemId: voce.itemId, codice: ean, esito: { tipo: 'cerco' } });
    const risposta = await cercaProdotto(ean);
    // Sessione scaduta: non è un errore del catalogo, si va a entrare.
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    if (risposta === 'errore') {
      seAncoraAperta(voce, ean, {
        tipo: 'manuale',
        messaggio: 'Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.',
        marca: '', nome: '', ean: null,
      });
      return;
    }
    if (!risposta.trovato || !risposta.quantita) {
      seAncoraAperta(voce, ean, {
        tipo: 'manuale',
        messaggio: 'Prodotto non trovato: puoi scrivere il formato a mano.',
        marca: risposta.trovato ? risposta.marca : '',
        nome: risposta.trovato ? risposta.nome : '',
        ean: risposta.trovato ? ean : null,
      });
      return;
    }

    const proposta = formatoProposto(risposta.quantita, voce.unita);
    if (proposta === null) {
      seAncoraAperta(voce, ean, { tipo: 'unita-diversa', unitaOff: risposta.quantita.unita });
      return;
    }
    if (proposta === voce.formato) {
      // Il formato non cambia e nemmeno le confezioni: niente da chiedere.
      // Ma il codice sì: si memorizza, così la prossima volta l'ingrediente
      // ha il suo ean. "Confermato" si dice solo dopo che la scrittura è andata.
      // Il confronto è su voce *e* codice: attivaRef da solo non basta se nel
      // frattempo si è riaperta la stessa voce con un'altra lettura (rilievo I2).
      if (attivaRef.current !== voce.itemId || codiceRef.current !== ean) return;
      seAncoraAperta(voce, ean, { tipo: 'confermo', formato: proposta, ean });
      void scrivi(voce, proposta, ean, voce.confezioni, 'confermato');
      return;
    }
    seAncoraAperta(voce, ean, { tipo: 'proposta', marca: risposta.marca, nome: risposta.nome, formato: proposta, ean });
  }

  const indietro = { etichetta: 'FINE SPESA', ariaLabel: 'Torna a fine spesa', onTorna: () => router.push('/lista/fatta') };

  if (erroreCaricamento) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}><MessaggioErrore>{erroreCaricamento}</MessaggioErrore></div>
      </Cornice>
    );
  }

  if (!stato) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}><Carico /></div>
      </Cornice>
    );
  }

  const voceAperta = attiva ? stato.voci.find((v) => v.itemId === attiva.itemId) ?? null : null;

  /** Cosa mostra il foglio di una voce dopo la lettura del codice (legge lo stato del componente). */
  function corpoFoglio(voce: VoceComprata, a: Attiva): ReactNode {
    const esito = a.esito;
    if (esito === null) return <LettoreCodice onCodice={(ean) => void onCodice(voce, ean)} />;

    const formatoManuale = numeroDaCampo(manuale);
    // Il formato su cui si chiede "quante ne hai comprate": quello proposto dal catalogo,
    // o quello scritto a mano se è valido.
    const formatoInDomanda = esito.tipo === 'proposta' ? esito.formato : esito.tipo === 'manuale' ? formatoManuale : null;
    const necessarie = formatoInDomanda === null ? null : necessarieCon(voce, formatoInDomanda);
    const confezioniComprate = necessarie === null ? null : interoDaCampo(comprate ?? String(necessarie));
    const inVolo = scrivendo === voce.itemId;

    return (
      <>
        <div style={{ background: 'rgba(20,22,58,0.04)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {a.codice && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)' }}>
              {`CODICE ${a.codice}`}
            </span>
          )}
          {esito.tipo === 'cerco' && <Testo secondario>Cerco nel catalogo…</Testo>}
          {esito.tipo === 'unita-diversa' && (
            <Testo>{`Unità diversa (${esito.unitaOff} contro ${voce.unita}): non aggiorno. Correggi il formato a mano se serve.`}</Testo>
          )}
          {esito.tipo === 'confermo' && !erroreScrittura && (
            <Testo>{`Formato ${quantita(esito.formato, voce.unita)}, come in lista. Memorizzo il codice…`}</Testo>
          )}
          {esito.tipo === 'confermato' && <Testo>{`Formato confermato: ${quantita(esito.formato, voce.unita)}.`}</Testo>}
          {esito.tipo === 'proposta' && (
            <>
              <Testo forte>{rigaProdotto(esito.marca, esito.nome, quantita(esito.formato, voce.unita))}</Testo>
              <Testo>
                {`La confezione è ${quantita(esito.formato, voce.unita)}, nel formato avevi ${quantita(voce.formato, voce.unita)}. Aggiorno per questa settimana e per le prossime?`}
              </Testo>
            </>
          )}
          {esito.tipo === 'manuale' && (
            <>
              <Testo>{esito.messaggio}</Testo>
              {(esito.marca || esito.nome) && <Testo forte>{rigaProdotto(esito.marca, esito.nome)}</Testo>}
              <CampoNumerico
                aria="Formato a mano"
                valore={manuale}
                segnaposto={String(voce.formato)}
                unita={voce.unita}
                onChange={(v) => {
                  setManuale(v);
                  // Le confezioni digitate erano per il formato di prima: con un altro
                  // formato la proposta cambia e il campo deve tornare a seguirla.
                  setComprate(null);
                }}
              />
            </>
          )}
          {necessarie !== null && formatoInDomanda !== null && (
            <>
              <Testo>
                {`Con confezioni da ${quantita(formatoInDomanda, voce.unita)} ne bastano ${necessarie} (la lista ne chiedeva ${voce.confezioni}). Quante ne hai comprate?`}
              </Testo>
              <CampoNumerico aria="Confezioni comprate" valore={comprate ?? String(necessarie)} unita="confezioni" onChange={setComprate} />
            </>
          )}
        </div>

        {erroreScrittura && <MessaggioErrore ruolo="alert">{erroreScrittura}</MessaggioErrore>}

        {(esito.tipo === 'unita-diversa' || esito.tipo === 'confermato') && (
          <TastoSecondario onClick={chiudi}>CHIUDI</TastoSecondario>
        )}
        {esito.tipo === 'confermo' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TastoSecondario onClick={chiudi} style={{ flex: 1 }}>CHIUDI</TastoSecondario>
            {erroreScrittura && (
              <TastoPrimario disabled={inVolo} onClick={() => void scrivi(voce, esito.formato, esito.ean, voce.confezioni, 'confermato')} style={{ flex: 1 }}>
                RIPROVA
              </TastoPrimario>
            )}
          </div>
        )}
        {(esito.tipo === 'proposta' || esito.tipo === 'manuale') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TastoSecondario onClick={chiudi} style={{ flex: 1 }}>LASCIA</TastoSecondario>
            <TastoPrimario
              disabled={inVolo || confezioniComprate === null || (esito.tipo === 'manuale' && formatoManuale === null)}
              onClick={() => {
                const formato = esito.tipo === 'proposta' ? esito.formato : formatoManuale;
                if (formato !== null && confezioniComprate !== null) void scrivi(voce, formato, esito.ean, confezioniComprate, 'chiudi');
              }}
              style={{ flex: 1 }}
            >
              AGGIORNA
            </TastoPrimario>
          </div>
        )}
      </>
    );
  }

  return (
    <Cornice indietro={indietro}>
      <div className="sc scroll-app" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: '0 2px', fontSize: 13, lineHeight: 1.5, color: 'var(--testo-2)' }}>
          Scansiona quello che hai comprato: se la confezione è diversa dal formato che l’app assume, il residuo si
          corregge da solo.
        </p>

        {stato.voci.length === 0 && (
          <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.035)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.
          </div>
        )}

        {stato.voci.map((voce) => (
          <div
            key={voce.itemId}
            style={{ padding: 16, borderRadius: 22, background: 'var(--superficie)', border: '1px solid var(--bordo)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {voce.nome}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--testo-2)', marginTop: 2 }}>
                {`${voce.confezioni} × ${quantita(voce.formato, voce.unita)}`}
                {aggiornati.has(voce.itemId) && ' · AGGIORNATO'}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Scansiona ${voce.nome}`}
              onClick={() => apriScanner(voce.itemId)}
              style={{ ...STILE_PILLOLA, flex: 'none', border: 'none', background: 'var(--ink)', color: 'var(--superficie)' }}
            >
              SCANSIONA
            </button>
          </div>
        ))}
      </div>

      {/* La key rimonta il LettoreCodice quando si apre un'altra voce (anche da tastiera,
          senza passare dal ✕): niente stato di una lettura precedente sotto un'altra scheda. */}
      {attiva && voceAperta && (
        <FoglioDalBasso key={attiva.itemId} etichetta={`Confezione di ${voceAperta.nome}`} onChiudi={chiudi}>
          <TestataFoglio onChiudi={chiudi} etichettaChiudi="Chiudi la scansione">
            <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{voceAperta.nome}</span>
          </TestataFoglio>
          <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {corpoFoglio(voceAperta, attiva)}
          </div>
        </FoglioDalBasso>
      )}
    </Cornice>
  );
}

function Testo({ children, forte = false, secondario = false }: { children: ReactNode; forte?: boolean; secondario?: boolean }) {
  return (
    <p style={{ margin: 0, fontSize: forte ? 15.5 : secondario ? 12.5 : 13.5, lineHeight: 1.5, fontWeight: forte ? 700 : 400, color: secondario ? 'var(--testo-2)' : 'var(--ink)' }}>
      {children}
    </p>
  );
}

/** Campo numerico di DESIGN.md §8: largo 96, mono 14/700 a destra, l'unità in mono 10 --ter. */
function CampoNumerico({ aria, valore, segnaposto, unita, onChange }: {
  aria: string; valore: string; segnaposto?: string; unita: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="text"
        aria-label={aria}
        inputMode="numeric"
        placeholder={segnaposto}
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
          border: '1px solid var(--bordo)', background: 'var(--superficie)',
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ink)',
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ter)' }}>{unita}</span>
    </div>
  );
}

/** Colonna a tutta altezza con la Testata in modo indietro verso il traguardo (spec fase 6 §B.2). */
function Cornice({ indietro, children }: { indietro: { etichetta: string; ariaLabel: string; onTorna: () => void }; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Confezioni" indietro={indietro} />
      {children}
    </div>
  );
}
