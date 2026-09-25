import { useEffect, useRef, useState, type RefObject } from 'react';
import { eanValido } from '@/domain/ean';

/**
 * 'rilevamento': stato iniziale, identico su server e client — nessun accesso
 * a `window`/`navigator` durante il render, solo dentro l'effect (che sul
 * server non gira). Stesso motivo di `Camera`: un client component viene
 * comunque prerenderizzato lato server, e decidere il ramo durante il render
 * produce markup diverso fra server e client (mismatch di hydration).
 * 'camera'/'fallback' si decidono solo dentro l'effect, dopo il mount.
 */
export type ModoLettore = 'rilevamento' | 'camera' | 'fallback';

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

/**
 * La lettura continua del codice a barre (spec scan-confezione §3), senza
 * interfaccia: apre la fotocamera posteriore se c'è `BarcodeDetector`, prova
 * un frame ogni 250 ms e al primo codice valido ferma tutto e chiama
 * `onCodice`. Allo smontaggio ferma lo stream. La usano `Scanner` (Lista →
 * confezioni) e `LettoreCodice` (Dispensa), che la vestono diversamente.
 */
export function useLettoreCodici(onCodice: (ean: string) => void): { modo: ModoLettore; videoRef: RefObject<HTMLVideoElement | null> } {
  const [modo, setModo] = useState<ModoLettore>('rilevamento');
  const [stream, setStream] = useState<MediaStream | null>(null);
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

  return { modo, videoRef };
}
