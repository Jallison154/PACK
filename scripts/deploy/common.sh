#!/usr/bin/env bash
# Shared helpers for Pack Linux deployment (install / update / uninstall).

REPO_URL="${PACK_REPO_URL:-https://github.com/Jallison154/PACK.git}"
APP_DIR="${PACK_APP_DIR:-/opt/pack}"
WEB_ROOT="${PACK_WEB_ROOT:-/var/www/pack}"
DATA_DIR="${PACK_DATA_DIR:-/opt/pack/data}"
BACKUPS_DIR="${PACK_BACKUPS_DIR:-/opt/pack/backups}"
UPLOADS_DIR="${PACK_UPLOADS_DIR:-/opt/pack/uploads}"
ENV_FILE="${PACK_ENV_FILE:-/opt/pack/.env}"
NGINX_SITE="${PACK_NGINX_SITE:-/etc/nginx/sites-available/pack}"
NGINX_ENABLED="${PACK_NGINX_ENABLED:-/etc/nginx/sites-enabled/pack}"
GIT_BRANCH="${PACK_GIT_BRANCH:-main}"

log() {
  printf '%s\n' "$*"
}

error() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    error "This script must be run as root. Try: sudo $0"
  fi
}

detect_os() {
  if [[ ! -f /etc/os-release ]]; then
    error "Cannot detect OS. Debian 12 or Ubuntu 22.04+ is required."
  fi

  # shellcheck source=/dev/null
  . /etc/os-release

  case "${ID:-}" in
    debian)
      if [[ "${VERSION_ID:-0}" != "12" && "${VERSION_ID:-0}" != "13" ]]; then
        log "Warning: Debian ${VERSION_ID:-unknown} is untested. Debian 12 is recommended."
      fi
      ;;
    ubuntu)
      if [[ "${VERSION_ID%%.*}" -lt 22 ]]; then
        error "Ubuntu ${VERSION_ID:-unknown} is not supported. Use Ubuntu 22.04 or newer."
      fi
      ;;
    *)
      error "Unsupported OS: ${PRETTY_NAME:-unknown}. Use Debian 12 or Ubuntu 22.04+."
      ;;
  esac

  log "Detected: ${PRETTY_NAME:-$ID}"
}

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
    set -a
    source "$ENV_FILE"
    set +a
  fi

  WEB_ROOT="${PACK_WEB_ROOT:-$WEB_ROOT}"
  DATA_DIR="${PACK_DATA_DIR:-$DATA_DIR}"
  BACKUPS_DIR="${PACK_BACKUPS_DIR:-$BACKUPS_DIR}"
  UPLOADS_DIR="${PACK_UPLOADS_DIR:-$UPLOADS_DIR}"
}

get_server_ip() {
  ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}' \
    || hostname -I 2>/dev/null | awk '{print $1}' \
    || echo "127.0.0.1"
}

install_apt_packages() {
  log "Updating package index..."
  apt-get update -qq

  local packages=(git curl ca-certificates gnupg nginx rsync)
  local missing=()

  for pkg in "${packages[@]}"; do
    if ! dpkg -s "$pkg" >/dev/null 2>&1; then
      missing+=("$pkg")
    fi
  done

  if ((${#missing[@]} > 0)); then
    log "Installing packages: ${missing[*]}..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}"
  else
    log "Required packages already installed."
  fi
}

install_nodejs() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "$major" -ge 20 ]]; then
      log "Node.js $(node -v) already installed."
      return 0
    fi
    log "Node.js $(node -v) is too old. Installing Node.js 20 LTS..."
  else
    log "Installing Node.js 20 LTS..."
  fi

  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs

  command -v node >/dev/null 2>&1 || error "Node.js installation failed."
  command -v npm >/dev/null 2>&1 || error "npm installation failed."

  log "Node.js $(node -v) and npm $(npm -v) ready."
}

ensure_app_directory() {
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Using existing application at $APP_DIR"
    return 0
  fi

  mkdir -p "$(dirname "$APP_DIR")"
  log "Cloning Pack repository..."
  git clone "$REPO_URL" "$APP_DIR"
  [[ -d "$APP_DIR/.git" ]] || error "Failed to clone repository to $APP_DIR"
}

