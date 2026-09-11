'use client';

import { useEffect, useRef, useState } from 'react';
import { eanValido } from '@/domain/ean';

interface Props {
  /** Il codice letto dalla camera o digitato: 8–14 cifre, già validato con `eanValido`. */
  onCodice: (ean: string) => void;
  onAnnulla: () => void;
}

/**
 * 'rilevamento': stato iniziale, identico su server e client — nessun accesso
 * a `window`/`navigator` durante il render, solo dentro l'effect (che sul
 * server non gira). Stesso motivo di `Camera`: un client component viene
 * comunque prerenderizzato lato server, e decidere il ramo durante il render
 * produce markup diverso fra server e client (mismatch di hydration).
 * 'camera'/'fallback' si decidono solo dentro l'effect, dopo il mount.
 */
type Modo = 'rilevamento' | 'camera' | 'fallback';

/**
 * `BarcodeDetector` (Shape Detection API) non è nei tipi di TypeScript:
 * l'interfaccia minima che serve qui, dichiarata in locale invece di un
 * `any`. `detect` accetta un elemento video e restituisce i codici trovati
 * nel frame corrente.
 */
interface RilevatoreCodici {
  detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

type CostruttoreRilevatore = new (o: { formats: string[] }) => RilevatoreCodici;

const FORMATI = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
const INTERVALLO_MS = 250;
const MAX_CIFRE = 14;

/**
 * Scanner del codice a barre (spec scan-confezione §3).
 *
 * Usa `BarcodeDetector` del browser perché la piattaforma della PWA è Chrome
 * Android, dove esiste: nessuna libreria di decodifica in v1 (peserebbe più
 * di tutta l'app e servirebbe solo a iOS/desktop, dove si scrive il codice).
 * Se il rilevatore c'è, apre la fotocamera posteriore e ogni 250 ms prova a
 * leggere il frame; al primo codice valido (`eanValido`) ferma intervallo e
 * stream e chiama `onCodice`. Se il rilevatore manca, o la camera è negata
 * o assente, resta solo il campo per scrivere il codice — che c'è sempre,
 * anche sotto il video: il codice stampato sotto le barre è il piano B che
 * non dipende da niente.
 *
 * Il componente non parla mai con la rete: restituisce il codice e basta. È
 * la pagina che decide cosa farne (la route `/api/prodotto/[ean]`).
 *
 * Il ramo camera non si testa in jsdom (né `BarcodeDetector` né
 * `getUserMedia` esistono lì): dichiarato nella spec §6.
 */
export function Scanner({ onCodice, onAnnulla }: Props) {
  const [modo, setModo] = useState<Modo>('rilevamento');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [codice, setCodice] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // `onCodice` in un ref: l'intervallo lo legge senza essere fra le dipendenze
  // dell'effect (che altrimenti riaprirebbe la camera a ogni render del genitore).
  const onCodiceRef = useRef(onCodice);
  useEffect(() => {
    onCodiceRef.current = onCodice;
  }, [onCodice]);

  useEffect(() => {
    let vivo = true;
    const finestra = window as unknown as { BarcodeDetector?: CostruttoreRilevatore };
    if (!finestra.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      // Microtask apposta: niente setState sincrono nel corpo dell'effect
      // (lint react-hooks/set-state-in-effect) e primo render del client
      // uguale a quello del server.
      Promise.resolve().then(() => {
        if (vivo) setModo('fallback');
      });
      return () => {
        vivo = false;
      };
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (!vivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        setModo('camera');
      })
      .catch(() => {
        if (vivo) setModo('fallback');
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Collega lo stream al <video> e allo smontaggio (o cambio) ferma le tracce.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // Il ciclo di lettura: parte quando c'è lo stream, si ferma da solo al
  // primo codice valido o allo smontaggio.
  useEffect(() => {
    if (!stream) return;
    const finestra = window as unknown as { BarcodeDetector?: CostruttoreRilevatore };
    if (!finestra.BarcodeDetector) return;
    const rilevatore = new finestra.BarcodeDetector({ formats: FORMATI });
    let fermo = false;
    let occupato = false;
    const intervallo = setInterval(async () => {
      const video = videoRef.current;
      if (fermo || occupato || !video || video.readyState < 2) return;
      occupato = true;
      try {
        const codici = await rilevatore.detect(video);
        if (fermo) return;
        const trovato = codici.find((c) => eanValido(c.rawValue));
        if (trovato) {
          fermo = true;
          clearInterval(intervallo);
          stream.getTracks().forEach((t) => t.stop());
          onCodiceRef.current(trovato.rawValue.trim());
        }
      } catch {
        // Un frame illeggibile non è un errore: si riprova al prossimo tick.
      } finally {
        occupato = false;
      }
    }, INTERVALLO_MS);
    return () => {
      fermo = true;
      clearInterval(intervallo);
    };
  }, [stream]);

  const valido = eanValido(codice);

  function cerca() {
    if (!valido) return;
    onCodice(codice.trim());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {modo === 'camera' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', borderRadius: 14, background: '#000' }}
        />
      )}
      {modo === 'fallback' && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--sec)' }}>
          La fotocamera non è disponibile: scrivi il codice sotto il codice a barre.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          cerca();
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          type="text"
          aria-label="Scrivi il codice"
          placeholder="Scrivi il codice"
          inputMode="numeric"
          maxLength={MAX_CIFRE}
          autoComplete="off"
          value={codice}
          onChange={(e) => setCodice(e.target.value.replace(/\D/g, '').slice(0, MAX_CIFRE))}
          style={{
            flex: 1, minWidth: 0, height: 46, padding: '0 14px', borderRadius: 14,
            border: '1px solid rgba(20,22,58,0.16)', background: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.06em', color: 'var(--ink)',
          }}
        />
        <button
          type="submit"
          disabled={!valido}
          style={{
            height: 46, padding: '0 18px', borderRadius: 14, border: 'none',
            background: '#14163A', color: '#FFFFFF',
            fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.09em',
            opacity: valido ? 1 : 0.45,
          }}
        >
          CERCA
        </button>
      </form>

      <button
        type="button"
        onClick={onAnnulla}
        style={{
          alignSelf: 'flex-start', height: 40, padding: '0 14px', borderRadius: 999,
          background: 'transparent', border: '1.5px solid rgba(20,22,58,0.16)', color: 'var(--ink)',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
        }}
      >
        ANNULLA
      </button>
    </div>
  );
}
