-- Il ledger degli storni (spec spunta-pasti §4): la memoria di quanto ogni
-- spunta ha spostato nel residuo. Una riga CUMULATIVA per (slot, ingrediente),
-- aggiornata leggi-somma-scrivi da aggiornaSlot; cancellata quando il cumulo
-- torna a 0. delta > 0 = riaccredito al residuo, delta < 0 = addebito.
create table meal_slot_storno (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_slot_id uuid not null references meal_slot(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  delta numeric not null,
  aggiornato_il timestamptz not null default now(),
  unique (meal_slot_id, ingredient_id)
);

-- RLS: stesso blocco di 0002_rls.sql / 0007_import_draft.sql.
do $$
begin
  execute 'alter table meal_slot_storno enable row level security';
  execute 'alter table meal_slot_storno force row level security';
  execute 'create policy meal_slot_storno_proprietario on meal_slot_storno for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;

-- 'sostituito' = "ho mangiato altro": per il residuo equivale a saltato, a
-- schermo si distingue. Il sostituto DEL REPERTORIO invece non è uno stato:
-- lo slot resta 'casa', cambia dish_id, il ledger pareggia (spec §4).
-- Nome del constraint verificato in produzione il 29/08: meal_slot_stato_check.
alter table meal_slot drop constraint meal_slot_stato_check;
alter table meal_slot add constraint meal_slot_stato_check
  check (stato in ('casa', 'fuori', 'saltato', 'sostituito'));
