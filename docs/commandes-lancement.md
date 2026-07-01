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

## Important - Document Intelligence local

La chaine `Document Intelligence` repose desormais sur :

- `Ollama` pour l'inference locale ;
- `Tesseract` + `poppler-utils` dans `api-nest` pour le fallback OCR.

La pile Docker provisionne automatiquement les modeles declares dans :

- `SIGEDA_DOCUMENT_AI_VISION_MODEL`
- `SIGEDA_DOCUMENT_AI_TEXT_MODEL`

Par defaut :

```bash
SIGEDA_DOCUMENT_AI_VISION_MODEL=qwen2.5vl:3b
SIGEDA_DOCUMENT_AI_TEXT_MODEL=qwen2.5:3b
```

Attention :

- le premier demarrage peut etre long ;
- le telechargement depend de la taille des modeles ;
- `api-nest` ne bloque plus sur le pull initial des modeles ;
- la disponibilite du moteur se verifie via `GET /api/v1/document-intelligence/readiness` ;
- `ollama-pull` relance automatiquement les telechargements en cas d'echec reseau ponctuel.

## 1) Installation des dependances

Depuis la racine du projet :

```bash
npm install
```

Initialisation recommandee de l'environnement Docker on-premise avec IA locale :

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres minio keycloak opensearch ollama
docker compose -f infra/docker/docker-compose.yml up -d ollama-pull
docker compose -f infra/docker/docker-compose.yml up -d api-nest web nginx
```

Verification rapide du runtime IA local :

```bash
docker compose -f infra/docker/docker-compose.yml logs -f ollama-pull
docker compose -f infra/docker/docker-compose.yml ps
```

Verification fonctionnelle minimale :

```bash
curl -I http://localhost:8088/api/document-intelligence/readiness
```

Resultat attendu sans session :

- `401 Unauthorized`

Resultat attendu avec session valide :

- JSON de disponibilite du moteur local ;
- details par mode `vision`, `ocr`, `auto`.

## 1.1) Exploitation preproduction mono-serveur

Les scripts suivants s'appuient sur :

- `infra/docker/docker-compose.preprod.yml`
- `infra/docker/.env.preprod`

### Variante Linux

Preparation :

```bash
cp infra/docker/.env.preprod.example infra/docker/.env.preprod
```

Lancement preproduction :

```bash
bash infra/docker/scripts/preprod-up.sh
```

Lancement preproduction avec `pgAdmin` :

```bash
bash infra/docker/scripts/preprod-up.sh --with-pgadmin
```

Arret de la pile :

```bash
bash infra/docker/scripts/preprod-down.sh
```

Verification technique rapide :

```bash
bash infra/docker/scripts/preprod-healthcheck.sh
```

Sauvegarde preproduction :

```bash
bash infra/docker/scripts/preprod-backup.sh
```

Restauration PostgreSQL SIGEDA :

```bash
bash infra/docker/scripts/preprod-restore-postgres.sh /opt/sigeda/data/backups/<timestamp>/sigeda-postgres.sql
```

Supervision preproduction locale :

```bash
docker compose \
  --env-file infra/docker/.env.preprod \
  -f infra/docker/docker-compose.preprod.yml \
  -f infra/docker/docker-compose.preprod.monitoring.yml \
  up -d prometheus grafana node-exporter cadvisor
```

Activation TLS preproduction :

```bash
docker compose \
  --env-file infra/docker/.env.preprod \
  -f infra/docker/docker-compose.preprod.yml \
  -f infra/docker/docker-compose.preprod.tls.yml \
  up -d --build
```

### Variante Windows 10 Professionnel

Preparation :

```powershell
Copy-Item infra/docker/.env.preprod.windows.example infra/docker/.env.preprod
```

Lancement preproduction :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1
```

Lancement avec `pgAdmin` :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1 -WithPgAdmin
```

Arret de la pile :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-down.ps1
```

Verification technique rapide :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-healthcheck.ps1
```

Sauvegarde preproduction :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-backup.ps1
```

Restauration PostgreSQL SIGEDA :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-restore-postgres.ps1 -BackupSqlPath C:\sigeda\data\backups\<timestamp>\sigeda-postgres.sql
```

Supervision preproduction locale :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-monitoring.ps1
```

Activation TLS preproduction :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-tls.ps1
```

Preflight preproduction Windows :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1
```

Inventaire machine preproduction :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Export-SigedaPreprodInventory.ps1
```

Pour `functions` (package independant) :

```bash
cd functions
npm install
cd ..
```

## 2) Lancer tout le monorepo (web + api)

Depuis la racine :

```bash
npm run dev
```

## 3) Lancer uniquement le web

Depuis la racine (workspace) :

```bash
npm run dev --workspace @sigeda/web
```

Ou depuis le dossier web :

```bash
cd apps/web
npm run dev
```

## 4) Lancer uniquement l'API

Depuis la racine (workspace) :

```bash
npm run dev --workspace @sigeda/api
```

Ou depuis le dossier API :

```bash
cd apps/api
npm run dev
```

## 5) Lancer via Turbo avec filtre

Web seulement :

```bash
npm run dev -- --filter=@sigeda/web
```

API seulement :

```bash
npm run dev -- --filter=@sigeda/api
```

## 6) Build et lancement production

Build monorepo (depuis la racine) :

```bash
npm run build
```

Web en production :

```bash
cd apps/web
npm run build
npm run start
```

API (build seulement, pas de script `start` defini) :

```bash
cd apps/api
npm run build
```

## 7) Functions Firebase en local

Depuis le dossier `functions` :

```bash
cd functions
npm run serve
```

Autres scripts utiles :

```bash
npm run shell
npm run start
npm run build:watch
```

## 8) Firebase CLI utile

Depuis la racine :

```bash
firebase emulators:start
```

Depuis `functions` :

```bash
npm run deploy
npm run logs
```

---

Fichier cree pour conserver les commandes de demarrage et d'exploitation locale.
