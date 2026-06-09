# Runbook pilote on-premise

## Prerequis

- Docker Desktop ou Docker Engine.
- Node.js 22.
- npm 10.

## Installation

```powershell
npm install
```

## Demarrage infrastructure

```powershell
docker compose -f infra/docker/docker-compose.yml up
```

Services exposes :

- API NestJS : `http://localhost:4100/api/v1/health`
- Nginx : `http://localhost:8088/health`
- Frontend Next.js : `http://localhost:3000`
- Frontend via Nginx : `http://localhost:8088`
- PostgreSQL : `localhost:5432`
- Keycloak : `http://localhost:8080`
- MinIO API : `http://localhost:9000`
- MinIO console : `http://localhost:9001`
- OpenSearch : `http://localhost:9200`

Mot de passe admin OpenSearch pilote :

```txt
CentralBankSearch_2026!Vault
```

## Base de donnees

```powershell
npm run prisma:migrate --workspace @sigeda/database
npm run prisma:seed --workspace @sigeda/database
```

## Build

```powershell
npm run build --workspace @sigeda/shared
npm run build --workspace @sigeda/database
npm run build --workspace @sigeda/api-nest
```

## Compte pilote Keycloak

- Email : `admin@sigeda.local`
- Mot de passe temporaire : `SigedaAdmin1!`

Changer ce mot de passe avant tout usage hors poste local.

Note pilote : l'API NestJS accepte temporairement l'audience Keycloak `sigeda-web`, car le client public pilote emet le token utilise pour les tests locaux. Dans Docker, l'issuer public reste `http://localhost:8080/realms/sigeda`, tandis que la recuperation JWKS utilise l'URL interne `http://keycloak:8080/realms/sigeda/protocol/openid-connect/certs`.
