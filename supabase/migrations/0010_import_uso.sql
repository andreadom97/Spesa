-- Tetto di import per utente (spec 2026-09-05-import-in-produzione-design.md §3).
-- Solo metadati: mai contenuto della dieta. Nessuna policy di update/delete:
-- il contatore non si azzera dal client.
create table import_uso (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  avviato_il timestamptz not null default now(),
  pagine int not null check (pagine between 1 and 12),
  modello text not null
);
create index import_uso_utente_data on import_uso (user_id, avviato_il desc);

-- RLS: stesso blocco di 0007_import_draft.sql, ma solo select e insert.
do $$
begin
  execute 'alter table import_uso enable row level security';
  execute 'alter table import_uso force row level security';
  execute 'create policy import_uso_leggi on import_uso for select to authenticated using (auth.uid() = user_id)';
  execute 'create policy import_uso_scrivi on import_uso for insert to authenticated with check (auth.uid() = user_id)';
end $$;
