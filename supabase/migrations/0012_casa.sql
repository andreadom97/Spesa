-- La casa condivisa (spec 2026-09-06-casa-condivisa-design.md).
--
-- Una casa È l'account del proprietario: un membro è un account autorizzato ad
-- agire sui dati del proprietario come se fossero i suoi. Il perno è casa_id(),
-- che restituisce il proprietario se chi chiama è membro di una casa, altrimenti
-- chi chiama. TUTTE le policy `auth.uid() = user_id` (0002, 0006-0011) vengono
-- sostituite da `user_id = casa_id()`: un ciclo su information_schema, non un
-- elenco a mano, così nessuna tabella resta con la regola vecchia.
--
-- Va applicata PRIMA del deploy del codice che usa idCasa(): senza la RPC
-- casa_id l'app non carica. Come le altre migrazioni NON è rieseguibile (le
-- create table fallirebbero la seconda volta).

-- ── Tabelle ──────────────────────────────────────────────────────────────────

-- Un account è membro di al più una casa (membro è chiave primaria). Un
-- proprietario non può essere membro altrove e un membro non può avere membri:
-- lo garantiscono entra_in_casa e crea_invito, così casa_id() non deve mai
-- risalire una catena.
create table casa_membro (
  membro uuid primary key references auth.users(id) on delete cascade,
  proprietario uuid not null references auth.users(id) on delete cascade,
  entrato_il timestamptz not null default now(),
  check (membro <> proprietario)
);
create index casa_membro_proprietario on casa_membro (proprietario);

-- Un codice per proprietario alla volta, sei caratteri, 24 ore. Chi lo ha entra:
-- rischio accettato fra persone che vivono insieme (spec §7).
create table casa_invito (
  codice text primary key,
  proprietario uuid not null references auth.users(id) on delete cascade,
  creato_il timestamptz not null default now(),
  scade_il timestamptz not null
);
create index casa_invito_proprietario on casa_invito (proprietario);

-- RLS propria delle due tabelle. casa_membro si legge da dentro la casa e non si
-- scrive mai direttamente; casa_invito non si tocca affatto: si passa dalle
-- funzioni qui sotto. La policy di casa_membro usa auth.uid() e NON casa_id(),
-- apposta: casa_id() legge casa_membro, e una policy che la richiamasse
-- girerebbe in tondo.
alter table casa_membro enable row level security;
alter table casa_membro force row level security;
create policy casa_membro_leggi on casa_membro
  for select to authenticated
  using (membro = auth.uid() or proprietario = auth.uid());
revoke insert, update, delete on casa_membro from authenticated, anon;

alter table casa_invito enable row level security;
alter table casa_invito force row level security;
revoke all on casa_invito from authenticated, anon;

-- ── casa_id() ────────────────────────────────────────────────────────────────

-- security definer: gira come il proprietario del DB, quindi legge casa_membro
-- senza passare dalla sua policy. Non è una scorciatoia di sicurezza (la policy
-- lascerebbe comunque leggere la propria riga): serve perché casa_id() viene
-- chiamata DENTRO le policy di tutte le altre tabelle, e una funzione che a sua
-- volta dipendesse da una policy renderebbe ogni query un castello di carte.
-- stable: una volta per statement, non per riga.
create or replace function public.casa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select proprietario from casa_membro where membro = auth.uid()),
    auth.uid()
  )
$$;
revoke execute on function public.casa_id() from public, anon;
grant execute on function public.casa_id() to authenticated;

-- ── Le policy, rigenerate su ogni tabella con user_id ────────────────────────

-- Prima si eliminano TUTTE le policy esistenti della tabella: due policy attive
-- insieme (x_proprietario e x_casa) sarebbero un OR permissivo, e un membro non
-- vedrebbe la casa ma un proprietario continuerebbe a vedere solo sé stesso.
-- import_uso conserva la sua forma (select e insert separate, niente update né
-- delete: il contatore non si azzera dal client); i privilegi di colonna della
-- 0010 non si toccano.
do $$
declare
  t text;
  p text;
  toccate text[] := array[]::text[];
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and tb.table_type = 'BASE TABLE'
    order by c.table_name
  loop
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on %I', p, t);
    end loop;

    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);

    if t = 'import_uso' then
      execute 'create policy import_uso_leggi on import_uso for select to authenticated using (user_id = casa_id())';
      execute 'create policy import_uso_scrivi on import_uso for insert to authenticated with check (user_id = casa_id())';
    else
      execute format(
        'create policy %I on %I for all to authenticated using (user_id = casa_id()) with check (user_id = casa_id())',
        t || '_casa', t
      );
    end if;

    toccate := toccate || t;
  end loop;

  raise notice 'Policy rigenerate su casa_id() per: %', array_to_string(toccate, ', ');
end $$;

