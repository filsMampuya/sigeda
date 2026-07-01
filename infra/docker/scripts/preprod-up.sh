#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

cd "${REPO_ROOT}"

echo "[SIGEDA] Verification du fichier compose..."
compose_cmd config >/dev/null

echo "[SIGEDA] Build et lancement de la pile preproduction..."
compose_cmd up -d --build

if [[ "${1:-}" == "--with-pgadmin" ]]; then
  echo "[SIGEDA] Activation du profil admin pour pgAdmin..."
  compose_cmd --profile admin up -d pgadmin
fi

echo "[SIGEDA] Etat des services..."
compose_cmd ps
