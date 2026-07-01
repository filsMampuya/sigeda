#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

cd "${REPO_ROOT}"

echo "[SIGEDA] Arret de la pile preproduction..."
compose_cmd down
