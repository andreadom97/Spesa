const CHIAVE = 'spesa:coda';

export interface Spunta {
  itemId: string;
  spuntato: boolean;
  /** Millisecondi. Decide chi vince fra due eventi sulla stessa voce. */
  ts: number;
}

export function leggiCoda(): Spunta[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return [];
    const v = JSON.parse(grezzo);
    return Array.isArray(v) ? (v as Spunta[]) : [];
  } catch {
    // Meglio perdere la coda che lasciare l'utente davanti a una schermata rotta
    // mentre è in corsia.
    return [];
  }
}

/**
 * Come `lista-cache.ts`: un errore di scrittura (quota superata, storage
 * bloccato, nessun `localStorage`) va in console e non propaga. Chi chiama è
 * un tap in corsia: meglio una spunta che non sopravvive al reload che una
 * schermata rotta.
 */
function scrivi(coda: Spunta[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(coda));
  } catch (e) {
    console.error('coda: scrittura fallita.', e);
  }
}

/**
 * Una sola voce in coda per itemId, quella più recente: la sincronizzazione
 * diventa idempotente e riprodurre la coda due volte non cambia il risultato.
 */
export function accodaSpunta(itemId: string, spuntato: boolean, ts = Date.now()): void {
  const coda = leggiCoda();
  const i = coda.findIndex((s) => s.itemId === itemId);
  if (i === -1) {
    coda.push({ itemId, spuntato, ts });
  } else if (ts >= coda[i].ts) {
    coda[i] = { itemId, spuntato, ts };
  }
  scrivi(coda);
}

export function svuotaCoda(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CHIAVE);
  } catch (e) {
    console.error('coda: scrittura fallita.', e);
  }
}

/**
 * Toglie dalla coda solo le voci esattamente confermate — stesso itemId *e*
 * stesso ts di quelle passate. Serve a chi sincronizza un sottoinsieme della
 * coda (non tutta, non svuotaCoda): se nel frattempo è arrivato un evento più
 * recente sulla stessa voce (ts diverso), quella resta in coda, perché la
 * scrittura appena confermata non la copre.
 */
export function rimuoviConfermate(confermate: Spunta[]): void {
  const rimanenti = leggiCoda().filter(
    (s) => !confermate.some((c) => c.itemId === s.itemId && c.ts === s.ts),
  );
  scrivi(rimanenti);
}

/** Lo stato locale in attesa ha sempre ragione su quello letto dal server. */
export function applicaCodaSuVoci<T extends { id: string; spuntato: boolean }>(voci: T[]): T[] {
  const coda = new Map(leggiCoda().map((s) => [s.itemId, s.spuntato]));
  return voci.map((v) => (coda.has(v.id) ? { ...v, spuntato: coda.get(v.id)! } : v));
}
