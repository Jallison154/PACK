-- Production may be missing deleted_at on people/places (older schema).
-- Add the columns, then fix admin count functions and refresh stats.

alter table public.people
  add column if not exists deleted_at timestamptz;

alter table public.places
  add column if not exists deleted_at timestamptz;

create or replace function public.refresh_user_pack_stats(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow SQL Editor / migrations (no JWT), service role, or admin.
  -- Block normal signed-in non-admins.
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

-- Refresh all profiles now that columns exist
do $$
declare
  uid uuid;
begin
  for uid in select id from public.profiles loop
    perform public.refresh_user_pack_stats(uid);
  end loop;
end $$;
