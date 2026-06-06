# Architecture SIGEDA

## Vue d'ensemble

SIGEDA suit une architecture monorepo avec separation claire entre presentation web, API metier et contrats partages.

## Couches

- `apps/web` : interface Next.js App Router, composants institutionnels, pages metier
- `apps/api` : API Express, middlewares d'authentification, services et repositories Firestore
- `packages/shared` : enums, types et schemas Zod communs

## Principes de securite

- authentification Firebase Auth
- controle d'acces centralise cote API
- compatibilite avec une logique RBAC et confidentialite documentaire
- audit trail extensible pour toutes les actions sensibles
