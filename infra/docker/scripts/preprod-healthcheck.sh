#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

require_var "SIGEDA_PUBLIC_BASE_URL"

echo "[SIGEDA] Validation compose..."
compose_cmd config >/dev/null

echo "[SIGEDA] Etat des conteneurs..."
compose_cmd ps

echo "[SIGEDA] Test health backend via Nginx..."
curl --fail --silent --show-error "${SIGEDA_PUBLIC_BASE_URL}/health" >/dev/null

echo "[SIGEDA] Test health API..."
curl --fail --silent --show-error "${SIGEDA_PUBLIC_BASE_URL}/api/v1/health" >/dev/null

echo "[SIGEDA] Test page login..."
curl --fail --silent --show-error --location "${SIGEDA_PUBLIC_BASE_URL}/login" >/dev/null

echo "[SIGEDA] Healthcheck preproduction OK."
