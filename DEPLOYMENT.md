# Pack — Self-Hosted Deployment

Deploy Pack as a **static production web app** on Ubuntu/Debian (Proxmox LXC). No Docker required.

**Production URL (example):** `https://pack.okamidesigns.com`

Pack is a client-side PWA. Nginx serves the built files only. **Pack Member data in the browser stays on each user's device** (IndexedDB). Server-side paths under `/opt/pack/data`, `/opt/pack/backups`, and `/opt/pack/uploads` are reserved for future use and are never overwritten by updates.

---

## One-command install

On a fresh Debian 12 or Ubuntu 22.04+ LXC:

```bash
git clone https://github.com/Jallison154/PACK.git
cd PACK
chmod +x install.sh update.sh uninstall.sh
./install.sh
```

If you are **not** root, use `sudo ./install.sh` instead. Minimal LXC images often have no `sudo` package when you are already logged in as `root`.

### Private GitHub repository?

GitHub **does not accept your account password** for `git clone`. If clone fails with *Password authentication is not supported*:

**Easiest (recommended for self-hosting):** make the repository **public**  
GitHub → **PACK** → Settings → Danger zone → Change visibility → Public

**Or use a Personal Access Token:**

1. GitHub → Settings → Developer settings → Personal access tokens → **classic**
2. Generate token with **repo** scope
3. Clone again:

```bash
git clone https://github.com/Jallison154/PACK.git
# Username: Jallison154
# Password: paste the token (not your GitHub password)
```

**Or use SSH:**

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
# Add the key at GitHub → Settings → SSH and GPG keys

git clone git@github.com:Jallison154/PACK.git
cd PACK
chmod +x install.sh update.sh uninstall.sh
./install.sh
```

**Or pass a token to the installer:**

```bash
PACK_GITHUB_TOKEN=ghp_your_token_here ./install.sh
```

Updates:

```bash
/opt/pack/update.sh
```

Uninstall:

```bash
sudo /opt/pack/uninstall.sh
```

| Script | Purpose |
|--------|---------|
| `install.sh` | Install dependencies, clone to `/opt/pack`, build, deploy to `/var/www/pack`, configure Nginx |
| `update.sh` | `git pull`, rebuild, redeploy (preserves data/uploads/databases) |
| `uninstall.sh` | Remove Nginx site and app; optionally remove all data |

Persistent paths (created on install, never deleted by `update.sh`):

| Path | Purpose |
|------|---------|
| `/opt/pack` | Git repository and build tree |
| `/opt/pack/data` | Future server-side SQLite / data |
| `/opt/pack/backups` | Server-side backup storage |
| `/opt/pack/uploads` | Future file uploads (symlinked at `/var/www/pack/uploads`) |
| `/opt/pack/.env` | Deployment config (never overwritten) |

---

## Requirements

| Item | Recommendation |
|------|----------------|
| **OS** | Ubuntu 22.04/24.04 or Debian 12 LXC |
| **Node.js** | **22.x LTS** (minimum **20.19+** for Vite 8) |
| **npm** | 10+ (bundled with Node 22) |
| **Nginx** | 1.18+ |
| **RAM (build)** | 1 GB minimum, 2 GB comfortable |
| **Disk** | ~500 MB for repo + `node_modules`; ~5–15 MB for `dist/` |

### Install Node.js 22 (NodeSource)

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg nginx git rsync

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # v22.x.x
npm -v
```

---

## Environment variables

Pack works without cloud sync (local-only mode). To enable **Pack Sync** with Supabase and **Mapbox maps**, set Vite variables in `/opt/pack/.env.local` **before** building:

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_APP_URL` | For sync | Public app URL (auth redirects), e.g. `https://pack.okamidesigns.com` |
| `VITE_SUPABASE_URL` | For sync | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For sync | Supabase anon/public key — never use service role in the client |
| `VITE_MAPBOX_ACCESS_TOKEN` | For maps | Public Mapbox token (`pk.*`) — required by `install.sh` / `update.sh` |

`install.sh` and `update.sh` load `.env.local` if present and **never overwrite** it. Server deploy paths live in `/opt/pack/.env` (also preserved).

**Vite embeds `VITE_*` variables at build time.** After changing `.env.local`, rebuild and redeploy:

```bash
/opt/pack/update.sh
```

`update.sh` refuses to build if `VITE_MAPBOX_ACCESS_TOKEN` is missing or not a public `pk.*` token. Do not put the Mapbox token only in `/opt/pack/.env` — it must be in `.env.local`.

