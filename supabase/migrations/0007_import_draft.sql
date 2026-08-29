-- La bozza dell'import dieta (spec 2026-08-29-import-dieta-design.md §3).
-- Una riga per utente: un solo import in corso alla volta. Si cancella al
-- commit o su "ricomincia". Il PianoEstratto resta immutato in `piano`;
-- le decisioni della revisione vivono in `stato_revisione`.
create table import_draft (
  user_id uuid primary key references auth.users(id) on delete cascade,
  piano jsonb not null,
  stato_revisione jsonb not null,
  creato_il timestamptz not null default now()
);

-- RLS: stesso blocco di 0002_rls.sql / 0006_alternative.sql.
do $$
begin
  execute 'alter table import_draft enable row level security';
  execute 'alter table import_draft force row level security';
  execute 'create policy import_draft_proprietario on import_draft for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;
