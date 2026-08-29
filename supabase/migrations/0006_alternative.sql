-- Le alternative delle diete vere ("oppure"), decise nel design del 29/08/2026.
--
-- Fra pasti: nessuna tabella — due piatti fissati sullo stesso
-- slot_def_id+giorno_ciclo+settimana_ciclo SONO il gruppo, sceglie il planner.
-- Dentro il piatto: un componente ("pane", "farcitura") raggruppa opzioni;
-- ogni opzione possiede le sue righe in dish_ingredient via option_id.
-- La scelta della settimana vive in meal_slot_choice: è un fatto della
-- settimana, non del piatto.

create table dish_option (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  -- Il componente non ha una tabella: è una chiave di raggruppamento più il
  -- suo nome, ripetuti su ogni opzione. Una tabella in più non comprerebbe
  -- niente: il componente non ha altri attributi.
  componente_id uuid not null,
  componente_nome text not null,
  -- Ordine dentro il componente: la posizione 0 è l'opzione di default.
  posizione int not null check (posizione >= 0),
  unique (dish_id, componente_id, posizione)
);

-- Riga fissa = option_id NULL (tutte le righe esistenti restano valide così).
alter table dish_ingredient
  add column option_id uuid references dish_option(id) on delete cascade;

-- Lo stesso ingrediente può comparire in più opzioni dello stesso piatto
-- (pane 60g nell'opzione A, pane 80g nella B): il vincolo unico originale lo
-- impedirebbe. Si sostituisce con due indici: le righe fisse restano uniche
-- per ingrediente, le righe di opzione sono uniche dentro la loro opzione.
alter table dish_ingredient
  drop constraint dish_ingredient_dish_id_ingredient_id_key;
create unique index dish_ingredient_fisso_unico
  on dish_ingredient (dish_id, ingredient_id) where option_id is null;
create unique index dish_ingredient_opzione_unica
  on dish_ingredient (option_id, ingredient_id) where option_id is not null;

create table meal_slot_choice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_slot_id uuid not null references meal_slot(id) on delete cascade,
  componente_id uuid not null,
  option_id uuid not null references dish_option(id) on delete cascade,
  fonte text not null check (fonte in ('planner', 'manuale')),
  unique (meal_slot_id, componente_id)
);

create index on dish_option (dish_id);
create index on meal_slot_choice (meal_slot_id);

-- RLS: stesso blocco di 0002_rls.sql, solo per le due tabelle nuove.
do $$
declare t text;
begin
  foreach t in array array['dish_option', 'meal_slot_choice'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_proprietario', t
    );
  end loop;
end $$;

comment on table dish_option is
  'Un''opzione di un componente del piatto. componente_id+componente_nome raggruppano; posizione 0 = default.';
comment on table meal_slot_choice is
  'Quale opzione vale per quel pasto in quella settimana. fonte=manuale non viene mai sovrascritta dal planner.';
