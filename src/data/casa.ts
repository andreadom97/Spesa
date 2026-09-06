import { client } from './supabase';

export type RuoloCasa = 'solo' | 'proprietario' | 'membro';

export interface StatoCasa {
  ruolo: RuoloCasa;
  /** Per un proprietario le email dei membri, per un membro quella del proprietario, per chi è solo nessuna. */
  email: string[];
}

const RUOLI: ReadonlyArray<RuoloCasa> = ['solo', 'proprietario', 'membro'];

/**
 * La memoria di `idCasa`: una promessa, non un valore, così anche due
 * chiamate partite insieme all'apertura dell'app (Lista e Dispensa che
 * caricano in parallelo) condividono una sola RPC invece di due.
 */
let idCasaMemorizzato: Promise<string> | null = null;

/**
 * L'account su cui agisce chi è loggato: il proprietario della casa se è
 * membro, altrimenti se stesso (`casa_id()` in SQL). Sostituisce
 * `utente.user!.id` in ogni scrittura e filtro per `user_id` del data layer.
 *
 * Memorizzata per sessione: una RPC per apertura dell'app. Il valore cambia
 * solo con entra/esci, che chiamano `dimenticaIdCasa()` e ricaricano tutto.
 * Se la RPC fallisce la promessa memorizzata si scarta, così il prossimo
 * tentativo riprova: un'assenza di rete momentanea non deve bloccare l'app
 * fino al reload. Con risultato vuoto (nessun utente autenticato) lancia
 * `non autenticato`, e neanche quello resta in memoria.
 */
export async function idCasa(): Promise<string> {
  if (!idCasaMemorizzato) {
    const promessa = leggiIdCasa();
    idCasaMemorizzato = promessa;
    promessa.catch(() => {
      // Solo se nessuno l'ha già sostituita nel frattempo (dimenticaIdCasa
      // durante la chiamata): non si scarta la memoria di qualcun altro.
      if (idCasaMemorizzato === promessa) idCasaMemorizzato = null;
    });
  }
  return idCasaMemorizzato;
}

async function leggiIdCasa(): Promise<string> {
  const { data, error } = await client().rpc('casa_id');
  if (error) throw error;
  if (!data) throw new Error('non autenticato');
  return String(data);
}

/** Scarta la memoria di `idCasa`: dopo entra/esci, prima del reload completo. */
export function dimenticaIdCasa(): void {
  idCasaMemorizzato = null;
}

function eStatoCasa(v: unknown): v is StatoCasa {
  if (typeof v !== 'object' || v === null) return false;
  const { ruolo, email } = v as Record<string, unknown>;
  return (RUOLI as ReadonlyArray<unknown>).includes(ruolo)
    && Array.isArray(email)
    && email.every((e) => typeof e === 'string');
}

/**
 * Il ruolo di chi è loggato e le email che gli spettano (`stato_casa()`
 * restituisce jsonb). La forma si valida qui, perché da un jsonb TypeScript
 * non garantisce niente e la scheda CASA si ramifica sul ruolo: meglio un
 * errore chiaro che una scheda vuota.
 */
export async function statoCasa(): Promise<StatoCasa> {
  const { data, error } = await client().rpc('stato_casa');
  if (error) throw error;
  if (!eStatoCasa(data)) throw new Error('stato della casa non valido');
  return { ruolo: data.ruolo, email: [...data.email] };
}

/** Un codice di sei caratteri valido 24 ore; sostituisce l'invito precedente del proprietario. */
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
 * la memoria si scarta e chi chiama ricarica l'app.
 */
export async function entraInCasa(codice: string): Promise<void> {
  const { error } = await client().rpc('entra_in_casa', { codice: codice.trim().toUpperCase() });
  if (error) throw error;
  dimenticaIdCasa();
}

/** Torna ai propri dati. Come per `entraInCasa`, l'id della casa cambia: memoria scartata, poi reload. */
export async function esciDallaCasa(): Promise<void> {
  const { error } = await client().rpc('esci_dalla_casa');
  if (error) throw error;
  dimenticaIdCasa();
}

/** Il proprietario toglie un membro (per id utente). L'id di chi chiama non cambia: la memoria resta. */
export async function rimuoviMembro(membro: string): Promise<void> {
  const { error } = await client().rpc('rimuovi_membro', { p_membro: membro });
  if (error) throw error;
}
