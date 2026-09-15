-- Contatore "non hai ricomprato" (spec 2026-09-05-non-ricomprato-design.md §3).
-- prezzo_confezione: euro per una confezione, facoltativo (null = nessun
-- prezzo). Serve SOLO a valorizzare in euro le confezioni non ricomprate:
-- non entra in nessun calcolo della lista né del residuo.
alter table ingredient add column prezzo_confezione numeric
  check (prezzo_confezione > 0);

-- Il non ricomprato di una settimana, fissato alla generazione della lista da
-- generaListe: per ogni ingrediente con fabbisogno > 0 e classe diversa da
-- 'stima', le confezioni che una lista "senza memoria" avrebbe chiesto
-- (ingenue), quelle chieste davvero col residuo (reali) e la differenza
-- (evitate). prezzo_confezione è un'istantanea: cambiare il prezzo
-- dell'ingrediente dopo non riscrive il passato. Una riga per (settimana,
-- ingrediente): rigenerare la lista sostituisce le righe della settimana.
create table risparmio_settimana (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references week(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  fabbisogno numeric not null,
  confezioni_ingenue int not null,
  confezioni_reali int not null,
  confezioni_evitate int not null check (confezioni_evitate >= 0),
  quantita_evitata numeric not null,
  unita text not null check (unita in ('g', 'ml', 'pz')),
  prezzo_confezione numeric,     -- istantanea al momento della generazione
  unique (week_id, ingredient_id)
);

-- Le letture sono sempre per utente e settimana (la scheda in "Hai preso
-- tutto") o per utente su tutte le settimane chiuse (il totale in Dispensa).
create index risparmio_settimana_utente_settimana
  on risparmio_settimana (user_id, week_id);

-- RLS: stesso blocco di 0002_rls.sql / 0009_meal_prepping.sql.
do $$
begin
  execute 'alter table risparmio_settimana enable row level security';
  execute 'alter table risparmio_settimana force row level security';
  execute 'create policy risparmio_settimana_proprietario on risparmio_settimana for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;
