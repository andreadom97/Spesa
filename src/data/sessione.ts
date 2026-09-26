import { client } from './supabase';
import { dimenticaIdCasa } from './casa';
import { dimenticaIniziale } from './utente';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';

/**
 * Esci (spec fase 5 §E.4). Prima del 25/09 il logout non esisteva.
 *
 * 1. `signOut({ scope: 'local' })`: esce da questo telefono, non dagli altri
 *    dispositivi dell'account (piano fase 5, D3).
 * 2. La pulizia, come `entraInCasa`/`esciDallaCasa`: l'istantanea offline
 *    della lista e la coda delle spunte non restano su un telefono da cui
 *    l'account è uscito. Una spunta ancora in coda si perde: limite
 *    dichiarato (spec §L), come uscendo da una casa.
 * 3. Le memorie di modulo (`idCasa`, l'iniziale del Menù utente).
 * 4. `window.location.replace('/entra')`: una navigazione piena, che svuota
 *    ogni altra cache di modulo e non passa dalla Lista.
 *
 * **Quando lancia.** `signOut` di auth-js (2.112.4) toglie la sessione
 * locale anche quando la chiamata al server fallisce, e poi restituisce
 * l'errore (misurato il 25/09 in `GoTrueClient._signOut`). Un errore quindi
 * non vuol dire «sei ancora dentro»: si guarda la sessione. Se c'è ancora,
 * si lancia e il dialogo resta aperto col suo errore, senza pulizia né
 * navigazione. Se non c'è più, l'uscita su questo telefono è avvenuta: si
 * pulisce e si va a `/entra` come se fosse andata liscia. Resta valido sul
 * server solo il refresh token, che non ha più nessuno.
 */
export async function esci(): Promise<void> {
  const auth = client().auth;
  let errore: unknown = null;
  try {
    const { error } = await auth.signOut({ scope: 'local' });
    errore = error;
  } catch (e) {
    errore = e;
  }
  if (errore) {
    const { data } = await auth.getSession();
    if (data.session) throw errore;
    console.error('esci: il server non ha confermato, ma la sessione locale è chiusa.', errore);
  }
  cancellaIstantaneaLista();
  svuotaCoda();
  dimenticaIdCasa();
  dimenticaIniziale();
  window.location.replace('/entra');
}
