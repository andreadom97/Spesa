import { client } from './supabase';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';

export type RuoloCasa = 'solo' | 'proprietario' | 'membro';

export interface StatoCasa {
  ruolo: RuoloCasa;
  /** Per un proprietario le email dei membri, per un membro quella del proprietario, per chi è solo nessuna. */
  email: string[];
  /**
   * Gli id utente accoppiati per indice a `email`: per un proprietario quelli
   * dei membri (in ordine di ingresso), per un membro quello del proprietario.
   * È l'id che `rimuoviMembro` vuole.
   */
  id: string[];
}

const RUOLI: ReadonlyArray<RuoloCasa> = ['solo', 'proprietario', 'membro'];

/**
 * Quanto a lungo vale una lettura di `idCasa`. Un membro tolto dal
 * proprietario (da un altro dispositivo) non lo viene a sapere: la sua scheda
 * continuerebbe a scrivere con l'id della casa vecchia e ogni upsert sarebbe
 * un 403 finché non ricarica (prova del 15/09). Un minuto è il tempo massimo
 * dell'inganno; la RPC è un select di una riga e ripeterla costa niente.
 */
export const SCADENZA_ID_CASA_MS = 60_000;

/**
 * La memoria di `idCasa`: una promessa, non un valore, così anche due
 * chiamate partite insieme all'apertura dell'app (Lista e Dispensa che
 * caricano in parallelo) condividono una sola RPC invece di due. Con lei
 * l'istante della lettura, per farla scadere, e se si è conclusa: una
 * promessa ancora in volo si riusa anche se è partita prima della scadenza.
 */
interface MemoriaIdCasa {
  promessa: Promise<string>;
  lettaA: number;
  conclusa: boolean;
}

let idCasaMemorizzato: MemoriaIdCasa | null = null;

/** Il listener di `visibilitychange` si registra una volta sola, alla prima `idCasa()`. */
let primoPianoAscoltato = false;

/**
 * L'account su cui agisce chi è loggato: il proprietario della casa se è
 * membro, altrimenti se stesso (`casa_id()` in SQL). Sostituisce
 * `utente.user!.id` in ogni scrittura e filtro per `user_id` del data layer.
 *
 * Memorizzata, ma non per sempre (spec casa-condivisa §7, tre cinture):
 * una lettura più vecchia di `SCADENZA_ID_CASA_MS` si rifà; al ritorno in
 * primo piano si scarta (`ascoltaPrimoPiano`); entra/esci chiamano
 * `dimenticaIdCasa()` e ricaricano tutto, e lo stesso fa la pagina che
 * riceve un rifiuto RLS (`eRifiutoRls`). Se la RPC fallisce la promessa
 * memorizzata si scarta, così il prossimo tentativo riprova: un'assenza di
 * rete momentanea non deve bloccare l'app fino al reload. Con risultato
 * vuoto (nessun utente autenticato) lancia `non autenticato`, e neanche
 * quello resta in memoria.
 */
export async function idCasa(): Promise<string> {
  ascoltaPrimoPiano();
  const memoria = idCasaMemorizzato;
  const valida = memoria !== null
    && (!memoria.conclusa || Date.now() - memoria.lettaA < SCADENZA_ID_CASA_MS);
  if (memoria && valida) return memoria.promessa;

  const promessa = leggiIdCasa();
  const nuova: MemoriaIdCasa = { promessa, lettaA: Date.now(), conclusa: false };
  idCasaMemorizzato = nuova;
  promessa.then(
    () => {
      nuova.conclusa = true;
    },
    () => {
      // Solo se nessuno l'ha già sostituita nel frattempo (dimenticaIdCasa
      // durante la chiamata): non si scarta la memoria di qualcun altro.
      if (idCasaMemorizzato === nuova) idCasaMemorizzato = null;
    },
  );
  return promessa;
}

async function leggiIdCasa(): Promise<string> {
  const { data, error } = await client().rpc('casa_id');
  if (error) throw error;
  if (!data) throw new Error('non autenticato');
  return String(data);
}

/**
 * Scarta la memoria di `idCasa`: dopo entra/esci, prima del reload completo;
 * al ritorno in primo piano; dopo un rifiuto RLS (la casa è cambiata sotto i
 * piedi di chi scrive).
 */
export function dimenticaIdCasa(): void {
  idCasaMemorizzato = null;
}

