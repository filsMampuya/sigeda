# Preproduction SIGEDA sur Windows 10 Professionnel

Mise a jour : `2026-07-01`  
Contexte : la machine cible de preproduction SIGEDA tourne sous `Windows 10 Professionnel`.

References :

- [plan-deploiement-preproduction-sigeda.md](./plan-deploiement-preproduction-sigeda.md)
- [checklist-deploiement-preproduction-sigeda.md](./checklist-deploiement-preproduction-sigeda.md)
- [runbook-mise-en-service-preprod-windows-sigeda.md](./runbook-mise-en-service-preprod-windows-sigeda.md)
- [commandes-lancement.md](./commandes-lancement.md)
- [modele-env-preproduction-windows-sigeda.md](./modele-env-preproduction-windows-sigeda.md)

## 1. Principe

Les assets Linux prepares precedemment restent valables comme doctrine d'exploitation, mais la machine de preproduction actuelle impose :

- `Docker Desktop` ;
- `PowerShell` ;
- `Pare-feu Windows Defender` ;
- chemins de donnees Windows.

Pour cette raison, une variante Windows a ete ajoutee.

## 2. Fichiers Windows ajoutes

Configuration :

- [infra/docker/.env.preprod.windows.example](../infra/docker/.env.preprod.windows.example)

Scripts PowerShell :

- [preprod-common.ps1](../infra/docker/scripts/preprod-common.ps1)
- [preprod-up.ps1](../infra/docker/scripts/preprod-up.ps1)
- [preprod-down.ps1](../infra/docker/scripts/preprod-down.ps1)
- [preprod-healthcheck.ps1](../infra/docker/scripts/preprod-healthcheck.ps1)
- [preprod-backup.ps1](../infra/docker/scripts/preprod-backup.ps1)
- [preprod-restore-postgres.ps1](../infra/docker/scripts/preprod-restore-postgres.ps1)

Pare-feu :

- [Set-SigedaPreprodFirewall.ps1](../infra/windows/Set-SigedaPreprodFirewall.ps1)
- [Register-SigedaPreprodScheduledTasks.ps1](../infra/windows/Register-SigedaPreprodScheduledTasks.ps1)
- [Unregister-SigedaPreprodScheduledTasks.ps1](../infra/windows/Unregister-SigedaPreprodScheduledTasks.ps1)
- [Invoke-SigedaPreprodPreflight.ps1](../infra/windows/Invoke-SigedaPreprodPreflight.ps1)
- [Export-SigedaPreprodInventory.ps1](../infra/windows/Export-SigedaPreprodInventory.ps1)

## 3. Prerequis Windows

Installer :

- `Docker Desktop` avec moteur Linux containers ;
- `Git for Windows` ;
- `Node.js LTS` ;
- `PowerShell 7` recommande ;
- `tar` disponible dans Windows ;
- acces administrateur local pour les regles firewall si necessaire.

Activer dans Docker Desktop :

- partage du disque contenant les volumes SIGEDA ;
- ressources RAM/CPU suffisantes ;
- mode Linux containers ;
- demarrage automatique si souhaitable.

## 4. Arborescence recommandee

Principe :

- l'arborescence est a creer sur la machine cible de preproduction ;
- pas sur la machine de developpement ;
- si le serveur ne dispose que du disque `C:`, utiliser `C:\sigeda\...` ;
- si un autre disque est disponible, adapter simplement `SIGEDA_DATA_ROOT` et `SIGEDA_CERTS_DIR`.

Exemple recommande sur un serveur Windows standard :

```txt
C:\sigeda
  \app
    \data
    \postgres
    \postgres-keycloak
    \minio
    \opensearch
    \ollama
    \backups
    \logs
      \nginx
    \pgadmin
    \prometheus
    \grafana
  \certs
```

## 5. Fichier d'environnement

Copier :

```powershell
Copy-Item infra/docker/.env.preprod.windows.example infra/docker/.env.preprod
```

Verifier particulierement :

- `SIGEDA_DATA_ROOT=C:/sigeda/data`
- `SIGEDA_CERTS_DIR=C:/sigeda/certs`
- `SIGEDA_PUBLIC_BASE_URL`
- `SIGEDA_KEYCLOAK_URL`
- `SIGEDA_KEYCLOAK_ISSUER`

Modele detaille disponible :

- [modele-env-preproduction-windows-sigeda.md](./modele-env-preproduction-windows-sigeda.md)

## 6. Commandes PowerShell

Lancement :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1
```

Lancement avec pgAdmin :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up.ps1 -WithPgAdmin
```

Arret :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-down.ps1
```

Healthcheck :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-healthcheck.ps1
```

Sauvegarde :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-backup.ps1
```

Restauration PostgreSQL :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-restore-postgres.ps1 -BackupSqlPath C:\sigeda\data\backups\<timestamp>\sigeda-postgres.sql
```

Supervision locale :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-monitoring.ps1
```

Activation TLS :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-up-tls.ps1
```

## 7. Pare-feu Windows

Regles minimales :

- autoriser `80` ;
- autoriser `443` si TLS active ;
- ne pas exposer les autres ports Docker au LAN utilisateur.

Script fourni :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Set-SigedaPreprodFirewall.ps1
```

## 8. Limites specifiques a Windows 10 Pro

Points de vigilance :

- `Windows 10 Professionnel` n'est pas un OS serveur de production cible ;
- `Docker Desktop` ajoute une couche supplementaire par rapport a un serveur Linux ;
- la gestion reseau et le partage de volumes sont plus sensibles ;
- les performances I/O pour PostgreSQL et OpenSearch peuvent etre inferieures a un Linux serveur dedie ;
- la supervision systemd/UFW/fail2ban ne s'applique pas nativement.

Conclusion pratique :

`Windows 10 Pro` reste acceptable pour une premiere preproduction Intranet, demonstration reseau et tests utilisateurs, mais doit etre considere comme un palier transitoire avant une future cible serveur plus stricte.

## 9. Automatisation minimale recommandee sous Windows

Pour une exploitation plus fiable, planifier dans le `Planificateur de taches Windows` :

- un lancement quotidien de `preprod-backup.ps1` ;
- un controle periodique de `preprod-healthcheck.ps1` ;
- un point de verification Docker Desktop avant chaque session de recette.

Script d'enregistrement fourni :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Register-SigedaPreprodScheduledTasks.ps1
```

## 10. Controle avant ouverture

Preflight technique :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1
```

Inventaire machine :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Export-SigedaPreprodInventory.ps1
```
