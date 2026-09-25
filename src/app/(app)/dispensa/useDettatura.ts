'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface RisultatoLike {
  isFinal: boolean;
  length: number;
  [i: number]: { transcript: string };
}

/** Il minimo di SpeechRecognition che serve (non è nei tipi di TypeScript). */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RisultatoLike> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/** Sotto questa durata il rilascio è un tocco breve, non un tenuto premuto (spec §H.2). */
export const SOGLIA_TENUTO_MS = 350;
export const MSG_MICROFONO = 'Il microfono non è disponibile: scrivi la nota.';

export interface Dettatura {
  disponibile: boolean;
  attiva: boolean;
  modo: 'tenuto' | 'tocco' | null;
  secondi: number;
  /** Le parole ancora incerte, da mostrare in `--ter` dopo il testo. */
  provvisorio: string;
  errore: string | null;
  /**
   * pointerdown sul microfono: avvia (o ferma, se sta dettando a tocchi). Il
   * rilascio si ascolta su window; con `pointerId` conta solo quello del dito
   * che ha premuto, senza vale il primo rilascio di qualunque puntatore.
   */
  premi: (pointerId?: number) => void;
  /** Tocco breve o tastiera: avvia, o ferma. */
  tocca: () => void;
  ferma: () => void;
}

function costruttore(): (new () => SpeechRecognitionLike) | undefined {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * La dettatura della nota (spec §H.2). Continua e con risultati provvisori:
 * le parole definitive vanno a `onDefinitivo`, che le accoda alla bozza; le
 * provvisorie restano qui finché il browser non le conferma. Niente parte da
 * solo: allo stop il testo resta nel campo.
 *
 * Il rilascio del tenuto premuto si ascolta su `window` e non sul tasto:
 * dal Dock il tondo sparisce sotto il dito quando il widget si apre.
 */
export function useDettatura(onDefinitivo: (testo: string) => void): Dettatura {
  const [disponibile, setDisponibile] = useState(false);
  const [attiva, setAttiva] = useState(false);
  const [modo, setModo] = useState<'tenuto' | 'tocco' | null>(null);
  const [secondi, setSecondi] = useState(0);
  const [provvisorio, setProvvisorio] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const riconoscitore = useRef<SpeechRecognitionLike | null>(null);
  const attivaRef = useRef(false);
  const onDefinitivoRef = useRef(onDefinitivo);
  useEffect(() => {
    onDefinitivoRef.current = onDefinitivo;
  }, [onDefinitivo]);

  useEffect(() => {
    if (!costruttore()) return;
    // Un'API del browser assente nel render statico: il primo render, server e
    // client, resta senza microfono; l'effetto lo aggiunge appena può (come
    // faceva NotaDispensa).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisponibile(true);
  }, []);

  const spento = useCallback(() => {
    attivaRef.current = false;
    setAttiva(false);
    setModo(null);
    setProvvisorio('');
  }, []);

  const ferma = useCallback(() => {
    if (!attivaRef.current) return;
    riconoscitore.current?.stop();
    spento();
  }, [spento]);

  const avvia = useCallback((m: 'tenuto' | 'tocco') => {
    const SR = costruttore();
    if (!SR || attivaRef.current) return;
    const r = new SR();
    r.lang = 'it-IT';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let definitivo = '';
      let incerto = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const ris = e.results[i];
        const t = ris?.[0]?.transcript ?? '';
        if (ris?.isFinal) definitivo += t;
        else incerto += t;
      }
      if (definitivo.trim()) onDefinitivoRef.current(definitivo.trim());
      setProvvisorio(incerto.trim());
    };
    // `no-speech` e `aborted` non sono guasti (silenzio, stop voluto): il
    // resto vuol dire che il microfono o il servizio non ci sono.
    r.onerror = (e) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(e.error)) setErrore(MSG_MICROFONO);
    };
    // Il browser chiude da sé dopo un silenzio: vale come stop, e il testo resta.
    r.onend = () => {
      if (riconoscitore.current === r) spento();
    };
    riconoscitore.current = r;
    attivaRef.current = true;
    setErrore(null);
    setSecondi(0);
    setAttiva(true);
    setModo(m);
    try {
      r.start();
    } catch {
      spento();
      setErrore(MSG_MICROFONO);
    }
  }, [spento]);

  const premi = useCallback((pointerId?: number) => {
    if (attivaRef.current) {
      ferma();
      return;
    }
    const inizio = Date.now();
    avvia('tenuto');
    // Un secondo dito che si alza non è il rilascio del tenuto premuto.
    const rilascio = (e: Event) => {
      if (pointerId !== undefined && (e as PointerEvent).pointerId !== pointerId) return;
      window.removeEventListener('pointerup', rilascio);
      window.removeEventListener('pointercancel', rilascio);
      if (Date.now() - inizio >= SOGLIA_TENUTO_MS) ferma();
      else if (attivaRef.current) setModo('tocco');
    };
    window.addEventListener('pointerup', rilascio);
    window.addEventListener('pointercancel', rilascio);
  }, [avvia, ferma]);

  const tocca = useCallback(() => {
    if (attivaRef.current) ferma();
    else avvia('tocco');
  }, [avvia, ferma]);

  useEffect(() => {
    if (!attiva) return;
    const id = setInterval(() => setSecondi((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [attiva]);

  useEffect(() => () => riconoscitore.current?.abort(), []);

  return { disponibile, attiva, modo, secondi, provvisorio, errore, premi, tocca, ferma };
}