ensure_persistent_directories() {
  log "Ensuring persistent directories..."
  mkdir -p "$DATA_DIR" "$BACKUPS_DIR" "$UPLOADS_DIR" "$WEB_ROOT"
  chmod 750 "$DATA_DIR" "$BACKUPS_DIR" "$UPLOADS_DIR"
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    log "Using existing configuration: $ENV_FILE"
    return 0
  fi

  log "Creating default configuration: $ENV_FILE"
  cat >"$ENV_FILE" <<'EOF'
# Pack deployment configuration
# This file is never overwritten by install or update scripts.

PACK_DOMAIN=pack.okamidesigns.com
PACK_WEB_ROOT=/var/www/pack
PACK_APP_DIR=/opt/pack
PACK_DATA_DIR=/opt/pack/data
PACK_UPLOADS_DIR=/opt/pack/uploads
PACK_BACKUPS_DIR=/opt/pack/backups
PACK_GIT_BRANCH=main
PACK_REPO_URL=https://github.com/Jallison154/PACK.git

NODE_ENV=production
EOF
  chmod 640 "$ENV_FILE"
}

install_npm_dependencies() {
  log "Installing npm dependencies..."
  cd "$APP_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
}

build_application() {
  log "Building Pack..."
  cd "$APP_DIR"
  export NODE_ENV=production
  npm run build
  [[ -d "$APP_DIR/dist" ]] || error "Build failed: dist/ directory was not created."
}

ensure_uploads_symlink() {
  local link_target="$WEB_ROOT/uploads"
  if [[ -L "$link_target" ]]; then
    return 0
  fi
  if [[ -e "$link_target" ]]; then
    log "Preserving existing uploads at $link_target"
    return 0
  fi
  ln -sfn "$UPLOADS_DIR" "$link_target"
}

preserve_server_data() {
  if [[ -f "$DATA_DIR/pack.db" ]]; then
    log "Preserving existing database at $DATA_DIR/pack.db"
  fi

  shopt -s nullglob
  local dbs=("$DATA_DIR"/*.db "$DATA_DIR"/*.sqlite "$DATA_DIR"/*.sqlite3)
  shopt -u nullglob
  for db in "${dbs[@]}"; do
    [[ -f "$db" ]] || continue
    [[ "$db" == "$DATA_DIR/pack.db" ]] && continue
    log "Preserving existing database at $db"
  done

  if [[ -d "$UPLOADS_DIR" ]] && [[ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]]; then
    log "Preserving existing uploads in $UPLOADS_DIR"
  fi

  if [[ -d "$BACKUPS_DIR" ]] && [[ -n "$(ls -A "$BACKUPS_DIR" 2>/dev/null)" ]]; then
    log "Preserving existing backups in $BACKUPS_DIR"
  fi
}

deploy_web_root() {
  log "Deploying..."
  preserve_server_data
  mkdir -p "$WEB_ROOT"

  rsync -a --delete \
    --exclude 'data/' \
    --exclude 'uploads/' \
    --exclude 'backups/' \
    "$APP_DIR/dist/" "$WEB_ROOT/"

  ensure_uploads_symlink
  chown -R www-data:www-data "$WEB_ROOT"
  log "Deployed to $WEB_ROOT"
}

write_nginx_config() {
  load_env
  local server_name="${PACK_DOMAIN:-_}"

  log "Configuring Nginx..."

  cat >"$NGINX_SITE" <<EOF
# Pack — managed by install.sh / update.sh
# Do not edit manually unless you know what you are doing.

map \$sent_http_content_type \$pack_cache_control {
    default                     "public, max-age=31536000, immutable";
    "text/html"                 "no-cache";
    "application/manifest+json" "no-cache";
}

server {
    listen 80;
    listen [::]:80;
    server_name ${server_name};

    root ${WEB_ROOT};
    index index.html;

    types {
        application/wasm wasm;
    }

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()" always;

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files \$uri =404;
    }

    location = /manifest.webmanifest {
        add_header Cache-Control "no-cache";
        try_files \$uri =404;
    }

    location /assets/ {
        add_header Cache-Control \$pack_cache_control;
        try_files \$uri =404;
    }

    location /uploads/ {
        alias ${UPLOADS_DIR}/;
        autoindex off;
        try_files \$uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files \$uri \$uri/ /index.html;
    }

    location ~ /\\. {
        deny all;
    }
}
EOF
}

enable_nginx_site() {
  write_nginx_config
  ln -sfn "$NGINX_SITE" "$NGINX_ENABLED"

  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t || error "Nginx configuration test failed."
}

reload_nginx() {
  log "Restarting Nginx..."
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl restart nginx
  systemctl is-active --quiet nginx || error "Nginx failed to start."
  log "Nginx is running."
}
