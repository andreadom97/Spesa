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
 * l'URL dice `da=piano` lo memorizza per questo piatto.
 */
export function leggiRitornoAlPiano(id: string, search: string): boolean {
  const d = deposito();
  if (new URLSearchParams(search).get('da') === 'piano') {
    try {
      d?.setItem(`${PREFISSO}${id}`, 'piano');
    } catch {
      // Quota piena o scrittura negata: vale solo l'URL.
    }
    return true;
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
