import type { DishIngredient } from '@/domain/types';

/**
 * Il piatto in scrittura, messo al riparo prima di uscire dall'editor.
 *
 * Serve a un percorso che al primo avvio è obbligato: per aggiungere un
 * ingrediente che non esiste ancora si esce dall'editor del piatto, e lo
 * stato del piatto vive solo nella memoria del componente. Senza questo,
 * chi crea il suo primo piatto — dove ogni ingrediente è nuovo per
 * definizione — riscrive nome e pasto a ogni ingrediente aggiunto.
 *
 * `sessionStorage` e non `localStorage`: una bozza è roba della sessione
 * corrente, non deve sopravvivere alla chiusura del browser né comparire
 * settimane dopo su un piatto che nel frattempo è cambiato.
 */
export interface BozzaPiatto {
  nome: string;
  slotDefId: string;
  ingredienti: DishIngredient[];
}

const PREFISSO = 'spesa:bozza-piatto:';

/**
 * Ogni accesso è protetto: in navigazione privata, o con i dati di sito
 * bloccati, il solo leggere `sessionStorage` lancia. Una bozza persa è un
 * fastidio; una schermata che non si apre è un'app rotta.
 */
function deposito(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function salvaBozza(id: string, bozza: BozzaPiatto): void {
  const d = deposito();
  if (!d) return;
  try {
    d.setItem(`${PREFISSO}${id}`, JSON.stringify(bozza));
  } catch {
    // Quota piena o scrittura negata: si perde la bozza, non la schermata.
  }
}

/**
 * Legge la bozza e la consuma: ripristinarla due volte sovrascriverebbe
 * modifiche fatte dopo il rientro.
 */
export function riprendiBozza(id: string): BozzaPiatto | null {
  const d = deposito();
  if (!d) return null;
  const chiave = `${PREFISSO}${id}`;
  let grezzo: string | null = null;
  try {
    grezzo = d.getItem(chiave);
    d.removeItem(chiave);
  } catch {
    return null;
  }
  if (!grezzo) return null;
  try {
    const letto = JSON.parse(grezzo) as Partial<BozzaPiatto>;
    // Una bozza malformata (versione vecchia del formato, manomissione) non
    // deve poter rompere l'editor: si scarta e si riparte dai dati veri.
    if (typeof letto.nome !== 'string' || typeof letto.slotDefId !== 'string') return null;
    if (!Array.isArray(letto.ingredienti)) return null;
    return { nome: letto.nome, slotDefId: letto.slotDefId, ingredienti: letto.ingredienti };
  } catch {
    return null;
  }
}

export function scartaBozza(id: string): void {
  const d = deposito();
  if (!d) return;
  try {
    d.removeItem(`${PREFISSO}${id}`);
  } catch {
    // Vedi salvaBozza.
  }
}
