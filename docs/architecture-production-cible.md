# Preparation de la mise en production SIGEDA

Mise a jour : `2026-06-19`
Branche de travail : `amelioration`

## 1. Objectif

Ce document fait basculer SIGEDA d'une logique de demonstration vers une logique :

- production ;
- exploitation ;
- securite ;
- disponibilite ;
- performance ;
- maintenabilite ;
- gouvernance.

Le contexte cible est un hebergement `On-Premise` pour l'Hotel des Monnaies de la Banque Centrale du Congo, avec documents sensibles, forte exigence de tracabilite et besoin de tenue en charge dans la duree.

## 2. Etat des lieux actuel

### 2.1 Monorepo

Le depot est structure en monorepo :

- `apps/web` : frontend Next.js ;
- `apps/api-nest` : backend metier NestJS ;
- `packages/database` : schema Prisma et seed PostgreSQL ;
- `packages/shared` : types, schemas et contrats partages ;
- `infra/docker` : pile Docker Compose locale.

### 2.2 Frontend

Stack constatee :

- Next.js `14` ;
- React `18` ;
- Tailwind CSS ;
- composants Radix / ShadCN ;
- App Router ;
- routes serveur Next pour proxifier certaines operations sensibles.

Role :

- interface utilisateur institutionnelle ;
- orchestration UX ;
- appels backend ;
- gestion de session web avec Keycloak.

Forces :

- socle moderne et maintenable ;
- separation correcte entre composants, pages et helpers ;
- possibilite de rendre cote serveur certaines vues sensibles ;
- bonne base pour pagination, filtres et parcours metier.

Limites actuelles :

- pas de pipeline de build/release formalise dans le depot ;
- pas de supervision frontend ;
- pas de gestion explicite de cache distribue ;
- pas de mecanisme de CDN prive ou de strategy d'edge cache ;
- logs applicatifs frontend non centralises.

Risques :

- derive de performance lorsque le volume de donnees augmente ;
- erreurs de session ou de proxy difficiles a diagnostiquer sans observabilite ;
- build Next couple aux variables d'environnement de la pile courante.

Recommandations :

- figer une configuration `prod` distincte des variables `dev/demo` ;
- centraliser les logs d'erreurs SSR et routes API Next ;
- activer supervision de latence et taux d'erreur ;
- garder Next.js comme BFF web, mais ne pas en faire la seule couche de controle de securite.

### 2.3 Backend

Stack constatee :

- NestJS `10` ;
- Prisma ;
- validation par `class-validator` ;
- `helmet` ;
- CORS ;
- MinIO SDK ;
- JOSE pour validation JWT Keycloak.

Role :

- coeur metier SIGEDA ;
- controle RBAC et perimetre de donnees ;
- classement documentaire ;
- annotations ;
- audit ;
- acces securise aux fichiers.

Forces :

- architecture modulaire ;
- logique metier clairement centralisee cote backend ;
- validation DTO globale ;
- prefixe API versionne `/api/v1`.

Limites actuelles :

- absence de rate limiting natif ;
- pas de bus de taches asynchrones ;
- pas de cache applicatif partage ;
- endpoint de sante tres simple ;
- pas de metriques Prometheus ;
- pas de circuit de migration/deploiement transactionnel formalise.

Risques :

- difficultes de diagnostic en cas de degradation lente ;
- contention base de donnees si la volumetrie augmente sans index complementaires ;
- longues transactions ou requetes complexes sur rapports futurs ;
- indisponibilite complete si l'unique conteneur API chute.

Recommandations :

- ajouter `readiness`, `liveness`, `dependencies health` ;
- instrumenter metriques techniques et metier ;
- ajouter rate limiting, correlation id, structured logging ;
- prevoir une file de traitements pour les operations lourdes.

### 2.4 Base de donnees

Stack constatee :

- PostgreSQL `16` ;
- acces via Prisma ;
- schema relationnel deja riche : documents, recipients, classeurs, archives, annotations, versions, audit.

Role :

- source de verite metier ;
- journalisation applicative ;
- traçabilite documentaire ;
- securisation du perimetre organisationnel.

Forces :

- modele relationnel adapte a la tracabilite ;
- timestamps automatiques ;
- contraintes d'unicite utiles ;
- indexes de base deja presents.

Limites actuelles :

- pas de partitionnement ;
- pas de plan de sauvegarde visible dans le depot ;
- pas de replication ;
- pas de pool de connexions dedie ;
- pas de tuning PostgreSQL explicite pour la production.

Risques :

