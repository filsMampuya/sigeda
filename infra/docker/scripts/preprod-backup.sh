#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/preprod-common.sh"

require_var "SIGEDA_POSTGRES_DB"
require_var "SIGEDA_DATA_ROOT"

BACKUP_DIR="$(backup_root)"
STAMP="$(timestamp_now)"
TARGET_DIR="${BACKUP_DIR}/${STAMP}"

mkdir -p "${TARGET_DIR}"

echo "[SIGEDA] Sauvegarde PostgreSQL..."
compose_cmd exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "${TARGET_DIR}/sigeda-postgres.sql"

echo "[SIGEDA] Sauvegarde PostgreSQL Keycloak..."
compose_cmd exec -T postgres-keycloak sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "${TARGET_DIR}/keycloak-postgres.sql"

echo "[SIGEDA] Archivage MinIO..."
tar -czf "${TARGET_DIR}/minio-data.tar.gz" -C "${SIGEDA_DATA_ROOT}" minio

echo "[SIGEDA] Archivage configuration preproduction..."
tar -czf "${TARGET_DIR}/preprod-config.tar.gz" \
  -C "${REPO_ROOT}" \
  infra/docker/docker-compose.preprod.yml \
  infra/docker/nginx/preprod.conf \
  infra/docker/keycloak/sigeda-realm.json \
  docs/plan-deploiement-preproduction-sigeda.md \
  docs/checklist-deploiement-preproduction-sigeda.md

cp "${ENV_FILE}" "${TARGET_DIR}/.env.preprod.snapshot"

cat > "${TARGET_DIR}/manifest.txt" <<EOF
timestamp=${STAMP}
compose_file=${COMPOSE_FILE}
env_file=${ENV_FILE}
postgres_dump=sigeda-postgres.sql
keycloak_dump=keycloak-postgres.sql
minio_archive=minio-data.tar.gz
config_archive=preprod-config.tar.gz
EOF

echo "[SIGEDA] Sauvegarde terminee : ${TARGET_DIR}"
