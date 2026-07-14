-- Staff need metadata access to profiles for admin_user_directory (security_invoker).
-- Does NOT grant access to people/places/interactions private content.

create policy "profiles_select_staff"
  on public.profiles for select
  using (public.has_staff_access());

-- Authenticated users can read maintenance-related access settings (no secrets).
create policy "admin_settings_select_access_authenticated"
  on public.admin_settings for select
  using (
    auth.uid() is not null
    and key = 'access'
  );
