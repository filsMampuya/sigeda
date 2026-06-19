# Commandes de lancement SIGEDA

Ce document centralise les commandes utiles pour lancer les differentes parties du projet.

## Important - environnement de demonstration

Pour la branche `annotation`, l'environnement de demonstration doit rester sans documents, sans annotations et sans archives documentaires prechargees.

Consequences :

- `npm run test:onprem` cree des documents techniques de verification ;
- `npm run test:functional:onprem` cree des documents et des archives de recette ;
- ces scripts ne doivent pas etre lances juste avant une demonstration metier si vous souhaitez conserver un jeu de donnees vierge.

Preparation recommandee d'un environnement de demonstration propre :

```bash
npm run db:reset-demo
docker compose -f infra/docker/docker-compose.yml up -d --force-recreate keycloak api-nest web nginx
```

Effet attendu :

- organisation prechargee ;
- utilisateurs de demonstration precharges ;
- classeurs annuels precharges pour l'annee de demonstration ;
- aucun contenu documentaire precharge.

## 1) Installation des dependances

Depuis la racine du projet:

```bash
npm install
```

Pour `functions` (package independant):

```bash
cd functions
npm install
cd ..
```

## 2) Lancer tout le monorepo (web + api)

Depuis la racine:

```bash
npm run dev
```

## 3) Lancer uniquement le web

Depuis la racine (workspace):

```bash
npm run dev --workspace @sigeda/web
```

Ou depuis le dossier web:

```bash
cd apps/web
npm run dev
```

## 4) Lancer uniquement l'API

Depuis la racine (workspace):

```bash
npm run dev --workspace @sigeda/api
```

Ou depuis le dossier API:

```bash
cd apps/api
npm run dev
```

## 5) Lancer via Turbo avec filtre

Web seulement:

```bash
npm run dev -- --filter=@sigeda/web
```

API seulement:

```bash
npm run dev -- --filter=@sigeda/api
```

## 6) Build et lancement production

Build monorepo (depuis la racine):

```bash
npm run build
```

Web en production:

```bash
cd apps/web
npm run build
npm run start
```

API (build seulement, pas de script `start` defini):

```bash
cd apps/api
npm run build
```

## 7) Functions Firebase en local

Depuis le dossier `functions`:

```bash
cd functions
npm run serve
```

Autres scripts utiles:

```bash
npm run shell
npm run start
npm run build:watch
```

## 8) Firebase CLI utile

Depuis la racine:

```bash
firebase emulators:start
```

Depuis `functions`:

```bash
npm run deploy
npm run logs
```

---

Fichier cree pour conserver les commandes de demarrage et d'exploitation locale.
