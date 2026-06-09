# Recette QA Keycloak / PostgreSQL

Ce guide valide la pile on-premise pilote sans Firebase Authentication.

## Prerequis

- Docker Desktop lance.
- Branche `migration-on-premise`.
- Services pilotes demarres avec `docker compose -f infra/docker/docker-compose.yml up -d --build`.
- Base initialisee avec :
  - `$env:DATABASE_URL='postgresql://sigeda:sigeda@localhost:5432/sigeda'`
  - `npm.cmd run db:migrate`
  - `npm.cmd run db:seed`

## Comptes pilotes

- Keycloak admin applicatif : `admin@sigeda.local`
- Mot de passe : `SigedaAdmin1!`
- Realm : `sigeda`
- Client public : `sigeda-web`

## Scenario 1 - Connexion web par redirection Keycloak

1. Ouvrir `http://localhost:3000/login`.
2. Cliquer sur `Se connecter avec Keycloak`.
3. Verifier la redirection vers `http://localhost:8080/realms/sigeda/...`.
4. Se connecter avec `admin@sigeda.local` et `SigedaAdmin1!`.
5. Verifier le retour automatique vers `http://localhost:3000/dashboard`.
6. Verifier que les pages protegees ne demandent plus Firebase.

## Scenario 2 - Deconnexion

1. Depuis l'application web, cliquer sur `Se deconnecter`.
2. Verifier la redirection de deconnexion Keycloak.
3. Revenir sur `http://localhost:3000/dashboard`.
4. Verifier que l'utilisateur est redirige vers `/login`.

## Scenario 3 - API protegee sans token

1. Appeler `http://localhost:4100/api/v1/departments` sans `Authorization`.
2. Verifier une reponse `401`.
3. Appeler `http://localhost:4100/api/v1/health`.
4. Verifier une reponse `200`.

## Scenario 4 - Smoke test automatise nouvelle stack

1. Executer `npm.cmd run test:onprem`.
2. Verifier les sorties :
   - `Keycloak token: ok`
   - `GET /health`
   - `POST /folders: ok`
   - `POST /documents: ok`
   - `Smoke test completed.`
3. Verifier dans PostgreSQL que les lignes sont creees dans `folders`, `documents`, `document_recipients` et `document_archives`.

## Scenario 5 - Robustesse session web

1. Ouvrir une fenetre privee.
2. Aller directement sur `http://localhost:3000/documents`.
3. Verifier la redirection vers `/login`.
4. Apres connexion Keycloak, verifier l'acces a la page.

## Points de controle

- Le frontend ne doit plus appeler Firebase Authentication.
- Les tokens transmis a l'API NestJS doivent etre des JWT Keycloak.
- Les donnees creees par les endpoints pilotes doivent etre dans PostgreSQL.
- L'ancien `apps/api` Express/Firebase reste present uniquement pour transition legacy.
