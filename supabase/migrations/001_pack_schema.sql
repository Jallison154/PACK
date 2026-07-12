-- Pack cloud schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor or: supabase db push
-- Requires Supabase Auth (auth.users). All data is isolated per user via RLS.

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  shared_notes text,
  pets text,
  general_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1
);

create index if not exists idx_households_user on public.households (user_id);
alter table public.households enable row level security;
create policy "households_own" on public.households for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1,
  unique (user_id, name)
);

create index if not exists idx_companies_user on public.companies (user_id);
alter table public.companies enable row level security;
create policy "companies_own" on public.companies for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- places
-- ---------------------------------------------------------------------------
create table if not exists public.places (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  category text,
  notes text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1
);

create index if not exists idx_places_user on public.places (user_id);
alter table public.places enable row level security;
create policy "places_own" on public.places for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1,
  unique (user_id, name)
);

create index if not exists idx_tags_user on public.tags (user_id);
alter table public.tags enable row level security;
create policy "tags_own" on public.tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------
create table if not exists public.people (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  workspace text not null default 'work',
  phone text,
  email text,
  company text,
  company_id text,
  job_title text,
  where_met text,
  event text,
  city text,
  state text,
  location_id text,
  where_met_place_id text,
  last_seen_place_id text,
  date_met text,
  notes text,
  relationship_type text,
  household_id text,
  home_address text,
  work_location text,
  last_seen_at text,
  last_seen_date text,
  last_interaction_notes text,
  profile_color text default '#52525B',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1,
  deleted_at timestamptz
);

create index if not exists idx_people_user on public.people (user_id);
create index if not exists idx_people_user_name on public.people (user_id, name);
alter table public.people enable row level security;
create policy "people_own" on public.people for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- person_tags
-- ---------------------------------------------------------------------------
create table if not exists public.person_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id text not null,
  tag_id text not null,
  primary key (user_id, person_id, tag_id)
);

create index if not exists idx_person_tags_user on public.person_tags (user_id);
alter table public.person_tags enable row level security;
create policy "person_tags_own" on public.person_tags for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interactions
-- ---------------------------------------------------------------------------
create table if not exists public.interactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id text not null,
  date text not null,
  location text,
  place_id text,
  interaction_type text,
  notes text,
  next_follow_up text,
  event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sync_version integer not null default 1
);

create index if not exists idx_interactions_user on public.interactions (user_id);
create index if not exists idx_interactions_person on public.interactions (user_id, person_id);
alter table public.interactions enable row level security;
create policy "interactions_own" on public.interactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_settings (app preferences synced to cloud)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_settings enable row level security;
create policy "user_settings_own" on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- backups (metadata — export files stay client-side unless you add storage)
-- ---------------------------------------------------------------------------
create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exported_at timestamptz not null default now(),
  format text not null,
  byte_size bigint,
  label text
);

create index if not exists idx_backups_user on public.backups (user_id);
alter table public.backups enable row level security;
create policy "backups_own" on public.backups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists households_updated_at on public.households;
create trigger households_updated_at before update on public.households
  for each row execute procedure public.set_updated_at();

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at before update on public.companies
  for each row execute procedure public.set_updated_at();

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at before update on public.places
  for each row execute procedure public.set_updated_at();

drop trigger if exists tags_updated_at on public.tags;
create trigger tags_updated_at before update on public.tags
  for each row execute procedure public.set_updated_at();

drop trigger if exists people_updated_at on public.people;
create trigger people_updated_at before update on public.people
  for each row execute procedure public.set_updated_at();

drop trigger if exists interactions_updated_at on public.interactions;
create trigger interactions_updated_at before update on public.interactions
  for each row execute procedure public.set_updated_at();

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute procedure public.set_updated_at();
