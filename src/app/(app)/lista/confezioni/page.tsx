'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UnitaBase } from '@/domain/types';
import { formatoProposto, type QuantitaConfezione } from '@/domain/ean';
import { confezioniNecessarie } from '@/domain/confezioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, type ListaSalvata, type SezioneSalvata } from '@/data/lista';
import {
  leggiVociComprate, aggiornaFormatoDaScansione, FORMATO_MAX, CONFEZIONI_MAX, type VoceComprata,
} from '@/data/confezioni';
import { Scanner } from '@/components/Scanner';

/**
 * Stessa regola di "Hai preso tutto" (lista/fatta): copiata, non importata
 * da una pagina. Una lista è finita solo quando ogni voce è spuntata e non
 * resta nessun controllo da rispondere.
 */
function tuttoFatto(lista: ListaSalvata): boolean {
  const sezioni: SezioneSalvata[] = [...lista.base, ...lista.topup];
  let totale = 0;
  let fatte = 0;
  let controlliInSospeso = 0;
  for (const s of sezioni) {
    for (const v of s.voci) {
      totale += 1;
      if (v.spuntato) fatte += 1;
    }
    controlliInSospeso += s.controlli.length;
  }
  return totale > 0 && fatte === totale && controlliInSospeso === 0;
}

/**
 * "500 g", "1250 g", "750 ml", "6 pz": il valore esatto, senza arrotondare
 * a "1,3 kg". Qui si confrontano formati e si scrive quello che si è
 * comprato: un arrotondamento nasconderebbe proprio la differenza che la
 * pagina serve a vedere.
 */
function quantita(valore: number, unita: UnitaBase): string {
  return `${valore} ${unita}`;
}

/** La risposta di GET /api/prodotto/[ean] (spec §2). */
type RispostaProdotto =
  | { trovato: true; nome: string; marca: string; quantita: QuantitaConfezione | null }
  | { trovato: false };

/** Cosa mostra il riquadro di una voce dopo la lettura del codice. */
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
 * Il formato scritto a mano: da 1 a FORMATO_MAX. Il data layer accetta da un
 * millesimo in su (un tetto generico contro lo zero e i refusi), ma qui le
 * unità sono grammi, millilitri e pezzi: sotto il grammo o il millilitro non
 * c'è nessuna confezione in vendita, e un pezzo non si spezza. Un "0,5"
 * digitato è quasi sempre un "500" con la virgola sbagliata, non mezzo grammo.
 */
function numeroDaCampo(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 1 && n <= FORMATO_MAX ? n : null;
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
 * /settimana). Lo scanner non parla con la rete: è questa pagina che chiama
 * `/api/prodotto/[ean]` e decide cosa proporre.
 */
