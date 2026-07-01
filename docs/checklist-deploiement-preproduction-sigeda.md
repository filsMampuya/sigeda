# Check-list de deploiement preproduction SIGEDA

Mise a jour : `2026-07-01`  
Objectif : derouler le deploiement preproduction mono-serveur de SIGEDA avec controle technique et validation metier.  
Contexte cible actuel : `Windows 10 Professionnel` avec `Docker Desktop` et `PowerShell`.

Fichiers relies :

- [plan-deploiement-preproduction-sigeda.md](./plan-deploiement-preproduction-sigeda.md)
- [preproduction-windows-10-pro-sigeda.md](./preproduction-windows-10-pro-sigeda.md)
- [runbook-mise-en-service-preprod-windows-sigeda.md](./runbook-mise-en-service-preprod-windows-sigeda.md)
- [rapport-go-no-go-preproduction-sigeda.md](./rapport-go-no-go-preproduction-sigeda.md)
- [modele-env-preproduction-windows-sigeda.md](./modele-env-preproduction-windows-sigeda.md)
- [docker-compose.preprod.yml](../infra/docker/docker-compose.preprod.yml)
- [docker-compose.preprod.monitoring.yml](../infra/docker/docker-compose.preprod.monitoring.yml)
- [docker-compose.preprod.tls.yml](../infra/docker/docker-compose.preprod.tls.yml)
- [.env.preprod.windows.example](../infra/docker/.env.preprod.windows.example)
- [preprod.conf](../infra/docker/nginx/preprod.conf)
- [preprod-tls.conf](../infra/docker/nginx/preprod-tls.conf)

## 1. Avant de commencer

- verifier le commit exact a deployer ;
- verifier que la branche retenue est stable ;
- verifier la presence des secrets de preproduction hors depot ;
- verifier que l'URL intranet retenue est definitive ;
- verifier l'espace disque disponible ;
- verifier la RAM disponible pour PostgreSQL, OpenSearch et Ollama ;
- verifier que `Docker Desktop` fonctionne en mode `Linux containers`.

Important :

- toute l'arborescence de preproduction doit etre creee sur la machine serveur cible ;
- pas sur la machine de developpement ;
- le disque `F:` n'est qu'un ancien exemple ; si le serveur ne dispose que de `C:`, utiliser `C:\sigeda\...`.

Preflight recommande avant toute ouverture :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1
```

## 2. Preparation machine

## 2.1 Socle Windows

- verifier que `Windows 10 Professionnel` est a jour ;
- installer `Docker Desktop` ;
- installer `Git for Windows` ;
- installer `Node.js LTS` ;
- installer `PowerShell 7` ;
- verifier les droits administrateur locaux pour le pare-feu ;
- verifier dans Docker Desktop :
  - RAM suffisante ;
  - CPU suffisants ;
  - disque Docker non sature ;
  - partage du disque contenant `C:\sigeda` ou le disque reel retenu.

## 2.2 Arborescence

Creer :

```powershell
New-Item -ItemType Directory -Force C:\sigeda\app | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\postgres | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\postgres-keycloak | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\minio | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\opensearch | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\ollama | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\backups | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\logs\nginx | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\pgadmin | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\prometheus | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\data\grafana | Out-Null
New-Item -ItemType Directory -Force C:\sigeda\certs | Out-Null
```

## 2.3 Depot

```powershell
Set-Location C:\sigeda\app
git clone <url-du-repo> repo
Set-Location C:\sigeda\app\repo
```

## 3. Configuration preproduction

## 3.1 Fichier d'environnement

```powershell
Copy-Item infra/docker/.env.preprod.windows.example infra/docker/.env.preprod
```

Puis renseigner obligatoirement :

- `SIGEDA_PREPROD_HOSTNAME`
- `SIGEDA_PUBLIC_BASE_URL`
- `SIGEDA_DATA_ROOT`
- `SIGEDA_CERTS_DIR`
- `SIGEDA_POSTGRES_PASSWORD`
- `SIGEDA_KEYCLOAK_DB_PASSWORD`
- `SIGEDA_KEYCLOAK_ADMIN_PASSWORD`
- `SIGEDA_MINIO_ROOT_PASSWORD`
- `SIGEDA_PGADMIN_PASSWORD`
- `SIGEDA_GRAFANA_ADMIN_PASSWORD`

## 3.2 Controles de coherence

Verifier que :

- `SIGEDA_DATA_ROOT=C:/sigeda/data` ;
- `SIGEDA_CERTS_DIR=C:/sigeda/certs` ;
- `SIGEDA_KEYCLOAK_URL` pointe vers `http://<host>/auth` ou `https://<host>/auth` ;
- `SIGEDA_KEYCLOAK_ISSUER` pointe vers `/auth/realms/sigeda` ;
- `SIGEDA_CORS_ORIGIN` correspond a l'URL web finale ;
- `SIGEDA_MINIO_PUBLIC_ENDPOINT` est coherent avec votre strategie :
  - `http://minio:9000` si les fichiers passent par les routes proxy applicatives ;
  - une URL publiee dediee seulement si un flux navigateur signe legacy l'exige ;
- aucun mot de passe de demonstration n'est conserve.

