# Runbook de mise en service preproduction SIGEDA sur Windows 10 Professionnel

Mise a jour : `2026-07-01`  
Contexte : execution de la journee de mise en service preproduction SIGEDA sur une machine `Windows 10 Professionnel`.

References :

- [preproduction-windows-10-pro-sigeda.md](./preproduction-windows-10-pro-sigeda.md)
- [checklist-deploiement-preproduction-sigeda.md](./checklist-deploiement-preproduction-sigeda.md)
- [plan-deploiement-preproduction-sigeda.md](./plan-deploiement-preproduction-sigeda.md)
- [commandes-lancement.md](./commandes-lancement.md)

## 1. Objectif du runbook

Ce document sert a piloter la mise en service sans improvisation.

Il couvre :

- preparation de la machine ;
- lancement de la pile ;
- verification technique ;
- verification fonctionnelle minimale ;
- decision `Go / No-Go` ;
- repli si incident.

## 2. Roles pendant la mise en service

Minimum recommande :

- `Responsable technique`
  - lance les commandes ;
  - controle Docker ;
  - valide les ports et volumes.
- `Referent fonctionnel`
  - teste connexion ;
  - teste creation documentaire ;
  - teste consultation et telechargement.
- `Observateur / validateur`
  - note les resultats ;
  - statue sur `Go`, `Go avec reserves` ou `No-Go`.

## 3. Fenetre de mise en service

Fenetre recommandee :

- debut technique : `08:30`
- ouverture des tests reseau : `10:00`
- decision `Go / No-Go` initiale : `12:00`
- stabilisation : `apres-midi`

L'objectif est d'avoir une decision avant l'ouverture large aux testeurs.

## 4. Preconditions obligatoires

Avant `08:30`, verifier :

- Docker Desktop installe et demarre ;
- mode Linux containers actif ;
- espace disque suffisant ;
- repository SIGEDA a jour ;
- `infra/docker/.env.preprod` renseigne ;
- structure `C:/sigeda/data` ou son equivalent reel creee sur le serveur ;
- si TLS est prevu :
  - `C:/sigeda/certs/fullchain.pem`
  - `C:/sigeda/certs/privkey.pem`
- machine accessible par le reseau Intranet ;
- nom DNS ou IP intranet connu.

## 5. Sequence d'execution

## 5.1 08:30 - Verification initiale

Dans PowerShell :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1
docker version
docker compose version
docker info
```

Verifier :

- Docker Desktop repond ;
- memoire allouee suffisante ;
- disque Docker non sature.

## 5.2 08:40 - Preparation de l'environnement

Si le fichier n'existe pas :

```powershell
Copy-Item infra/docker/.env.preprod.windows.example infra/docker/.env.preprod
```

Verifier ensuite manuellement :

- `SIGEDA_DATA_ROOT`
- `SIGEDA_PUBLIC_BASE_URL`
- `SIGEDA_KEYCLOAK_URL`
- `SIGEDA_KEYCLOAK_ISSUER`
- mots de passe non par defaut

## 5.3 08:50 - Validation de la configuration Compose

```powershell
$env:SIGEDA_PREPROD_ENV_FILE = "C:\sigeda\app\repo\infra\docker\.env.preprod"
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-healthcheck.ps1
```

Si la pile n'est pas encore lancee, le healthcheck echouera.  
Le but ici est surtout de verifier que :

- le script PowerShell se charge correctement ;
- le fichier d'environnement est bien lu.

## 5.4 09:00 - Lancement de la pile

Sans `pgAdmin` :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1
```

Avec `pgAdmin` si necessaire :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1 -WithPgAdmin
```

Si la supervision locale fait partie de la session :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-monitoring.ps1
```

## 5.5 09:10 - Verification des conteneurs

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml ps
```

Verifier :

- `postgres` = `healthy`
- `postgres-keycloak` = `healthy`
- `api-nest` = `healthy`
- `web` = `healthy`
- `nginx` = `up`
- `keycloak` = `up`
- `minio` = `up`

## 5.6 09:20 - Migrations et initialisation

Si necessaire :

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml exec api-nest npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

Puis, seulement si la preproduction doit etre peuplee :

```powershell
docker compose --env-file infra/docker/.env.preprod -f infra/docker/docker-compose.preprod.yml exec api-nest npm run --workspace @sigeda/database seed
```

## 5.7 09:35 - Verification HTTP/HTTPS

Sans TLS :

```powershell
$publicBaseUrl = (Select-String -Path infra/docker/.env.preprod -Pattern "^SIGEDA_PUBLIC_BASE_URL=" | Select-Object -First 1).ToString().Split("=", 2)[1]
Invoke-WebRequest -UseBasicParsing "$publicBaseUrl/health"
```

Plus simplement :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-healthcheck.ps1
```

