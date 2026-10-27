-- Océades Studio — schéma PostgreSQL (Supabase) pour la version multi-utilisateur.
-- Miroir du schéma SQLite local (src/lib/server/db.ts), enrichi des notions d'organisation et d'auteur.

create extension if not exists "pgcrypto";

create type activity as enum ('fitness', 'musculation', 'aquatique', 'institut', 'global');
create type platform as enum ('instagram', 'facebook', 'tiktok', 'linkedin');
create type post_format as enum ('reel', 'story', 'carrousel', 'photo', 'video', 'publicite');
create type objective as enum ('notoriete', 'engagement', 'trafic', 'conversion', 'fidelisation');
create type post_status as enum ('idee', 'a_produire', 'en_production', 'a_valider', 'programme', 'publie');
create type media_category as enum ('photo', 'video', 'miniature', 'publicite', 'logo', 'document');
create type member_role as enum ('lecteur', 'redacteur', 'validateur', 'admin');

create table members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role member_role not null default 'redacteur',
  created_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'campagne' check (kind in ('campagne', 'evenement')),
  objective text not null default '',
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  activities activity[] not null default '{}',
  target_audience text not null default '',
  key_messages text not null default '',
  color text not null default '#203849',
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  -- Heure locale « murale » des clubs (Europe/Paris), sans fuseau, comme en local.
  scheduled_at timestamp without time zone,
  platform platform not null,
  activity activity not null,
  format post_format not null,
  objective objective not null,
  status post_status not null default 'idee',
  description text not null default '',
  hook text not null default '',
  cta text not null default '',
  notes text not null default '',
  campaign_id uuid references campaigns(id) on delete set null,
  checklist jsonb not null default '{"visualReady":false,"textValidated":false,"rightsChecked":false}',
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_scheduled_at_idx on posts (scheduled_at);
create index posts_campaign_idx on posts (campaign_id);

-- Les fichiers vivent dans Supabase Storage (bucket privé « media ») ; seule la clé est stockée ici.
create table media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  original_name text not null,
  mime_type text not null,
  size bigint not null,
  category media_category not null,
  tags text[] not null default '{}',
  storage_key text not null unique,
  rights_checked boolean not null default false,
  notes text not null default '',
  is_demo boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index media_tags_idx on media using gin (tags);

create table post_media (
  post_id uuid not null references posts(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  position int not null default 0,
  primary key (post_id, media_id)
);

-- Sécurité au niveau des lignes : tout membre lit ; rédacteurs+ écrivent ; seuls validateurs/admins programment ou publient.
alter table members enable row level security;
alter table campaigns enable row level security;
alter table posts enable row level security;
alter table media enable row level security;
alter table post_media enable row level security;

create function current_role_level() returns int language sql stable as $$
  select case role when 'lecteur' then 0 when 'redacteur' then 1 when 'validateur' then 2 when 'admin' then 3 end
  from members where user_id = auth.uid()
$$;

create policy "membres : lecture" on members for select using (current_role_level() is not null);
create policy "lecture équipe" on campaigns for select using (current_role_level() >= 0);
create policy "lecture équipe" on posts for select using (current_role_level() >= 0);
create policy "lecture équipe" on media for select using (current_role_level() >= 0);
create policy "lecture équipe" on post_media for select using (current_role_level() >= 0);

create policy "écriture rédacteurs" on campaigns for all using (current_role_level() >= 1) with check (current_role_level() >= 1);
create policy "écriture rédacteurs" on media for all using (current_role_level() >= 1) with check (current_role_level() >= 1);
create policy "écriture rédacteurs" on post_media for all using (current_role_level() >= 1) with check (current_role_level() >= 1);
create policy "écriture publications" on posts for all
  using (current_role_level() >= 1)
  with check (current_role_level() >= 2 or status not in ('programme', 'publie'));
