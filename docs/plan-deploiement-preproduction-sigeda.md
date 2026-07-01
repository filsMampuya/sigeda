# Plan de deploiement en preproduction SIGEDA

Mise a jour : `2026-06-30`
Date cible de deploiement preproduction : `2026-07-01`
Contexte : premiere mise en service SIGEDA sur un serveur interne unique pour tests Intranet multi-utilisateurs.
References :

- [architecture-production-cible.md](./architecture-production-cible.md)
- [plan-execution-production-sigeda.md](./plan-execution-production-sigeda.md)
- [commandes-lancement.md](./commandes-lancement.md)
- [automatisation-et-hardening-preproduction-sigeda.md](./automatisation-et-hardening-preproduction-sigeda.md)

## 1. Objectif

Ce document transforme l'architecture actuelle du depot en plan de deploiement preproduction :

- realiste ;
- securise ;
- exploitable par une petite equipe ;
- proche de la future production sans sur-complexification prematuree.

Le perimetre vise une seule machine serveur hebergeant :

- Nginx ;
- frontend Next.js ;
- backend NestJS ;
- PostgreSQL ;
- MinIO ;
- Keycloak ;
- OpenSearch ;
- Ollama pour l'OCR + IA locale si active ;
- journaux et sauvegardes locales.

## 2. Analyse de l'architecture actuelle

## 2.1 Composants constates dans le depot

Architecture constatee dans [docker-compose.yml](../infra/docker/docker-compose.yml) :

- `web` : frontend Next.js ;
- `api-nest` : backend NestJS ;
- `postgres` : PostgreSQL 16 ;
- `minio` : stockage documentaire ;
- `keycloak` : authentification ;
- `opensearch` : recherche ;
- `ollama` + `ollama-pull` : IA locale ;
- `nginx` : reverse proxy ;
- `pgadmin` : administration PostgreSQL.

## 2.2 Forces

- pile deja conteneurisee ;
- dependances applicatives clairement identifiees ;
- PostgreSQL, MinIO et Keycloak deja integres ;
- proxy frontal Nginx deja en place ;
- variables d'environnement deja centralisees en partie ;
- pile suffisante pour une premiere preproduction mono-serveur.

## 2.3 Faiblesses actuelles

Points faibles constates dans l'etat actuel :

1. `Keycloak` tourne en `start-dev`, ce qui n'est pas acceptable meme en preproduction durable.
2. `pgAdmin`, `PostgreSQL`, `MinIO`, `OpenSearch`, `Keycloak` et `API` sont exposes directement par ports.
3. Nginx ecoute en HTTP seul, sans TLS ni headers de securite avances.
4. Les endpoints publics utilisent encore `localhost` dans plusieurs variables.
5. Les mots de passe par defaut de demonstration restent presents dans les exemples.
6. Il n'existe pas encore de plan outille de sauvegarde/restauration dans le depot.
7. Les journaux ne sont pas centralises et la rotation n'est pas formalisee.
8. `pgAdmin` est utile pour l'administration mais ne doit pas rester expose au reseau utilisateur.
9. `OpenSearch` est en mode single-node et sans posture securite cible.
10. `Ollama` peut devenir un point de contention CPU/RAM important si la machine serveur est sous-dimensionnee.

## 2.4 Conclusion d'analyse

La pile actuelle est utilisable comme base de preproduction, mais pas telle quelle.

Pour le deploiement du `2026-07-01`, il faut viser :

- une preproduction mono-serveur durcie ;
- une exposition reseau minimale ;
- des secrets de preproduction distincts ;
- une procedure claire de sauvegarde ;
- une verification de bout en bout avant ouverture aux utilisateurs Intranet.

## 3. Architecture cible de preproduction

## 3.1 Principe

Une seule machine serveur heberge tous les composants.

Les postes clients accedent uniquement au frontal web via navigateur.

Les services techniques ne doivent pas etre exposes directement au reseau utilisateur, sauf besoin ponctuel d'administration.