- base unique = point de defaillance unique ;
- croissance rapide des tables `audit_logs`, `document_annotations`, `document_transmissions` ;
- fenetre de restauration potentiellement longue ;
- saturation I/O si stockage mal dimensionne.

Recommandations :

- mettre en place sauvegarde `pg_basebackup` ou `pgBackRest` ;
- prevoir replication primaire/secondaire ;
- definir retention, VACUUM, ANALYZE, autovacuum tuning ;
- preparer des indexes complementaires bases sur les usages reels.

### 2.5 Authentification

Stack constatee :

- Keycloak `25` ;
- realm importe par JSON ;
- mode `start-dev` dans Docker Compose ;
- verification JWT cote backend ;
- login web via Keycloak.

Role :

- authentification centralisee ;
- SSO ;
- federation des identites ;
- cycle de vie des sessions.

Forces :

- bon choix pour un SI on-premise institutionnel ;
- support des roles, realms, clients, federation, MFA ;
- separation correcte entre authentification et logique metier.

Limites actuelles :

- configuration actuelle en mode developpement ;
- pas de base Keycloak externe dediee dans `docker-compose.yml` ;
- secrets et comptes admin de demonstration encore presents ;
- pas de haute disponibilite.

Risques :

- non conformite de production si conserve en `start-dev` ;
- indisponibilite globale si Keycloak tombe ;
- exposition de parametres sensibles si les variables ne sont pas externalisees correctement.

Recommandations :

- migrer Keycloak vers mode production ;
- base PostgreSQL dediee a Keycloak ;
- au moins deux noeuds Keycloak derriere proxy/LB ;
- politique MFA pour profils sensibles ;
- rotation des secrets clients et mots de passe admin.

### 2.6 Stockage documentaire

Stack constatee :

- MinIO single-node ;
- bucket documentaire unique ;
- URLs d'acces controlees par le backend.

Role :

- stockage des fichiers documentaires ;
- stockage des fichiers d'annotation ;
- decouplage binaire / base relationnelle.

Forces :

- bon choix on-premise compatible S3 ;
- simple a exploiter ;
- integration propre avec le backend.

Limites actuelles :

- un seul noeud ;
- pas de versioning visible dans le depot ;
- pas de politique de cycle de vie visible ;
- pas de replication ni d'immutabilite configuree.

Risques :

- perte documentaire si corruption ou panne disque sans sauvegarde valide ;
- performance degradee si volumetrie forte sur un seul hote ;
- gouvernance faible sans politiques buckets, retention et chiffrement.

Recommandations :

- activer versioning des buckets ;
- activer chiffrement au repos ;
- definir sauvegarde reguliere et test de restauration ;
- envisager mode distribue MinIO si HA exigee.

### 2.7 Infrastructure

Stack constatee :

- Docker ;
- Docker Compose ;
- Nginx ;
- OpenSearch single-node ;
- pgAdmin expose ;
- toutes les briques exposees localement par ports.

Role :

- environnement d'execution on-premise actuel ;
- proxy web ;
- orchestration simple pour dev/demo.

Forces :

- installation rapide ;
- lisibilite des dependances ;
- bon socle pour preproduction locale.

Limites actuelles :

- architecture mono-hote ;
- pas de separation reseau stricte ;
- pas de secrets manager ;
- pas de supervision ;
- pas de registry/image policy ;
- Nginx sans TLS dans le depot.

Risques :

- point de defaillance unique ;
- faible resilience ;
- exposition excessive des services d'administration ;
- maintien en condition operationnelle manuel.

Recommandations :

- ne pas considerer la pile Compose actuelle comme architecture de production finale ;
- l'utiliser comme base de preproduction ou d'environnement de reference ;
- durcir l'isolation reseau, l'acces admin et les ports exposes.

## 3. Constats critiques avant production

Les points suivants bloquent une vraie mise en production bancaire :

- Keycloak en mode `start-dev` ;
- PostgreSQL sans replication ni sauvegarde formalisee ;
- MinIO single-node sans plan de reprise visible ;
- absence de supervision Prometheus/Grafana ;
- absence de logs centralises ;
- absence de TLS et PKI documentes ;
- absence de secrets management industrialise ;
- absence de pipeline CI/CD documente ;
- absence de strategie de rollback outillee ;
- absence de tests de charge et de PRA documentes.

## 4. Architecture cible recommandee

### 4.1 Positionnement

Recommandation :

- `Phase 1 production initiale` : architecture VM/Bare Metal on-premise avec conteneurs Docker, reverse proxy HA, supervision et sauvegardes ;
- `Phase 2` : ajout de haute disponibilite forte pour PostgreSQL, Keycloak et MinIO ;
- `Phase 3` : orchestration plus avancee si le volume et l'equipe d'exploitation le justifient.

