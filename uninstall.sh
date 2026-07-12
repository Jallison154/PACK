#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy/common.sh
source "$SCRIPT_DIR/scripts/deploy/common.sh"

remove_nginx_site() {
  log "Removing Nginx configuration..."
  rm -f "$NGINX_ENABLED" "$NGINX_SITE"
  if systemctl is-active --quiet nginx 2>/dev/null; then
    nginx -t 2>/dev/null && systemctl reload nginx || systemctl restart nginx
  fi
}

remove_web_root() {
  log "Removing web files from $WEB_ROOT..."
  rm -rf "$WEB_ROOT"
}

remove_application_files() {
  log "Removing application files from $APP_DIR..."

  if [[ ! -d "$APP_DIR" ]]; then
    log "Application directory not found — nothing to remove."
    return 0
  fi

  find "$APP_DIR" -mindepth 1 -maxdepth 1 \
    ! -name data \
    ! -name backups \
    ! -name uploads \
    ! -name .env \
    -exec rm -rf {} +
}

remove_all_pack_data() {
  log "Removing all Pack data..."
  rm -rf "$APP_DIR" "$WEB_ROOT"
}

prompt_remove_data() {
  local answer
  printf '\nDo you also want to remove Pack data? [y/N] ' >&2
  read -r answer
  case "${answer,,}" in
    y|yes) return 0 ;;
    *) return 1 ;;
  esac
}

main() {
  require_root
  load_env

  log "Uninstalling Pack..."
  log ""

  remove_nginx_site
  remove_web_root

  if prompt_remove_data; then
    remove_all_pack_data
    log ""
    log "Pack has been completely removed, including all data."
  else
    remove_application_files
    log ""
    log "Pack application removed."
    log "Preserved:"
    log "  - ${DATA_DIR}"
    log "  - ${BACKUPS_DIR}"
    log "  - ${UPLOADS_DIR}"
    log "  - ${ENV_FILE}"
  fi

  log ""
  log "Done."
}

main "$@"
