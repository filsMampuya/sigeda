# Automatisation et hardening preproduction SIGEDA

Mise a jour : `2026-07-01`
Contexte : outillage minimal d'exploitation pour la preproduction mono-serveur SIGEDA.
Cas reel actuel : `Windows 10 Professionnel` avec `Docker Desktop`.

References :

- [plan-deploiement-preproduction-sigeda.md](./plan-deploiement-preproduction-sigeda.md)
- [checklist-deploiement-preproduction-sigeda.md](./checklist-deploiement-preproduction-sigeda.md)
- [commandes-lancement.md](./commandes-lancement.md)

## 1. Objectif

Ce lot couvre quatre besoins immediats :

- automatiser les sauvegardes ;
- automatiser les controles de sante ;
- faire tourner les journaux proprement ;
- limiter l'exposition reseau du serveur.

Les assets ajoutes dans le depot sont :

- scripts shell :
  - [preprod-up.sh](../infra/docker/scripts/preprod-up.sh)
  - [preprod-down.sh](../infra/docker/scripts/preprod-down.sh)
  - [preprod-healthcheck.sh](../infra/docker/scripts/preprod-healthcheck.sh)
  - [preprod-backup.sh](../infra/docker/scripts/preprod-backup.sh)
  - [preprod-backup-prune.sh](../infra/docker/scripts/preprod-backup-prune.sh)
  - [preprod-restore-postgres.sh](../infra/docker/scripts/preprod-restore-postgres.sh)
- scripts PowerShell :
  - [preprod-up.ps1](../infra/docker/scripts/preprod-up.ps1)
  - [preprod-up-monitoring.ps1](../infra/docker/scripts/preprod-up-monitoring.ps1)
  - [preprod-up-tls.ps1](../infra/docker/scripts/preprod-up-tls.ps1)
  - [preprod-down.ps1](../infra/docker/scripts/preprod-down.ps1)
  - [preprod-healthcheck.ps1](../infra/docker/scripts/preprod-healthcheck.ps1)
  - [preprod-backup.ps1](../infra/docker/scripts/preprod-backup.ps1)
  - [preprod-backup-prune.ps1](../infra/docker/scripts/preprod-backup-prune.ps1)
  - [preprod-restore-postgres.ps1](../infra/docker/scripts/preprod-restore-postgres.ps1)
- rotation des logs :
  - [sigeda-preprod.conf](../infra/logrotate/sigeda-preprod.conf)
- timers systemd :
  - [sigeda-preprod-backup.service](../infra/systemd/sigeda-preprod-backup.service)
  - [sigeda-preprod-backup.timer](../infra/systemd/sigeda-preprod-backup.timer)
  - [sigeda-preprod-healthcheck.service](../infra/systemd/sigeda-preprod-healthcheck.service)
  - [sigeda-preprod-healthcheck.timer](../infra/systemd/sigeda-preprod-healthcheck.timer)
- hardening reseau :
  - [ufw-preprod.sh](../infra/security/ufw-preprod.sh)
  - [jail.local.example](../infra/security/fail2ban/jail.local.example)
  - [Set-SigedaPreprodFirewall.ps1](../infra/windows/Set-SigedaPreprodFirewall.ps1)
  - [Register-SigedaPreprodScheduledTasks.ps1](../infra/windows/Register-SigedaPreprodScheduledTasks.ps1)
  - [Unregister-SigedaPreprodScheduledTasks.ps1](../infra/windows/Unregister-SigedaPreprodScheduledTasks.ps1)
  - [Invoke-SigedaPreprodPreflight.ps1](../infra/windows/Invoke-SigedaPreprodPreflight.ps1)
  - [Export-SigedaPreprodInventory.ps1](../infra/windows/Export-SigedaPreprodInventory.ps1)

## 2. Sauvegardes automatisees

## 2.1 Ce que sauvegarde le script

Le script [preprod-backup.sh](../infra/docker/scripts/preprod-backup.sh) produit :

- dump PostgreSQL SIGEDA ;
- dump PostgreSQL Keycloak ;
- archive du volume MinIO ;
- archive des fichiers de configuration preproduction ;
- snapshot du fichier `.env.preprod` ;
- manifeste de sauvegarde.

Le tout est stocke sous :

```txt
/opt/sigeda/data/backups/<timestamp>/
```

Sous Windows :

```txt
C:\sigeda\data\backups\<timestamp>\
```

## 2.2 Retention

Le script [preprod-backup-prune.sh](../infra/docker/scripts/preprod-backup-prune.sh) supprime par defaut les sauvegardes de plus de `7` jours.

