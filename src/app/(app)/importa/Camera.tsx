'use client';

import { useEffect, useRef, useState } from 'react';
import { useNascondiBarra } from '@/components/barra-context';
import { FogliPresi } from './FogliPresi';

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
  /** Il tondo indietro: torna alla scelta fra foto e PDF. */
  onIndietro: () => void;
  /** `Ho finito`: avvia l'estrazione dei fogli presi. */
  onFinito: () => void;
}

interface Pagina {
  blob: Blob;
  url: string;
  /**
   * Quando è entrata, per «Ultimo foglio alle HH:MM». `null` per le pagine
   * seminate da `iniziali`: di quelle l'ora non si sa, e non si inventa.
   */
  alle: Date | null;
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

/** `18:04`: ora locale a due cifre, come la legge chi ha appena scattato. */
function oraMinuti(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ANGOLI = ['alto-sx', 'alto-dx', 'basso-sx', 'basso-dx'] as const;

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
 * La fotocamera dell'import, a tutto schermo (spec fase 3 §E): anteprima
 * piena, cornice guida, in alto il tondo indietro e il titolo, in basso la
 * Banda dei comandi con lo scatto, i fogli presi, `Ho finito` e la galleria.
 * Chiede al Guscio di togliere la tab bar finché è montata. Se
 * `getUserMedia` non esiste o viene rifiutato, ripiega: niente anteprima né
 * scatto, un testo al centro e la galleria nella banda. Scatti e foto scelte
 * passano dallo stesso percorso (`ricomprimi`: lato lungo 1568px, jpeg 0.75)
 * e dallo stesso tetto di 12 pagine (`MAX_PAGINE`); un file che non si
 * decodifica è scartato con un avviso. L'input della galleria non ha
 * `capture`: sul telefono riaprirebbe la fotocamera di sistema.
 *
 * `onFoto` è chiamato dagli event handler DOPO il setState, mai dentro
 * l'updater di `setPagine` (sarebbe un setState del genitore durante il
 * render: React lo segnala con "Cannot update Importa while rendering
 * Camera" e l'aggiornamento può andare perso — miniature visibili ma stato
 * del genitore vuoto, visto nell'E2E del 30/08) e mai da un effect sulla
 * lista: un effect scatterebbe anche al mount, un `onFoto([])` che il
 * chiamante non si aspetta finché l'utente non ha davvero cambiato qualcosa.
 */
export function Camera({ onFoto, iniziali = [], onIndietro, onFinito }: Props) {
  // A tutto schermo: la tab bar esce dal DOM finché la fotocamera è montata (spec §G).
  useNascondiBarra(true);

  // Lazy initializer: gira una sola volta, al mount — nessun accesso a
  // `navigator` qui (i blob arrivano già pronti da prop), quindi resta
  // identico fra server e client. Semina lo stato ma non chiama `onFoto`:
  // il chiamante conosce già questi blob, non è una modifica sua.
  const [pagine, setPagine] = useState<Pagina[]>(() =>
    iniziali.map((blob) => ({ blob, url: URL.createObjectURL(blob), alle: null })),
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modo, setModo] = useState<Modo>('rilevamento');
  const [avviso, setAvviso] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [rivedi, setRivedi] = useState(false);
  const miniaturaRef = useRef<HTMLButtonElement | null>(null);
  const scattoRef = useRef<HTMLButtonElement | null>(null);
  const galleriaRef = useRef<HTMLInputElement | null>(null);
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
    applicaPagine([...pagineRef.current, { blob, url: URL.createObjectURL(blob), alle: new Date() }]);
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
    const alle = new Date();
    applicaPagine([
      ...pagineRef.current,
      ...blob.map((b) => ({ blob: b, url: URL.createObjectURL(b), alle })),
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

  /**
   * «Togli» da «Rivedi»: se era l'ultimo foglio non resta niente da rivedere,
   * il foglio si chiude e il fuoco va allo scatto (alla galleria, nel ripiego).
   */
  function togli(indice: number) {
    elimina(indice);
    if (pagineRef.current.length === 0) {
      setRivedi(false);
      (scattoRef.current ?? galleriaRef.current)?.focus();
    }
  }

  function chiudiRivedi() {
    setRivedi(false);
    miniaturaRef.current?.focus();
  }

  // Il guscio della fotocamera è identico fra server e client in ogni modo:
  // in 'rilevamento' mancano solo anteprima, cornice e scatto, e nessun ramo
  // legge `navigator` durante il render — la scelta fra camera e fallback
  // arriva dall'effect.
  const n = pagine.length;
  const ultima = n > 0 ? pagine[n - 1] : null;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#000' }}>
      {modo === 'camera' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {modo === 'fallback' && (
        <div
          style={{
            position: 'absolute', inset: '88px 24px 268px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, maxWidth: '30ch', fontSize: 14, lineHeight: 1.5, color: '#FFFFFF' }}>
            La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria
          </p>
        </div>
      )}

      {/* La cornice guida aiuta a inquadrare, non ritaglia: lo scatto prende il
          fotogramma intero del video (spec §E). */}
      {modo === 'camera' && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '88px 40px 268px', pointerEvents: 'none', zIndex: 1 }}>
          {ANGOLI.map((a) => <span key={a} className={`guida-angolo ${a}`} />)}
        </div>
      )}

      <div style={{ position: 'absolute', top: 22, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 8, zIndex: 3 }}>
        <button
          type="button"
          aria-label="Indietro"
          onClick={onIndietro}
          style={{
            width: 44, height: 44, flex: 'none', border: 0, borderRadius: 999, padding: 0,
            background: '#FFFFFF', boxShadow: 'var(--ombra-nav)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h1
          style={{
            margin: 0, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px',
            borderRadius: 999, background: '#FFFFFF', boxShadow: 'var(--ombra-nav)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink)', whiteSpace: 'nowrap',
          }}
        >
          Fotografa il piano
        </h1>
      </div>

      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
          background: 'var(--banda-fondo)', borderRadius: '22px 22px 0 0',
          padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            {n > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  ref={miniaturaRef}
                  type="button"
                  aria-label={n === 1 ? 'Rivedi il foglio preso' : `Rivedi i ${n} fogli presi`}
                  onClick={() => setRivedi(true)}
                  style={{
                    position: 'relative', width: 44, height: 44, flex: 'none', border: 0, padding: 0,
                    borderRadius: 14, background: '#FFFFFF', boxShadow: 'var(--ombra-nav)', overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', inset: 7,
                      backgroundImage: 'repeating-linear-gradient(180deg, rgba(20,22,58,0.14) 0 2px, rgba(20,22,58,0) 2px 7px)',
                    }}
                  />
                </button>
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
                    textTransform: 'uppercase', color: '#FFFFFF', whiteSpace: 'nowrap',
                  }}
                >
                  {n === 1 ? '1 foglio' : `${n} fogli`}
                </span>
              </span>
            )}
          </span>

          {modo === 'camera' && (
            <button
              ref={scattoRef}
              type="button"
              className="scatto"
              aria-label="Scatta la foto del foglio"
              onClick={scatta}
              disabled={!stream}
            >
              <span className="scatto-disco" />
            </button>
          )}

          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {n > 0 && (
              <button
                type="button"
                onClick={onFinito}
                style={{
                  height: 44, border: 0, borderRadius: 999, padding: '0 16px',
                  background: '#FFFFFF', color: 'var(--ink)', boxShadow: 'var(--ombra-nav)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}
              >
                Ho finito
              </button>
            )}
          </span>
        </div>

        {avviso && (
          <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, color: '#FFFFFF' }}>
            {avviso}
          </p>
        )}

        {ultima?.alle && (
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#FFFFFF', padding: '0 2px',
            }}
          >
            {`Ultimo foglio alle ${oraMinuti(ultima.alle)}`}
          </span>
        )}

        {/* L'input reale resta accessibile (aria-label) ma visivamente nascosto:
            il tap va sul tasto. Nessun `capture`: sul telefono riaprirebbe la
            fotocamera di sistema invece della galleria. */}
        <label
          style={{
            position: 'relative', minHeight: 50, width: '100%', boxSizing: 'border-box',
            border: '1.5px solid var(--banda-bordo)', borderRadius: 18, background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#FFFFFF',
          }}
        >
          Seleziona dalla galleria
          <input
            ref={galleriaRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="scegli le foto dalla galleria"
            onChange={scegliFile}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clipPath: 'inset(50%)' }}
          />
        </label>
      </div>

      {rivedi && n > 0 && (
        <FogliPresi pagine={pagine} onSposta={sposta} onTogli={togli} onChiudi={chiudiRivedi} />
      )}
    </div>
  );
}
