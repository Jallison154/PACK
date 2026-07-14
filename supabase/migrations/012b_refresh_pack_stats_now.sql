-- Immediate fix: fill cached admin counts from live cloud tables.
-- Run in Supabase SQL Editor, then refresh /admin/users.
-- Your account already has 6 people / 4 places in cloud; stats cache was empty.

select public.refresh_user_pack_stats(id)
from public.profiles;

-- Verify:
select
  p.email,
  s.people_count,
  s.places_count,
  s.interactions_count
from public.profiles p
left join public.user_pack_stats s on s.user_id = p.id
where p.email = 'jallison154@gmail.com';