Kubernetes n'est pas le premier choix recommande a court terme si l'equipe d'exploitation est reduite. Une architecture Docker industrialisee et bien supervisee sera plus realiste, plus simple a maintenir et plus rapide a stabiliser.

### 4.2 Diagramme cible logique

```txt
Utilisateurs internes
   ↓
Pare-feu / VLAN / WAF interne
   ↓
Load Balancer / Reverse Proxy Nginx (x2)
   ↓
Frontend Next.js (x2)
   ↓
Backend NestJS (x2 ou plus)
   ↓
PostgreSQL primaire + replica
   ↓
MinIO distribue ou single-node durci selon phase
   ↓
Sauvegardes hors noeud + coffre de restauration

Authentification transverse :
Keycloak (x2) + PostgreSQL dedie

Observabilite transverse :
Prometheus + Grafana + Loki/OpenSearch + Alertmanager
```

### 4.3 Diagramme cible physique minimal

```txt
VM1   reverse-proxy-1      Nginx
VM2   reverse-proxy-2      Nginx
VM3   web-api-1            Next.js + NestJS
VM4   web-api-2            Next.js + NestJS
VM5   postgres-primary     PostgreSQL
VM6   postgres-replica     PostgreSQL
VM7   keycloak-1           Keycloak
VM8   keycloak-2           Keycloak
VM9   keycloak-db          PostgreSQL dedie Keycloak
VM10  minio-1              MinIO
VM11  observability        Prometheus + Grafana + Loki
VM12  backup               pgBackRest / restic / snapshots
```

Cette cible peut etre compactee en preproduction, mais pas en production sensible si la disponibilite est critique.

## 5. Logiciels et OS a installer

### 5.1 Systeme d'exploitation

Recommandation principale :

- `Rocky Linux 9` pour les serveurs de production.

Alternatives acceptables :

- `RHEL 9` si la banque dispose de souscriptions ;
- `Ubuntu Server 24.04 LTS` si la DSI est plus a l'aise avec cet ecosysteme.

Pourquoi Rocky Linux 9 :

- bon alignement entreprise ;
- forte stabilite ;
- ecosysteme RHEL ;
- bon support des pratiques securite et durcissement.

### 5.2 Socle technique

Logiciels recommandes :

- Nginx ;
- Docker Engine ;
- Docker Compose plugin ;
- PostgreSQL 16 ;
- pgBackRest ;
- MinIO ;
- Keycloak ;
- Prometheus ;
- Grafana ;
- Alertmanager ;
- Loki ou OpenSearch pour les logs ;
- node exporter ;
- postgres exporter ;
- blackbox exporter ;
- MinIO exporter ;
- restic ou equivalent pour sauvegardes fichiers.

### 5.3 Outils d'administration

Utiles mais a restreindre :

- pgAdmin ;
- interface MinIO console ;
- interface Keycloak admin ;
- SSH bastion ;
- Portainer uniquement si l'equipe d'exploitation le maitrise et si l'acces est strictement cloisonne.

## 6. Build, release et deploiement

### 6.1 Build

Le depot produit aujourd'hui :

- build frontend via `next build` ;
- build backend via `tsc` ;
- build d'images Docker via Dockerfiles applicatifs.

Recommandation :

- une image Docker par application ;
- tags immuables ;
- dependances verrouillees ;
- promotion d'artefacts entre environnements.

### 6.2 Strategie de versionnement

Versionnement recommande :

- `v1.0.0` : premiere mise en production ;
- `v1.0.1` : correctif compatible ;
- `v1.1.0` : ajout fonctionnel retrocompatible ;
- `v2.0.0` : rupture contractuelle ou schema majeur.

Associer chaque release a :

- hash Git ;
- notes de version ;
- scripts Prisma associes ;
- date de deploiement ;
- responsable de validation.

### 6.3 Pipeline recommande

Etapes minimales :

1. `lint + typecheck`
2. `build shared`
3. `build web`
4. `build api`
5. `tests smoke`
6. `tests fonctionnels`
7. `build images`
8. `scan securite images`
9. `push registry interne`
10. `deploy preproduction`
11. `validation fonctionnelle`
12. `promotion production`

### 6.4 Registry

Recommandation :

- registry privee on-premise ;
- retention des images ;
- signature d'image si possible ;
- politique d'interdiction des tags flottants en production.

### 6.5 Deploiement production

Approche recommandee :

- `blue/green` si l'infrastructure le permet ;
- sinon `rolling update` par noeud applicatif ;
- migrations Prisma executees de maniere explicite avant bascule trafic ;
- rollback prepare a l'avance.

