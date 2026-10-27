-- Océades Studio — schéma PostgreSQL (Supabase) pour la version multi-utilisateur.
-- Miroir du schéma SQLite local (src/lib/server/db.ts, migrations v1 à v3), enrichi des comptes et des rôles.

create extension if not exists "pgcrypto";

create type member_role as enum ('lecteur', 'redacteur', 'validateur', 'admin');
create type list_kind as enum ('normal', 'ideas', 'week', 'done');
create type label_family as enum ('activite', 'plateforme', 'format', 'production', 'autre');
create type card_status as enum ('idee', 'a_rediger', 'a_tourner', 'a_monter', 'a_designer', 'a_valider', 'programme', 'publie');

-- Membres de l'équipe (liés aux comptes Supabase Auth).
create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  color text not null default '#2c5a7a',
  role member_role not null default 'redacteur',
  created_at timestamptz not null default now()
);

create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  background text not null default '#203849',
  position double precision not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  color text,
  kind list_kind not null default 'normal',
  week_start date,
  position double precision not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_board_idx on lists (board_id, position);

create table labels (
  id uuid primary key default gen_random_uuid(),
  family label_family not null,
  key text,
  name text not null,
  color text not null,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'campagne' check (kind in ('campagne', 'evenement')),
  objective text not null default '',
  brief text not null default '',
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  activities text[] not null default '{}',
  target_audience text not null default '',
  key_messages text not null default '',
  color text not null default '#2c5a7a',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fichiers dans Supabase Storage (bucket privé « media ») ; seule la clé est stockée ici.
create table media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_name text not null,
  mime_type text not null,
  size bigint not null,
  category text not null,
  activity text,
  tags text[] not null default '{}',
  storage_key text not null unique,
  rights_checked boolean not null default false,
  notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  list_id uuid not null references lists(id) on delete cascade,
  position double precision not null,
  title text not null check (char_length(title) between 1 and 300),
  description text not null default '',
  -- Heure locale « murale » des clubs (Europe/Paris), sans fuseau.
  scheduled_at timestamp without time zone,
  production_date date,
  validation_date date,
  status card_status not null default 'idee',
  objective text,
  target text not null default '',
  campaign_id uuid references campaigns(id) on delete set null,
  assignee_id uuid references members(id) on delete set null,
  hook text not null default '',
  caption text not null default '',
  script text not null default '',
  brief text not null default '',
  cta text not null default '',
  cover_media_id uuid references media(id) on delete set null,
  parent_card_id uuid references cards(id) on delete set null,
  links jsonb not null default '[]',
  archived_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_list_idx on cards (list_id, position);
create index cards_scheduled_idx on cards (scheduled_at);

create table card_labels (card_id uuid references cards(id) on delete cascade, label_id uuid references labels(id) on delete cascade, primary key (card_id, label_id));
create table card_attachments (card_id uuid references cards(id) on delete cascade, media_id uuid references media(id) on delete cascade, position int not null default 0, primary key (card_id, media_id));
create table checklist_items (id uuid primary key default gen_random_uuid(), card_id uuid not null references cards(id) on delete cascade, text text not null, done boolean not null default false, position double precision not null);
create table comments (id uuid primary key default gen_random_uuid(), card_id uuid not null references cards(id) on delete cascade, author_id uuid references members(id), author text not null, body text not null, created_at timestamptz not null default now());
create table card_events (id uuid primary key default gen_random_uuid(), card_id uuid not null references cards(id) on delete cascade, author text not null, type text not null, detail text not null default '', created_at timestamptz not null default now());
create table settings (key text primary key, value jsonb not null);

-- Sécurité au niveau des lignes : tout membre lit ; rédacteurs et plus écrivent ;
-- seuls les validateurs et administrateurs peuvent passer une carte en « Programmé » ou « Publié ».
create function current_role_level() returns int language sql stable as $$
  select case role when 'lecteur' then 0 when 'redacteur' then 1 when 'validateur' then 2 when 'admin' then 3 end
  from members where user_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['members','boards','lists','labels','campaigns','media','cards','card_labels','card_attachments','checklist_items','comments','card_events','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lecture équipe" on %I for select using (current_role_level() >= 0)', t);
    if t <> 'cards' then
      execute format('create policy "écriture rédacteurs" on %I for all using (current_role_level() >= 1) with check (current_role_level() >= 1)', t);
    end if;
  end loop;
end $$;

create policy "écriture cartes" on cards for all
  using (current_role_level() >= 1)
  with check (current_role_level() >= 2 or status not in ('programme', 'publie'));