Do not put `NODE_ENV` in `/opt/pack/.env` — Vite warns and ignores it. `npm run build` already produces a production bundle.

If you ever serve Pack from a subpath (e.g. `/pack/`), you would need to set Vite `base` in `vite.config.ts` and rebuild — the default expects the site root `/`.

---

## Build

### 1. Clone the repository

```bash
sudo mkdir -p /opt/pack
sudo chown "$USER:$USER" /opt/pack
git clone https://github.com/YOUR_ORG/pack.git /opt/pack
cd /opt/pack
```

### 2. Install dependencies and build

```bash
npm install
npm run build
```

### 3. Build output folder

```
/opt/pack/dist/
```

Typical contents:

```
dist/
  index.html
  assets/          # hashed JS, CSS, WASM, images
  sw.js            # service worker (PWA)
  workbox-*.js
  manifest.webmanifest
  registerSW.js
  favicon.png
  ...
```

### 4. Publish to the web root

```bash
sudo mkdir -p /var/www/pack
sudo rsync -a --delete dist/ /var/www/pack/
sudo chown -R www-data:www-data /var/www/pack
```

Verify locally:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
# open http://127.0.0.1:4173
```

---

## Nginx configuration

Create `/etc/nginx/sites-available/pack`:

```nginx
# Pack — static SPA (pack.okamidesigns.com)

map $sent_http_content_type $pack_cache_control {
    default                    "public, max-age=31536000, immutable";
    "text/html"                "no-cache";
    "application/manifest+json" "no-cache";
}

server {
    listen 80;
    listen [::]:80;
    server_name pack.okamidesigns.com;

    root /var/www/pack;
    index index.html;

    # Required for sql.js (SQLite in the browser)
    types {
        application/wasm wasm;
    }

  # Security headers (static app; data is client-side)
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()" always;

    # Service worker + manifest should not be cached aggressively
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    # Hashed build assets
    location /assets/ {
        add_header Cache-Control $pack_cache_control;
        try_files $uri =404;
    }

    # SPA fallback — React Router client routes
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }

    # Do not expose VCS or source if the repo lives on the same host
    location ~ /\. {
        deny all;
    }
}
```

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/pack /etc/nginx/sites-enabled/pack
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

### HTTPS on the origin (optional)

If Cloudflare terminates TLS in front of the tunnel, HTTP on port 80 inside the LXC is fine. For local HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pack.okamidesigns.com
```

---

## Cloudflare Tunnel notes

A common Proxmox setup: **Cloudflare Tunnel** → Nginx on the LXC → static `dist/`.

### 1. DNS

In Cloudflare for `okamidesigns.com`:

- Add a **CNAME**: `pack` → `<tunnel-id>.cfargotunnel.com` (created when you configure the tunnel), **Proxied** (orange cloud).

### 2. Install `cloudflared` on the LXC

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### 3. Authenticate and create a tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create pack
```

Note the tunnel UUID. Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: pack.okamidesigns.com
    service: http://127.0.0.1:80
  - service: http_status:404
```

### 4. Route DNS and run as a service

```bash
cloudflared tunnel route dns pack pack.okamidesigns.com
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

### Cloudflare recommendations

| Setting | Recommendation |
|---------|----------------|
| **SSL/TLS mode** | Full (strict) if origin has a valid cert; **Full** if origin is HTTP only |
| **Always Use HTTPS** | On |
| **Cloudflare Access** | Strongly recommended — email OTP or IdP in front of personal contact data |
| **Bot Fight Mode** | Optional |
| **Caching** | Default is fine; HTML/SW should bypass cache (Nginx headers above help) |

Pack uses **geolocation** for nearby places; browsers require a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) (`https://`).

---

## Updating from GitHub

```bash
cd /opt/pack

# See current version
git rev-parse --short HEAD

git fetch origin
git checkout main          # or a release tag: git checkout v1.0.0
git pull --ff-only origin main

npm install
npm run build

sudo rsync -a --delete dist/ /var/www/pack/
sudo chown -R www-data:www-data /var/www/pack

# Reload only if you changed Nginx config
sudo nginx -t && sudo systemctl reload nginx
```

The PWA is configured with `registerType: 'autoUpdate'`. Users receive the new service worker on their next visit (may require a refresh).

### Optional: tagged releases

```bash
git fetch --tags
git checkout v1.2.0
npm install && npm run build
sudo rsync -a --delete dist/ /var/www/pack/
```

