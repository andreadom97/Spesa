-- Sei aree fisse: vivono come costanti in src/domain/aree.ts, non come tabella.
-- Qui compaiono solo come vincolo di dominio.

create table meal_slot_def (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  posizione int not null,
  -- Sette booleani, indice 0 = lunedì. true = abitualmente fuori casa.
  assenze_abituali boolean[] not null default '{false,false,false,false,false,false,false}',
  created_at timestamptz not null default now(),
  constraint assenze_sette check (array_length(assenze_abituali, 1) = 7)
);
-- Il vincolo "da 3 a 5 pasti" è applicativo: in SQL richiederebbe un trigger
-- che conta le righe per utente, e il costo non vale la copertura.

create table ingredient (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  unita_base text not null check (unita_base in ('g', 'ml', 'pz')),
  area text not null check (area in
    ('ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati')),
  classe_residuo text not null check (classe_residuo in ('porzionabile', 'intero', 'stima')),
  deperibile boolean not null default false,
  formato_confezione numeric not null check (formato_confezione > 0),
  -- Previste per il futuro, mai popolate né lette in v1.
  kcal_100 numeric, prot_100 numeric, carb_100 numeric, gras_100 numeric,
  created_at timestamptz not null default now()
);

create table dish (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  slot_def_id uuid not null references meal_slot_def(id) on delete cascade,
  fonte text not null default 'proprio' check (fonte in ('nutrizionista', 'proprio')),
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

create table dish_ingredient (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete restrict,
  quantita numeric not null check (quantita > 0),
  unita text not null check (unita in ('g', 'kg', 'ml', 'l', 'pz')),
  unique (dish_id, ingredient_id)
);

create table week (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data_inizio date not null,
  stato text not null default 'bozza' check (stato in ('bozza', 'confermata', 'chiusa')),
  created_at timestamptz not null default now(),
  unique (user_id, data_inizio)
);

create table meal_slot (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references week(id) on delete cascade,
  data date not null,
  slot_def_id uuid not null references meal_slot_def(id) on delete cascade,
  stato text not null check (stato in ('casa', 'fuori', 'saltato')),
  dish_id uuid references dish(id) on delete set null,
  fonte_stato text not null default 'default'
    check (fonte_stato in ('default', 'calendario', 'checkin', 'correzione')),
  unique (week_id, data, slot_def_id)
);

create table shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references week(id) on delete cascade,
  tipo text not null check (tipo in ('base', 'topup')),
  creata_il timestamptz not null default now(),
  chiusa_il timestamptz,
  unique (week_id, tipo)
);

create table shopping_list_item (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shopping_list_id uuid not null references shopping_list(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete restrict,
  -- Congelati al momento della generazione: la lista non si ricalcola sotto i piedi
  -- di chi è in corsia.
  fabbisogno numeric not null,
  residuo numeric not null,
  confezioni int not null,
  quantita_totale numeric not null,
  unita text not null check (unita in ('g', 'ml', 'pz')),
  area text not null,
  spuntato boolean not null default false,
  spuntato_il timestamptz,
  origine text not null default 'piano' check (origine in ('piano', 'controllo', 'manuale')),
  unique (shopping_list_id, ingredient_id)
);

create table pantry_state (
  ingredient_id uuid primary key references ingredient(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  residuo numeric not null default 0 check (residuo >= 0),
  ultimo_acquisto date,
  giorni_stimati int not null default 90,
  ultimo_check date
);

-- Storico degli acquisti. La spec impone di registrarli fin dalla v1 perché la
-- Fase 4 possa imparare i ritmi; pantry_state.ultimo_acquisto tiene solo l'ultimo.
create table purchase (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  data date not null,
  confezioni int not null,
  quantita numeric not null,
  shopping_list_id uuid references shopping_list(id) on delete set null
);

create table settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  moltiplicatore_porzioni int not null default 1 check (moltiplicatore_porzioni between 1 and 6),
  ordine_aree text[] not null default
    '{ortofrutta,macelleria,latticini,cereali,dispensa,surgelati}',
  constraint ordine_sei check (array_length(ordine_aree, 1) = 6)
);

create index on dish (user_id, slot_def_id) where attivo;
create index on meal_slot (week_id, data);
create index on shopping_list_item (shopping_list_id);
create index on purchase (user_id, ingredient_id, data desc);
