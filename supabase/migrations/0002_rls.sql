-- user_id su ogni tabella, RLS su ogni tabella. Nessuna eccezione: le tabelle
-- figlie portano user_id anche se sarebbe deducibile per join, così ogni policy
-- è identica e non c'è modo di sbagliarne una.

do $$
declare t text;
begin
  foreach t in array array[
    'meal_slot_def', 'ingredient', 'dish', 'dish_ingredient', 'week',
    'meal_slot', 'shopping_list', 'shopping_list_item', 'pantry_state',
    'purchase', 'settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_proprietario', t
    );
  end loop;
end $$;