## 3.2 Vue logique

```txt
Navigateurs utilisateurs
    ->
Nginx frontal
    ->
Web Next.js
    ->
API NestJS
    ->
PostgreSQL
    -> MinIO
    -> Keycloak
    -> OpenSearch
    -> Ollama
```

## 3.3 Regle d'exposition reseau

Exposer aux utilisateurs :

- `80` et idealement `443` via Nginx.

Ne pas exposer au reseau utilisateur :

- `5432` PostgreSQL ;
- `9000` MinIO API ;
- `9001` MinIO Console ;
- `8080` Keycloak ;
- `9200` OpenSearch ;
- `9600` OpenSearch monitoring ;
- `4100` API ;
- `3000` Web ;
- `5050` pgAdmin ;
- `11434` Ollama.

Ces ports peuvent rester joignables seulement :

- en reseau Docker interne ;
- ou via un VLAN/pare-feu d'administration.

## 4. Systeme et logiciels recommandes

## 4.1 Systeme d'exploitation

Recommandation principale :

- `Rocky Linux 9`

Alternative acceptable si la DSI l'impose :

- `Ubuntu Server 24.04 LTS`

Contrainte reelle de la phase actuelle :

- la premiere machine de preproduction disponible est sous `Windows 10 Professionnel`.

Interpretation :

- ce choix reste acceptable pour une premiere preproduction et des tests Intranet ;
- il ne doit pas etre confondu avec la cible serveur recommandee a moyen terme ;
- une documentation et des scripts PowerShell dedies ont ete ajoutes pour cette machine.

Pour rester coherent avec les documents d'architecture deja rediges, la recommandation par defaut reste `Rocky Linux 9`.

## 4.2 Logiciels a installer sur le serveur

Socle obligatoire :

- Docker Engine `27.x` ou version stable equivalente ;
- Docker Compose Plugin `2.27+` ;
- Git `2.4x+` ;
- OpenSSL `3.x` ;
- curl ;
- jq ;
- unzip ;
- tar ;
- htop ;
- net-tools ou `iproute2` ;
- rsync ;
- logrotate ;
- ufw ou firewalld selon OS ;
- fail2ban ;
- cron ou systemd timers.

Optionnels mais utiles :

- pgAdmin uniquement pour administration restreinte ;
- Prometheus / Grafana dans un second temps ;
- restic pour sauvegardes de fichiers ;
- pgBackRest si une strategie PostgreSQL plus robuste est retenue rapidement.

## 5. Arborescence serveur recommandee

```txt
/opt/sigeda
  /app
    /repo
  /infra
    /compose
    /env
    /nginx
    /keycloak
    /scripts
  /data
    /postgres
    /minio
    /opensearch
    /ollama
    /backups
    /logs
  /secrets
  /certs
```

Regles :

- `/opt/sigeda/app/repo` : copie du depot ;
- `/opt/sigeda/infra/env` : fichiers `.env` de preproduction ;
- `/opt/sigeda/secrets` : secrets non commits ;
- `/opt/sigeda/data` : volumes persistants relies aux conteneurs ;
- `/opt/sigeda/data/backups` : sauvegardes locales en attendant externalisation.

## 6. Variables d'environnement a fiabiliser

## 6.1 Variables a externaliser obligatoirement

Depuis :

- [apps/api-nest/.env.example](../apps/api-nest/.env.example)
- [infra/docker/.env.example](../infra/docker/.env.example)

Variables critiques :

- `SIGEDA_POSTGRES_PASSWORD`
- `SIGEDA_PGADMIN_PASSWORD`
- `SIGEDA_MINIO_ROOT_PASSWORD`
- `SIGEDA_KEYCLOAK_ADMIN_PASSWORD`
- `SIGEDA_KEYCLOAK_URL`
- `SIGEDA_KEYCLOAK_ISSUER`
- `SIGEDA_CORS_ORIGIN`
- `SIGEDA_MINIO_PUBLIC_ENDPOINT`
- `SIGEDA_DOCUMENT_AI_*`
- `SIGEDA_OCR_*`

