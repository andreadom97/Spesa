'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onFoto: (foto: Blob[]) => void;
  /**
   * Scatti già presenti da un montaggio precedente (es. dopo un errore di
   * estrazione, quando il chiamante rimonta Camera da capo ma vuole
   * mostrare — e far accodare i nuovi scatti a — quelli già presi). Seminati
   * nello stato al mount, mai richiamando `onFoto`: non sono una modifica,
   * sono lo stato di partenza che il chiamante conosce già.
   */
  iniziali?: Blob[];
}

interface Pagina {
  blob: Blob;
  url: string;
}

/**
 * 'rilevamento': stato iniziale, identico su server e client — nessun accesso
 * a `navigator` durante il render, solo dentro l'effect (che sul server non
 * gira). Un client component in App Router viene comunque prerenderizzato
 * lato server, dove `navigator.mediaDevices` non esiste: decidere il ramo
 * durante il render (anche con un lazy initializer di `useState`) produce
 * markup diverso fra server e client, e React scarta il sottoalbero
 * all'hydration invece di riconciliarlo — flash del ramo sbagliato, warning
 * in console, in questo caso anche un secondo `getUserMedia` di troppo.
 * 'camera'/'fallback' si decidono solo dentro l'effect, dopo il mount.
 */
type Modo = 'rilevamento' | 'camera' | 'fallback';

const LATO_MAX = 1568;

/**
 * Stesso tetto di `/api/import/estrai` (MAX_IMMAGINI): applicato qui, prima
 * dell'invio, così chi sceglie 20 foto dalla galleria vede subito quali sono
 * entrate invece di un 413 dopo l'upload. Le eccedenti si scartano.
 */
const MAX_PAGINE = 12;

/** Sorgente disegnabile su canvas con dimensioni note in pixel. */
interface Sorgente {
  immagine: CanvasImageSource;
  larghezza: number;
  altezza: number;
  rilascia?: () => void;
}

/**
 * Ridisegna la sorgente su un canvas ridimensionato (max 1568px sul lato
 * lungo) e produce un jpeg allo 0.75 di qualità. Ritorna null se il canvas
 * non riesce a produrre un blob (fotocamera nera, browser esotico): in quel
 * caso la pagina va scartata invece di aggiungerne una vuota.
 */
function ricomprimi({ immagine, larghezza, altezza, rilascia }: Sorgente): Promise<Blob | null> {
  const lato = Math.max(larghezza, altezza);
  const scala = lato > LATO_MAX ? LATO_MAX / lato : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(larghezza * scala);
  canvas.height = Math.round(altezza * scala);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    rilascia?.();
    return Promise.resolve(null);
  }
  ctx.drawImage(immagine, 0, 0, canvas.width, canvas.height);
  rilascia?.();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75);
  });
}

function scattaDaVideo(video: HTMLVideoElement): Promise<Blob | null> {
  return ricomprimi({ immagine: video, larghezza: video.videoWidth, altezza: video.videoHeight });
}

/**
 * Decodifica un file di galleria e lo porta sullo stesso percorso dello
 * scatto (ridimensionamento + jpeg 0.75): le foto di galleria pesano 3–5 MB
 * e su iPhone sono HEIC, che la route rifiuta (accetta jpeg/png/webp, 4 MiB
 * in tutto). Prima `createImageBitmap` (decodifica anche HEIC dove il
 * browser lo sa fare, es. Safari), altrimenti un `<img>` da object URL. Se
 * nessuno dei due decodifica, null: il file si scarta con un avviso, non
 * rompe il flusso.
 */
