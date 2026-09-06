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
 */
export interface IstantaneaLista {
  /** L'id della casa (`idCasa()`) di cui la lista è. */
  casaId: string;
  weekId: string;
  settimanaLabel: string;
  lista: ListaSalvata;
  /** Millisecondi: quando è stata salvata. */
  salvataIl: number;
}

const CHIAVE = 'spesa:lista';

/** La forma minima che serve alla Lista per mostrarla: il resto lo tollera già il rendering. */
function eIstantanea(v: unknown): v is IstantaneaLista {
  if (typeof v !== 'object' || v === null) return false;
  const { casaId, weekId, settimanaLabel, salvataIl, lista } = v as Record<string, unknown>;
  if (typeof casaId !== 'string' || typeof weekId !== 'string' || typeof settimanaLabel !== 'string') return false;
  if (typeof salvataIl !== 'number') return false;
  if (typeof lista !== 'object' || lista === null) return false;
  const { base, topup } = lista as Record<string, unknown>;
  return Array.isArray(base) && Array.isArray(topup);
}

/**
 * null se assente, malformata o senza `localStorage`: chi chiama mostra
 * allora l'errore di sempre.
 *
 * Con `casaId` si legge solo se l'istantanea è di quella casa: se è di
 * un'altra (un membro tolto dal proprietario, che ha ancora sul telefono la
 * lista della casa che ha lasciato) si cancella e si torna null. Senza
 * `casaId` la si restituisce comunque: chi chiama non ha potuto verificare
 * la casa (a freddo senza rete `idCasa()` fallisce) e l'istantanea è la
 * migliore informazione disponibile.
 */
export function leggiIstantaneaLista(casaId?: string): IstantaneaLista | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const v: unknown = JSON.parse(grezzo);
    if (!eIstantanea(v)) return null;
    if (casaId !== undefined && v.casaId !== casaId) {
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
