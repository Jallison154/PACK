-- Add soft-delete support for places (matches local SQLite schema v7)
alter table public.places
  add column if not exists deleted_at timestamptz;