## 4. Validation du code avant build

Depuis le repo :

```powershell
npm install
npm run typecheck
```

Si un lot de recette authentifiee est disponible et stable :

```powershell
npm run --workspace @sigeda/api-nest smoke-test
```

Si cette commande n'est pas prete pour la machine, la noter comme non executee dans le rapport.

## 5. Deploiement de la pile

## 5.1 Build et lancement

Lancement standard :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1
```

Lancement avec `pgAdmin` :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1 -WithPgAdmin
```

Activation de la supervision locale :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-monitoring.ps1
```

Activation TLS :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-tls.ps1
```

## 5.2 Verification immediate

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml ps
```

Verifier que :

- `postgres` est `healthy` ;
- `postgres-keycloak` est `healthy` ;
- `api-nest` est `healthy` ;
- `web` est `healthy` ;
- `nginx` est `up` ;
- `keycloak` est `up` ;
- `minio` est `up`.

## 6. Initialisation metier

## 6.1 Migrations Prisma

Si necessaire depuis le conteneur API :

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml exec api-nest npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

## 6.2 Seed de reference

Executer le seed uniquement si la preproduction doit contenir :

- l'organisation ;
- les profils ;
- les comptes de recette ;
- les classeurs de base.

Commande type :

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml exec api-nest npm run --workspace @sigeda/database seed
```

## 7. Verification technique

## 7.1 API

Depuis la machine :

```powershell
curl.exe -I http://localhost/health
curl.exe -I http://localhost/api/v1/health
```

## 7.2 Web

Depuis la machine ou un poste client :

```powershell
curl.exe -I http://<host-intranet>/
```

## 7.3 Keycloak

Verifier dans le navigateur :

- `http://<host-intranet>/auth`

Verifier :

- realm `sigeda` ;
- client `sigeda-web` ;
- ecran de connexion charge correctement.

## 7.4 MinIO

Verifier via le backend :

- upload document ;
- ouverture document ;
- telechargement document ;
- upload annotation ;
- ouverture annotation ;
- telechargement annotation.

## 8. Sauvegardes initiales

## 8.1 Sauvegarde applicative

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-backup.ps1
```

## 8.2 Verification sauvegarde

```powershell
Get-ChildItem C:\sigeda\data\backups
```

Verifier qu'un dossier date existe avec :

- dump PostgreSQL SIGEDA ;
- dump PostgreSQL Keycloak ;
- archive MinIO.

## 9. Recette fonctionnelle minimale

Tester au minimum :

- connexion utilisateur ;
- creation document ;
- classement ;
- creation archive documentaire ;
- annotation ;
- consultation ;
- telechargement ;
- recherche ;
- verification du perimetre agent / manager / directeur / DG.

## 10. Controles de securite minimum

- verifier que seuls `80` ou `443` sont ouverts au reseau utilisateur ;
- verifier que `5432`, `4100`, `3000`, `8080`, `9000`, `9001`, `9200`, `11434` ne sont pas ouverts au LAN utilisateur ;
- verifier que `pgAdmin` est desactive ou restreint ;
- verifier que les secrets de demonstration ont disparu ;
- verifier que le compte `admin/admin` n'existe plus.

Controles complements recommandes :

- appliquer les regles via [Set-SigedaPreprodFirewall.ps1](../infra/windows/Set-SigedaPreprodFirewall.ps1) ;
- planifier l'execution reguliere de [preprod-backup.ps1](../infra/docker/scripts/preprod-backup.ps1) ;
- planifier la purge via [preprod-backup-prune.ps1](../infra/docker/scripts/preprod-backup-prune.ps1) ;
- planifier l'execution reguliere de [preprod-healthcheck.ps1](../infra/docker/scripts/preprod-healthcheck.ps1) ;
- enregistrer les taches Windows via [Register-SigedaPreprodScheduledTasks.ps1](../infra/windows/Register-SigedaPreprodScheduledTasks.ps1) ;
- conserver les assets Linux de hardening comme reference cible pour un futur serveur Linux.

## 11. Go / No-Go

## 11.1 Go si

- la pile demarre proprement ;
- le frontal est accessible depuis plusieurs postes ;
- la connexion Keycloak fonctionne ;
- les parcours documentaires critiques fonctionnent ;
- les fichiers s'ouvrent et se telechargent ;
- la sauvegarde initiale est presente ;
- aucun port technique n'est expose inutilement.

## 11.2 No-Go si

- `keycloak` tourne encore en mode developpement ;
- le frontend n'ouvre pas la page de connexion ;
- la creation documentaire echoue ;
- les flux de fichiers echouent ;
- la sauvegarde initiale n'a pas ete produite ;
- plusieurs services internes restent exposes au LAN utilisateur.

## 12. Rapport de fin de journee

Consigner :

- date et heure de deploiement ;
- commit deploye ;
- versions Docker/images ;
- URL finale ;
- composants demarres ;
- tests executes ;
- resultats ;
- incidents ;
- actions correctives ;
- statut final :
  - `Go preproduction`
  - `Go avec reserves`
  - `No-Go`

Inventaire machine exportable :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Export-SigedaPreprodInventory.ps1
```
