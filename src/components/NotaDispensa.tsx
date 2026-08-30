'use client';

import { useEffect, useRef, useState } from 'react';
import type { EsitoCorrezione, ModificaProposta, VoceContesto } from '@/domain/dispensa-ai';
import { CONFIDENCE_SOGLIA } from '@/domain/dispensa-ai';
import { correggiResiduo, impostaCongelato } from '@/data/dispensa';
import { client } from '@/data/supabase';

interface Props {
  contesto: VoceContesto[];
  /** La pagina ricarica i dati: le applicazioni cambiano residui e flag. */
  onDatiCambiati: () => void;
}

type StatoProposta = 'applicata' | 'annullata' | 'daConfermare';

// Minimo indispensabile dell'API SpeechRecognition per la dettatura: il resto
// del browser (webkitSpeechRecognition compreso) non serve qui.
interface SpeechRecognitionLike {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/**
 * Applica una proposta (residuo o congelato) sull'ingrediente che indica, e
 * torna la promessa così l'invio può attenderla in sequenza — la spec vuole
 * un ordine deterministico, non una raffica di scritture in parallelo.
 */
function applica(p: ModificaProposta, valore: number | boolean): Promise<void> {
  if (p.campo === 'residuo') return correggiResiduo(p.ingredientId, valore as number);
  return impostaCongelato(p.ingredientId, valore as boolean);
}

/**
 * La nota libera che rimette in pari la dispensa senza passare riga per riga:
 * "ho finito il riso, l'olio è a metà". Il modello propone, le proposte sopra
 * soglia si applicano subito e restano annullabili, quelle sotto soglia
 * aspettano una conferma esplicita — mai una scrittura silenziosa su un dato
 * incerto (spec §4-5).
 */
export function NotaDispensa({ contesto, onDatiCambiati }: Props) {
  const [nota, setNota] = useState('');
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<EsitoCorrezione | null>(null);
  const [stati, setStati] = useState<Map<number, StatoProposta>>(new Map());
  // Indici la cui riga ha un annulla/conferma in volo: guardia contro il
  // doppio tap (doppia scrittura, doppio onDatiCambiati) mentre l'await
  // sulla singola riga non è ancora tornato.
  const [righeInCorso, setRigheInCorso] = useState<Set<number>>(new Set());
  const [dettaturaDisponibile, setDettaturaDisponibile] = useState(false);
  const riconoscitoreRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    // Non è stato derivato da uno stato/prop React (il caso che la regola
    // vuole evitare): legge un'API del browser assente durante il render
    // statico (window.SpeechRecognition). Il primo render, server e client,
    // resta senza microfono; l'effetto lo aggiunge appena può verificarlo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDettaturaDisponibile(true);
    const riconoscitore = new SR();
    riconoscitore.lang = 'it-IT';
    riconoscitore.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (!transcript) return;
      setNota((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    riconoscitoreRef.current = riconoscitore;
  }, []);

  function detta() {
    riconoscitoreRef.current?.start();
  }

  const perId = new Map(contesto.map((v) => [v.id, v]));

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
          body: JSON.stringify({ nota, contesto }),
        });

        if (!risposta.ok) {
          if (risposta.status === 503) setErrore('La correzione non è disponibile.');
          else if (risposta.status === 422) setErrore('Non ho capito la nota, riprova.');
          else setErrore('Non siamo riusciti a correggere. Riprova.');
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
            await applica(p, p.valoreNuovo);
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
        setNota('');
      }
    } finally {
      setInviando(false);
    }
  }

  async function annulla(indice: number, p: ModificaProposta) {
    if (righeInCorso.has(indice)) return;
    setRigheInCorso((prev) => new Set(prev).add(indice));
    setErrore(null);
    try {
      await applica(p, p.valoreAttuale);
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
      await applica(p, p.valoreNuovo);
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
  const applicate = esito
    ? esito.proposte.map((p, i) => [i, p] as const).filter(([i]) => stati.get(i) === 'applicata' || stati.get(i) === 'annullata')
    : [];
  const daConfermare = esito
    ? esito.proposte.map((p, i) => [i, p] as const).filter(([i]) => stati.get(i) === 'daConfermare')
    : [];

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ margin: '0 0 9px', padding: '0 4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', color: 'var(--ink)',
          }}
        >
          CORREGGI CON UNA NOTA
        </span>
      </div>

      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '14px 15px', borderRadius: 18,
          background: 'var(--superficie)', border: '1px solid var(--bordo)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={inviando}
            placeholder="Es. ho finito il riso, l'olio è a metà…"
            rows={2}
            style={{
              flex: 1, minWidth: 0, resize: 'none', borderRadius: 13,
              border: '1px solid rgba(20,22,58,0.12)', background: '#FFFFFF',
              padding: '9px 10px', outline: 'none',
              fontSize: 14, lineHeight: 1.4, color: 'var(--ink)',
            }}
          />
          {dettaturaDisponibile && (
            <button
              type="button"
              onClick={detta}
              disabled={inviando}
              aria-label="Detta la nota"
              style={{
                width: 44, height: 44, flex: 'none', borderRadius: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                  stroke="var(--ter)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d="M5 11a7 7 0 0 0 14 0M12 18v3"
                  stroke="var(--ter)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={invia}
          disabled={inviando || nota.trim().length === 0}
          style={{
            alignSelf: 'flex-start', minHeight: 44, padding: '0 18px', borderRadius: 999,
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            background: '#FFFFFF', color: 'var(--ink)',
            opacity: inviando || nota.trim().length === 0 ? 0.5 : 1,
          }}
        >
          Correggi
        </button>

        {errore && <p style={{ fontSize: 13, color: 'var(--sec)', margin: 0 }}>{errore}</p>}

        {esito && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {applicate.length > 0 && (
              <GruppoRecap titolo="APPLICATE">
                {applicate.map(([i, p]) => (
                  <RigaProposta
                    key={i}
                    proposta={p}
                    voce={perId.get(p.ingredientId)}
                    annullata={stati.get(i) === 'annullata'}
                    azione={
                      stati.get(i) === 'annullata'
                        ? undefined
                        : { etichetta: 'Annulla', onClick: () => annulla(i, p), disabilitato: righeInCorso.has(i) }
                    }
                  />
                ))}
              </GruppoRecap>
            )}

            {daConfermare.length > 0 && (
              <GruppoRecap titolo="DA CONFERMARE">
                {daConfermare.map(([i, p]) => (
                  <RigaProposta
                    key={i}
                    proposta={p}
                    voce={perId.get(p.ingredientId)}
                    azione={{ etichetta: 'Conferma', onClick: () => conferma(i, p), disabilitato: righeInCorso.has(i) }}
                  />
                ))}
              </GruppoRecap>
            )}

            {esito.nonRiconosciuti.length > 0 && (
              <GruppoRecap titolo="NON RICONOSCIUTI">
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13.5, color: 'var(--sec)' }}>
                  {esito.nonRiconosciuti.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </GruppoRecap>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GruppoRecap({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700,
          letterSpacing: '0.14em', color: 'var(--sec)', marginBottom: 6,
        }}
      >
        {titolo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function testoValori(p: ModificaProposta, voce: VoceContesto | undefined): string {
  if (p.campo === 'residuo') {
    const unita = voce?.unitaBase ?? '';
    return `${p.valoreAttuale} → ${p.valoreNuovo} ${unita}`.trim();
  }
  return p.valoreNuovo ? 'frigo → freezer' : 'freezer → frigo';
}

function RigaProposta({
  proposta,
  voce,
  annullata = false,
  azione,
}: {
  proposta: ModificaProposta;
  voce: VoceContesto | undefined;
  annullata?: boolean;
  azione?: { etichetta: string; onClick: () => void; disabilitato?: boolean };
}) {
  const nome = voce?.nome ?? proposta.ingredientId;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 13,
        background: '#FFFFFF', border: '1px solid rgba(20,22,58,0.08)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
          {nome} <span style={{ fontWeight: 400, color: 'var(--sec)' }}>{testoValori(proposta, voce)}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>{proposta.motivazione}</div>
        {annullata && <div style={{ fontSize: 11.5, color: 'var(--ter)', marginTop: 2 }}>annullata</div>}
      </div>
      {azione && (
        <button
          type="button"
          onClick={azione.onClick}
          disabled={azione.disabilitato}
          style={{
            minHeight: 36, padding: '0 12px', borderRadius: 999, flex: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
            background: 'var(--superficie)', color: 'var(--ink)',
            opacity: azione.disabilitato ? 0.5 : 1,
          }}
        >
          {azione.etichetta}
        </button>
      )}
    </div>
  );
}
