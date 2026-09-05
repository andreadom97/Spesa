-- Tetto di import per utente (spec 2026-09-05-import-in-produzione-design.md §3).
-- Solo metadati: mai contenuto della dieta. Nessuna policy di update/delete:
-- il contatore non si azzera dal client.
create table import_uso (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  avviato_il timestamptz not null default now(),
  -- 0 = PDF: la riga si scrive prima di dividerlo, il numero di pagine non è
  -- ancora noto alla registrazione. Le foto registrano il loro numero (1..12).
  pagine int not null check (pagine between 0 and 12),
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

-- Privilegi di colonna: il client con il JWT scrive solo user_id, pagine e modello;
-- id e avviato_il li decide il DB (PostgREST rispetta i privilegi di colonna), così
-- nessuno può retrodatare un import per uscire dalla finestra dei 30 giorni.
revoke insert on import_uso from authenticated;
grant insert (user_id, pagine, modello) on import_uso to authenticated;
