# TLS preproduction SIGEDA

Mise a jour : `2026-07-01`
Objectif : permettre une bascule propre de la preproduction SIGEDA de `HTTP` vers `HTTPS` sans remettre en cause la pile preproduction de base.

References :

- [docker-compose.preprod.yml](../infra/docker/docker-compose.preprod.yml)
- [docker-compose.preprod.tls.yml](../infra/docker/docker-compose.preprod.tls.yml)
- [preprod.conf](../infra/docker/nginx/preprod.conf)
- [preprod-tls.conf](../infra/docker/nginx/preprod-tls.conf)
- [README certificats](../infra/certs/README.md)

## 1. Principe

La pile preproduction de base reste compatible `HTTP`.

Le passage en `HTTPS` se fait en combinant :

- `SIGEDA_NGINX_CONFIG_FILE=preprod-tls.conf`
- un dossier de certificats monte via `SIGEDA_CERTS_DIR`
- l'override Compose [docker-compose.preprod.tls.yml](../infra/docker/docker-compose.preprod.tls.yml)

## 2. Certificats attendus

Le conteneur Nginx attend :

- `fullchain.pem`
- `privkey.pem`

dans le repertoire pointe par :

- `SIGEDA_CERTS_DIR`

Exemple :

```txt
/opt/sigeda/certs/fullchain.pem
/opt/sigeda/certs/privkey.pem
```

## 3. Variables a definir

Dans `infra/docker/.env.preprod` :

```bash
SIGEDA_NGINX_CONFIG_FILE=preprod-tls.conf
SIGEDA_NGINX_HTTPS_PORT=443
SIGEDA_CERTS_DIR=/opt/sigeda/certs
SIGEDA_PUBLIC_BASE_URL=https://sigeda-preprod.local
SIGEDA_KEYCLOAK_URL=https://sigeda-preprod.local/auth
SIGEDA_KEYCLOAK_ISSUER=https://sigeda-preprod.local/auth/realms/sigeda
SIGEDA_CORS_ORIGIN=https://sigeda-preprod.local
SIGEDA_GRAFANA_ROOT_URL=https://sigeda-preprod.local:3001
```

## 4. Lancement

Commande :

```bash
docker compose \
  --env-file infra/docker/.env.preprod \
  -f infra/docker/docker-compose.preprod.yml \
  -f infra/docker/docker-compose.preprod.tls.yml \
  up -d --build
```

## 5. Comportement attendu

- `http://sigeda-preprod.local` redirige vers `https://sigeda-preprod.local`
- `https://sigeda-preprod.local` sert l'application
- `https://sigeda-preprod.local/auth` sert Keycloak via reverse proxy
- `https://sigeda-preprod.local/api/v1/...` sert l'API

## 6. Verification

Depuis le serveur :

```bash
curl -Ik https://sigeda-preprod.local/
curl -Ik https://sigeda-preprod.local/health
curl -Ik https://sigeda-preprod.local/auth
```

## 7. Point d'attention

Si vous activez TLS, pensez a aligner :

- `SIGEDA_PUBLIC_BASE_URL`
- `SIGEDA_KEYCLOAK_URL`
- `SIGEDA_KEYCLOAK_ISSUER`
- `SIGEDA_CORS_ORIGIN`

Sinon, les flux d'authentification et de session peuvent devenir incoherents.
