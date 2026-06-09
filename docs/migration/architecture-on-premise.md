# Architecture on-premise SIGEDA

## Objectif

SIGEDA doit pouvoir fonctionner dans l'infrastructure interne de la Banque Centrale, sans dependance de production a Firebase. La migration est progressive : l'API Express/Firebase reste disponible pendant que l'API NestJS/PostgreSQL couvre les modules un par un.

## Cible technique

- Frontend : Next.js, React, TypeScript, TailwindCSS, ShadCN UI.
- Backend cible : NestJS REST API dans `apps/api-nest`.
- Base de donnees : PostgreSQL via Prisma dans `packages/database`.
- Stockage documentaire : MinIO compatible S3.
- Authentification : Keycloak, avec integration AD/LDAP et MFA possible.
- Recherche : OpenSearch.
- Deploiement pilote : Docker Compose dans `infra/docker`.

## Coexistence temporaire

- `apps/api` reste l'API Express/Firebase existante.
- `apps/api-nest` devient la nouvelle API on-premise exposee sous `/api/v1`.
- `packages/shared` porte les constantes et types metier communs.
- Les nouvelles donnees pilote sont creees dans PostgreSQL par seed Prisma.

## Regles non negociables

- Les autorisations sont appliquees cote backend.
- Les mouvements documentaires `ENTREE` et `SORTIE` sont calcules, jamais saisis.
- La reference documentaire n'est pas unique globalement.
- L'unicite logique est `emitterDirectionId + year + referenceNumber`.
- Les classeurs sont annuels, rattaches a un bureau et representent une direction partenaire.
