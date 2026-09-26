'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { client } from '@/data/supabase';
import { Marchio } from '@/components/Marchio';
import { TastoPrimario, TastoSecondario, MessaggioErrore } from '@/components/controlli';

/**
 * Messaggi per ?errore=... sulla query string: ci arriva chi rimbalza da
 * /auth/callback perché il code mancava o lo scambio con Supabase è
 * fallito. Senza questo, l'utente vedrebbe solo il form vuoto, senza sapere
 * che il link appena toccato non ha funzionato.
 */
const MESSAGGI_ERRORE: Record<string, string> = {
  "link-non-valido": "Questo link non è valido. Richiedine uno nuovo qui sotto.",
  "accesso-fallito": "Non siamo riusciti a completare l'accesso. Richiedi un nuovo link.",
};

/**
 * La porta dell'app, prima dell'accesso: fuori dal Guscio, quindi senza Testata né tab bar
 * (spec fase 6 §C). Marchio e nome, poi il Campo di testo e il Tasto primario di §8. Dopo
 * l'invio dice a quale indirizzo è partito il link: un refuso si vede subito, e USA
 * UN'ALTRA EMAIL lo corregge senza ricaricare.
 */
export default function Entra() {
  const [email, setEmail] = useState('');
  const [caricando, setCaricando] = useState(false);
  /** L'indirizzo a cui è partito il link; null finché non è partito. */
  const [inviataA, setInviataA] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  // Letto direttamente da window.location, non da useSearchParams: questa è
  // una pagina interamente client-side (niente dati da leggere lato server),
  // e useSearchParams costringerebbe a un confine <Suspense> solo per questo.
  useEffect(() => {
    const codice = new URLSearchParams(window.location.search).get('errore');
    if (codice) {
      // Non è stato derivato da uno stato/prop React (il caso che la regola
      // vuole evitare): legge una API del browser non disponibile durante
      // il render statico (window.location). Farlo fuori da un effetto
      // darebbe un mismatch di idratazione fra il markup prerenderizzato
      // (senza window) e il client.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrore(MESSAGGI_ERRORE[codice] ?? "Non siamo riusciti a completare l'accesso. Riprova.");
    }
  }, []);

  async function inviaLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (caricando) return;
    setErrore(null);
    setCaricando(true);
    const { error } = await client().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setCaricando(false);
    if (error) {
      console.error('entra: signInWithOtp fallita.', error);
      setErrore('Non siamo riusciti a inviare il link. Riprova.');
      return;
    }
    setInviataA(email);
  }

  function altraEmail() {
    setInviataA(null);
    setEmail('');
    setErrore(null);
  }

  return (
    <main
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 16px', boxSizing: 'border-box', background: 'var(--sfondo-schermata)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Marchio aree={[]} lato={20} />
        </div>
        <h1 style={{ margin: '0 0 40px', textAlign: 'center', fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
          Dispesa
        </h1>

        {inviataA !== null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.5, color: 'var(--ink)' }}>
              Ti ho mandato un link a <strong style={{ fontWeight: 700 }}>{inviataA}</strong>: aprilo per entrare.
            </p>
            <TastoSecondario onClick={altraEmail}>USA UN&apos;ALTRA EMAIL</TastoSecondario>
          </div>
        ) : (
          <form onSubmit={inviaLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label
                htmlFor="email"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
                  border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
                  fontSize: 14, color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
            <TastoPrimario type="submit" disabled={caricando}>ENTRA CON UN LINK</TastoPrimario>
            {errore && <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>}
          </form>
        )}
      </div>
    </main>
  );
}