## 6.2 Ajustements de preproduction obligatoires

Remplacer les valeurs `localhost` par le nom DNS ou l'IP intranet du serveur, par exemple :

- `SIGEDA_KEYCLOAK_URL=https://sigeda-preprod.hdm.local/auth`
- `SIGEDA_KEYCLOAK_ISSUER=https://sigeda-preprod.hdm.local/auth/realms/sigeda`
- `SIGEDA_MINIO_PUBLIC_ENDPOINT=https://sigeda-preprod.hdm.local/minio`
- `SIGEDA_CORS_ORIGIN=https://sigeda-preprod.hdm.local`

Des variables de demonstration doivent etre desactivees ou revues :

- `DOCUMENT_AI_DEBUG=false`
- secrets de demonstration remplaces ;
- comptes admin par defaut remplaces ;
- adresses publiques reelles introduites.

## 7. Ajustements techniques prealables au deploiement

Avant de deployer, le depot doit etre interprete comme une base de reference, pas comme un fichier compose directement expose tel quel.

## 7.1 Ajustements Docker Compose recommandes

Pour la preproduction, il faut :

1. cloner le compose actuel vers un compose preproduction dedie ;
2. retirer les `ports` inutiles pour les services internes ;
3. laisser uniquement Nginx publier `80/443` ;
4. monter les volumes persistants vers des chemins explicites ;
5. ajouter `restart: unless-stopped` sur les services critiques ;
6. ajouter des `healthcheck` coherents sur web, api, keycloak, minio si absents ;
7. separer les secrets dans un fichier `.env.preprod`.

## 7.2 Ajustements Nginx recommandes

Etat actuel dans [default.conf](../infra/docker/nginx/default.conf) :

- proxy HTTP simple ;
- `client_max_body_size 32m` ;
- pas de TLS ;
- pas de headers de securite explicites ;
- pas de cache statique ;
- pas de compression visible.

Pour la preproduction :

