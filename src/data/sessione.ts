import { client } from './supabase';
import { dimenticaIdCasa } from './casa';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';

/**
 * Esce dall'account su questo dispositivo soltanto (spec esci §2).
 *
 * `scope: 'local'` chiude la sessione di questa scheda e basta: il default
 * (`global`) revoca tutti i refresh token dell'utente, e uscendo dal PC si
 * farebbe uscire anche il telefono. Se il server non chiude la sessione
 * (niente rete) si rilancia e in locale non si tocca nulla: altrimenti la
 * scheda resterebbe "dentro" con i dati locali spariti.
 *
 * Solo dopo, le tre pulizie: l'istantanea offline della lista, la coda delle
 * spunte e la memoria dell'id della casa sono tutte dell'account che esce,
 * e il prossimo account su questa scheda non le deve vedere. Il proxy
 * rimanda a /entra ogni pagina senza sessione: chi chiama fa
 * `router.replace('/entra')` solo per non aspettare la prossima navigazione.
 */
export async function esciDallAccount(): Promise<void> {
  const { error } = await client().auth.signOut({ scope: 'local' });
  if (error) throw error;
  cancellaIstantaneaLista();
  svuotaCoda();
  dimenticaIdCasa();
}

/**
 * L'email dell'account loggato, per la riga `Sei dentro come …` di
 * Impostazioni. Viene da `auth.getUser()`, non da `statoCasa()` (che elenca
 * gli altri). È una riga di cortesia: senza utente (sessione scaduta) o con
 * un errore restituisce `null` e la pagina dice solo `Sei dentro`.
 */
export async function emailAccount(): Promise<string | null> {
  try {
    const { data } = await client().auth.getUser();
    return data.user?.email ?? null;
  } catch (errore) {
    console.error('sessione: lettura dell\'email fallita.', errore);
    return null;
  }
}