Exemple :

```bash
bash infra/docker/scripts/preprod-backup-prune.sh 14
```

Equivalent Windows :

```powershell
powershell -ExecutionPolicy Bypass -File infra/docker/scripts/preprod-backup-prune.ps1 -RetentionDays 14
```

## 2.3 Taches planifiees Windows

Enregistrement :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Register-SigedaPreprodScheduledTasks.ps1
```

Suppression :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Unregister-SigedaPreprodScheduledTasks.ps1
```

Le script enregistre :

- une sauvegarde quotidienne ;
- une purge quotidienne des sauvegardes ;
- un healthcheck periodique.

## 2.4 Controle avant ouverture

Preflight :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Invoke-SigedaPreprodPreflight.ps1
```

Inventaire :

```powershell
powershell -ExecutionPolicy Bypass -File infra/windows/Export-SigedaPreprodInventory.ps1
```

Ces deux exports permettent :

- de documenter la machine cible ;
- de verifier les prerequis avant ouverture ;
- de rattacher des preuves au rapport Go / No-Go.

## 3. Timers systemd

## 3.1 Installation

Copier les fichiers :

```bash
sudo cp infra/systemd/sigeda-preprod-backup.service /etc/systemd/system/
sudo cp infra/systemd/sigeda-preprod-backup.timer /etc/systemd/system/
sudo cp infra/systemd/sigeda-preprod-healthcheck.service /etc/systemd/system/
sudo cp infra/systemd/sigeda-preprod-healthcheck.timer /etc/systemd/system/
sudo systemctl daemon-reload
```

## 3.2 Activation

```bash
sudo systemctl enable --now sigeda-preprod-backup.timer
sudo systemctl enable --now sigeda-preprod-healthcheck.timer
```

## 3.3 Comportement

- sauvegarde quotidienne a `22:30` ;
- healthcheck toutes les `15 minutes`.

Verification :

```bash
systemctl list-timers | grep sigeda-preprod
systemctl status sigeda-preprod-backup.timer
systemctl status sigeda-preprod-healthcheck.timer
```

## 4. Rotation des logs

Installer la configuration :

```bash
sudo cp infra/logrotate/sigeda-preprod.conf /etc/logrotate.d/sigeda-preprod
sudo logrotate -d /etc/logrotate.d/sigeda-preprod
```

La rotation cible :

- journaux Nginx ;
- rotation quotidienne ;
- conservation `14` jours ;
- compression.

## 5. Pare-feu UFW

Le script [ufw-preprod.sh](../infra/security/ufw-preprod.sh) configure une politique minimale :

- deny incoming par defaut ;
- allow outgoing par defaut ;
- ouverture SSH ;
- ouverture HTTP ;
- ouverture HTTPS optionnelle.

Exemple avec reseau d'administration :

```bash
sudo ADMIN_CIDR=10.10.20.0/24 SSH_PORT=22 ALLOW_HTTP=true ALLOW_HTTPS=false \
  bash infra/security/ufw-preprod.sh
```

## 6. Fail2ban

Le fichier [jail.local.example](../infra/security/fail2ban/jail.local.example) fournit une base minimale pour :

- `sshd`
- `nginx-http-auth`
- `nginx-botsearch`

Installation type :

```bash
sudo cp infra/security/fail2ban/jail.local.example /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

## 7. Ordre recommande de mise en place

1. deployer la pile preproduction ;
2. verifier le healthcheck manuel ;
3. produire une premiere sauvegarde manuelle ;
4. installer logrotate ;
5. installer les timers systemd ;
6. activer UFW ;
7. activer fail2ban ;
8. executer un test de restauration.

## 8. Limites connues

Ces assets constituent un socle preproduction, pas un dispositif final de production bancaire.

Ils ne couvrent pas encore :

- TLS termine avec certificats institutionnels ;
- externalisation hors noeud des sauvegardes ;
- supervision Prometheus/Grafana ;
- PRA multi-noeuds ;
- rotation centralisee des secrets ;
- haute disponibilite PostgreSQL / Keycloak / MinIO.

## 9. Recommandation immediate

Pour la journee de `2026-07-01`, la priorite utile est :

- lancer la pile ;
- verifier les parcours critiques ;
- activer le backup quotidien ;
- activer la purge quotidienne ;
- activer le healthcheck periodique ;
- verrouiller les ports avec `Pare-feu Windows Defender` ;
- restreindre les acces admin.

Une fois ces points en place, la preproduction devient beaucoup plus exploitable et defensible avant d'ouvrir les tests Intranet a plus grande echelle.