---

## Backing up Pack data

**Important:** Self-hosting Pack does **not** store contacts on the server. Backups are **per browser / per device**.

### In-app backup (recommended)

In **Settings → Data**:

| Export | Use |
|--------|-----|
| **Export JSON** | Full backup (people, places, interactions, tags) |
| **Export SQLite** | Raw database file |
| **Export CSV** | Spreadsheet-friendly people export |
| **Backup Now** | Saves JSON to browser `localStorage` (last 7 daily keys) |

Store exports in encrypted cloud storage or an offline vault. Schedule a recurring reminder to export.

### Where data lives in the browser

| Storage | Key / name | Contents |
|---------|------------|----------|
| **IndexedDB** | DB `pack_storage`, store `database`, key `sqlite` | Main SQLite database |
| **localStorage** | `pack_passcode` | Optional 4-digit passcode (plain text) |
| **localStorage** | `pack_backup_YYYY-MM-DD` | Automatic JSON backups |
| **localStorage** | `pack_workspace`, `pack_last_workspace` | UI preferences |
| **localStorage** | `pack_*` settings keys | Toggles and preferences |
| **localStorage** | `pack_recent_searches` | Recent search terms |
| **sessionStorage** | `pack_unlocked` | Passcode session flag |

### Browser DevTools export (advanced)

1. Open DevTools → **Application** → **IndexedDB** → `pack_storage`.
2. Or use in-app **Export JSON** / **Export SQLite** (preferred).

### Server-side backup scope

Back up on the LXC:

```bash
sudo tar -czf pack-webroot-$(date +%F).tar.gz /var/www/pack
sudo tar -czf pack-nginx-$(date +%F).tar.gz /etc/nginx/sites-available/pack /etc/cloudflared/
```

That preserves the **app files**, not user contact databases.

---

## Security notes (personal contact data)

Pack is designed **offline-first**: names, phones, emails, and notes stay on the device unless the user exports them.

### Hosting

1. **Use HTTPS** — required for PWA install, service workers, and geolocation.
2. **Restrict who can reach the URL** — Cloudflare Access, VPN, or IP allowlist. The app has no multi-user server auth; anyone with the URL can use their own empty local database.
3. **Do not commit secrets** — no API keys are needed for static hosting.
4. **Keep the host patched** — `apt upgrade`, Node only needed at build time.
5. **Do not serve `.git` or `/opt/pack/src`** from Nginx — only `/var/www/pack` (`dist/`).
6. **Separate build tree from web root** — build in `/opt/pack`, publish `dist/` to `/var/www/pack`.

### Application-level

1. **Passcode lock** is client-side `localStorage` — deterrence only, not encryption. Do not treat it as vault-grade security.
2. **No server-side encryption** — sensitive data is in the user's browser profile. Protect the device and browser profile.
3. **Exports are plaintext** — JSON/CSV/SQLite exports contain full contact data; encrypt at rest.
4. **Shared computers** — use a private browser profile or avoid saving a passcode on shared machines.
5. **Location permission** — optional; only used for nearby place suggestions when granted.

### Nginx / network

- Deny dotfiles (see config above).
- Consider rate limiting if the origin is exposed directly (less critical behind Cloudflare Tunnel).
- Review Cloudflare WAF / Access policies for a personal CRM.

---

## Quick reference

```bash
# Build
cd /opt/pack && npm install && npm run build

# Publish
sudo rsync -a --delete dist/ /var/www/pack/

# Logs
sudo journalctl -u nginx -f
sudo journalctl -u cloudflared -f
```

| Item | Value |
|------|-------|
| **Node.js** | 22.x LTS (≥ 20.19) |
| **Build command** | `npm run build` |
| **Output directory** | `dist/` |
| **Web root** | `/var/www/pack` |
| **Env vars** | None required |
| **Docker** | Not required |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank page after deploy | Check `try_files` SPA fallback; ensure `index.html` exists in web root |
| “Failed to load Pack” / DB error | Confirm `.wasm` is served (`application/wasm`); check browser console |
| Old UI after deploy | Hard refresh; clear site data; verify `sw.js` is not cached by an upstream CDN |
| Maps not loading | Ensure HTTPS; check browser blocked mixed content |
| `npm run build` OOM | Add swap or build with `NODE_OPTIONS=--max-old-space-size=2048` |

---

Okami Designs — Pack deployment guide
