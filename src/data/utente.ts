'use client';

import { useEffect, useState } from 'react';
import { client } from '@/data/supabase';

export interface Utente {
  /** `user_metadata.nome` se c'è, altrimenti la parte dell'email prima della @; '' senza utente. */
  nome: string;
  email: string;
}

const NESSUNO: Utente = { nome: '', email: '' };

/**
 * Chi è loggato: il nome per il Menù utente (`{Nome}: profilo e impostazioni`, spec fase 5
 * §A.2) e nome ed email per il gruppo Account del pannello. Solo lettura; non lancia.
 */
export async function leggiUtente(): Promise<Utente> {
  try {
    const { data } = await client().auth.getUser();
    const u = data.user;
    if (!u) return NESSUNO;
    const email = u.email ?? '';
    const dalProfilo = typeof u.user_metadata?.nome === 'string' ? u.user_metadata.nome.trim() : '';
    return { nome: dalProfilo || email.split('@')[0], email };
  } catch {
    return NESSUNO;
  }
}

/** L'iniziale del Menù utente: la prima lettera del nome, maiuscola; '·' se il nome non c'è. */
export function inizialeDi(nome: string): string {
  const pulito = nome.trim();
  return pulito ? pulito[0].toLocaleUpperCase('it') : '·';
}

// La Testata monta a ogni pagina: senza cache, ogni montaggio richiamerebbe `getUser` da capo
// per la stessa sessione. Una sola promessa condivisa a livello di modulo.
let promessa: Promise<Utente> | null = null;

/** null finché `getUser` non risponde. */
export function useUtente(): Utente | null {
  const [utente, setUtente] = useState<Utente | null>(null);
  useEffect(() => {
    let vivo = true;
    (promessa ??= leggiUtente()).then((u) => { if (vivo) setUtente(u); });
    return () => { vivo = false; };
  }, []);
  return utente;
}

/**
 * Azzera la promessa condivisa: il prossimo `useUtente` rilegge. Il nome è quello di prima
 * della fase 5 (lo chiamano `esci()` e i test).
 */
export function dimenticaIniziale(): void {
  promessa = null;
}
