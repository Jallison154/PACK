# Pack Admin Portal

Protected staff portal at `/admin` for support, admin, and owner roles.

## Architecture

- **Roles** stored in `public.user_roles` (`user` | `support` | `admin` | `owner`)
- **RLS helpers**: `current_user_role()`, `has_staff_access()`, `has_admin_access()`, `is_owner()`
- **Privacy-safe directory**: `admin_user_directory` view (counts + account metadata only)
- **Privileged Auth Admin ops**: Supabase Edge Function `admin-api` with **service role server-side only**
- **Frontend** never trusts a client-only role flag for authorization; gate + Edge Function + RLS

## Promote an owner

After applying migrations `009_admin_portal.sql` and `010_admin_portal_rls_fix.sql`, run:

- `011_admin_owner_bootstrap.sql` — promotes `jallison154@gmail.com` to `owner`

That account must already exist in Supabase Auth (sign up / sign in once first).

For a different user later:

```sql
insert into public.user_roles (user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('someone@example.com')
on conflict (user_id) do update
set role = 'owner', updated_at = now();
```

## Deploy Edge Function

```bash
supabase functions deploy admin-api
```

Ensure secrets exist on the function runtime (not in `VITE_*`):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Permissions

| Capability | user | support | admin | owner |
|---|---|---|---|---|
| Open `/admin` | no | yes | yes | yes |
| View users / diagnostics | | yes | yes | yes |
| Suspend / reactivate | | | yes | yes |
| Feature flags / health writes | | | yes | yes |
| Assign roles / delete users / settings | | | | yes |
| View private Pack Member content | never (V1) | never | never | never |

## Privacy

Admins see **counts and diagnostics**, not Pack Member names, notes, phones, contact emails, or private location history.

## Support contacts

- Email: `contact@okamidesigns.com`
- Ko-fi: https://ko-fi.com/okamidesigns

## Maintenance mode

Owner can set `normal` | `read-only` | `maintenance` via Admin Settings (Edge Function updates `admin_settings` + feature flags). Staff can still open `/admin` during maintenance.
