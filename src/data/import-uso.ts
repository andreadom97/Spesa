import type { SupabaseClient } from '@supabase/supabase-js';

// Tetto di import per utente (spec 2026-09-05-import-in-produzione-design.md §3).
// Non è una leva di costo: è una difesa per una chiave Anthropic in produzione
// raggiungibile da chiunque abbia un account, e va dichiarata (il 429 dice
// quanti import e da quando). Si contano i tentativi, non i successi: la riga
// si scrive prima delle chiamate al modello, così due invii concorrenti contano
// due e un import fallito consuma comunque uno slot.
//
// Il client arriva dal chiamante: la route lo costruisce con il JWT dell'utente
// negli header, così la RLS vale (select e insert del proprietario, nessun
// update o delete). Questo modulo non usa `client()` né una service key.

const LIMITE_DEFAULT = 3;
const FINESTRA_MS = 30 * 24 * 60 * 60 * 1000;

/** IMPORT_LIMITE_30GG, letta a ogni chiamata: assente o non valida → 3; `0` disattiva il limite. */
export function limiteImport30ggConfigurato(): number {
  const grezzo = process.env.IMPORT_LIMITE_30GG;
  if (grezzo === undefined) return LIMITE_DEFAULT;
  const n = Number(grezzo);
  if (!Number.isInteger(n) || n < 0) return LIMITE_DEFAULT;
  return n;
}

/** Quanti import ha avviato l'utente negli ultimi 30 giorni, e quando il più vecchio (per dire "il prossimo dal ..."). */
export async function contaImportRecenti(
  sb: SupabaseClient,
  userId: string,
  adesso: Date,
): Promise<{ conteggio: number; piuVecchio: Date | null }> {
  const soglia = new Date(adesso.getTime() - FINESTRA_MS).toISOString();
  const { data, error } = await sb
    .from('import_uso')
    .select('avviato_il')
    .eq('user_id', userId)
    .gte('avviato_il', soglia)
    .order('avviato_il', { ascending: true });
  if (error) throw error;
  const righe = (data ?? []) as { avviato_il: string }[];
  return {
    conteggio: righe.length,
    piuVecchio: righe.length ? new Date(righe[0].avviato_il) : null,
  };
}

/** Registra un tentativo di import: da chiamare prima delle chiamate al modello. */
export async function registraImport(
  sb: SupabaseClient,
  userId: string,
  pagine: number,
  modello: string,
): Promise<void> {
  const { error } = await sb.from('import_uso').insert({ user_id: userId, pagine, modello });
  if (error) throw error;
}
