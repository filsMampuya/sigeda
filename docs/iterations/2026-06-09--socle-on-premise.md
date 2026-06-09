# Iteration - Socle on-premise

Date : 2026-06-09
Branche : `migration-on-premise`

## Objectif

Preparer la migration progressive de SIGEDA vers une architecture on-premise souveraine, sans supprimer l'existant Firebase/Express. L'objectif de cette iteration etait de poser le socle cible : NestJS, PostgreSQL/Prisma, Keycloak, MinIO, OpenSearch, Docker Compose et documentation de migration.

## Ce qui a ete fait

- Creation de la branche `migration-on-premise`.
- Ajout du nouveau backend pilote `apps/api-nest`.
- Ajout du package `packages/database` avec Prisma, schema PostgreSQL, migration initiale et seed pilote.
- Ajout de l'infrastructure pilote dans `infra/docker` :
  - PostgreSQL;
  - MinIO;
  - Keycloak;
  - OpenSearch;
  - API NestJS;
  - Nginx.
- Ajout d'un realm Keycloak pilote `sigeda`.
- Ajout des modules NestJS de base :
  - auth;
  - users;
  - departments;
  - documents;
  - folders;
  - document-archives;
  - attachments;
  - audit;
  - search;
  - health.
- Ajout d'un guard Keycloak JWT et d'un guard RBAC.
- Ajout d'un interceptor d'audit HTTP.
- Ajout des endpoints REST pilotes sous `/api/v1`.
- Ajout des constantes/types on-premise dans `packages/shared`.
- Mise a jour de `apps/web/.env.example` pour exposer les variables on-premise et rendre Firebase optionnel pendant la transition.
- Ajout de helpers dans `apps/web/lib/env.ts` pour l'API on-premise et Keycloak.
- Ajout des documents :
  - `docs/migration/architecture-on-premise.md`;
  - `docs/migration/firebase-to-onpremise.md`;
  - `docs/migration/data-model-postgresql.md`;
  - `docs/migration/runbook-pilote.md`.
- Ajout des scripts racine :
  - `build:onprem`;
  - `db:migrate`;
  - `db:seed`;
  - `dev:onprem`.
- Ajout d'un guide de test pas a pas dans `docs/migration/test-pilote-pas-a-pas.md`.
- Ajout du frontend Next.js au Docker Compose pilote.
- Correction du Dockerfile NestJS pour embarquer les dependances workspace necessaires.
- Correction du Dockerfile Web et du `.dockerignore` pour reduire le contexte Docker.
- Correction du mot de passe OpenSearch pilote pour satisfaire la validation de robustesse.
- Correction de la migration Prisma initiale en UTF-8 sans BOM.
- Separation de l'issuer Keycloak public et de l'URL JWKS interne Docker.

## Verification

Commandes executees avec succes :

```powershell
npm.cmd run build --workspace @sigeda/shared
npm.cmd run build --workspace @sigeda/database
npm.cmd run build --workspace @sigeda/api-nest
npm.cmd run build --workspace @sigeda/api
npm.cmd run typecheck --workspace @sigeda/web
npm.cmd run build:onprem
npm.cmd run build --workspace @sigeda/web
```

Schema Prisma valide avec `DATABASE_URL` pilote :

```powershell
$env:DATABASE_URL='postgresql://sigeda:sigeda@localhost:5432/sigeda'
npx.cmd prisma validate --schema packages/database/prisma/schema.prisma
```

Non teste dans cette iteration :

- login Keycloak depuis le frontend;
- migration reelle des donnees Firestore;
- migration reelle des fichiers Firebase Storage/local vers MinIO;
- indexation OpenSearch effective.

Tests d'execution realises ensuite avec succes :

- `docker compose -f infra/docker/docker-compose.yml up -d --build`
- `npm.cmd run db:migrate`
- `npm.cmd run db:seed`
- API NestJS : `http://localhost:4100/api/v1/health`
- Nginx health : `http://localhost:8088/health`
- Frontend direct : `http://localhost:3000/login`
- Frontend via Nginx : `http://localhost:8088/login`
- MinIO console : `http://localhost:9001`
- OpenSearch : `http://localhost:9200`
- Token Keycloak obtenu pour `admin@sigeda.local`
- Endpoint protege `/api/v1/departments` appele avec token Keycloak et donnees PostgreSQL seed retournees.

## Etat actuel

Le socle on-premise est present et compilable. L'API NestJS est un backend pilote structure, mais pas encore une implementation complete de production. L'ancien backend Express/Firebase reste en place pour maintenir la compatibilite fonctionnelle pendant la migration.

Points sensibles :

- `apps/web/tsconfig.tsbuildinfo` a ete modifie par le typecheck; c'est un artefact genere.
- `npm install` signale des vulnerabilites transitoires dans les dependances.
- Keycloak est configure pour un pilote local; les mots de passe et clients devront etre durcis avant tout environnement sensible.
- MinIO et OpenSearch sont prepares, mais les services applicatifs d'upload, download, indexation et recherche complete restent a finaliser.
- L'API NestJS accepte temporairement l'audience `sigeda-web` pour les tests locaux. En production, prevoir un audience mapper Keycloak vers `sigeda-api`.

## Prochaines actions recommandees

- Demarrer `docker compose -f infra/docker/docker-compose.yml up` et valider les healthchecks.
- Executer `npm.cmd run db:migrate` puis `npm.cmd run db:seed` contre PostgreSQL pilote.
- Tester l'obtention d'un token Keycloak et l'appel de `/api/v1/health`, `/api/v1/departments`, `/api/v1/documents`.
- Implementer l'upload/download MinIO reel avec checksum et controle d'acces.
- Implementer l'indexation OpenSearch des documents.
- Adapter progressivement le frontend a Keycloak et a l'API `/api/v1`.
- Preparer une specification de migration Firestore vers PostgreSQL et fichiers vers MinIO avant toute migration de donnees reelles.
