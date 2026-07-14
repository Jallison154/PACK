-- Let each signed-in user report their own device DB size (matches Settings → Database size).
-- Admin storage_bytes should reflect that local SQLite size, not tiny cloud row estimates.

create or replace function public.report_my_pack_stats(
  p_storage_bytes bigint,
  p_pending_sync_count integer default null,
  p_last_sync_error text default null,
  p_sync_enabled boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.user_pack_stats (
    user_id,
    storage_bytes,
    pending_sync_count,
    last_sync_at,
    last_sync_error,
    sync_enabled,
    updated_at
  )
  values (
    uid,
    greatest(coalesce(p_storage_bytes, 0), 0),
    coalesce(p_pending_sync_count, 0),
    now(),
    p_last_sync_error,
    coalesce(p_sync_enabled, true),
    now()
  )
  on conflict (user_id) do update set
    storage_bytes = excluded.storage_bytes,
    pending_sync_count = coalesce(p_pending_sync_count, public.user_pack_stats.pending_sync_count),
    last_sync_at = excluded.last_sync_at,
    last_sync_error = excluded.last_sync_error,
    sync_enabled = excluded.sync_enabled,
    updated_at = now();
end;
$$;

revoke all on function public.report_my_pack_stats(bigint, integer, text, boolean) from public;
grant execute on function public.report_my_pack_stats(bigint, integer, text, boolean) to authenticated;

-- Cloud count refresh must not overwrite device-reported storage_bytes.
create or replace function public.refresh_user_pack_stats(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.role() <> 'service_role'
     and not public.has_admin_access() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.user_pack_stats (
    user_id,
    people_count,
    places_count,
    interactions_count,
    updated_at
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
    -- storage_bytes intentionally preserved (device DB size from report_my_pack_stats)
end;
$$;

-- Directory: use reported device storage; only fall back to cloud estimate when unset.
create or replace function public.get_admin_user_directory()
returns table (
  user_id uuid,
  email text,
  display_name text,
  first_name text,
  last_name text,
  role text,
  account_created_at timestamptz,
  profile_updated_at timestamptz,
  account_status text,
  people_count integer,
  places_count integer,
  interactions_count integer,
  pending_sync_count integer,
  last_sync_at timestamptz,
  last_sync_error text,
  sync_enabled boolean,
  storage_bytes bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and not public.has_staff_access() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.first_name,
    p.last_name,
    coalesce(r.role, 'user')::text,
    p.created_at,
    p.updated_at,
    coalesce(s.account_status, 'active')::text,
    coalesce(pc.cnt, 0)::integer,
    coalesce(plc.cnt, 0)::integer,
    coalesce(ic.cnt, 0)::integer,
    coalesce(s.pending_sync_count, 0)::integer,
    s.last_sync_at,
    s.last_sync_error,
    coalesce(s.sync_enabled, true),
    case
      when coalesce(s.storage_bytes, 0) > 0 then s.storage_bytes
      else coalesce(public.estimate_user_cloud_storage_bytes(p.id), 0)
    end
  from public.profiles p
  left join public.user_roles r on r.user_id = p.id
  left join public.user_pack_stats s on s.user_id = p.id
  left join (
    select pe.user_id, count(*)::integer as cnt
    from public.people pe
    where pe.deleted_at is null
    group by pe.user_id
  ) pc on pc.user_id = p.id
  left join (
    select pl.user_id, count(*)::integer as cnt
    from public.places pl
    where pl.deleted_at is null
    group by pl.user_id
  ) plc on plc.user_id = p.id
  left join (
    select i.user_id, count(*)::integer as cnt
    from public.interactions i
    group by i.user_id
  ) ic on ic.user_id = p.id
  order by p.created_at desc;
end;
$$;
