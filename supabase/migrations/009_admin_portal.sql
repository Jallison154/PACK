-- Pack Admin Portal schema (009)
-- Roles, audit, support notes, error logs, health checks, feature flags, settings.
-- Privileged Auth Admin ops still require Edge Function + service role (never in browser).

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'support', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_user_roles_role on public.user_roles (role);

alter table public.user_roles enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'user'
  );
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create or replace function public.has_staff_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('support', 'admin', 'owner');
$$;

create or replace function public.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'owner');
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner';
$$;

revoke all on function public.has_staff_access() from public;
revoke all on function public.has_admin_access() from public;
revoke all on function public.is_owner() from public;
grant execute on function public.has_staff_access() to authenticated;
grant execute on function public.has_admin_access() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- Users can read their own role; staff can read all roles.
create policy "user_roles_select_own_or_staff"
  on public.user_roles for select
  using (auth.uid() = user_id or public.has_staff_access());

-- Role writes only via security-definer RPCs / Edge Functions (service role).
-- No direct insert/update/delete policies for authenticated clients.

create or replace function public.ensure_default_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_role on auth.users;
create trigger on_auth_user_role
  after insert on auth.users
  for each row execute procedure public.ensure_default_user_role();

-- Backfill existing users as 'user'
insert into public.user_roles (user_id, role)
select id, 'user' from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Privacy-safe pack stats (counts only — never private content)
-- ---------------------------------------------------------------------------
create table if not exists public.user_pack_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  people_count integer not null default 0,
  places_count integer not null default 0,
  interactions_count integer not null default 0,
  pending_sync_count integer not null default 0,
  last_sync_at timestamptz,
  last_sync_error text,
  sync_enabled boolean not null default true,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  storage_bytes bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_pack_stats enable row level security;

create policy "user_pack_stats_select_own_or_staff"
  on public.user_pack_stats for select
  using (auth.uid() = user_id or public.has_staff_access());