/**
 * Al ritorno in primo piano la memoria si scarta: è lì che una scheda
 * lasciata aperta (il PC del membro, mentre il proprietario lo toglie dal
 * telefono) rischia di avere un id vecchio. Registrato una volta sola, a
 * livello di modulo, e solo dalla prima `idCasa()`: niente side effect
 * all'import, e in un ambiente senza `document` (route API) non fa nulla.
 * Le pagine che rileggono al ritorno in primo piano (Lista) chiamano
 * `idCasa()` dopo un `await`, quindi trovano la memoria già scartata.
 */
function ascoltaPrimoPiano(): void {
  if (primoPianoAscoltato || typeof document === 'undefined') return;
  primoPianoAscoltato = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') dimenticaIdCasa();
  });
}

/**
 * Riconosce il rifiuto di PostgREST per una violazione di row-level
 * security: codice Postgres `42501` (insufficient_privilege) o un messaggio
 * che parla di `row-level security`. È l'errore che riceve chi scrive con
 * l'id di una casa che non è più la sua: chi lo vede scarta la memoria
 * (`dimenticaIdCasa`) e ricarica i dati prima di lasciar riprovare.
 */
export function eRifiutoRls(errore: unknown): boolean {
  if (typeof errore !== 'object' || errore === null) return false;
  const { code, message } = errore as { code?: unknown; message?: unknown };
  if (code === '42501') return true;
  return typeof message === 'string' && message.toLowerCase().includes('row-level security');
}

function eStatoCasa(v: unknown): v is StatoCasa {
  if (typeof v !== 'object' || v === null) return false;
  const { ruolo, email, id } = v as Record<string, unknown>;
  return (RUOLI as ReadonlyArray<unknown>).includes(ruolo)
    && Array.isArray(email)
    && email.every((e) => typeof e === 'string')
    && Array.isArray(id)
    && id.every((i) => typeof i === 'string')
    // Accoppiati per indice: una lunghezza diversa farebbe togliere la persona sbagliata.
    && id.length === email.length;
}

/**
 * Il ruolo di chi è loggato, le email che gli spettano e gli id accoppiati
 * (`stato_casa()` restituisce jsonb). La forma si valida qui, perché da un
 * jsonb TypeScript non garantisce niente e la scheda CASA si ramifica sul
 * ruolo: meglio un errore chiaro che una scheda vuota.
 */
export async function statoCasa(): Promise<StatoCasa> {
  const { data, error } = await client().rpc('stato_casa');
  if (error) throw error;
  if (!eStatoCasa(data)) throw new Error('stato della casa non valido');
  return { ruolo: data.ruolo, email: [...data.email], id: [...data.id] };
}

/** Un codice di otto caratteri valido un'ora; sostituisce l'invito precedente del proprietario. */
export async function creaInvito(): Promise<string> {
  const { data, error } = await client().rpc('crea_invito');
  if (error) throw error;
  return String(data);
}

/**
 * Entra nella casa di chi ha creato il codice. Il codice si normalizza qui
 * (spazi via, maiuscole) perché lo si scrive a mano sul telefono; gli errori
 * della funzione SQL (`codice non valido o scaduto`…) arrivano già in
 * italiano e si mostrano così come sono. Dopo, l'id della casa cambia:
 * la memoria si scarta e chi chiama ricarica l'app. Con la memoria se ne
 * vanno anche le due copie locali della lista, entrambe dell'altra casa:
 * l'istantanea offline (lista-cache.ts), che senza rete al reload farebbe
 * ricomparire la lista sbagliata, e la coda delle spunte (coda.ts), i cui
 * itemId sono di righe che nella casa nuova non esistono — una spunta non
 * ancora sincronizzata al momento del cambio si perde, limite dichiarato in
 * spec casa-condivisa §7.
 */
export async function entraInCasa(codice: string): Promise<void> {
  const { error } = await client().rpc('entra_in_casa', { codice: codice.trim().toUpperCase() });
  if (error) throw error;
  dimenticaIdCasa();
  cancellaIstantaneaLista();
  svuotaCoda();
}

/**
 * Torna ai propri dati. Come per `entraInCasa`, l'id della casa cambia:
 * memoria scartata, istantanea offline e coda delle spunte (entrambe della
 * casa che si lascia) cancellate, poi reload.
 */
export async function esciDallaCasa(): Promise<void> {
  const { error } = await client().rpc('esci_dalla_casa');
  if (error) throw error;
  dimenticaIdCasa();
  cancellaIstantaneaLista();
  svuotaCoda();
}

/** Il proprietario toglie un membro (per id utente). L'id di chi chiama non cambia: la memoria resta. */
export async function rimuoviMembro(membro: string): Promise<void> {
  const { error } = await client().rpc('rimuovi_membro', { p_membro: membro });
  if (error) throw error;
}
