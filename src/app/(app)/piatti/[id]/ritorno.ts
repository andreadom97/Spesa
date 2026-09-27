/**
 * Dove torna l'editor del piatto (review finale fase 7, I1). Il Piano apre un
 * piatto con `?da=piano`; l'editor lo memorizza per id, perché il giro verso
 * l'editor di un ingrediente rientra su `/piatti/{id}` senza parametri e
 * altrimenti lo perderebbe. Nella PWA su iOS non c'è un indietro di sistema:
 * senza questo, dal Piano si finiva su Piatti.
 *
 * `sessionStorage` come la bozza, e con la stessa protezione: il solo leggerlo
 * può lanciare (navigazione privata, dati di sito bloccati). Senza memoria il
 * ritorno vale finché si resta sulla pagina aperta con `?da=piano`.
 *
 * Uscendo in un altro modo (chiusura a metà, indietro di sistema) la chiave
 * resta scritta: riaprendo lo stesso piatto da Piatti nella stessa sessione,
 * la freccia tornerebbe al Piano invece che a Piatti. Da qui Piatti apre con
 * `?da=piatti` (spec: correzione su richiesta di Andrea, 27/09): un `da`
 * diverso da `piano` ripulisce la chiave invece di limitarsi a ignorarla.
 */
const PREFISSO = 'spesa:piatto-ritorno:';

function deposito(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Prima l'URL, poi la memoria: `true` se l'editor va riportato al Piano. Se
 * l'URL dice `da=piano` lo memorizza per questo piatto. Se l'URL dice `da`
 * con un altro valore (oggi solo `piatti`, da Piatti), un'eventuale chiave
 * rimasta orfana — uscita di sistema, app chiusa a metà, senza passare da
 * freccia/SALVA/ELIMINA — non deve più valere: si cancella. Se l'URL non ha
 * `da` è il rientro dall'editor dell'ingrediente, e la chiave vale com'è.
 */
export function leggiRitornoAlPiano(id: string, search: string): boolean {
  const d = deposito();
  const da = new URLSearchParams(search).get('da');
  if (da === 'piano') {
    try {
      d?.setItem(`${PREFISSO}${id}`, 'piano');
    } catch {
      // Quota piena o scrittura negata: vale solo l'URL.
    }
    return true;
  }
  if (da !== null) {
    try {
      d?.removeItem(`${PREFISSO}${id}`);
    } catch {
      // Vedi sopra.
    }
    return false;
  }
  try {
    return d?.getItem(`${PREFISSO}${id}`) === 'piano';
  } catch {
    return false;
  }
}

/** Si esce dall'editor (freccia, SALVA, ELIMINA): il ritorno non serve più. */
export function dimenticaRitorno(id: string): void {
  const d = deposito();
  if (!d) return;
  try {
    d.removeItem(`${PREFISSO}${id}`);
  } catch {
    // Vedi sopra.
  }
}
