#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy/common.sh
source "$SCRIPT_DIR/scripts/deploy/common.sh"

main() {
  require_root

  [[ -d "$APP_DIR" ]] || error "Pack is not installed at $APP_DIR. Run install.sh first."

  load_env
  local branch="${PACK_GIT_BRANCH:-$GIT_BRANCH}"

  log "Updating Pack..."
  log ""

  log "Step 1/6: Entering application directory..."
  cd "$APP_DIR"

  log "Step 2/6: Pulling latest changes from origin/${branch}..."
  git fetch origin
  git pull --ff-only origin "$branch"

  log "Step 3/6: Installing npm dependencies..."
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  log "Step 4/6: Building Pack..."
  export NODE_ENV=production
  npm run build

  log "Step 5/6: Deploying web files (preserving data, uploads, and databases)..."
  deploy_web_root

  log "Step 6/6: Reloading Nginx..."
  if [[ -f "$NGINX_SITE" ]]; then
    nginx -t
    systemctl reload nginx
    log "Nginx reloaded."
  else
    log "Warning: Nginx site config not found at $NGINX_SITE — skipping reload."
  fi

  log ""
  log "Pack updated successfully."
  log "User data and databases in ${DATA_DIR} were not modified."
  log ""
  log "Done."
}

main "$@"
