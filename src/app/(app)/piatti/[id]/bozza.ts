import type { Componente, DishIngredient } from '@/domain/types';

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
  descrizione: string;
  settimanaCiclo: number | null;
  giornoCiclo: number | null;
  ingredienti: DishIngredient[];
  /**
   * Senza questo campo, uscire dall'editor per creare un ingrediente (dalla
   * lista fissa o da un'opzione di un componente) o per modificarne uno
   * esistente perdeva silenziosamente ogni componente aggiunto/modificato
   * fino a quel momento: `riparaBozzaPrimaDiUscire` salvava una bozza senza
   * componenti, e al rientro `carica()` li rileggeva dal server (o da `[]`
   * su un piatto nuovo), cancellando il lavoro in corso. Sono oggetti
   * piani, serializzabili come il resto della bozza.
   */
  componenti: Componente[];
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
    // I campi aggiunti dopo si leggono con un default: una bozza scritta da
    // una versione precedente resta valida invece di essere buttata via.
    // `componenti` è fra questi: una bozza salvata prima di questo fix non
    // ce l'ha, e deve restare leggibile.
    return {
      nome: letto.nome,
      slotDefId: letto.slotDefId,
      descrizione: typeof letto.descrizione === 'string' ? letto.descrizione : '',
      settimanaCiclo: typeof letto.settimanaCiclo === 'number' ? letto.settimanaCiclo : null,
      giornoCiclo: typeof letto.giornoCiclo === 'number' ? letto.giornoCiclo : null,
      ingredienti: letto.ingredienti,
      componenti: Array.isArray(letto.componenti) ? letto.componenti : [],
    };
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

const CHIAVE_CREATO = 'spesa:ingrediente-creato:';

/**
 * L'ingrediente appena creato, da aggiungere al piatto che lo aspetta.
 *
 * Chi esce dall'editor del piatto per creare un ingrediente lo sta creando
 * *per quel piatto*: tornare indietro e doverlo riselezionare a mano è un
 * passaggio che non serve a niente, e a fine creazione non è nemmeno ovvio
 * che vada fatto — il piatto ricompare identico a prima.
 */
export function segnalaIngredienteCreato(piattoId: string, ingredientId: string): void {
  const d = deposito();
  if (!d) return;
  try {
    d.setItem(`${CHIAVE_CREATO}${piattoId}`, ingredientId);
  } catch {
    // Vedi salvaBozza: al peggio si riseleziona a mano.
  }
}

/** Come `riprendiBozza`, consuma: l'ingrediente va aggiunto una volta sola. */
export function raccogliIngredienteCreato(piattoId: string): string | null {
  const d = deposito();
  if (!d) return null;
  const chiave = `${CHIAVE_CREATO}${piattoId}`;
  try {
    const id = d.getItem(chiave);
    d.removeItem(chiave);
    return id || null;
  } catch {
    return null;
  }
}
