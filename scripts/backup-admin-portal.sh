#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_DIR="${ROOT_DIR}/backups/admin-portal-${STAMP}"

mkdir -p "${BACKUP_DIR}"

backup_path() {
  local rel_path="$1"
  local src="${ROOT_DIR}/${rel_path}"
  local dest="${BACKUP_DIR}/${rel_path}"
  if [ -e "${src}" ]; then
    mkdir -p "$(dirname "${dest}")"
    cp -a "${src}" "${dest}"
  fi
}

backup_path "apps/solaire-facile/src/admin"
backup_path "apps/solaire-facile/src/routes.tsx"
backup_path "apps/solaire-facile/src/index.css"
backup_path "apps/solaire-facile/vite.config.ts"

echo "Backup created at ${BACKUP_DIR}"
