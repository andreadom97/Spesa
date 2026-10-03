import type { SupabaseClient } from '@supabase/supabase-js';
import type { MealSlotDef } from '@/domain/types';
import type { PianoEstratto } from '@/domain/import/types';
import { statoRevisioneIniziale } from '@/domain/import/mapping';
import { aSlotDef } from './mappers';
import type { BozzaImport } from './importa';

// La bozza salvata dal server (spec 8c §E). Il client arriva dal chiamante, come in
// import-uso.ts: la route lo costruisce col JWT dell'utente negli header, così vale la RLS di
// casa (`user_id = casa_id()`). Nessuna service key, nessun `client()` del browser.

export async function leggiSlotDefsCon(sb: SupabaseClient): Promise<MealSlotDef[]> {
  const { data, error } = await sb.from('meal_slot_def').select('*').order('posizione');
  if (error) throw error;
  return (data ?? []).map(aSlotDef);
}

export async function salvaBozzaCon(sb: SupabaseClient, casaId: string, bozza: BozzaImport): Promise<void> {
  const { error } = await sb.from('import_draft').upsert({ user_id: casaId, piano: bozza.piano, stato_revisione: bozza.statoRevisione });
  if (error) throw error;
}

/**
 * Salva la lettura appena validata come bozza della casa, con la mappatura dei pasti proposta.
 * Non lancia mai: un errore di scrittura non deve far perdere un'estrazione pagata. `false` e il
 * telefono salva come prima.
 */
export async function salvaBozzaDalServer(sb: SupabaseClient, piano: PianoEstratto): Promise<boolean> {
  try {
    const { data: casa, error } = await sb.rpc('casa_id');
    if (error || !casa) throw error ?? new Error('casa_id vuota');
    const slotDefs = await leggiSlotDefsCon(sb);
    await salvaBozzaCon(sb, String(casa), { piano, statoRevisione: statoRevisioneIniziale(piano, slotDefs) });
    return true;
  } catch (e) {
    console.error('import/estrai: bozza non salvata dal server.', e instanceof Error ? e.name : 'errore');
    return false;
  }
}
