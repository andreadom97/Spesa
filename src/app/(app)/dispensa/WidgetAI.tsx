'use client';

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { EsitoCorrezione, ModificaProposta, VoceContesto } from '@/domain/dispensa-ai';
import { CONFIDENCE_SOGLIA } from '@/domain/dispensa-ai';
import { correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { client } from '@/data/supabase';
import { TondoFoglio } from '@/components/FoglioDalBasso';
import { IconaAI, IconaMicrofono, IconaX } from './icone';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario } from './controlli';
import { useAltezzaTastiera } from './useAltezzaTastiera';
import type { Dettatura } from './useDettatura';

interface Props {
  contesto: VoceContesto[];
  dettatura: Dettatura;
  /** La nota, tenuta dalla pagina: resta come bozza se si chiude (spec §H.1). */
  bozza: string;
  onBozza: (testo: string) => void;
  onDatiCambiati: () => void;
  onChiudi: () => void;
}

type StatoProposta = 'applicata' | 'annullata' | 'daConfermare';

/**
 * Applica una proposta (residuo o congelato) sull'ingrediente che indica, e
 * torna la promessa così l'invio può attenderla in sequenza — la spec vuole
 * un ordine deterministico, non una raffica di scritture in parallelo.
 *
 * Su `residuo`, `correggiResiduo` applica anche le regole delle date (spec
 * fase 4 §E.2, §E.3) e per questo vuole il valore di prima: `prima` è quello
 * che chi chiama sta lasciando, non quello a cui si sta scrivendo.
 */
function applica(p: ModificaProposta, valore: number | boolean, prima: number | boolean): Promise<void> {
  if (p.campo === 'residuo') return correggiResiduo(p.ingredientId, valore as number, prima as number);
  return impostaCongelato(p.ingredientId, valore as boolean);
}

const TASTIERA_APERTA = 80;

/**
 * Sulla banda della dettatura e sulla riga sotto: un tenuto lungo partito dal
 * Dock può finire sopra di loro, e non deve aprire la selezione o il menu.
 */
