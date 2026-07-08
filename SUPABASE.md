# Pack Cloud Sync (Supabase)

Pack uses **Supabase** for accounts, authentication, and PostgreSQL storage. The web app remains a static SPA; Supabase is the backend.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Choose a region close to your users.
3. Save the database password.

## 2. Run the database migration

In **Supabase → SQL Editor**, paste and run:

```
supabase/migrations/001_pack_schema.sql
```

This creates all Pack tables with **Row Level Security (RLS)** so each user only sees their own data.

## 3. Configure authentication

In **Authentication → Providers → Email**:

- Enable Email provider
- Confirm email (recommended for production)
- Set **Site URL** to `https://pack.okamidesigns.com`
- Add **Redirect URLs**:
  - `https://pack.okamidesigns.com/settings/account`
  - `http://localhost:5173/settings/account` (development)

Passwords are handled by Supabase Auth (hashed, never stored in Pack).

## 4. Get API keys

**Project Settings → API**

| Key | Where to use |
|-----|----------------|
| Project URL | `VITE_SUPABASE_URL` |
| anon public | `VITE_SUPABASE_ANON_KEY` |
| service_role | **Server / Edge Functions only** — never in the client build |

## 5. Build Pack with cloud sync enabled

```bash
cp .env.example .env.local
# Edit VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_URL

npm install
npm run build
```

On the server, set env vars **before** `npm run build` (Vite bakes them into the bundle):

```bash
cd /opt/pack
export VITE_SUPABASE_URL=https://xxxx.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJ...
export VITE_APP_URL=https://pack.okamidesigns.com
npm run build
rsync -a --delete dist/ /var/www/pack/
```

Or create `/opt/pack/.env.local` before building (not committed to git).

## 6. HTTPS required

Cloud sync and secure auth require **HTTPS** in production.

## 7. Account deletion

Deleting an account in **Settings → Account** removes all Pack data from PostgreSQL for that user. The Supabase Auth user record may remain until removed via Supabase Admin or an Edge Function with the service role key.

## 8. Local-only mode

If `VITE_SUPABASE_*` is not set, Pack works exactly as before — local IndexedDB only, no login required.

## Security checklist

- [ ] RLS enabled on all tables (included in migration)
- [ ] HTTPS on production domain
- [ ] `service_role` key never in client bundle
- [ ] Email confirmation enabled (production)
- [ ] Supabase rate limiting / CAPTCHA if needed