## 7. Strategie de mise a jour

### 7.1 Environnements

Conserver trois paliers :

- developpement ;
- preproduction ;
- production.

### 7.2 Regle de promotion

- rien n'entre en production sans etre passe en preproduction ;
- schema Prisma et application doivent etre versionnes ensemble ;
- les variables et secrets doivent etre specifiques par environnement ;
- la restauration doit etre testee avant les mises a jour majeures.

### 7.3 Rollback

Prevoir :

- rollback applicatif par image precedente ;
- rollback base uniquement via procedure maitrisee ;
- sauvegarde avant migration irreversible ;
- decision tree `go/no-go` avant deploiement.

## 8. Performance et montee en charge

### 8.1 PostgreSQL

Actions recommandees :

- revue d'indexes sur :
  `documents`,
  `document_archives`,
  `document_annotations`,
  `audit_logs`,
  `document_transmissions` ;
- indexes composes sur les filtres metier les plus frequents ;
- partitionnement par annee ou par date pour `audit_logs` a moyen terme ;
- vues materialisees pour statistiques lourdes ;
- pool de connexions via PgBouncer.

### 8.2 Backend

Actions recommandees :

- pagination obligatoire partout ;
- limiter les `include` Prisma profonds ;
- isoler les exports lourds ;
- mise en cache des referentiels peu mouvants ;
- file asynchrone pour traitements non critiques.

### 8.3 Frontend

Actions recommandees :

- pagination serveur partout ;
- `lazy loading` des composants lourds ;
- suppression des surcharges SSR inutiles ;
- eventuelle virtualisation pour longues listes.

### 8.4 MinIO

Actions recommandees :

- quotas et monitoring volumetrique ;
- separation des buckets si besoin ;
- lifecycle rules ;
- verification reguliere de l'integrite et des temps de restauration.

## 9. Rapports et tableaux de bord

Pour les rapports futurs, la cible recommande :

- PostgreSQL pour l'operationnel temps reel ;
- vues materialisees pour reporting interne ;
- tables d'agregation pour indicateurs mensuels/annuels ;
- Metabase pour explorations metier ;
- Grafana pour supervision technique ;
- Power BI uniquement si l'organisation l'impose et si les flux de donnees sont gouvernes.

Recommandation pragmatique :

- demarrer avec PostgreSQL + vues materialisees + Metabase ;
- reserver OpenSearch aux usages de recherche ou de log analytics, pas au reporting principal.

## 10. Securite cible

### 10.1 Authentification

- Keycloak en mode production ;
- clients distincts `web`, `admin`, `integration` ;
- MFA pour comptes sensibles ;
- rotation des secrets ;
- session management stricte.

### 10.2 Autorisations

- conserver RBAC metier ;
- completer si besoin par ACL documentaire pour cas exceptionnels ;
- verifier le perimetre au backend uniquement ;
- tracer toute elevation ou bypass.

### 10.3 Chiffrement

- TLS interne et externe ;
- certificats issus d'une PKI institutionnelle ;
- chiffrement des sauvegardes ;
- chiffrement au repos pour PostgreSQL et MinIO si l'infrastructure le permet.

### 10.4 Comptes et privileges

- comptes techniques distincts par service ;
- pas d'usage de comptes admin par defaut ;
- moindre privilege ;
- rotation reguliere des mots de passe techniques.

### 10.5 Journalisation

- logs d'authentification ;
- logs applicatifs structures ;
- audit trail metier immuable ;
- retention et archivage des journaux.

### 10.6 Perimetre reseau

- exposition minimale des ports ;
- interfaces d'administration sur VLAN dedie ;
- bastion ou VPN admin ;
- pas d'exposition directe de PostgreSQL, MinIO, Keycloak admin au reseau utilisateur.

## 11. Continuite de service

### 11.1 Sauvegardes

Minimum requis :

- sauvegardes PostgreSQL quotidiennes ;
- WAL archiving si RPO faible ;
- sauvegardes MinIO quotidiennes ;
- export regulier des configurations Keycloak ;
- sauvegarde des fichiers de configuration Nginx et Compose.

### 11.2 Restauration

Tester regulierement :

- restauration complete PostgreSQL ;
- restauration d'un bucket MinIO ;
- restauration d'un document individuel ;
- restauration Keycloak ;
- redemarrage complet sur hote vierge.

### 11.3 PRA / PCA

Questions et reponses attendues :

- si PostgreSQL tombe :
  bascule replica ou restauration controlee ;
- si MinIO tombe :
  acces fichiers interrompu, restauration depuis sauvegarde ou noeud distribue ;