export default function Confezioni() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [attiva, setAttiva] = useState<Attiva | null>(null);
  // La voce aperta, leggibile in modo sincrono da chi torna da una fetch:
  // lo stato React arriva solo al render dopo.
  const attivaRef = useRef<string | null>(null);
  const [aggiornati, setAggiornati] = useState<Set<string>>(() => new Set());
  const [manuale, setManuale] = useState('');
  /** Il campo "quante ne hai comprate": null finché non lo tocca, e vale il proposto. */
  const [comprate, setComprate] = useState<string | null>(null);
  const [scrivendo, setScrivendo] = useState(false);
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
          router.replace('/settimana');
          return;
        }
        const lista = await leggiListe(settimana.id);
        if (!lista || !tuttoFatto(lista)) {
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
    setAttiva(a);
    setManuale('');
    setComprate(null);
    setErroreScrittura(null);
  }

  function apriScanner(itemId: string) {
    apri({ itemId, esito: null });
  }

  function chiudi() {
    apri(null);
  }

  /**
   * Un esito arrivato da una fetch: vale solo se la voce è ancora quella
   * aperta. Se intanto si è premuto SCANSIONA su un'altra voce, la risposta
   * in ritardo non deve coprire il suo scanner.
   */
  function seAncoraAperta(voce: VoceComprata, esito: Esito) {
    setAttiva((a) => (a?.itemId === voce.itemId ? { itemId: voce.itemId, esito } : a));
  }

  /**
   * Scrive formato e confezioni comprate e allinea la scheda come fa il
   * dato: tutte le voci dello stesso ingrediente (una può stare in base e in
   * top-up) prendono il nuovo formato; le confezioni vanno sulla prima (le
   * voci arrivano già in ordine base → top-up) e 0 sulle altre.
   */
  async function scrivi(
    voce: VoceComprata,
    formato: number,
    ean: string | null,
    confezioni: number,
    poi: 'chiudi' | 'confermato',
  ) {
    if (!stato || scrivendo) return;
    setScrivendo(true);
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
      if (poi === 'chiudi') chiudi();
      else seAncoraAperta(voce, { tipo: 'confermato', formato });
    } catch (errore) {
      if (errore instanceof Error && errore.message === 'spesa già chiusa') {
        router.replace('/settimana');
        return;
      }
      console.error('lista/confezioni: aggiornamento del formato fallito.', errore);
      if (attivaRef.current === voce.itemId) setErroreScrittura('Non siamo riusciti ad aggiornare. Riprova.');
    } finally {
      setScrivendo(false);
    }
  }

  async function onCodice(voce: VoceComprata, ean: string) {
    apri({ itemId: voce.itemId, esito: { tipo: 'cerco' } });
    let risposta: RispostaProdotto;
    try {
      const res = await fetch(`/api/prodotto/${ean}`);
      // Sessione scaduta: il proxy rimanda a /entra (la fetch segue il
      // redirect e torna HTML) o la route risponde 401. Non è un errore del
      // catalogo: si va a entrare, non si propone di scrivere a mano.
      if (res.redirected || res.status === 401) {
        router.replace('/entra');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      risposta = (await res.json()) as RispostaProdotto;
    } catch (errore) {
      console.error('lista/confezioni: catalogo non raggiungibile.', errore instanceof Error ? errore.name : 'errore');
      seAncoraAperta(voce, {
        tipo: 'manuale',
        messaggio: 'Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.',
        marca: '', nome: '', ean: null,
      });
      return;
    }

    if (!risposta.trovato || !risposta.quantita) {
      seAncoraAperta(voce, {
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
      seAncoraAperta(voce, { tipo: 'unita-diversa', unitaOff: risposta.quantita.unita });
      return;
    }
    if (proposta === voce.formato) {
      // Il formato non cambia e nemmeno le confezioni: niente da chiedere.
      // Ma il codice sì: si memorizza, così la prossima volta l'ingrediente
      // ha il suo ean. "Confermato" si dice solo dopo che la scrittura è andata.
      if (attivaRef.current !== voce.itemId) return;
      seAncoraAperta(voce, { tipo: 'confermo', formato: proposta, ean });
      void scrivi(voce, proposta, ean, voce.confezioni, 'confermato');
      return;
    }
    seAncoraAperta(voce, { tipo: 'proposta', marca: risposta.marca, nome: risposta.nome, formato: proposta, ean });
  }

  if (erroreCaricamento) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{erroreCaricamento}</p>
      </Cornice>
    );
  }

  if (!stato) return <Cornice />;

  const formatoManuale = numeroDaCampo(manuale);

  return (
    <Cornice>
      <div className="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)', marginBottom: 6 }}>
            Le confezioni vere
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#8A8A96' }}>
            Scansiona quello che hai comprato: se la confezione è diversa dal formato che l’app assume, il residuo si
            corregge da solo.
          </div>
        </div>

        {stato.voci.length === 0 && (
          <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.045)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.
          </div>
        )}

        {stato.voci.map((voce) => {
          const aperta = attiva?.itemId === voce.itemId;
          const esito = aperta ? attiva.esito : null;
          // Il formato su cui si chiede "quante ne hai comprate": quello
          // proposto dal catalogo, o quello scritto a mano se è valido.
          const formatoInDomanda = esito?.tipo === 'proposta' ? esito.formato : esito?.tipo === 'manuale' ? formatoManuale : null;
          const necessarie = formatoInDomanda === null ? null : necessarieCon(voce, formatoInDomanda);
          const confezioniComprate = necessarie === null ? null : interoDaCampo(comprate ?? String(necessarie));
          return (
            <div
              key={voce.itemId}
              style={{ padding: '14px 16px', borderRadius: 20, background: '#FFFFFF', border: '1px solid rgba(20,22,58,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {voce.nome}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--sec)', marginTop: 2 }}>
                    {`${voce.confezioni} × ${quantita(voce.formato, voce.unita)}`}
                    {aggiornati.has(voce.itemId) && ' · AGGIORNATO'}
                  </div>
                </div>
                {!aperta && (
                  <button
                    type="button"
                    onClick={() => apriScanner(voce.itemId)}
                    style={{
                      flex: 'none', height: 40, padding: '0 16px', borderRadius: 999, border: 'none',
                      background: '#14163A', color: '#FFFFFF',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
                    }}
                  >
                    SCANSIONA
                  </button>
                )}
              </div>

              {aperta && esito === null && (
                <Scanner onCodice={(ean) => void onCodice(voce, ean)} onAnnulla={chiudi} />
              )}

              {esito?.tipo === 'cerco' && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--sec)' }}>Cerco nel catalogo…</p>
              )}

              {esito?.tipo === 'unita-diversa' && (
                <Riquadro>
                  <Testo>
                    {`Unità diversa (${esito.unitaOff} contro ${voce.unita}): non aggiorno. Correggi il formato a mano se serve.`}
                  </Testo>
                  <Azioni>
                    <Secondario onClick={chiudi}>CHIUDI</Secondario>
                  </Azioni>
                </Riquadro>
              )}

              {esito?.tipo === 'confermo' && (
                <Riquadro>
                  {erroreScrittura
                    ? <Errore>{erroreScrittura}</Errore>
                    : <Testo>{`Formato ${quantita(esito.formato, voce.unita)}, come in lista. Memorizzo il codice…`}</Testo>}
                  <Azioni>
                    {erroreScrittura && (
                      <Primario disabled={scrivendo} onClick={() => void scrivi(voce, esito.formato, esito.ean, voce.confezioni, 'confermato')}>
                        RIPROVA
                      </Primario>
                    )}
                    <Secondario onClick={chiudi}>CHIUDI</Secondario>
                  </Azioni>
                </Riquadro>
              )}

              {esito?.tipo === 'confermato' && (
                <Riquadro>
                  <Testo>{`Formato confermato: ${quantita(esito.formato, voce.unita)}.`}</Testo>
                  <Azioni>
                    <Secondario onClick={chiudi}>CHIUDI</Secondario>
                  </Azioni>
                </Riquadro>
              )}

              {esito?.tipo === 'proposta' && (
                <Riquadro>
                  <Testo forte>{rigaProdotto(esito.marca, esito.nome, quantita(esito.formato, voce.unita))}</Testo>
                  <Testo>
                    {`La confezione è ${quantita(esito.formato, voce.unita)}, nel formato avevi ${quantita(voce.formato, voce.unita)}. Aggiorno per questa settimana e per le prossime?`}
                  </Testo>
                  {necessarie !== null && (
                    <DomandaConfezioni
                      testo={`Con confezioni da ${quantita(esito.formato, voce.unita)} ne bastano ${necessarie} (la lista ne chiedeva ${voce.confezioni}). Quante ne hai comprate?`}
                      valore={comprate ?? String(necessarie)}
                      onChange={setComprate}
                    />
                  )}
                  {erroreScrittura && <Errore>{erroreScrittura}</Errore>}
                  <Azioni>
                    <Primario
                      disabled={scrivendo || confezioniComprate === null}
                      onClick={() => confezioniComprate !== null && void scrivi(voce, esito.formato, esito.ean, confezioniComprate, 'chiudi')}
                    >
                      AGGIORNA
                    </Primario>
                    <Secondario onClick={chiudi}>LASCIA</Secondario>
                  </Azioni>
                </Riquadro>
              )}

              {esito?.tipo === 'manuale' && (
                <Riquadro>
                  <Testo>{esito.messaggio}</Testo>
                  {(esito.marca || esito.nome) && <Testo forte>{rigaProdotto(esito.marca, esito.nome)}</Testo>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      aria-label="Formato a mano"
                      inputMode="decimal"
                      placeholder={String(voce.formato)}
                      value={manuale}
                      onChange={(e) => setManuale(e.target.value)}
                      style={{
                        flex: 1, minWidth: 0, height: 44, padding: '0 14px', borderRadius: 14,
                        border: '1px solid rgba(20,22,58,0.16)', background: '#FFFFFF',
                        fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)',
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sec)' }}>{voce.unita}</span>
                  </div>
                  {formatoManuale !== null && necessarie !== null && (
                    <DomandaConfezioni
                      testo={`Con confezioni da ${quantita(formatoManuale, voce.unita)} ne bastano ${necessarie} (la lista ne chiedeva ${voce.confezioni}). Quante ne hai comprate?`}
                      valore={comprate ?? String(necessarie)}
                      onChange={setComprate}
                    />
                  )}
                  {erroreScrittura && <Errore>{erroreScrittura}</Errore>}
                  <Azioni>
                    <Primario
                      disabled={scrivendo || formatoManuale === null || confezioniComprate === null}
                      onClick={() =>
                        formatoManuale !== null && confezioniComprate !== null
                        && void scrivi(voce, formatoManuale, esito.ean, confezioniComprate, 'chiudi')}
                    >
                      AGGIORNA
                    </Primario>
                    <Secondario onClick={chiudi}>LASCIA</Secondario>
                  </Azioni>
                </Riquadro>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '6px 16px 0' }}>
        <Link
          href="/lista/fatta"
          style={{
            width: '100%', height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            background: 'transparent', border: '1.5px solid rgba(20,22,58,0.16)', color: 'var(--ink)',
          }}
        >
          TORNA A HAI PRESO TUTTO
        </Link>
      </div>
    </Cornice>
  );
}

/** "Quante ne hai comprate?" con il campo intero accanto. */
function DomandaConfezioni({ testo, valore, onChange }: { testo: string; valore: string; onChange: (v: string) => void }) {
  return (
    <>
      <Testo>{testo}</Testo>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          aria-label="Confezioni comprate"
          inputMode="numeric"
          value={valore}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 96, height: 44, padding: '0 14px', borderRadius: 14,
            border: '1px solid rgba(20,22,58,0.16)', background: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)',
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sec)' }}>confezioni</span>
      </div>
    </>
  );
}

