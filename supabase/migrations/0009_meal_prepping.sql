-- Meal prepping (spec 2026-08-30-meal-prepping-design.md §4).
-- porzioni_preparate: quante porzioni EXTRA questo slot cucina (entrano nei
-- Pronti); da_pronti: il pasto è coperto da una porzione già pronta, non
-- consuma ingredienti crudi.
alter table meal_slot add column porzioni_preparate integer not null default 0
  check (porzioni_preparate >= 0);
alter table meal_slot add column da_pronti boolean not null default false;

-- I lotti dei Pronti: porzioni cucinate in anticipo, per piatto, datate al
-- giorno in cui vengono (o verranno) preparate. Il decadimento è derivato in
-- lettura (porzioniUtilizzabili), mai scritto. meal_slot_id lega il lotto
-- alla dichiarazione sullo slot: cambiare N su quello slot aggiorna QUESTO
-- lotto; null per i lotti creati o corretti a mano dalla Dispensa.
create table porzione_pronta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  porzioni integer not null check (porzioni > 0),
  congelato boolean not null default false,
  preparata_il date not null,
  meal_slot_id uuid references meal_slot(id) on delete set null,
  unique (meal_slot_id)
);

-- RLS: stesso blocco di 0002_rls.sql / 0008_spunta_pasti.sql.
do $$
begin
  execute 'alter table porzione_pronta enable row level security';
  execute 'alter table porzione_pronta force row level security';
  execute 'create policy porzione_pronta_proprietario on porzione_pronta for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;
