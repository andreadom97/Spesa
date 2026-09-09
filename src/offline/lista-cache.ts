import type { ListaSalvata } from '@/data/lista';

/**
 * L'ultima lista vista con la rete, salvata in `localStorage` (`spesa:lista`)
 * perché la Lista si possa riaprire in corsia senza segnale.
 *
 * La regola: la rete decide, la copia ripara. Ogni lettura riuscita dal
 * server sovrascrive l'istantanea; solo quando la lettura fallisce la Lista
 * ripiega su questa copia, dicendolo. Non è mai una fonte alternativa di
 * verità, e non si legge mai al posto della rete quando la rete c'è.
 *
 * `lista` è la `ListaSalvata` COME LETTA DAL SERVER, senza la coda delle
 * spunte (`coda.ts`) applicata sopra. La coda si riapplica sempre al momento
 * di mostrare: se l'istantanea contenesse già le spunte in attesa, una spunta
 * ancora in volo verrebbe "disfatta" dalla prossima rilettura dal server (che
 * non la conosce ancora) o contata due volte (una nell'istantanea, una nella
 * coda). Tenere le due cose separate rende la coda l'unico posto in cui vive
 * lo stato locale in attesa.
 *
 * `casaId` è la casa di cui la lista è (`idCasa()`): l'istantanea si legge
 * solo se è della casa di chi la apre. Chi entra o esce da una casa la
 * cancella già (`casa.ts`), ma un membro **tolto dal proprietario** non
 * passa di lì: senza l'id resterebbe sul suo telefono l'ultima lista della
 * casa che ha lasciato, e offline la vedrebbe ancora.
 *
 * `userId` è l'account che l'ha salvata (`auth.getSession()`): sullo stesso
 * browser due account diversi condividono `localStorage`, e senza l'id chi
 * entra dopo vedrebbe offline la lista di chi c'era prima. Vuoto (`''`)
 * quando al salvataggio la sessione non era leggibile.
 */
export interface IstantaneaLista {
  /** L'id della casa (`idCasa()`) di cui la lista è. */
  casaId: string;
  /** L'id dell'account (`auth.getSession()`) che l'ha salvata; `''` se non leggibile. */
  userId: string;
  weekId: string;
  settimanaLabel: string;
  lista: ListaSalvata;
  /** Millisecondi: quando è stata salvata. */
  salvataIl: number;
}

const CHIAVE = 'spesa:lista';

/**
 * Oltre questa età l'istantanea si scarta: una lista di un mese fa non è
 * più "l'ultima vista", è un dato vecchio che in corsia farebbe comprare
 * cose sbagliate, e su un browser condiviso resterebbe in giro a tempo
 * indefinito.
 */
const SCADENZA_MS = 30 * 86_400_000;

/** La forma minima che serve alla Lista per mostrarla: il resto lo tollera già il rendering. */
function eIstantanea(v: unknown): v is IstantaneaLista {
  if (typeof v !== 'object' || v === null) return false;
  const { casaId, userId, weekId, settimanaLabel, salvataIl, lista } = v as Record<string, unknown>;
  if (typeof casaId !== 'string' || typeof userId !== 'string') return false;
  if (typeof weekId !== 'string' || typeof settimanaLabel !== 'string') return false;
  if (typeof salvataIl !== 'number') return false;
  if (typeof lista !== 'object' || lista === null) return false;
  const { base, topup } = lista as Record<string, unknown>;
  return Array.isArray(base) && Array.isArray(topup);
}

/**
 * null se assente, malformata, più vecchia di 30 giorni o senza
 * `localStorage`: chi chiama mostra allora l'errore di sempre.
 *
 * Con `casaId` si legge solo se l'istantanea è di quella casa: se è di
 * un'altra (un membro tolto dal proprietario, che ha ancora sul telefono la
 * lista della casa che ha lasciato) si cancella e si torna null. Con
 * `userId`, lo stesso per l'account: se l'ha salvata un altro account sullo
 * stesso browser si cancella e si torna null. Senza l'uno o l'altro la si
 * restituisce comunque: chi chiama non ha potuto verificare (a freddo senza
 * rete `idCasa()` fallisce; con il token scaduto la sessione non si legge)
 * e l'istantanea è la migliore informazione disponibile. Simmetrico dal
 * lato del salvataggio: un'istantanea con `userId` vuoto (sessione non
 * leggibile quando è stata salvata) non è di un altro account, è di un
 * account non verificabile, e si restituisce anche leggendo con un id.
 */
export function leggiIstantaneaLista(opzioni: { casaId?: string; userId?: string } = {}): IstantaneaLista | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const v: unknown = JSON.parse(grezzo);
    if (!eIstantanea(v)) return null;
    const { casaId, userId } = opzioni;
    if (casaId !== undefined && v.casaId !== casaId) {
      cancellaIstantaneaLista();
      return null;
    }
    // `''` è "account non verificato al salvataggio", non un account
    // diverso: si mostra, come quando è la lettura a non poter verificare
    // (spec lista-offline §1 e §5).
    if (userId !== undefined && v.userId !== '' && v.userId !== userId) {
      cancellaIstantaneaLista();
      return null;
    }
    if (Date.now() - v.salvataIl > SCADENZA_MS) {
      cancellaIstantaneaLista();
      return null;
    }
    return v;
  } catch {
    // Meglio l'errore di caricamento che una schermata rotta in corsia.
    return null;
  }
}

/**
 * `salvataIl` è adesso. Un errore (quota superata, storage bloccato) va in
 * console e non propaga: la lista appena letta si mostra comunque, solo non
 * si potrà rileggere offline.
 */
export function salvaIstantaneaLista(istantanea: Omit<IstantaneaLista, 'salvataIl'>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const completa: IstantaneaLista = { ...istantanea, salvataIl: Date.now() };
    localStorage.setItem(CHIAVE, JSON.stringify(completa));
  } catch (e) {
    console.error('lista offline: istantanea non salvata.', e);
  }
}

export function cancellaIstantaneaLista(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CHIAVE);
  } catch (e) {
    console.error('lista offline: istantanea non cancellata.', e);
  }
}
