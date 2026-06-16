# Architecture SIGEDA

Mise a jour : `2026-06-16`

Ce document resume l'architecture cible de la branche `annotation`.

## Vue d'ensemble

SIGEDA suit une architecture monorepo avec separation claire entre presentation web, API metier, schema de donnees et contrats partages.

## Couches applicatives

- `apps/web`
  Frontend Next.js App Router, composants institutionnels, pages metier, routes proxy serveur.
- `apps/api-nest`
  API metier cible sur NestJS.
- `packages/database`
  Schema Prisma, migrations PostgreSQL et seed.
- `packages/shared`
  Types, constantes et contrats partages.
- `apps/api`
  Backend legacy Express/Firebase conserve comme heritage de migration.

## Stack cible

- Frontend : Next.js, React, TypeScript, Tailwind CSS, ShadCN UI
- Backend : NestJS
- Base : PostgreSQL via Prisma
- Auth : Keycloak
- Stockage : MinIO
- Recherche : OpenSearch provisionne
- Reverse proxy : Nginx
- Orchestration locale : Docker Compose

## Principes de securite

- authentification centralisee par Keycloak ;
- controle d'acces applique cote backend ;
- perimetre de donnees derive du role et de la structure ;
- audit des actions sensibles ;
- acces securise aux fichiers par URL signees temporaires.

## Documentation detaillee

- [Documentation de comprehension](./comprehension/README.md)
- [Vue technique detaillee](./comprehension/vue-technique.md)
- [Doctrine annotation document](./doctrine-annotation-document.md)
