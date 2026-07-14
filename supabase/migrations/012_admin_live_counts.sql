-- Live Pack Member / Place counts for admin directory (metadata only).
-- user_pack_stats stayed at 0 unless refreshStats was called; staff RLS also
-- cannot count other users' people/places via the security_invoker view.

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
  -- Service role (Edge Function) or signed-in staff only
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
    coalesce(s.storage_bytes, 0)::bigint
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

revoke all on function public.get_admin_user_directory() from public;
grant execute on function public.get_admin_user_directory() to authenticated;
grant execute on function public.get_admin_user_directory() to service_role;

-- Keep cached stats in sync when staff/admins refresh (optional helper)
create or replace function public.refresh_all_user_pack_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if auth.role() <> 'service_role' and not public.has_admin_access() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for uid in select id from public.profiles loop
    perform public.refresh_user_pack_stats(uid);
  end loop;
end;
$$;

revoke all on function public.refresh_all_user_pack_stats() from public;
grant execute on function public.refresh_all_user_pack_stats() to authenticated;
grant execute on function public.refresh_all_user_pack_stats() to service_role;

-- Harden single-user refresh: service role or admin only
create or replace function public.refresh_user_pack_stats(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow SQL Editor / migrations (no JWT), service role, or admin.
  if auth.uid() is not null
     and auth.role() <> 'service_role'
     and not public.has_admin_access() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

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
grant execute on function public.refresh_user_pack_stats(uuid) to authenticated;
grant execute on function public.refresh_user_pack_stats(uuid) to service_role;
