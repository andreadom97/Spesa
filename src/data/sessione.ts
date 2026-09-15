import { client } from './supabase';
import { dimenticaIdCasa } from './casa';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';

/** Le chiavi di `sessionStorage` che sono dell'app: le bozze piatto di `bozza.ts` e simili. */
const PREFISSO_SESSIONE = 'spesa:';

/**
 * Esce dall'account su questo dispositivo soltanto (spec esci §2).
 *
 * `scope: 'local'` chiama `/logout?scope=local`, che revoca solo la sessione
 * di questo dispositivo: le altre restano (il default, `global`, revoca
 * tutti i refresh token dell'utente, e uscendo dal PC si farebbe uscire
 * anche il telefono).
 *
 * Senza rete la libreria (`@supabase/auth-js`, `GoTrueClient._signOut`)
 * chiude COMUNQUE la sessione locale (i cookie `sb-*` se ne vanno) e poi
 * restituisce `{ error }`: il refresh token di questo dispositivo resta
 * valido lato server finché scade, ma la scheda è già fuori. In quel caso
 * si esce e si pulisce lo stesso: rilanciare lasciava istantanea, coda e
 * memoria della casa a chi era già fuori, e la pagina diceva "serve la
 * rete" a una scheda senza sessione. Si rilancia solo se dopo l'errore la
 * sessione locale è ancora lì: succede quando `_signOut` non arriva
 * nemmeno al server (token scaduto e refresh fallito: la libreria esce
 * senza rimuovere nulla). Lì in locale non si tocca niente, altrimenti la
 * scheda resterebbe "dentro" con i dati locali spariti.
 *
 * Poi le pulizie: l'istantanea offline della lista, la coda delle spunte,
 * la memoria dell'id della casa e le chiavi `spesa:*` di `sessionStorage`
 * (le bozze piatto: quella di /piatti/nuovo ha una chiave fissa, e un
 * secondo account sullo stesso telefono si ritroverebbe la bozza del
 * primo) sono tutte dell'account che esce, e il prossimo account su questa
 * scheda non le deve vedere. Il proxy rimanda a /entra ogni pagina senza
 * sessione: chi chiama fa `router.replace('/entra')` solo per non
 * aspettare la prossima navigazione.
 */
export async function esciDallAccount(): Promise<void> {
  const { error } = await client().auth.signOut({ scope: 'local' });
  if (error && !(await sessioneLocaleAndata())) throw error;
  cancellaIstantaneaLista();
  svuotaCoda();
  dimenticaIdCasa();
  scartaChiaviDiSessione();
}

/**
 * Vero se, dopo un `signOut` con errore, la sessione locale non c'è più.
 * `getSession` legge il token locale: risponde `session: null` senza
 * errore quando la libreria l'ha rimossa. Un `session: null` CON errore è
 * un'altra cosa (access token scaduto e refresh fallito): il cookie è
 * ancora su disco e la sessione non è "andata". Se non si riesce nemmeno
 * a leggere (storage bloccato) si è prudenti: non andata.
 */
async function sessioneLocaleAndata(): Promise<boolean> {
  try {
    const { data, error } = await client().auth.getSession();
    return data.session === null && !error;
  } catch (errore) {
    console.error('sessione: lettura della sessione dopo il signOut fallita.', errore);
    return false;
  }
}

/**
 * Toglie da `sessionStorage` ogni chiave `spesa:*`. Protetto come in
 * `bozza.ts`: in navigazione privata, o con i dati di sito bloccati, il
 * solo leggere `sessionStorage` lancia, e una bozza rimasta è un fastidio
 * mentre un'uscita che non riesce è un'app rotta.
 */
function scartaChiaviDiSessione(): void {
  try {
    if (typeof window === 'undefined') return;
    const deposito = window.sessionStorage;
    const chiavi: string[] = [];
    for (let i = 0; i < deposito.length; i += 1) {
      const chiave = deposito.key(i);
      if (chiave?.startsWith(PREFISSO_SESSIONE)) chiavi.push(chiave);
    }
    for (const chiave of chiavi) deposito.removeItem(chiave);
  } catch {
    // Storage negato: si esce lo stesso.
  }
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
