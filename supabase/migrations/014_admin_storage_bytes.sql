-- Populate admin storage_bytes from approximate cloud row sizes.
-- This is cloud Postgres payload size (not the user's local SQLite file).

create or replace function public.estimate_user_cloud_storage_bytes(target_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(pg_column_size(pe))::bigint
      from public.people pe
      where pe.user_id = target_user and pe.deleted_at is null
    ), 0)
    + coalesce((
      select sum(pg_column_size(pl))::bigint
      from public.places pl
      where pl.user_id = target_user and pl.deleted_at is null
    ), 0)
    + coalesce((
      select sum(pg_column_size(i))::bigint
      from public.interactions i
      where i.user_id = target_user
    ), 0);
$$;

revoke all on function public.estimate_user_cloud_storage_bytes(uuid) from public;
grant execute on function public.estimate_user_cloud_storage_bytes(uuid) to authenticated;
grant execute on function public.estimate_user_cloud_storage_bytes(uuid) to service_role;

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
    storage_bytes,
    updated_at
  )
  values (
    target_user,
    (select count(*) from public.people where user_id = target_user and deleted_at is null),
    (select count(*) from public.places where user_id = target_user and deleted_at is null),
    (select count(*) from public.interactions where user_id = target_user),
    public.estimate_user_cloud_storage_bytes(target_user),
    now()
  )
  on conflict (user_id) do update set
    people_count = excluded.people_count,
    places_count = excluded.places_count,
    interactions_count = excluded.interactions_count,
    storage_bytes = excluded.storage_bytes,
    updated_at = now();
end;
$$;

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
    coalesce(
      nullif(s.storage_bytes, 0),
      public.estimate_user_cloud_storage_bytes(p.id),
      0
    )::bigint
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

-- Backfill storage for existing users
do $$
declare
  uid uuid;
begin
  for uid in select id from public.profiles loop
    perform public.refresh_user_pack_stats(uid);
  end loop;
end $$;
