# Identifiants de demonstration SIGEDA

Document mis a jour le 2026-06-10 pour la pile on-premise active.

## Comptes Keycloak utilisables

- Utilisateur applicatif principal
  - Email : `admin@sigeda.local`
  - Mot de passe temporaire : `SigedaAdmin1!`
  - Realm : `sigeda`
  - Client public : `sigeda-web`
- Compte Keycloak d'administration de la plateforme
  - URL : `http://localhost:8080`
  - Login : `admin`
  - Mot de passe : `admin`

## Profil PostgreSQL correspondant

- Email : `admin@sigeda.local`
- Role : `ADMIN`
- Matricule : `ADM-001`
- Direction : `Direction des Finances`
- Service : `Service Comptabilite`
- Bureau : `Bureau du Cadre`

## Comptes techniques utiles

- PostgreSQL
  - Hote : `localhost`
  - Port : `5432`
  - Base : `sigeda`
  - Utilisateur : `sigeda`
  - Mot de passe : `sigeda`
- pgAdmin
  - URL : `http://localhost:5050`
  - Email : `admin@sigeda.dev`
  - Mot de passe : `SigedaPgAdmin1!`
- MinIO console
  - URL : `http://localhost:9001`
  - Utilisateur : `sigeda`
  - Mot de passe : `sigeda-password`
- OpenSearch
  - URL : `http://localhost:9200`
  - Utilisateur : `admin`
  - Mot de passe : `CentralBankSearch_2026!Vault`

## Important

- L'ancien compte Firebase `agent.demo.20260606@sigeda.local / SigedaDemo@2026!` ne doit plus etre utilise pour la recette on-premise courante.
- Le point d'entree recommande pour les tests web est `http://localhost:8088`.
