#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/deploy/common.sh
source "$SCRIPT_DIR/scripts/deploy/common.sh"

main() {
  require_root
  detect_os
  install_apt_packages
  install_nodejs
  ensure_app_directory
  ensure_persistent_directories
  ensure_env_file
  load_env
  install_npm_dependencies
  build_application
  deploy_web_root
  enable_nginx_site
  reload_nginx

  local server_ip
  server_ip="$(get_server_ip)"

  log ""
  log "Pack installed successfully."
  log ""
  log "Next Steps:"
  log ""
  log "  - Configure DNS for ${PACK_DOMAIN:-pack.okamidesigns.com}"
  log "  - Configure Cloudflare Tunnel (optional)"
  log "  - Visit:"
  log "    http://${server_ip}"
  log ""
  log "Application: ${APP_DIR}"
  log "Web root:    ${WEB_ROOT}"
  log "Data:        ${DATA_DIR}"
  log "Backups:     ${BACKUPS_DIR}"
  log "Uploads:     ${UPLOADS_DIR}"
  log ""
  log "Done."
}

main "$@"
