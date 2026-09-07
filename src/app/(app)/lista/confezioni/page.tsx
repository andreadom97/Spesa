'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UnitaBase } from '@/domain/types';
import { formatoProposto, type QuantitaConfezione } from '@/domain/ean';
import { formattaQuantita } from '@/domain/risparmio';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, type ListaSalvata, type SezioneSalvata } from '@/data/lista';
import { leggiVociComprate, aggiornaFormatoDaScansione, type VoceComprata } from '@/data/confezioni';
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

/** "500 g", "1,5 kg", "750 ml", "6 pz": una sola unità alla volta, via `formattaQuantita`. */
function quantita(valore: number, unita: UnitaBase): string {
  return formattaQuantita({ g: 0, ml: 0, pz: 0, [unita]: valore });
}

/** La risposta di GET /api/prodotto/[ean] (spec §2). */
type RispostaProdotto =
  | { trovato: true; nome: string; marca: string; quantita: QuantitaConfezione | null }
  | { trovato: false };

/** Cosa mostra il riquadro di una voce dopo la lettura del codice. */
type Esito =
  | { tipo: 'cerco' }
  | { tipo: 'unita-diversa'; unitaOff: UnitaBase }
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

function numeroDaCampo(s: string): number | null {
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
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
 * accrediterà). Solo le voci `porzionabile`: le `intero` si contano, non si
 * pesano, e le `stima` non hanno un formato da correggere (spec §4).
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
  const [aggiornati, setAggiornati] = useState<Set<string>>(() => new Set());
  const [manuale, setManuale] = useState('');
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

  function apriScanner(itemId: string) {
    setAttiva({ itemId, esito: null });
    setManuale('');
    setErroreScrittura(null);
  }

  function chiudi() {
    setAttiva(null);
    setManuale('');
    setErroreScrittura(null);
  }

  /**
   * Scrive il formato e allinea la scheda: tutte le voci dello stesso
   * ingrediente (una può stare in base e in top-up) prendono il nuovo
   * formato e `quantitaTotale = confezioni × formato`, come fa il dato.
   */
  async function scrivi(voce: VoceComprata, formato: number, ean: string | null, poi: 'chiudi' | 'resta') {
    if (!stato || scrivendo) return;
    setScrivendo(true);
    setErroreScrittura(null);
    try {
      await aggiornaFormatoDaScansione({ ingredientId: voce.ingredientId, weekId: stato.weekId, formato, ean });
      setStato((s) =>
        s && {
          ...s,
          voci: s.voci.map((v) =>
            v.ingredientId === voce.ingredientId
              ? { ...v, formato, quantitaTotale: v.confezioni * formato, ean: ean ?? v.ean }
              : v,
          ),
        },
      );
      if (formato !== voce.formato) {
        setAggiornati((a) => {
          const n = new Set(a);
          for (const v of stato.voci) if (v.ingredientId === voce.ingredientId) n.add(v.itemId);
          return n;
        });
      }
      if (poi === 'chiudi') chiudi();
    } catch (errore) {
      if (errore instanceof Error && errore.message === 'spesa già chiusa') {
        router.replace('/settimana');
        return;
      }
      console.error('lista/confezioni: aggiornamento del formato fallito.', errore);
      setErroreScrittura('Non siamo riusciti ad aggiornare. Riprova.');
    } finally {
      setScrivendo(false);
    }
  }

  async function onCodice(voce: VoceComprata, ean: string) {
    setAttiva({ itemId: voce.itemId, esito: { tipo: 'cerco' } });
    let risposta: RispostaProdotto;
    try {
      const res = await fetch(`/api/prodotto/${ean}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      risposta = (await res.json()) as RispostaProdotto;
    } catch (errore) {
      console.error('lista/confezioni: catalogo non raggiungibile.', errore instanceof Error ? errore.name : 'errore');
      setAttiva({
        itemId: voce.itemId,
        esito: {
          tipo: 'manuale',
          messaggio: 'Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.',
          marca: '', nome: '', ean: null,
        },
      });
      return;
    }

    if (!risposta.trovato || !risposta.quantita) {
      setAttiva({
        itemId: voce.itemId,
        esito: {
          tipo: 'manuale',
          messaggio: 'Prodotto non trovato: puoi scrivere il formato a mano.',
          marca: risposta.trovato ? risposta.marca : '',
          nome: risposta.trovato ? risposta.nome : '',
          ean: risposta.trovato ? ean : null,
        },
      });
      return;
    }

    const proposta = formatoProposto(risposta.quantita, voce.unita);
    if (proposta === null) {
      setAttiva({ itemId: voce.itemId, esito: { tipo: 'unita-diversa', unitaOff: risposta.quantita.unita } });
      return;
    }
    if (proposta === voce.formato) {
      setAttiva({ itemId: voce.itemId, esito: { tipo: 'confermato', formato: proposta } });
      // Il formato non cambia ma il codice sì: si memorizza, così la prossima
      // volta l'ingrediente ha il suo ean.
      void scrivi(voce, proposta, ean, 'resta');
      return;
    }
    setAttiva({
      itemId: voce.itemId,
      esito: { tipo: 'proposta', marca: risposta.marca, nome: risposta.nome, formato: proposta, ean },
    });
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

              {esito?.tipo === 'confermato' && (
                <Riquadro>
                  <Testo>{`Formato confermato: ${quantita(esito.formato, voce.unita)}.`}</Testo>
                  {erroreScrittura && <Errore>{erroreScrittura}</Errore>}
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
                  {erroreScrittura && <Errore>{erroreScrittura}</Errore>}
                  <Azioni>
                    <Primario disabled={scrivendo} onClick={() => void scrivi(voce, esito.formato, esito.ean, 'chiudi')}>
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
                  {erroreScrittura && <Errore>{erroreScrittura}</Errore>}
                  <Azioni>
                    <Primario
                      disabled={scrivendo || formatoManuale === null}
                      onClick={() => formatoManuale !== null && void scrivi(voce, formatoManuale, esito.ean, 'chiudi')}
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
