# Test pas a pas du pilote on-premise SIGEDA

Ce guide sert a verifier le socle on-premise cree sur la branche `migration-on-premise`.

## 1. Verifier la branche

```powershell
git branch --show-current
```

La branche attendue est :

```txt
migration-on-premise
```

## 2. Installer les dependances

```powershell
npm.cmd install
```

## 3. Builder le socle on-premise

```powershell
npm.cmd run build:onprem
```

## 4. Demarrer l'infrastructure pilote

```powershell
npm.cmd run dev:onprem
```

Equivalent direct :

```powershell
docker compose -f infra/docker/docker-compose.yml up
```

## 5. Initialiser PostgreSQL

Dans un deuxieme terminal :

```powershell
$env:DATABASE_URL="postgresql://sigeda:sigeda@localhost:5432/sigeda"
npm.cmd run db:migrate
npm.cmd run db:seed
```

## 6. Verifier les services

API NestJS :

```txt
http://localhost:4100/api/v1/health
```

Nginx :

```txt
http://localhost:8088/health
```

Frontend Next.js :

```txt
http://localhost:3000
```

Frontend via Nginx :

```txt
http://localhost:8088
```

Keycloak :

```txt
http://localhost:8080
```

MinIO :

```txt
http://localhost:9001
```

OpenSearch :

```txt
http://localhost:9200
```

Mot de passe admin OpenSearch pilote :

```txt
CentralBankSearch_2026!Vault
```

## 7. Identifiants pilote

Keycloak admin local :

```txt
admin / admin
```

Utilisateur pilote du realm SIGEDA :

```txt
admin@sigeda.local / SigedaAdmin1!
```

MinIO :

```txt
sigeda / sigeda-password
```

## 8. Arret

```powershell
docker compose -f infra/docker/docker-compose.yml down
```
