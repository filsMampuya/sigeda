# Vue technique SIGEDA

Mise a jour : `2026-06-16`

## 1. Architecture technique cible

La branche `annotation` a pour reference l'architecture on-premise suivante :

- Frontend : Next.js, React, TypeScript, Tailwind CSS, ShadCN UI
- Backend : NestJS
- ORM : Prisma
- Base de donnees : PostgreSQL
- Authentification : Keycloak
- Stockage documentaire : MinIO
- Recherche : OpenSearch provisionne
- Reverse proxy : Nginx
- Orchestration locale : Docker Compose

## 2. Architecture applicative simplifiee

```txt
Utilisateur
  ->
Nginx
  ->
Next.js (apps/web)
  ->
NestJS API (apps/api-nest)
      -> PostgreSQL
      -> MinIO
      -> Keycloak
      -> OpenSearch (socle provisionne)
```

## 3. Monorepo

### Applications

- `apps/web`
  Frontend institutionnel Next.js App Router.
- `apps/api-nest`
  API metier principale sur la branche `annotation`.
- `apps/api`
  Legacy Express/Firebase encore present dans le depot pour l'historique de migration.

### Packages

- `packages/shared`
  Types, constantes et contrats partages.
- `packages/database`
  Schema Prisma, migrations, seed et build du modele PostgreSQL.

## 4. Modules backend principaux

- `auth`
- `users`
- `departments`
- `documents`
- `document-archives`
- `folders`
- `attachments`
- `search`
- `dashboard`
- `audit`
- `physical-archives`

## 5. Modules frontend principaux

- `documents`
- `archives-documentaires`
- `classeurs-annuels`
- `directions`
- `services`
- `bureaux`
- `admin`
- `audit`
- `dashboard`

## 6. Flux techniques principaux

### Authentification

```txt
Navigateur
  -> route Next.js de login
  -> redirection Keycloak
  -> callback OAuth/OpenID Connect
  -> cookie de session web
  -> appels API internes Next.js
  -> NestJS avec bearer token
```

### Creation d'un document

```txt
Frontend Next.js
  -> POST proxy web
  -> API NestJS /documents
  -> PostgreSQL
  -> MinIO pour les fichiers
  -> Audit log
```

### Consultation d'un document

```txt
Frontend
  -> GET document detail
  -> API NestJS
  -> PostgreSQL
  -> liens securises MinIO si piece jointe
```

### Annotation

```txt
Frontend
  -> POST /documents/:id/annotations
API NestJS
  -> verifie le scope utilisateur
  -> televerse eventuellement le fichier dans MinIO
  -> cree document_annotation
  -> ecrit l'audit
```

### Classement

```txt
Frontend
  -> action "Classer"
API NestJS
  -> calcule bureau et classeur
  -> cree document_archive
  -> journalise l'action
```

## 7. Modele relationnel simplifie

```txt
departments
  1 -> n users
  1 -> n department children
  1 -> n documents as emitter
  1 -> n document_recipients
  1 -> n folders

documents
  1 -> n document_recipients
  1 -> n document_signers
  1 -> n attachments
  1 -> n document_versions
  1 -> n document_annotations
  1 -> n document_transmissions
  1 -> n document_archives

folders
  1 -> n document_archives
```

## 8. Choix techniques structurants

- `Department` unifie direction, service et bureau pour reduire la duplication du modele.
- Prisma centralise le schema et les migrations PostgreSQL.
- MinIO remplace Firebase Storage pour les pieces jointes et les fichiers annotes.
- Keycloak remplace Firebase Auth pour soutenir une architecture souveraine et integrable a l'environnement interne.
- Le frontend passe par des routes serveur/proxy pour mieux maitriser la session et les appels proteges.
- Les tableaux et composants sont concus pour un usage metier intensif plutot que marketing.

## 9. Securite

- authentification centralisee par Keycloak ;
- verifications RBAC cote backend ;
- perimetre de donnees calcule avec direction/service/bureau ;
- audit des actions sensibles ;
- acces securise aux fichiers via URL signees temporaires ;
- confidentialite documentaire geree au niveau metier.

## 10. Limites techniques actuelles

- l'ancien backend `apps/api` reste dans le monorepo comme heritage de migration ;
- OpenSearch est provisionne mais pas encore industrialise comme moteur principal de recherche ;
- certains documents historiques du depot parlent encore de Firestore/Firebase et doivent etre lus comme contexte de migration, pas comme etat cible.