-- ── Le funzioni della casa (RPC) ─────────────────────────────────────────────
-- Tutte security definer con search_path fisso: scrivono su tabelle che il
-- client non può toccare. I messaggi di errore sono in italiano e arrivano
-- all'utente così come sono.

create or replace function public.crea_invito()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- senza 0 O 1 I
  nuovo text;
  i int;
begin
  if auth.uid() is null then
    raise exception 'non autenticato';
  end if;
  if exists (select 1 from casa_membro where membro = auth.uid()) then
    raise exception 'sei già in una casa: esci prima di invitare';
  end if;

  delete from casa_invito where proprietario = auth.uid();

  loop
    nuovo := '';
    for i in 1..6 loop
      nuovo := nuovo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from casa_invito where codice = nuovo);
  end loop;

  insert into casa_invito (codice, proprietario, scade_il)
  values (nuovo, auth.uid(), now() + interval '24 hours');

  return nuovo;
end $$;
revoke execute on function public.crea_invito() from public, anon;
grant execute on function public.crea_invito() to authenticated;

create or replace function public.entra_in_casa(codice text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invito casa_invito%rowtype;
begin
  if auth.uid() is null then
    raise exception 'non autenticato';
  end if;

  select * into invito
  from casa_invito
  where casa_invito.codice = upper(trim(entra_in_casa.codice))
    and scade_il > now();
  if not found then
    raise exception 'codice non valido o scaduto';
  end if;
  if invito.proprietario = auth.uid() then
    raise exception 'non puoi entrare nella tua stessa casa';
  end if;
  if exists (select 1 from casa_membro where proprietario = auth.uid()) then
    raise exception 'hai già una casa con altre persone: toglile prima di entrare altrove';
  end if;
  if exists (select 1 from casa_membro where membro = auth.uid()) then
    raise exception 'sei già in una casa: esci prima';
  end if;
  if exists (select 1 from casa_membro where membro = invito.proprietario) then
    raise exception 'questa casa non può ospitare: chi ti ha invitato è a sua volta in un''altra casa';
  end if;

  insert into casa_membro (membro, proprietario) values (auth.uid(), invito.proprietario);
  delete from casa_invito where casa_invito.codice = invito.codice;

  return invito.proprietario;
end $$;
revoke execute on function public.entra_in_casa(text) from public, anon;
grant execute on function public.entra_in_casa(text) to authenticated;

create or replace function public.esci_dalla_casa()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from casa_membro where membro = auth.uid();
end $$;
revoke execute on function public.esci_dalla_casa() from public, anon;
grant execute on function public.esci_dalla_casa() to authenticated;

create or replace function public.rimuovi_membro(p_membro uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from casa_membro where membro = p_membro and proprietario = auth.uid();
  if not found then
    raise exception 'nessun membro con questo id nella tua casa';
  end if;
end $$;
revoke execute on function public.rimuovi_membro(uuid) from public, anon;
grant execute on function public.rimuovi_membro(uuid) to authenticated;

-- Le email vengono da auth.users dentro security definer: è l'unico modo per
-- mostrarle, e restano dentro la casa (un membro vede il proprietario, un
-- proprietario i suoi membri, nessun altro).
create or replace function public.stato_casa()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  proprietario_di uuid;
  email_elenco jsonb;
  id_elenco jsonb;
begin
  if auth.uid() is null then
    raise exception 'non autenticato';
  end if;

  select proprietario into proprietario_di from casa_membro where membro = auth.uid();
  if found then
    select coalesce(jsonb_agg(coalesce(u.email, '')), '[]'::jsonb),
           coalesce(jsonb_agg(u.id), '[]'::jsonb)
      into email_elenco, id_elenco
    from auth.users u where u.id = proprietario_di;
    return jsonb_build_object('ruolo', 'membro', 'email', email_elenco, 'id', id_elenco);
  end if;

  -- email e id nello stesso ordine (entrato_il): la scheda CASA li accoppia per indice.
  select coalesce(jsonb_agg(coalesce(u.email, '') order by m.entrato_il), '[]'::jsonb),
         coalesce(jsonb_agg(m.membro order by m.entrato_il), '[]'::jsonb)
    into email_elenco, id_elenco
  from casa_membro m
  join auth.users u on u.id = m.membro
  where m.proprietario = auth.uid();
  if email_elenco <> '[]'::jsonb then
    return jsonb_build_object('ruolo', 'proprietario', 'email', email_elenco, 'id', id_elenco);
  end if;

  return jsonb_build_object('ruolo', 'solo', 'email', '[]'::jsonb, 'id', '[]'::jsonb);
end $$;
revoke execute on function public.stato_casa() from public, anon;
grant execute on function public.stato_casa() to authenticated;

comment on table casa_membro is
  'Chi agisce sui dati di chi: membro → proprietario. Una riga per membro; le policy di tutte le tabelle passano da casa_id().';
comment on table casa_invito is
  'Codice di sei caratteri, 24 ore, uno per proprietario. Solo le funzioni lo leggono.';
