# Identifiants de demonstration SIGEDA

Document mis a jour le `2026-06-16` pour la pile on-premise active.

## Point d'entree web

- Application web : `http://localhost:8088`
- Keycloak : `http://localhost:8080`
- Realm : `sigeda`
- Client public : `sigeda-web`

## Comptes de recette par profil

| Profil | Email | Mot de passe | Perimetre attendu |
| --- | --- | --- | --- |
| `ADMIN` | `admin@sigeda.local` | `SigedaAdmin1!` | Vision globale |
| `DIRECTEUR_GENERAL` | `dg.demo@sigeda.local` | `SigedaDg1!` | Vision globale |
| `DIRECTEUR` | `directeur.finance@sigeda.local` | `SigedaDir1!` | Toute la `Direction des Finances` |
| `MANAGER` | `manager.compta@sigeda.local` | `SigedaMng1!` | Tous les bureaux du `Service Comptabilite` |
| `AGENT` | `agent.cadre@sigeda.local` | `SigedaAgt1!` | Uniquement `Bureau du Cadre` |
| `AUDITEUR` | `auditeur.demo@sigeda.local` | `SigedaAud1!` | Vision globale en lecture |

## Comptes complementaires utiles pour verifier le perimetre

| Usage | Email | Mot de passe | Rattachement |
| --- | --- | --- | --- |
| Agent meme service, autre bureau | `agent.annexe@sigeda.local` | `SigedaAgt2!` | `Direction des Finances` > `Service Comptabilite` > `Bureau Comptable Annexe` |
| Agent meme direction, autre service | `agent.treso@sigeda.local` | `SigedaAgt3!` | `Direction des Finances` > `Service Tresorerie Demo` > `Bureau Tresorerie Demo` |

## Rattachement organisationnel des profils principaux

| Email | Role | Direction | Service | Bureau |
| --- | --- | --- | --- | --- |
| `admin@sigeda.local` | `ADMIN` | `Direction des Finances` | `Service Comptabilite` | `Bureau du Cadre` |
| `dg.demo@sigeda.local` | `DIRECTEUR_GENERAL` | `Direction Generale` | `Direction Generale` | `Bureau du Directeur General` |
| `directeur.finance@sigeda.local` | `DIRECTEUR` | `Direction des Finances` | `Service Comptabilite` | `Bureau du Cadre` |
| `manager.compta@sigeda.local` | `MANAGER` | `Direction des Finances` | `Service Comptabilite` | `Bureau du Cadre` |
| `agent.cadre@sigeda.local` | `AGENT` | `Direction des Finances` | `Service Comptabilite` | `Bureau du Cadre` |
| `auditeur.demo@sigeda.local` | `AUDITEUR` | `Direction Generale` | `Direction Generale` | `Bureau du Directeur General` |

## Verification rapide du perimetre utilisateur

Controle effectue le `2026-06-16` via `GET /api/v1/users?page=1&pageSize=100` :

| Profil | Nombre d'utilisateurs visibles |
| --- | ---: |
| `ADMIN` | `100` |
| `DIRECTEUR_GENERAL` | `100` |
| `DIRECTEUR` | `29` |
| `MANAGER` | `28` |
| `AGENT` | `27` |
| `AUDITEUR` | `100` |

Lecture attendue :

- `DIRECTEUR` voit `agent.treso@sigeda.local`, car il couvre toute la direction.
- `MANAGER` ne voit pas `agent.treso@sigeda.local`, car cet agent est dans un autre service.
- `AGENT` ne voit ni `agent.annexe@sigeda.local` ni `agent.treso@sigeda.local`, car ils sont hors de son bureau.

## Compte Keycloak d'administration

- URL : `http://localhost:8080`
- Login : `admin`
- Mot de passe : `admin`

## Comptes techniques utiles

| Service | URL / Hote | Identifiant | Mot de passe |
| --- | --- | --- | --- |
| PostgreSQL | `localhost:5432` / base `sigeda` | `sigeda` | `sigeda` |
| pgAdmin | `http://localhost:5050` | `admin@sigeda.dev` | `SigedaPgAdmin_2026!` |
| MinIO Console | `http://localhost:9001` | `sigeda` | `sigeda-password` |
| OpenSearch | `http://localhost:9200` | `admin` | `CentralBankSearch_2026!Vault` |

## Important

- L'ancien compte Firebase `agent.demo.20260606@sigeda.local / SigedaDemo@2026!` ne doit plus etre utilise.
- Les comptes ci-dessus sont provisionnes dans Keycloak et en base PostgreSQL.
