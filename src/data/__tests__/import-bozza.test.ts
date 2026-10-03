import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import { salvaBozzaDalServer } from '../import-bozza';

const SLOT = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenze_abituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenze_abituali: Array(7).fill(false) },
];

function finto(opzioni: { casa?: string | null; erroreSlot?: unknown; erroreUpsert?: unknown } = {}) {
  const upsert = vi.fn(async (riga: unknown) => {
    void riga; // registrata da vi.fn, controllata con toHaveBeenCalledWith
    return { error: opzioni.erroreUpsert ?? null };
  });
  const order = vi.fn(async () => ({ data: opzioni.erroreSlot ? null : SLOT, error: opzioni.erroreSlot ?? null }));
  const sb = {
    rpc: vi.fn(async () => ({ data: opzioni.casa === undefined ? 'casa-1' : opzioni.casa, error: null })),
    from: vi.fn((tabella: string) => (tabella === 'meal_slot_def' ? { select: () => ({ order }) } : { upsert })),
  };
  return { sb: sb as unknown as SupabaseClient, upsert };
}

describe('salvaBozzaDalServer (spec 8c §E)', () => {
  it('scrive la bozza della casa con la mappatura proposta, e dice true', async () => {
    const { sb, upsert } = finto();
    expect(await salvaBozzaDalServer(sb, PIANO_MENU_SETTIMANALE)).toBe(true);
    expect(upsert).toHaveBeenCalledWith({
      user_id: 'casa-1',
      piano: PIANO_MENU_SETTIMANALE,
      stato_revisione: { passo: 'revisione', mappaturaPasti: { colazione: 's-col', cena: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
  });

  it('casa vuota, slot illeggibili o upsert in errore: false, senza lanciare', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await salvaBozzaDalServer(finto({ casa: null }).sb, PIANO_MENU_SETTIMANALE)).toBe(false);
    expect(await salvaBozzaDalServer(finto({ erroreSlot: { message: 'no' } }).sb, PIANO_MENU_SETTIMANALE)).toBe(false);
    expect(await salvaBozzaDalServer(finto({ erroreUpsert: { message: 'rls' } }).sb, PIANO_MENU_SETTIMANALE)).toBe(false);
    vi.mocked(console.error).mockRestore();
  });
});
