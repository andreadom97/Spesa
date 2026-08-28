'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { client } from '@/data/supabase';

/**
 * Messaggi per ?errore=... sulla query string: ci arriva chi rimbalza da
 * /auth/callback perché il code mancava o lo scambio con Supabase è
 * fallito. Senza questo, l'utente vedrebbe solo il form vuoto, senza sapere
 * che il link appena toccato non ha funzionato.
 */
const MESSAGGI_ERRORE: Record<string, string> = {
  'link-non-valido': 'Questo link non è valido. Richiedine uno nuovo qui sotto.',
  'accesso-fallito': 'Non siamo riusciti a completare l’accesso. Richiedi un nuovo link.',
};

export default function Entra() {
  const [email, setEmail] = useState('');
  const [caricando, setCaricando] = useState(false);
  const [inviata, setInviata] = useState(false);
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
      setErrore(MESSAGGI_ERRORE[codice] ?? 'Non siamo riusciti a completare l’accesso. Riprova.');
    }
  }, []);

  async function inviaLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    setInviata(true);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-[var(--fondo)] px-6 py-12">
      <h1
        className="text-center text-[var(--ink)]"
        style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em' }}
      >
        Spesa
      </h1>

      {inviata ? (
        <p className="text-center text-lg text-[var(--ink-2)]">Controlla la posta.</p>
      ) : (
        <form onSubmit={inviaLink} className="flex w-full max-w-sm flex-col gap-4">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="La tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[52px] rounded-[18px] border border-[var(--bordo)] bg-[var(--superficie)] px-5 text-base text-[var(--ink)] outline-none"
          />
          <button
            type="submit"
            disabled={caricando}
            className="h-[52px] rounded-[18px] bg-[var(--ink)] px-5 text-base font-semibold text-[var(--superficie)] disabled:opacity-60"
            style={{ boxShadow: '0 3px 10px rgba(20,22,58,0.24)' }}
          >
            {caricando ? 'Invio in corso…' : 'Entra con un link'}
          </button>
          {errore && <p className="text-sm text-[var(--ink-2)]">{errore}</p>}
        </form>
      )}
    </main>
  );
}