const SENZA_SELEZIONE = { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as const;
const BARRE = Array.from({ length: 22 }, (_, i) => i);

function tempo(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function cambio(p: ModificaProposta, voce: VoceContesto | undefined): string {
  if (p.campo === 'residuo') return `${p.valoreAttuale} → ${p.valoreNuovo} ${voce?.unitaBase ?? ''}`.trim();
  return p.valoreNuovo ? 'frigo → freezer' : 'freezer → frigo';
}

/**
 * Il widget di Modifica con l'AI (spec §H, v2 09–12): la nota scritta o
 * dettata, `FAI LE MODIFICHE`, l'esito. Il modello propone; sopra soglia si
 * applica subito e resta annullabile, sotto soglia aspetta `Conferma` — mai
 * una scrittura silenziosa su un dato incerto (spec della nota, §4-5).
 */
export function WidgetAI({ contesto, dettatura, bozza, onBozza, onDatiCambiati, onChiudi }: Props) {
  const tastiera = useAltezzaTastiera();
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const esitoRef = useRef<HTMLDivElement>(null);
  // Il click che segue un pointerdown sul tondo è già stato gestito da `premi`.
  const premutoRef = useRef(false);
  // Il velo chiude solo se anche il pointerdown è partito sul velo. Dal Dock il
  // tocco breve sul microfono apre il widget al pointerdown, e il click che
  // segue il rilascio può cadere sul velo (Dock a bottom 96 con la barra
  // ridotta, widget a 114): senza questa guardia il widget si richiuderebbe
  // subito. Tastiera e screen reader escono dalla X, che è il controllo.
  const veloPremutoRef = useRef(false);
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [nonDisponibile, setNonDisponibile] = useState(false);
  const [esito, setEsito] = useState<EsitoCorrezione | null>(null);
  const [stati, setStati] = useState<Map<number, StatoProposta>>(new Map());
  // Indici la cui riga ha un annulla/conferma in volo: guardia contro il
  // doppio tap (doppia scrittura, doppio onDatiCambiati) mentre l'await
  // sulla singola riga non è ancora tornato.
  const [righeInCorso, setRigheInCorso] = useState<Set<number>>(new Set());
  const perId = new Map(contesto.map((v) => [v.id, v]));

  // Il campo cresce col testo fino a 5 righe (15 × 1,5 × 5 + 24 di padding).
  // Si rimisura anche quando la textarea torna dopo la dettatura o l'invio:
  // lì la bozza è cambiata mentre il campo non c'era.
  useLayoutEffect(() => {
    const c = campoRef.current;
    if (!c) return;
    c.style.height = 'auto';
    c.style.height = `${Math.min(Math.max(c.scrollHeight, 96), 137)}px`;
  }, [bozza, dettatura.attiva, inviando]);

  // Il fuoco al campo solo alla prima apertura, non con `autoFocus`: la
  // textarea torna dopo ogni dettatura, e sul telefono riaprirebbe la
  // tastiera che la dettatura aveva chiuso. Se il widget nasce già in
  // dettatura (dal Dock), il campo non c'è e il fuoco resta dov'è.
  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  // All'esito il campo sparisce: il fuoco va al contenitore del recap, così
  // lo screen reader non resta su `body`.
  useEffect(() => {
    if (esito) esitoRef.current?.focus();
  }, [esito]);

  async function invia() {
    setInviando(true);
    setErrore(null);
    try {
      const sb = client();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setErrore('Non siamo riusciti a correggere. Riprova.');
        return;
      }

      // fetch che rigetta (offline) e json() che esplode (corpo non JSON)
      // sono entrambi errori non gestiti dai rami di stato sotto: senza
      // questo catch diventano un unhandled rejection e la nota resta
      // com'è ma senza nessun messaggio (C1).
      let nuovoEsito: EsitoCorrezione;
      try {
        const risposta = await fetch('/api/dispensa/correggi', {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nota: bozza, contesto }),
        });

        if (!risposta.ok) {
          if (risposta.status === 503) {
            setErrore('La correzione non è disponibile.');
            // La route risponde 503 quando non ha né chiave né mock: rimandare
            // la stessa nota non serve, FAI LE MODIFICHE resta spento fino
            // alla chiusura del widget (spec §H.4).
            setNonDisponibile(true);
          } else if (risposta.status === 422) {
            setErrore('Non ho capito la nota, riprova.');
          } else {
            setErrore('Non siamo riusciti a correggere. Riprova.');
          }
          return;
        }

        nuovoEsito = (await risposta.json()) as EsitoCorrezione;
      } catch (e) {
        console.error('dispensa: nota, richiesta fallita.', e);
        setErrore('Non siamo riusciti a correggere. Riprova.');
        return;
      }

      // Le proposte sopra soglia si applicano in sequenza: se una scrittura
      // fallisce a metà ci si ferma subito — le successive restano
      // "mai scritte", e non devono comparire come applicate nel recap
      // (C2). esito e stati si impostano insieme, dopo il giro, non prima:
      // altrimenti c'è una finestra in cui il recap è già montato con uno
      // stato ancora vuoto o (al secondo invio) quello della nota precedente
      // (I1).
      const nuoviStati = new Map<number, StatoProposta>();
      let erroreApplicazione = false;
      for (let i = 0; i < nuovoEsito.proposte.length; i++) {
        const p = nuovoEsito.proposte[i]!;
        if (p.confidence >= CONFIDENCE_SOGLIA) {
          try {
            await applica(p, p.valoreNuovo, p.valoreAttuale);
            nuoviStati.set(i, 'applicata');
          } catch (e) {
            console.error('dispensa: nota, applicazione automatica fallita.', e);
            erroreApplicazione = true;
            break;
          }
        } else {
          nuoviStati.set(i, 'daConfermare');
        }
      }

      setEsito(nuovoEsito);
      setStati(nuoviStati);
      onDatiCambiati();

      if (erroreApplicazione) {
        setErrore('Non siamo riusciti a correggere. Riprova.');
      } else {
        // Svuota il campo solo quando la nota è stata capita e applicata
        // per intero: sugli errori resta, perché altrimenti l'utente
        // dovrebbe riscriverla da capo (spec §5). Serve anche a non far
        // apparire due volte lo stesso testo — quello appena scritto e
        // quello del recap.
        onBozza('');
      }
    } finally {
      setInviando(false);
    }
  }

  // `prima` = `p.valoreAttuale` (non `p.valoreNuovo`): l'annulla ripristina
  // il residuo di prima e non deve toccare le date come se fosse una nuova
  // correzione. Un "finito" annullato (400 → 0 → 400) conserva l'acquisto
  // originale.
  //
  // Limiti noti, entrambi prezzo di non rileggere lo stato dal server (il
  // dato che conta, il residuo, torna giusto):
  // - annullare un'entrata (0 → 500 → 0) non ripristina `ultimo_acquisto`:
  //   l'entrata l'ha messo a oggi e l'annulla è un'uscita, che non lo tocca.
  //   Un mai comprato torna a 0 ma con un acquisto, e in pagina compare come
  //   «Finito» invece di sparire tra i mai comprati.
  // - la data scritta a mano, cancellata dal primo gesto (quello annullato),
  //   resta persa: annullare non la ripristina.
  async function annulla(indice: number, p: ModificaProposta) {
    if (righeInCorso.has(indice)) return;
    setRigheInCorso((prev) => new Set(prev).add(indice));
    setErrore(null);
    try {
      await applica(p, p.valoreAttuale, p.valoreAttuale);
      setStati((prev) => new Map(prev).set(indice, 'annullata'));
      onDatiCambiati();
    } catch (e) {
      console.error('dispensa: nota, annulla fallito.', e);
      setErrore('Non siamo riusciti a correggere. Riprova.');
    } finally {
      setRigheInCorso((prev) => {
        const successivo = new Set(prev);
        successivo.delete(indice);
        return successivo;
      });
    }
  }

  async function conferma(indice: number, p: ModificaProposta) {
    if (righeInCorso.has(indice)) return;
    setRigheInCorso((prev) => new Set(prev).add(indice));
    setErrore(null);
    try {
      await applica(p, p.valoreNuovo, p.valoreAttuale);
      setStati((prev) => new Map(prev).set(indice, 'applicata'));
      onDatiCambiati();
    } catch (e) {
      console.error('dispensa: nota, conferma fallita.', e);
      setErrore('Non siamo riusciti a correggere. Riprova.');
    } finally {
      setRigheInCorso((prev) => {
        const successivo = new Set(prev);
        successivo.delete(indice);
        return successivo;
      });
    }
  }

  // Classificazione esplicita (I1): un indice senza stato riconosciuto (mai
  // applicato, per esempio perché l'applicazione automatica si è fermata su
  // di lui) non deve finire in nessuno dei due gruppi per default.
  const indici = esito ? esito.proposte.map((p, i) => [i, p] as const) : [];
  const applicate = indici.filter(([i]) => stati.get(i) === 'applicata' || stati.get(i) === 'annullata');
  const attive = applicate.filter(([i]) => stati.get(i) === 'applicata').length;
  const daConfermare = indici.filter(([i]) => stati.get(i) === 'daConfermare');

  function premiMicrofono(e: PointerEvent<HTMLButtonElement>) {
    premutoRef.current = true;
    dettatura.premi(e.pointerId);
  }

  // Il click dopo un pointerdown è il dito: l'ha già gestito `premi`. Senza
  // pointerdown (tastiera, `detail` 0, o uno screen reader che sintetizza il
  // click con `detail` 1) è un tocco breve. `detail` 0 vale sempre come
  // tastiera, anche se un pointerdown è rimasto senza click.
  function clickMicrofono(e: MouseEvent<HTMLButtonElement>) {
    const dalDito = premutoRef.current && e.detail !== 0;
    premutoRef.current = false;
    if (!dalDito) dettatura.tocca();
  }

  const conEsito = esito !== null;
  const posizione = conEsito
    ? { top: 88, bottom: 114 }
    : { bottom: !dettatura.attiva && tastiera > TASTIERA_APERTA ? tastiera + 12 : 114 };

  const scatola = {
    minHeight: 96, boxSizing: 'border-box' as const, borderRadius: 14, padding: '12px 14px',
    border: '1.5px solid var(--ink)', fontSize: 15, lineHeight: 1.5, color: 'var(--ink)',
    whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const,
  };

  return (
    <div
      data-testid="velo-widget"
      onPointerDown={(e) => { veloPremutoRef.current = e.target === e.currentTarget; }}
      onClick={() => {
        const dalVelo = veloPremutoRef.current;
        veloPremutoRef.current = false;
        if (dalVelo) onChiudi();
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--overlay-foglio)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modifica con l'AI"
        className="anim-foglio"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: 12, right: 12, ...posizione,
          background: 'var(--superficie)', borderRadius: 22, boxShadow: 'var(--ombra-alta)', padding: '12px 12px 12px 16px',
          display: 'flex', flexDirection: 'column', gap: 10, overflowY: conEsito ? 'auto' : 'visible',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconaAI size={14} />
          <span style={{ flex: 1 }}><Etichetta>{"Modifica con l'AI"}</Etichetta></span>
          <TondoFoglio etichetta="Chiudi" onClick={onChiudi}><IconaX size={20} colore="var(--ink)" /></TondoFoglio>
        </div>

        {!conEsito && (
          <>
            {dettatura.attiva ? (
              <div aria-live="polite" style={scatola}>
                {bozza}
                {dettatura.provvisorio && <span style={{ color: 'var(--ter)' }}>{`${bozza ? ' ' : ''}${dettatura.provvisorio}`}</span>}
              </div>
            ) : inviando ? (
              <div className="anim-luce-testo" style={scatola}>{bozza}</div>
            ) : (
              <textarea
                ref={campoRef}
                aria-label="Nota per l'AI"
                value={bozza}
                onChange={(e) => onBozza(e.target.value)}
                placeholder="Es. ho finito il riso, l'olio è a metà…"
                rows={3}
                style={{ ...scatola, resize: 'none', outline: 'none', background: 'var(--superficie)', width: '100%' }}
              />
            )}

            {errore && <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>}
            {dettatura.errore && <MessaggioErrore ruolo="alert">{dettatura.errore}</MessaggioErrore>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dettatura.attiva ? (
                <div role="status" style={{ flex: 1, height: 54, borderRadius: 999, background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', overflow: 'hidden', ...SENZA_SELEZIONE }}>
                  <span aria-hidden="true" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, height: 26 }}>
                    {BARRE.map((i) => (
                      <span key={i} className="onda-barra" style={{ animationDelay: `${(i * 37) % 220}ms` }} />
                    ))}
                  </span>
                  {/* Il tempo non si rilegge ogni secondo: lo `status` annuncia la dettatura, non il conteggio. */}
                  <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,.62)' }}>
                    {tempo(dettatura.secondi)}
                  </span>
                </div>
              ) : (
                <TastoPrimario
                  onClick={() => void invia()}
                  disabled={inviando || nonDisponibile || bozza.trim() === ''}
                  style={{ flex: 1, ...(inviando ? { background: 'var(--ink)', color: 'var(--superficie)', opacity: 0.5 } : {}) }}
                >
                  FAI LE MODIFICHE
                </TastoPrimario>
              )}
              {/* Il tondo a destra, come nel Dock: aprendo dal microfono del Dock non salta di lato (25/09). */}
              {dettatura.disponibile && (
                <button
                  type="button"
                  aria-label="Registra un vocale"
                  onPointerDown={inviando ? undefined : premiMicrofono}
                  onClick={clickMicrofono}
                  // Su Android il tenuto lungo aprirebbe il menu o la
                  // selezione, e il browser manderebbe pointercancel.
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={inviando}
                  style={{
                    width: 56, height: 56, flex: 'none', borderRadius: 999, background: 'var(--ink)', touchAction: 'none',
                    userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: inviando ? 0.5 : 1,
                    transform: dettatura.attiva ? 'scale(1.06)' : 'none',
                    boxShadow: dettatura.attiva ? '0 0 0 6px rgba(20,22,58,0.10)' : 'none',
                  }}
                >
                  <IconaMicrofono />
                </button>
              )}
            </div>

            {dettatura.attiva && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)', ...SENZA_SELEZIONE }}>
                {dettatura.modo === 'tenuto' ? 'RILASCIA PER FERMARE' : 'TOCCA PER FERMARE'}
              </span>
            )}
            {inviando && (
              <span role="status" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)' }}>
                PREPARO LE MODIFICHE…
              </span>
            )}
          </>
        )}

        {conEsito && esito && (
          <div ref={esitoRef} tabIndex={-1} data-testid="esito-widget" style={{ display: 'flex', flexDirection: 'column', gap: 16, outline: 'none' }}>
            {errore && <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>}
            {applicate.length > 0 && (
              <Gruppo titolo={`APPLICATE ${attive} DI ${applicate.length}`}>
                {applicate.map(([i, p]) => {
                  const voce = perId.get(p.ingredientId);
                  const nome = voce?.nome ?? p.ingredientId;
                  const annullata = stati.get(i) === 'annullata';
                  return (
                    <RigaProposta
                      key={i}
                      nome={nome}
                      cambio={cambio(p, voce)}
                      motivazione={p.motivazione}
                      annullata={annullata}
                      azione={annullata ? undefined : { testo: 'Annulla', aria: `Annulla: ${nome} ${cambio(p, voce)}`, scuro: false, onClick: () => void annulla(i, p), spento: righeInCorso.has(i) }}
                    />
                  );
                })}
              </Gruppo>
            )}
            {daConfermare.length > 0 && (
              <Gruppo titolo={`DA CONFERMARE ${daConfermare.length}`}>
                {daConfermare.map(([i, p]) => {
                  const voce = perId.get(p.ingredientId);
                  const nome = voce?.nome ?? p.ingredientId;
                  return (
                    <RigaProposta
                      key={i}
                      nome={nome}
                      cambio={cambio(p, voce)}
                      motivazione={p.motivazione}
                      azione={{ testo: 'Conferma', aria: `Conferma: ${nome} ${cambio(p, voce)}`, scuro: true, onClick: () => void conferma(i, p), spento: righeInCorso.has(i) }}
                    />
                  );
                })}
              </Gruppo>
            )}
            {esito.nonRiconosciuti.length > 0 && (
              <Gruppo titolo="NON RICONOSCIUTI">
                {esito.nonRiconosciuti.map((n, i) => (
                  <p key={i} style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>{`«${n}»`}</p>
                ))}
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--testo-2)' }}>Cercali in dispensa.</p>
              </Gruppo>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Gruppo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)', marginBottom: 4 }}>{titolo}</span>
      {children}
    </div>
  );
}

