/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Non c'è un Postgres locale (né la CLI Supabase né Docker su questa macchina, 03/10): la funzione
 * si verifica in produzione con una lettura dopo l'applicazione (spec §I, §J). Qui si fissa il
 * contratto scritto nel file, così una modifica distratta non lo rompe in silenzio.
 */
const sql = readFileSync(join(process.cwd(), 'supabase/migrations/0016_import_unita_e_qb.sql'), 'utf-8');

describe('migrazione 0016', () => {
  it('quantita facoltativa: null è il q.b.', () => {
    expect(sql).toContain('alter table dish_ingredient alter column quantita drop not null;');
    expect(sql).toContain('check (quantita is null or quantita > 0)');
  });

  it('la funzione è security invoker, col search_path fisso, eseguibile solo da authenticated', () => {
    expect(sql).toContain('create function public.cambia_unita_ingrediente(p_ingrediente uuid, p_unita text, p_fattore numeric)');
    expect(sql).toMatch(/security invoker\s+set search_path = public/);
    expect(sql).toContain('revoke execute on function public.cambia_unita_ingrediente(uuid, text, numeric) from public, anon;');
    expect(sql).toContain('grant execute on function public.cambia_unita_ingrediente(uuid, text, numeric) to authenticated;');
  });

  it('tocca le tabelle della spec e le liste aperte, sempre filtrate per casa', () => {
    for (const t of ['update ingredient', 'update dish_ingredient', 'update pantry_state', 'update meal_slot_storno', 'update purchase', 'update shopping_list_item']) {
      expect(sql).toContain(t);
    }
    expect(sql.match(/user_id = casa/g)?.length).toBeGreaterThanOrEqual(8);
    // «Lista aperta» come nella 0015 (correzione D12): la settimana non chiusa, non chiusa_il.
    expect(sql).toContain('join week w on w.id = sl.week_id');
    expect(sql).toContain("w.stato <> 'chiusa'");
    expect(sql).not.toContain('chiusa_il is null');
    expect(sql).not.toContain('update risparmio_settimana');
  });

  it('un secondo giro non converte due volte, e fra ml e altro non converte mai', () => {
    expect(sql).toMatch(/if attuale = p_unita then\s+return;/);
    expect(sql).toContain("if p_unita is null or p_unita not in ('g', 'pz') then");
    expect(sql).toContain("if attuale not in ('g', 'pz') then");
  });

  it('rifiuta unità e fattore nulli, non numerici, infiniti o enormi (null e NaN non superano il confronto)', () => {
    expect(sql).toContain('p_unita is null or p_unita not in');
    // 'Infinity'::numeric (Postgres ≥ 14) supera `<= 0`: il tetto di 100 kg a pezzo lo ferma su ogni
    // versione senza citare il letterale (review finale, I1).
    expect(sql).toContain("if p_fattore is null or p_fattore = 'NaN'::numeric or p_fattore <= 0 or p_fattore > 100000 then");
  });

  it('un ingrediente «intero» che passa a grammi diventa «porzionabile» nella stessa update', () => {
    // «intero» vuol dire formato 1 a pezzi: lasciato in g conterebbe una confezione per grammo
    // (review finale, C1). Da g a pz la classe resta: porzionabile e stima in pz sono ammessi.
    const updateIngrediente = sql.slice(sql.indexOf('update ingredient'), sql.indexOf('update dish_ingredient'));
    expect(updateIngrediente).toMatch(
      /classe_residuo = case\s+when p_unita = 'g' and classe_residuo = 'intero' then 'porzionabile'\s+else classe_residuo\s+end/,
    );
    expect(updateIngrediente).toContain('where id = p_ingrediente and user_id = casa;');
  });

  it('le righe q.b. restano null e i kg valgono 1000 g prima del fattore', () => {
    // greatest() ignora i null: senza questa guardia ogni q.b. diventerebbe 0,25 pz o 1 g.
    expect(sql).toContain('when quantita is null then null');
    expect(sql).toContain("(case when unita = 'kg' then 1000 else 1 end)");
  });
});
