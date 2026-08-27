'use client';

import { useState, type FormEvent } from 'react';
import { client } from '@/data/supabase';

export default function Entra() {
  const [email, setEmail] = useState('');
  const [caricando, setCaricando] = useState(false);
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function inviaLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setCaricando(true);
    const { error } = await client().auth.signInWithOtp({ email });
    setCaricando(false);
    if (error) {
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
