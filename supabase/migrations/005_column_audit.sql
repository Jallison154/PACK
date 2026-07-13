-- Pack column audit (005) — ensures all client-synced columns exist.
-- Run after 001–004 in Supabase SQL Editor.

-- places.soft delete (also in 003; idempotent)
alter table public.places
  add column if not exists deleted_at timestamptz;

-- people.soft delete (in 001; idempotent)
alter table public.people
  add column if not exists deleted_at timestamptz;

-- person_tags sync metadata (also in 004; idempotent)
alter table public.person_tags
  add column if not exists id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.person_tags
set id = person_id || ':' || tag_id
where id is null;

-- profiles name columns (also in 002; idempotent)
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text;
