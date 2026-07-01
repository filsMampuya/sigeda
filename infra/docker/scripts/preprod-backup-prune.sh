#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

RETENTION_DAYS="${1:-7}"
BACKUP_DIR="$(backup_root)"

mkdir -p "${BACKUP_DIR}"

echo "[SIGEDA] Purge des sauvegardes de plus de ${RETENTION_DAYS} jours dans ${BACKUP_DIR}"
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -print -exec rm -rf {} +

echo "[SIGEDA] Purge terminee."
