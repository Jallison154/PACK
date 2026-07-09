-- Extend profiles for personal display names and future avatars

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text;

-- Backfill first/last from existing display_name when possible
update public.profiles
set
  first_name = split_part(display_name, ' ', 1),
  last_name = nullif(trim(substring(display_name from position(' ' in display_name))), '')
where display_name is not null
  and position(' ' in display_name) > 0
  and first_name is null;

update public.profiles
set first_name = display_name
where display_name is not null
  and position(' ' in display_name) = 0
  and first_name is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_name text := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, email, display_name, first_name, last_name)
  values (
    new.id,
    new.email,
    meta_name,
    split_part(meta_name, ' ', 1),
    nullif(trim(substring(meta_name from position(' ' in meta_name))), '')
  );
  return new;
end;
$$;
