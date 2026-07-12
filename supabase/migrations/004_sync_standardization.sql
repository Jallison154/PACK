-- Pack sync standardization (004)
-- Run after 001, 002, and 003 in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- person_tags sync metadata
-- ---------------------------------------------------------------------------
alter table public.person_tags
  add column if not exists id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.person_tags
set id = person_id || ':' || tag_id
where id is null;

create index if not exists idx_person_tags_person on public.person_tags (user_id, person_id);

-- ---------------------------------------------------------------------------
-- user_settings sync metadata (optional id for diagnostics)
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.user_settings
set id = user_id::text || ':' || key
where id is null;

-- ---------------------------------------------------------------------------
-- Explicit RLS policies (SELECT / INSERT / UPDATE / DELETE)
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'households', 'companies', 'places', 'tags', 'people',
    'interactions', 'person_tags', 'user_settings', 'backups'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', tbl || '_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);

    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      tbl || '_select_own', tbl
    );
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      tbl || '_insert_own', tbl
    );
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      tbl || '_update_own', tbl
    );
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      tbl || '_delete_own', tbl
    );
  end loop;
end $$;

-- profiles: match by id, not user_id
drop policy if exists profiles_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Realtime publication (required for postgres_changes subscriptions)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.people;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.places;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.companies;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.interactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tags;
exception when duplicate_object then null;
end $$;
