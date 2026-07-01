#!/usr/bin/env bash
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"
ALLOW_HTTP="${ALLOW_HTTP:-true}"
ALLOW_HTTPS="${ALLOW_HTTPS:-false}"
ADMIN_CIDR="${ADMIN_CIDR:-}"

echo "[SIGEDA] Configuration UFW preproduction"
echo "[SIGEDA] SSH_PORT=${SSH_PORT} ALLOW_HTTP=${ALLOW_HTTP} ALLOW_HTTPS=${ALLOW_HTTPS} ADMIN_CIDR=${ADMIN_CIDR:-none}"

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

if [[ -n "${ADMIN_CIDR}" ]]; then
  ufw allow from "${ADMIN_CIDR}" to any port "${SSH_PORT}" proto tcp
else
  ufw allow "${SSH_PORT}/tcp"
fi

if [[ "${ALLOW_HTTP}" == "true" ]]; then
  ufw allow 80/tcp
fi

if [[ "${ALLOW_HTTPS}" == "true" ]]; then
  ufw allow 443/tcp
fi

ufw --force enable
ufw status verbose
