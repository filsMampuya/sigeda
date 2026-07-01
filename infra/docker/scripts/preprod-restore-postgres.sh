#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-sql-path>" >&2
  exit 1
fi

SQL_PATH="$1"

if [[ ! -f "${SQL_PATH}" ]]; then
  echo "Dump SQL introuvable : ${SQL_PATH}" >&2
  exit 1
fi

echo "[SIGEDA] Restauration PostgreSQL SIGEDA depuis ${SQL_PATH}"
echo "[SIGEDA] Cette operation ecrase la base cible. Lancez-la uniquement sur environnement maitrise."

compose_cmd exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"'
compose_cmd exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\";"'
compose_cmd exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${SQL_PATH}"

echo "[SIGEDA] Restauration PostgreSQL terminee."
