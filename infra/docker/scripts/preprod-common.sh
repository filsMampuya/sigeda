#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${INFRA_DIR}/../.." && pwd)"
ENV_FILE="${SIGEDA_PREPROD_ENV_FILE:-${INFRA_DIR}/.env.preprod}"
COMPOSE_FILE="${SIGEDA_PREPROD_COMPOSE_FILE:-${INFRA_DIR}/docker-compose.preprod.yml}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Fichier d'environnement introuvable : ${ENV_FILE}" >&2
  echo "Copiez infra/docker/.env.preprod.example vers infra/docker/.env.preprod puis adaptez les valeurs." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Fichier compose introuvable : ${COMPOSE_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Variable obligatoire manquante : ${name}" >&2
    exit 1
  fi
}

compose_cmd() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

timestamp_now() {
  date +"%Y%m%d-%H%M%S"
}

backup_root() {
  require_var "SIGEDA_DATA_ROOT"
  printf "%s/backups" "${SIGEDA_DATA_ROOT}"
}