create or replace function public.refresh_user_pack_stats(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_pack_stats (
    user_id, people_count, places_count, interactions_count, updated_at
  )
  values (
    target_user,
    (select count(*) from public.people where user_id = target_user and deleted_at is null),
    (select count(*) from public.places where user_id = target_user and deleted_at is null),
    (select count(*) from public.interactions where user_id = target_user),
    now()
  )
  on conflict (user_id) do update set
    people_count = excluded.people_count,
    places_count = excluded.places_count,
    interactions_count = excluded.interactions_count,
    updated_at = now();
end;
$$;

revoke all on function public.refresh_user_pack_stats(uuid) from public;
grant execute on function public.refresh_user_pack_stats(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Admin audit log (immutable from client)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete set null,
  admin_role text not null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  reason text,
  before_status jsonb,
  after_status jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_target on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_select_staff"
  on public.admin_audit_log for select
  using (public.has_staff_access());

-- No insert/update/delete for authenticated — service role / edge only.

-- ---------------------------------------------------------------------------
-- Support notes (internal only)
-- ---------------------------------------------------------------------------
create table if not exists public.support_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete set null,
  author_role text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_notes_target on public.support_notes (target_user_id, created_at desc);

alter table public.support_notes enable row level security;

create policy "support_notes_select_staff"
  on public.support_notes for select
  using (public.has_staff_access());

create policy "support_notes_insert_staff"
  on public.support_notes for insert
  with check (
    public.has_staff_access()
    and author_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- App error logs (sanitized)
-- ---------------------------------------------------------------------------
create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  user_id uuid references auth.users (id) on delete set null,
  app_version text,
  device_browser text,
  route text,
  service text,
  operation text,
  error_code text,
  error_message text not null,
  sanitized_details jsonb,
  resolved boolean not null default false,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_error_logs_created on public.app_error_logs (created_at desc);
create index if not exists idx_app_error_logs_severity on public.app_error_logs (severity, resolved);

alter table public.app_error_logs enable row level security;

create policy "app_error_logs_select_staff"
  on public.app_error_logs for select
  using (public.has_staff_access());

create policy "app_error_logs_insert_authenticated"
  on public.app_error_logs for insert
  with check (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
  );

create policy "app_error_logs_update_admin"
  on public.app_error_logs for update
  using (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Service health checks
-- ---------------------------------------------------------------------------
create table if not exists public.service_health_checks (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  status text not null check (status in ('healthy', 'warning', 'degraded', 'offline')),
  latency_ms integer,
  message text,
  details jsonb,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_service_health_checked on public.service_health_checks (service, checked_at desc);

alter table public.service_health_checks enable row level security;

create policy "service_health_select_staff"
  on public.service_health_checks for select
  using (public.has_staff_access());

create policy "service_health_insert_admin"
  on public.service_health_checks for insert
  with check (public.has_admin_access());

-- Dedicated diagnostics write table for admin DB write tests
create table if not exists public.admin_diagnostics_ping (
  id uuid primary key default gen_random_uuid(),
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_diagnostics_ping enable row level security;

create policy "admin_diagnostics_ping_admin"
  on public.admin_diagnostics_ping for all
  using (public.has_admin_access())
  with check (public.has_admin_access());

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.feature_flags enable row level security;

create policy "feature_flags_select_authenticated"
  on public.feature_flags for select
  using (auth.uid() is not null);

create policy "feature_flags_write_admin"
  on public.feature_flags for all
  using (public.has_admin_access())
  with check (public.has_admin_access());

insert into public.feature_flags (key, enabled, description) values
  ('pack_sync', true, 'Pack Sync enabled globally'),
  ('realtime', true, 'Realtime sync enabled'),
  ('mapbox', true, 'Mapbox maps and search'),
  ('nearby_pois', true, 'Nearby POI suggestions'),
  ('account_creation', true, 'New account signup allowed'),
  ('email_verification_required', true, 'Require email verification'),
  ('new_user_onboarding', true, 'Show onboarding for new users'),
  ('maintenance_mode', false, 'Full maintenance mode'),
  ('read_only_mode', false, 'Read-only mode for users'),
  ('pwa_update_banner', true, 'Show PWA update banner')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Admin settings (singleton-style key/value)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.admin_settings enable row level security;

create policy "admin_settings_select_staff"
  on public.admin_settings for select
  using (public.has_staff_access());

create policy "admin_settings_write_owner"
  on public.admin_settings for all
  using (public.is_owner())
  with check (public.is_owner());

insert into public.admin_settings (key, value) values
  ('site', '{"site_name":"Pack","support_email":"contact@okamidesigns.com","public_site_url":"https://pack.okamidesigns.com","support_link":"https://ko-fi.com/okamidesigns"}'::jsonb),
  ('access', '{"maintenance_mode":"normal","account_creation":true,"email_verification_required":true}'::jsonb),
  ('retention', '{"log_days":90,"backup_days":30}'::jsonb),
  ('support_policy', '{"private_data_access":"disabled","require_consent":true}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Sync diagnostics aggregates (privacy-safe)
-- ---------------------------------------------------------------------------
create table if not exists public.sync_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  category text not null,
  error_code text,
  message text,
  device_browser text,
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_diagnostics_created on public.sync_diagnostics (created_at desc);
create index if not exists idx_sync_diagnostics_user on public.sync_diagnostics (user_id);

alter table public.sync_diagnostics enable row level security;

create policy "sync_diagnostics_select_staff"
  on public.sync_diagnostics for select
  using (public.has_staff_access());

create policy "sync_diagnostics_insert_own"
  on public.sync_diagnostics for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Staff directory view (privacy-safe user list)
-- ---------------------------------------------------------------------------
create or replace view public.admin_user_directory
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.display_name,
  p.first_name,
  p.last_name,
  coalesce(r.role, 'user') as role,
  p.created_at as account_created_at,
  p.updated_at as profile_updated_at,
  coalesce(s.account_status, 'active') as account_status,
  coalesce(s.people_count, 0) as people_count,
  coalesce(s.places_count, 0) as places_count,
  coalesce(s.interactions_count, 0) as interactions_count,
  coalesce(s.pending_sync_count, 0) as pending_sync_count,
  s.last_sync_at,
  s.last_sync_error,
  coalesce(s.sync_enabled, true) as sync_enabled,
  coalesce(s.storage_bytes, 0) as storage_bytes
from public.profiles p
left join public.user_roles r on r.user_id = p.id
left join public.user_pack_stats s on s.user_id = p.id;

grant select on public.admin_user_directory to authenticated;

comment on view public.admin_user_directory is
  'Privacy-safe staff directory. Counts and account metadata only — no Pack Member content.';

-- ---------------------------------------------------------------------------
-- Bootstrap: promote first owner manually after migration:
--   insert into public.user_roles (user_id, role)
--   values ('YOUR-USER-UUID', 'owner')
--   on conflict (user_id) do update set role = 'owner', updated_at = now();
-- ---------------------------------------------------------------------------