- si Keycloak tombe :
  plus de nouvelles sessions, maintien limite des sessions existantes selon design, reprise prioritaire ;
- si un serveur applicatif est perdu :
  bascule sur le second noeud applicatif.

Objectifs a definir formellement :

- `RPO` ;
- `RTO` ;
- niveau de service cible ;
- priorite de reprise par composant.

## 12. Observabilite

### 12.1 Architecture cible

```txt
SIGEDA services
   ↓
Exporters / structured logs
   ↓
Prometheus + Loki/OpenSearch
   ↓
Grafana + Alertmanager
   ↓
Alertes mail / SMS / supervision interne
```

### 12.2 Metriques a suivre

- disponibilite des services ;
- latence API ;
- erreurs HTTP par route ;
- connexions PostgreSQL ;
- temps de requete SQL ;
- volumetrie MinIO ;
- connexions Keycloak ;
- nombre de documents crees ;
- nombre de documents classes ;
- nombre d'annotations ;
- taux d'echec d'ouverture / telechargement fichier.

### 12.3 Logs

Centraliser :

- logs Nginx ;
- logs Next.js ;
- logs NestJS ;
- logs PostgreSQL ;
- logs Keycloak ;
- logs MinIO.

## 13. Conformite institutionnelle

SIGEDA va dans la bonne direction fonctionnelle, mais l'architecture actuelle n'est pas encore au niveau attendu pour :

- un environnement de banque centrale ;
- des documents sensibles ;
- un besoin de conservation durable ;
- une auditabilite forte ;
- une exploitation plusieurs annees.

Pour atteindre ce niveau, il faut au minimum :

- industrialiser l'authentification ;
- durcir l'infrastructure ;
- formaliser sauvegarde et PRA ;
- centraliser logs et supervision ;
- documenter build, release et exploitation ;
- reduire les points uniques de defaillance.

## 14. Feuille de route de production

### Phase 1. Stabilisation

- figer les parcours critiques ;
- corriger les regressions ;
- nettoyer les variables de demonstration ;
- ajouter healthchecks riches ;
- ajouter logs structures.

### Phase 2. Preproduction

- monter une preproduction isolee ;
- deploiement sur OS cible ;
- tests de restauration ;
- tests de migration Prisma ;
- validation des comptes et roles.

### Phase 3. Tests de charge

- simulation charge utilisateurs ;
- simulation charge documentaire ;
- mesure latence et contention DB ;
- ajustement index et sizing.

### Phase 4. Securisation

- TLS ;
- rotation secrets ;
- MFA ;
- hardening OS ;
- cloisonnement reseau ;
- revue des privileges.

### Phase 5. Mise en production

- sauvegarde pre-deploiement ;
- migration schema ;
- deploiement blue/green ou rolling ;
- recette de smoke test ;
- validation metier et technique.

### Phase 6. Exploitation

- supervision continue ;
- patch management ;
- revues capacitaires ;
- audits de securite ;
- exercices PRA.

## 15. Recommandations prioritaires

### Priorite immediate

- sortir Keycloak du mode developpement ;
- definir secrets et mots de passe de production ;
- ajouter supervision minimale ;
- definir sauvegarde/restauration PostgreSQL et MinIO ;
- documenter procedure de deploiement.

### Priorite court terme

- replication PostgreSQL ;
- cluster applicatif web/api ;
- logs centralises ;
- metrics Prometheus ;
- tests de charge.

### Priorite moyen terme

- HA Keycloak ;
- MinIO distribue ou plan de reprise renforce ;
- vues materialisees pour reporting ;
- outillage de release et de rollback.

## 16. Decision d'architecture recommandee

Decision pragmatique recommandee pour SIGEDA :

- conserver `Next.js + NestJS + PostgreSQL + Keycloak + MinIO` ;
- conserver `Docker` comme socle de packaging ;
- utiliser `Docker Compose industrialise` ou systemd + conteneurs pour la premiere production ;
- ne pas introduire Kubernetes tant que l'equipe exploitation, la supervision et les procedures ne sont pas matures ;
- investir d'abord dans la resilience des donnees, la securite, les sauvegardes et l'observabilite.

## 17. Conclusion

L'architecture applicative de SIGEDA est pertinente. Le principal chantier n'est plus le choix de stack, mais l'industrialisation :

- durcissement ;
- haute disponibilite ;
- exploitation ;
- supervision ;
- sauvegarde ;
- gouvernance.

La pile actuelle est une bonne base de preproduction. Elle ne doit pas etre promue telle quelle en production bancaire sans la phase de transformation decrite dans ce document.