function RigaProposta({ nome, cambio, motivazione, annullata = false, azione }: {
  nome: string; cambio: string; motivazione: string; annullata?: boolean;
  azione?: { testo: string; aria: string; scuro: boolean; onClick: () => void; spento: boolean };
}) {
  const barrato = annullata ? { textDecoration: 'line-through', color: 'rgba(20,22,58,0.34)' } : {};
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 10px 14px', borderRadius: 14, background: 'rgba(20,22,58,0.04)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', ...barrato }}>
          {nome}{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', ...barrato }}>{cambio}</span>
        </div>
        {annullata ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--testo-2)', marginTop: 3 }}>annullata</div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--testo-2)', marginTop: 3 }}>{motivazione}</div>
        )}
      </div>
      {azione && (
        <button
          type="button"
          aria-label={azione.aria}
          onClick={azione.onClick}
          disabled={azione.spento}
          style={{
            ...STILE_PILLOLA, padding: '0 13px', flex: 'none',
            background: azione.scuro ? 'var(--ink)' : 'var(--superficie)',
            color: azione.scuro ? 'var(--superficie)' : 'var(--ink)',
            border: azione.scuro ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
            opacity: azione.spento ? 0.5 : 1,
          }}
        >
          {azione.testo}
        </button>
      )}
    </div>
  );
}
