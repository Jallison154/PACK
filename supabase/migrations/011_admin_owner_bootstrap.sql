-- Bootstrap Pack Admin Portal owner for the site owner account.
-- Safe to re-run: upserts role only when the auth user exists.

insert into public.user_roles (user_id, role, updated_at)
select id, 'owner', now()
from auth.users
where lower(email) = lower('jallison154@gmail.com')
on conflict (user_id) do update
set role = 'owner',
    updated_at = now();