- activer TLS si possible des cette phase ;
- conserver `client_max_body_size` coherent avec les tailles documentaires attendues ;
- ajouter :
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Content-Security-Policy` minimale si compatible ;
- activer `gzip` ;
- definir timeouts raisonnables pour OCR + IA locale ;
- journaliser les acces et erreurs dans des fichiers dedies.

## 7.3 Ajustement Keycloak recommande

Point critique :

- le mode `start-dev` doit etre abandonne.

Cible preproduction minimale :

- `start` en mode production ;
- base de donnees persistante ;
- hostname correct ;
- compte admin de preproduction dedie ;
- import realm controle.

## 8. Procedure de build et de deploiement

## 8.1 Preparation serveur

1. Installer OS et appliquer mises a jour.
2. Installer Docker Engine et Compose Plugin.
3. Creer l'arborescence `/opt/sigeda`.
4. Cloner le depot dans `/opt/sigeda/app/repo`.
5. Creer les fichiers d'environnement de preproduction.
6. Placer certificats et secrets hors du depot.

## 8.2 Preparation application

Depuis le repo :

1. verifier les branches et le commit retenu ;
2. executer les validations minimales :
   - `npm install`
   - `npm run typecheck`
   - tests smoke si disponibles ;
3. verifier le schema Prisma ;
4. verifier les fichiers compose et nginx de preproduction.

## 8.3 Build

Procedure recommandee :

1. construire les images `web` et `api-nest` ;
2. tirer les images officielles `postgres`, `minio`, `keycloak`, `nginx`, `opensearch`, `ollama` ;
3. initialiser les volumes persistants ;
4. lancer la pile en ordre controle.

## 8.4 Initialisation base de donnees

Au premier deploiement :

1. demarrer `postgres` ;
2. lancer migrations Prisma ;
3. executer le seed uniquement si la preproduction doit contenir l'organisation de reference ;
4. verifier connectivite backend.

## 8.5 Initialisation stockage

1. demarrer `minio` ;
2. verifier bucket `sigeda-documents` ;
3. verifier droits d'ecriture/lecture via le backend ;
4. confirmer qu'aucun acces direct utilisateur n'est autorise.

## 8.6 Initialisation Keycloak

1. demarrer Keycloak avec variables finales ;
2. verifier import du realm `sigeda` ;
3. verifier `redirect URIs`, `web origins`, clients et roles ;
4. tester connexion et deconnexion depuis le frontal ;
5. tester expiration puis renouvellement de session.

## 8.7 Demarrage final

Ordre recommande :

1. PostgreSQL
2. Keycloak
3. MinIO
4. OpenSearch
5. Ollama
6. API NestJS
7. Web Next.js
8. Nginx

## 9. Base de donnees

## 9.1 Controles obligatoires

- migrations appliquees ;
- utilisateur PostgreSQL dedie ;
- mot de passe fort ;
- volume persistant explicite ;
- verification de la croissance disque ;
- verification des index critiques.

## 9.2 Sauvegarde minimale a mettre en place avant ouverture

Minimum pour le `2026-07-01` :

- dump PostgreSQL quotidien ;
- retention glissante locale de 7 jours ;
- copie externe si possible des le premier jour ;
- test de restauration sur base vide.

Commande type a automatiser :

- `pg_dump` pour sauvegarde logique quotidienne ;
- puis evolution vers `pgBackRest` ou equivalent.

## 10. Stockage documentaire MinIO

## 10.1 Controles obligatoires

- bucket documentaire present ;
- credentials non par defaut ;
- console MinIO non exposee au reseau utilisateur ;
- espace disque suffisant ;
- verification d'ouverture et telechargement depuis SIGEDA.

## 10.2 Sauvegarde minimale

Avant ouverture multi-utilisateurs :

- sauvegarde quotidienne du volume MinIO ;
- verification de restauration d'un fichier ;
- verification de restauration du bucket complet si possible.

## 11. Authentification Keycloak

## 11.1 Controles obligatoires

- realm `sigeda` disponible ;
- client `sigeda-web` conforme ;
- `redirect URIs` correspondant a l'URL intranet reelle ;
- `web origins` limites a l'URL preproduction ;
- comptes de demonstration ou de recette verifies ;
- compte admin `admin/admin` supprime ou modifie.

## 11.2 Scenarios a tester

- connexion initiale ;
- refresh token en arriere-plan ;
- expiration de session ;
- deconnexion ;
- retour a l'application apres authentification ;
- acces par plusieurs profils.

## 12. Nginx, reseau et securite

## 12.1 Reseau

Regles recommandees :

- seul Nginx est accessible aux utilisateurs ;
- acces SSH reserve aux administrateurs ;
- ports internes filtres par pare-feu ;
- si `pgAdmin` est conserve, acces admin seulement.

## 12.2 Headers et limites

A configurer :

- `client_max_body_size` compatible avec la taille de documents cible ;
- timeouts longs pour OCR/IA sans exces ;
- `gzip on` ;
- journaux d'acces et d'erreurs ;
- headers de securite.

## 12.3 Secrets et permissions

- mots de passe hors depot ;
- droits minimaux sur `/opt/sigeda/secrets` ;
- sauvegardes chiffrees si exportees ;
- comptes techniques distincts si possible.

## 13. Journalisation et supervision

## 13.1 Journalisation minimale immediate

Des le deploiement preproduction :

- conserver logs Docker ;
- configurer rotation des logs ;
- conserver logs Nginx ;
- conserver logs applicatifs backend ;
- conserver logs Keycloak.

## 13.2 Supervision minimale immediate

Avant ouverture large, suivre au minimum :

- CPU ;
- RAM ;
- espace disque ;
- etat des conteneurs ;
- temps de reponse applicatif ;
- temps de reponse PostgreSQL ;
- latence OCR/IA si active.

Si Prometheus/Grafana ne sont pas encore installes, documenter au minimum :

- commandes de controle ;
- seuils de saturation ;
- personne responsable de surveillance.

Des assets minimaux ont ete prepares dans le depot pour cette premiere phase :

- timers systemd de healthcheck ;
- timers systemd de sauvegarde ;
- configuration logrotate ;
- scripts shell de backup et de purge ;
- base de hardening UFW et fail2ban.

## 14. Plan de tests preproduction

## 14.1 Tests fonctionnels

Tester depuis le reseau Intranet :

- connexion utilisateur ;
- creation d'un document ;
- OCR + IA si active ;
- pre-remplissage ;
- classement ;
- creation archive documentaire ;
- annotation ;
- consultation ;
- telechargement document ;
- telechargement annotation ;
- recherche ;
- impression ou export si disponible.

## 14.2 Tests multi-profils

Tester :

- agent ;
- manager ;
- directeur ;
- directeur general ;
- administrateur.

Verifier le perimetre de donnees et les actions autorisees.

## 14.3 Tests multi-utilisateurs

Tester simultanement :

- connexions multiples ;
- creation documentaire en parallele ;
- consultation et telechargement paralleles ;
- impact sur PostgreSQL, MinIO et Ollama.

## 15. Sauvegarde et restauration

## 15.1 Sauvegardes a couvrir

Sauvegarder obligatoirement :

- PostgreSQL ;
- volume MinIO ;
- configuration Keycloak ;
- fichiers `.env` de preproduction ;
- configuration Nginx ;
- certificats.

## 15.2 Procedure de restauration a valider

Avant considerer la preproduction comme fiable :

1. restaurer PostgreSQL ;
2. restaurer au moins un fichier MinIO ;
3. restaurer realm/configuration Keycloak si necessaire ;
4. relancer la pile ;
5. verifier qu'un utilisateur peut se connecter et consulter un document.

## 16. Plan de validation finale

Le rapport de fin de deploiement doit lister :

- OS installe ;
- versions des composants ;
- URL de preproduction ;
- services demarres ;
- ports ouverts ;
- tests realises ;
- anomalies detectees ;
- points de vigilance avant production.

## 17. Go / No-Go preproduction

## 17.1 Go si

- l'application est accessible depuis plusieurs postes ;
- l'authentification fonctionne ;
- la creation documentaire est stable ;
- les telechargements fonctionnent ;
- PostgreSQL et MinIO sont persistants ;
- une sauvegarde initiale est disponible ;
- les secrets de demonstration ne sont plus utilises ;
- seuls les ports necessaires sont exposes.

## 17.2 No-Go si

- Keycloak reste en `start-dev` sans decision explicite de risque ;
- les services internes sont tous exposes au reseau utilisateur ;
- aucun plan de sauvegarde n'est en place ;
- les variables `localhost` n'ont pas ete remplacees ;
- les mots de passe par defaut sont encore actifs ;
- les flux documentaires critiques echouent.

## 18. Feuille de route vers la production

Apres cette preproduction mono-serveur, sequence recommandee :

1. durcir Keycloak en mode production complet ;
2. externaliser et cloisonner les acces admin ;
3. mettre en place sauvegardes automatisees et restauration testee ;
4. ajouter supervision Prometheus/Grafana ;
5. reduire les points uniques de defaillance ;
6. preparer une architecture production multi-noeuds.

## 19. Recommandation finale

Pour le deploiement preproduction du `2026-07-01`, la meilleure strategie n'est pas de tout industrialiser d'un coup.

La bonne approche est :

- une seule machine serveur ;
- une pile Docker durcie ;
- Nginx seul expose ;
- secrets et URLs de preproduction propres ;
- Keycloak sorti du mode demonstration ;
- sauvegardes actives des le premier jour ;
- tests reseau multi-utilisateurs immediats ;
- rapport Go / No-Go produit a la fin de la journee.

Cette approche donne une preproduction credible, stable et suffisamment proche de la future production, tout en restant realiste pour une premiere mise en service Intranet de SIGEDA.
