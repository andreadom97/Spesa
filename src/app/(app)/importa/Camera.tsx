'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onFoto: (foto: Blob[]) => void;
}

interface Pagina {
  blob: Blob;
  url: string;
}

const LATO_MAX = 2048;

/**
 * Ridisegna il frame corrente del video su un canvas ridimensionato (max
 * 2048px sul lato lungo) e produce un jpeg allo 0.8 di qualità. Ritorna null
 * se il canvas non riesce a produrre un blob (fotocamera nera, browser
 * esotico): in quel caso lo scatto va scartato invece di aggiungere una
 * pagina vuota.
 */
function scattaDaVideo(video: HTMLVideoElement): Promise<Blob | null> {
  const largezzaSorgente = video.videoWidth;
  const altezzaSorgente = video.videoHeight;
  const lato = Math.max(largezzaSorgente, altezzaSorgente);
  const scala = lato > LATO_MAX ? LATO_MAX / lato : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(largezzaSorgente * scala);
  canvas.height = Math.round(altezzaSorgente * scala);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
  });
}

/**
 * Camera in-app multi-scatto per l'import dieta: componente isolato, nessuna
 * dipendenza dal resto del piano. Prova ad aprire lo stream della fotocamera
 * posteriore; se `getUserMedia` non esiste o viene rifiutato, ripiega su un
 * `<input type="file" capture="environment">` con la stessa striscia di
 * miniature — l'utente sceglie le foto dei fogli dalla galleria o scattandole
 * con la fotocamera di sistema.
 *
 * `onFoto` è chiamato dentro le funzioni che aggiornano `pagine` (aggiungi,
 * rimuovi, sposta), mai da un effect sulla lista: un effect scatterebbe anche
 * al mount con la lista vuota, un `onFoto([])` che il chiamante non si
 * aspetta finché l'utente non ha davvero cambiato qualcosa.
 */
export function Camera({ onFoto }: Props) {
  const [pagine, setPagine] = useState<Pagina[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Determinato una volta sola in modo sincrono (lazy initializer), non
  // dentro l'effect: la lint rule react-hooks/set-state-in-effect vieta un
  // setState sincrono nel corpo dell'effect, e qui il valore è comunque noto
  // subito, senza bisogno di aspettare un giro di render.
  const [fallback, setFallback] = useState(() => !navigator.mediaDevices?.getUserMedia);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (fallback) return;
    let vivo = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (!vivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
      })
      .catch(() => {
        if (vivo) setFallback(true);
      });
    return () => {
      vivo = false;
    };
  }, [fallback]);

  // Collega lo stream al <video> non appena entrambi esistono.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Allo smontaggio, ferma tutte le tracce dello stream aperto.
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  function aggiungiBlob(blob: Blob) {
    setPagine((prev) => {
      const nuove = [...prev, { blob, url: URL.createObjectURL(blob) }];
      onFoto(nuove.map((p) => p.blob));
      return nuove;
    });
  }

  async function scatta() {
    const video = videoRef.current;
    if (!video) return;
    const blob = await scattaDaVideo(video);
    if (blob) aggiungiBlob(blob);
  }

  function scegliFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files;
    if (!file || file.length === 0) return;
    setPagine((prev) => {
      const nuove = [...prev, ...Array.from(file).map((f) => ({ blob: f, url: URL.createObjectURL(f) }))];
      onFoto(nuove.map((p) => p.blob));
      return nuove;
    });
    e.target.value = '';
  }

  function elimina(indice: number) {
    setPagine((prev) => {
      const rimossa = prev[indice];
      if (rimossa) URL.revokeObjectURL(rimossa.url);
      const nuove = prev.filter((_, i) => i !== indice);
      onFoto(nuove.map((p) => p.blob));
      return nuove;
    });
  }

  function sposta(indice: number, delta: number) {
    setPagine((prev) => {
      const dest = indice + delta;
      if (dest < 0 || dest >= prev.length) return prev;
      const nuove = [...prev];
      [nuove[indice], nuove[dest]] = [nuove[dest], nuove[indice]];
      onFoto(nuove.map((p) => p.blob));
      return nuove;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {fallback ? (
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 16,
            borderRadius: 14,
            border: '1px solid var(--bordo)',
            background: 'var(--superficie)',
            color: 'var(--sec)',
            fontSize: 13,
          }}
        >
          La fotocamera non è disponibile: scegli le foto dei fogli
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            aria-label="scegli le foto dei fogli"
            onChange={scegliFile}
            style={{ fontSize: 13 }}
          />
        </label>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 14, background: '#000' }}
          />
          <button
            type="button"
            onClick={scatta}
            disabled={!stream}
            style={{
              alignSelf: 'center',
              height: 48,
              padding: '0 24px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--ink)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Scatta
          </button>
        </>
      )}

      {pagine.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {pagine.map((p, i) => (
            <div
              key={p.url}
              style={{
                position: 'relative',
                flex: 'none',
                width: 84,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura da object URL locale, non da fonte remota ottimizzabile */}
              <img
                src={p.url}
                alt={`pag. ${i + 1}`}
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--bordo)' }}
              />
              <span style={{ fontSize: 11, color: 'var(--sec)', textAlign: 'center' }}>{`pag. ${i + 1}`}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  aria-label={`sposta pag. ${i + 1} a sinistra`}
                  onClick={() => sposta(i, -1)}
                  disabled={i === 0}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink)', fontSize: 14 }}
                >
                  ◀
                </button>
                <button
                  type="button"
                  aria-label={`elimina pag. ${i + 1}`}
                  onClick={() => elimina(i)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink)', fontSize: 14 }}
                >
                  ✕
                </button>
                <button
                  type="button"
                  aria-label={`sposta pag. ${i + 1} a destra`}
                  onClick={() => sposta(i, 1)}
                  disabled={i === pagine.length - 1}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ink)', fontSize: 14 }}
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