async function ricomprimiFile(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return await ricomprimi({
        immagine: bitmap,
        larghezza: bitmap.width,
        altezza: bitmap.height,
        rilascia: () => bitmap.close(),
      });
    } catch {
      // Formato che il browser non decodifica via bitmap: si prova con <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!img) return null;
    return await ricomprimi({ immagine: img, larghezza: img.naturalWidth, altezza: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Camera in-app multi-scatto per l'import dieta: componente isolato, nessuna
 * dipendenza dal resto del piano. Prova ad aprire lo stream della fotocamera
 * posteriore; se `getUserMedia` non esiste o viene rifiutato, ripiega su un
 * `<input type="file">` con la stessa striscia di miniature. In entrambi i
 * rami c'è il tasto DALLA GALLERIA: le foto si possono anche scegliere dalla
 * galleria del telefono, senza scattarle — l'input non ha `capture`, che sul
 * telefono riaprirebbe la fotocamera di sistema. Scatti e foto scelte passano
 * dallo stesso percorso (`ricomprimi`: lato lungo 1568px, jpeg 0.75) e dallo
 * stesso tetto di 12 pagine (`MAX_PAGINE`); un file che non si decodifica è
 * scartato con un avviso.
 *
 * `onFoto` è chiamato dagli event handler DOPO il setState, mai dentro
 * l'updater di `setPagine` (sarebbe un setState del genitore durante il
 * render: React lo segnala con "Cannot update Importa while rendering
 * Camera" e l'aggiornamento può andare perso — miniature visibili ma stato
 * del genitore vuoto, visto nell'E2E del 30/08) e mai da un effect sulla
 * lista: un effect scatterebbe anche al mount, un `onFoto([])` che il
 * chiamante non si aspetta finché l'utente non ha davvero cambiato qualcosa.
 */
export function Camera({ onFoto, iniziali = [] }: Props) {
  // Lazy initializer: gira una sola volta, al mount — nessun accesso a
  // `navigator` qui (i blob arrivano già pronti da prop), quindi resta
  // identico fra server e client. Semina lo stato ma non chiama `onFoto`:
  // il chiamante conosce già questi blob, non è una modifica sua.
  const [pagine, setPagine] = useState<Pagina[]>(() =>
    iniziali.map((blob) => ({ blob, url: URL.createObjectURL(blob) })),
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modo, setModo] = useState<Modo>('rilevamento');
  const [avviso, setAvviso] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Rif. sempre allineato a `pagine`: base di calcolo delle mutazioni (così
  // gli handler compongono la lista nuova FUORI dall'updater e possono
  // chiamare `onFoto` senza setState-during-render) e fonte per revocare gli
  // object URL residui allo smontaggio senza mettere `pagine` fra le
  // dipendenze dell'effect di cleanup (che altrimenti scatterebbe — e
  // revocherebbe — a ogni cambio).
  const pagineRef = useRef<Pagina[]>(pagine);
  useEffect(() => {
    pagineRef.current = pagine;
  }, [pagine]);

  useEffect(() => {
    let vivo = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      // Ramo reso asincrono (microtask) apposta: la lint rule
      // react-hooks/set-state-in-effect vieta un setState sincrono nel
      // corpo dell'effect, e un setState sincrono qui è anche la causa
      // diretta del mismatch di hydration — il primo render del client deve
      // restare 'rilevamento', uguale a quello del server.
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

  // Allo smontaggio, revoca anche gli object URL delle miniature ancora in
  // lista (quelli rimossi singolarmente sono già revocati da `elimina`).
  useEffect(() => {
    return () => {
      pagineRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  /** Unico punto di mutazione: allinea ref e stato, poi avvisa il genitore. */
  function applicaPagine(nuove: Pagina[]) {
    pagineRef.current = nuove;
    setPagine(nuove);
    onFoto(nuove.map((p) => p.blob));
  }

  function aggiungiBlob(blob: Blob) {
    applicaPagine([...pagineRef.current, { blob, url: URL.createObjectURL(blob) }]);
  }

  async function scatta() {
    const video = videoRef.current;
    if (!video) return;
    if (pagineRef.current.length >= MAX_PAGINE) {
      setAvviso(`al massimo ${MAX_PAGINE} fogli`);
      return;
    }
    const blob = await scattaDaVideo(video);
    if (blob) {
      setAvviso(null);
      aggiungiBlob(blob);
    }
  }

  /**
   * Foto dalla galleria: si ricomprimono una alla volta (una foto per volta
   * in memoria, non venti bitmap insieme), poi si accodano in un colpo solo
   * nell'ordine scelto. Il tetto si applica PRIMA di decodificare: le
   * eccedenti non costano nulla.
   */
  async function scegliFile(e: React.ChangeEvent<HTMLInputElement>) {
    const scelti = Array.from(e.target.files ?? []);
    // Reset subito (prima di ogni await): riscegliere gli stessi file deve
    // rilanciare `change`.
    e.target.value = '';
    if (scelti.length === 0) return;
    const spazio = Math.max(0, MAX_PAGINE - pagineRef.current.length);
    const daDecodificare = scelti.slice(0, spazio);
    const eccedenti = scelti.length - daDecodificare.length;
    const blob: Blob[] = [];
    for (const file of daDecodificare) {
      const b = await ricomprimiFile(file);
      if (b) blob.push(b);
    }
    const illeggibili = daDecodificare.length - blob.length;
    const messaggi: string[] = [];
    if (eccedenti > 0) messaggi.push(`al massimo ${MAX_PAGINE} fogli: ${eccedenti} foto in più scartat${eccedenti === 1 ? 'a' : 'e'}`);
    if (illeggibili > 0) messaggi.push(`${illeggibili} foto non leggibil${illeggibili === 1 ? 'e' : 'i'}, scartat${illeggibili === 1 ? 'a' : 'e'}`);
    setAvviso(messaggi.length > 0 ? messaggi.join(' · ') : null);
    if (blob.length === 0) return;
    applicaPagine([
      ...pagineRef.current,
      ...blob.map((b) => ({ blob: b, url: URL.createObjectURL(b) })),
    ]);
  }

  function elimina(indice: number) {
    const rimossa = pagineRef.current[indice];
    if (rimossa) URL.revokeObjectURL(rimossa.url);
    applicaPagine(pagineRef.current.filter((_, i) => i !== indice));
  }

  function sposta(indice: number, delta: number) {
    const dest = indice + delta;
    if (dest < 0 || dest >= pagineRef.current.length) return;
    const nuove = [...pagineRef.current];
    [nuove[indice], nuove[dest]] = [nuove[dest], nuove[indice]];
    applicaPagine(nuove);
  }

  if (modo === 'rilevamento') {
    // Render minimale e identico fra server e client: nessun accesso a
    // `navigator` qui, la scelta fra camera e fallback arriva dall'effect.
    return <div style={{ minHeight: 160 }} />;
  }

  // L'input reale resta accessibile (aria-label) ma visivamente nascosto: il
  // tap va sul finto bottone testuale, vestito come gli altri bottoni
  // dell'app. Nessun `capture`: sul telefono riaprirebbe la fotocamera di
  // sistema invece della galleria.
  const tastoGalleria = (
    <label
      style={{
        position: 'relative',
        alignSelf: modo === 'camera' ? 'center' : 'flex-start',
        height: 40, padding: '0 18px', borderRadius: 999,
        display: 'inline-flex', alignItems: 'center',
        border: modo === 'camera' ? '1px solid var(--bordo)' : 'none',
        background: modo === 'camera' ? 'var(--superficie)' : 'var(--ink)',
        color: modo === 'camera' ? 'var(--ink)' : '#FFFFFF',
        fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
        cursor: 'pointer',
      }}
    >
      DALLA GALLERIA
      <input
        type="file"
        accept="image/*"
        multiple
        aria-label="scegli le foto dalla galleria"
        onChange={scegliFile}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clipPath: 'inset(50%)' }}
      />
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {modo === 'fallback' ? (
        <div
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
          La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria
          {tastoGalleria}
        </div>
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
          {tastoGalleria}
        </>
      )}

      {avviso && (
        <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--sec)' }}>
          {avviso}
        </p>
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