Si TLS est active, verifier aussi :

```powershell
curl.exe -k -I https://<host-intranet>/
curl.exe -k -I https://<host-intranet>/health
curl.exe -k -I https://<host-intranet>/auth
```

## 5.8 09:45 - Pare-feu Windows

Si les regles n'ont pas encore ete posees :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Set-SigedaPreprodFirewall.ps1
```

Verifier ensuite que seuls les ports voulus sont exposes aux testeurs.

## 5.9 10:00 - Sauvegarde initiale

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-backup.ps1
```

Verifier qu'un dossier de sauvegarde est cree sous :

```txt
C:\sigeda\data\backups\<timestamp>\
```

## 6. Recette fonctionnelle minimale

## 6.1 Authentification

Tester :

- acces a l'URL web ;
- redirection vers Keycloak ;
- connexion reussie ;
- retour a l'application ;
- deconnexion.

## 6.2 Parcours documentaires

Tester au minimum :

- creation d'un document ;
- OCR + IA si active ;
- classement ;
- consultation ;
- telechargement document ;
- annotation ;
- telechargement annotation ;
- recherche documentaire.

## 6.3 Profils a tester

Tester au minimum :

- `AGENT`
- `MANAGER`
- `DIRECTEUR`
- `DIRECTEUR_GENERAL`

Verifier :

- perimetre de donnees ;
- actions visibles ;
- absence d'erreurs bloquantes.

## 7. Criteres de decision

## 7.1 Go

Statut `Go` si :

- la pile est stable ;
- l'authentification fonctionne ;
- creation document OK ;
- classement OK ;
- consultation/telechargement OK ;
- annotations OK ;
- sauvegarde initiale OK ;
- acces reseau multi-postes OK.

## 7.2 Go avec reserves

Statut `Go avec reserves` si :

- les parcours critiques fonctionnent ;
- mais il reste des ecarts secondaires :
  - ergonomie ;
  - monitoring incomplet ;
  - outil admin non finalise ;
  - reserve documentaire non bloquante.

## 7.3 No-Go

Statut `No-Go` si :

- la connexion ne fonctionne pas ;
- la creation documentaire echoue ;
- les fichiers ne s'ouvrent pas ;
- les annotations sont instables ;
- la base ou MinIO ne sont pas persistants ;
- les services redemarrent en boucle ;
- les URLs publiques sont incoherentes.

## 8. Plan de repli

Si incident bloquant :

1. stopper les nouveaux tests utilisateurs ;
2. consigner l'heure et le symptome ;
3. exporter les logs Docker des services en cause ;
4. si besoin :
   - `preprod-down.ps1`
   - correction ciblee
   - `preprod-up.ps1`
5. si la base a ete corrompue :
   - restaurer le dump le plus recent ;
6. reexecuter healthcheck ;
7. reprendre les tests seulement apres validation technique.

## 9. Commandes de repli rapide

Arret :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-down.ps1
```

Redemarrage :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1
```

Restauration PostgreSQL :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-restore-postgres.ps1 -BackupSqlPath C:\sigeda\data\backups\<timestamp>\sigeda-postgres.sql
```

## 10. Rapport de fin de mise en service

En fin de journee, consigner :

- machine cible ;
- URL finale ;
- mode HTTP ou HTTPS ;
- commit deploye ;
- images utilisees ;
- statut des tests ;
- incidents rencontres ;
- statut final.

Utiliser le modele :

- [rapport-go-no-go-preproduction-sigeda.md](./rapport-go-no-go-preproduction-sigeda.md)
- [modele-inventaire-machine-preproduction-sigeda.md](./modele-inventaire-machine-preproduction-sigeda.md)

## 11. Automatisation post mise en service

Apres validation initiale, enregistrer les taches planifiees :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Register-SigedaPreprodScheduledTasks.ps1
```
