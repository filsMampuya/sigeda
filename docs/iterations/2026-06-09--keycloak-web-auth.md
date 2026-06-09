# Iteration - Auth Keycloak Web

## Objectif

Remplacer l'authentification Firebase cote frontend par un flux de redirection Keycloak, tout en gardant l'ancien backend Express/Firebase isole comme legacy temporaire.

## Travail realise

- Ajout des routes Next.js `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout` et `/api/auth/token`.
- Stockage du token Keycloak dans un cookie HTTP-only `sigeda_session`.
- Remplacement du formulaire de connexion par une redirection Keycloak.
- Remplacement de la deconnexion Firebase par une deconnexion Keycloak.
- Remplacement des appels client `getIdToken()` Firebase par la lecture du token Keycloak via `/api/auth/token`.
- Suppression du client Firebase web inutilise.
- Ajout des variables Keycloak serveur dans Docker pour permettre l'echange `code -> token` depuis le conteneur Next.js.
- Ajout d'un smoke test `npm.cmd run test:onprem` pour valider Keycloak, API NestJS et PostgreSQL.
- Ajout du guide de recette `docs/migration/qa-scenarios-keycloak-onpremise.md`.

## Etat

- Keycloak est l'authentification cible pour `apps/web` et `apps/api-nest`.
- PostgreSQL reste la base cible du backend NestJS.
- Firebase Authentication n'est plus utilise par le chemin web on-premise.
- `apps/api` reste present uniquement pour transition legacy.

## Prochaines etapes

- Migrer progressivement les pages web restantes vers les endpoints `/api/v1`.
- Brancher l'utilisateur courant web sur `/api/v1/users` avec mapping Keycloak.
- Ajouter des tests RBAC par profil metier.
