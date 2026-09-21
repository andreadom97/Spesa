'use client';

import { useEffect, useState } from 'react';
import { client } from '@/data/supabase';

/** L'iniziale per il menù utente: nome se c'è, altrimenti email; '·' se manca tutto. Solo lettura. */
export async function leggiIniziale(): Promise<string> {
  try {
    const { data } = await client().auth.getUser();
    const u = data.user;
    if (!u) return '·';
    const nome = typeof u.user_metadata?.nome === 'string' ? u.user_metadata.nome.trim() : '';
    const base = nome || u.email || '';
    return base ? base[0].toLocaleUpperCase('it') : '·';
  } catch {
    return '·';
  }
}

// La Testata monta a ogni pagina: senza cache, ogni montaggio richiamerebbe
// `getUser` da capo per la stessa sessione. Una sola promessa condivisa a
// livello di modulo, azzerabile dai test con `dimenticaIniziale`.
let promessa: Promise<string> | null = null;

export function useIniziale(): string {
  const [iniziale, setIniziale] = useState('·');
  useEffect(() => {
    let vivo = true;
    (promessa ??= leggiIniziale()).then((i) => { if (vivo) setIniziale(i); });
    return () => { vivo = false; };
  }, []);
  return iniziale;
}

/** Solo per i test: azzera la promessa condivisa così il prossimo `useIniziale` rilegge. */
export function dimenticaIniziale(): void {
  promessa = null;
}