function Riquadro({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(20,22,58,0.045)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  );
}

function Testo({ children, forte = false }: { children: ReactNode; forte?: boolean }) {
  return (
    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)', fontWeight: forte ? 700 : 400 }}>
      {children}
    </p>
  );
}

function Errore({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12.5, color: 'var(--sec)' }}>{children}</p>;
}

function Azioni({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>{children}</div>;
}

function Primario({ children, onClick, disabled = false }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 40, padding: '0 16px', borderRadius: 999, border: 'none',
        background: '#14163A', color: '#FFFFFF',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Secondario({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 40, padding: '0 14px', borderRadius: 999,
        background: 'transparent', border: '1.5px solid rgba(20,22,58,0.16)', color: 'var(--ink)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Header ridotto come in Scegli: freccia indietro verso "Hai preso tutto",
 * etichetta mono al centro. Da qui si torna sempre a /lista/fatta, che è
 * l'unico posto da cui si arriva.
 */
function Cornice({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/lista/fatta"
          aria-label="Torna a Hai preso tutto"
          style={{ width: 44, height: 44, margin: '0 0 0 -10px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 5 7.8 12l6.7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
          CONFEZIONI
        </span>
        <div style={{ width: 44, height: 44, flex: 'none' }} />
      </div>
      {children}
    </div>
  );
}
