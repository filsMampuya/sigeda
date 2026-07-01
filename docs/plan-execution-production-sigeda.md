# Plan d'execution de mise en production SIGEDA

Mise a jour : `2026-06-19`
Reference : [architecture-production-cible.md](./architecture-production-cible.md)
Branche : `amelioration`

## 1. Objectif

Ce document transforme l'architecture cible en plan d'execution concret.

Il sert a :

- sequencer les travaux ;
- reduire les risques avant production ;
- identifier les dependances ;
- cadrer les livrables techniques ;
- preparer la gouvernance de deploiement et d'exploitation.

## 2. Principes d'execution

Le plan suit les principes suivants :

- ne pas melanger stabilisation applicative et industrialisation infra ;
- valider chaque palier avant de passer au suivant ;
- traiter d'abord la securite, la donnee et la restauration ;
- ne pas viser la haute disponibilite complete avant d'avoir fiabilise les bases ;
- privilegier des livrables testables et auditables.

## 3. Vue d'ensemble des phases

```txt
Phase 0  Cadrage et gouvernance
Phase 1  Stabilisation applicative
Phase 2  Industrialisation de l'infrastructure
Phase 3  Securisation de la plateforme
Phase 4  Sauvegarde, restauration, PRA/PCA
Phase 5  Observabilite et exploitation
Phase 6  Performance et tests de charge
Phase 7  Preproduction complete
Phase 8  Mise en production
Phase 9  Hypercare et exploitation continue
```

## 4. Phase 0 — Cadrage et gouvernance

### Objectif

Poser le cadre de pilotage avant tout chantier technique.

### Travaux

1. Identifier les parties prenantes :
   - MOA ;
   - DSI ;
   - equipe securite ;
   - equipe reseau ;
   - equipe systeme ;
   - equipe DBA ;
   - equipe exploitation ;
   - referents metier SIGEDA.
2. Definir les environnements :
   - developpement ;
   - preproduction ;
   - production.
3. Definir les objectifs de service :
   - disponibilite cible ;
   - RTO ;
   - RPO ;
   - fenetres de maintenance ;
   - volumetrie initiale ;
   - charge utilisateur attendue.
4. Definir les normes de versionnement :
   - releases ;
   - hotfix ;
   - rollback ;
   - nomenclature images ;
   - nomenclature sauvegardes.
5. Definir la gouvernance documentaire :
   - qui valide les changements ;
   - qui autorise les migrations ;
   - qui approuve les mises en production ;
   - qui porte la responsabilite de restauration.

### Livrables

- RACI projet ;
- planning macro ;
- matrice des environnements ;
- politique de versionnement ;
- politique de changement.

### Critere de sortie

- gouvernance validee ;
- perimetre technique valide ;
- responsabilites connues.

## 5. Phase 1 — Stabilisation applicative

### Objectif

Figer une version applicative stable avant industrialisation.

### Travaux backend

1. Revue des parcours critiques :
   - creation document ;
   - classement ;
   - annotations ;
   - ouverture et telechargement de fichiers ;
   - perimetre de visibilite.
2. Revue des validations DTO et erreurs utilisateur.
3. Ajout ou verification des endpoints de sante :
   - `liveness` ;
   - `readiness` ;
   - verification dependances.
4. Ajout d'un identifiant de correlation dans les logs.
5. Standardisation des erreurs HTTP.

### Travaux frontend

1. Revue des parcours critiques et messages d'erreur.
2. Verification des refresh token et reprise sur session expirante.
3. Verification pagination sur toutes les vues volumineuses.
4. Reduction des blocages UX sur erreurs asynchrones.

### Travaux data

1. Revue du schema Prisma :
   - unicite ;
   - cardinalites ;
   - index existants.
2. Validation de la doctrine documentaire :
   - document ;
   - archives documentaires ;
   - classeurs ;
   - annotations ;
   - audit.

### Livrables

- version applicative candidate ;
- check-list de regression ;
- plan de tests fonctionnels SIGEDA ;
- healthchecks exposes.

### Critere de sortie

- zero anomalie bloquante sur les parcours critiques ;
- smoke tests passants ;
- schema fonctionnel fige.

## 6. Phase 2 — Industrialisation de l'infrastructure

### Objectif

Passer d'une pile de demonstration a une pile exploitable.

### Travaux systeme

1. Choisir l'OS cible :
   - Rocky Linux 9 recommande.
2. Definir les VM ou serveurs :
   - reverse proxy ;
   - web/api ;
   - PostgreSQL ;
   - Keycloak ;
   - MinIO ;
   - supervision ;
   - backup.
3. Definir le plan reseau :
   - VLAN utilisateurs ;
   - VLAN administration ;
   - VLAN base ;
   - VLAN stockage ;
   - pare-feu inter-zones.

### Travaux conteneurs

1. Separer les fichiers Compose par environnement :
   - `compose.base.yml`
   - `compose.preprod.yml`
   - `compose.prod.yml`
2. Externaliser toutes les variables sensibles.
3. Interdire les credentials par defaut.
4. Definir les volumes persistants.

### Travaux proxy

1. Nginx en frontal HA ;
2. terminaison TLS ;
3. redirection HTTP vers HTTPS ;
4. headers de securite ;
5. limites de payload ;
6. timeouts et upstream health.

### Livrables

- design reseau cible ;
- matrice des serveurs ;
- fichiers de deploiement par environnement ;
- conventions secrets / volumes / certificats.

### Critere de sortie

- environnement infra cible de preproduction cree ;
- tous les composants deploient proprement ;
- aucune dependance critique non documentee.

## 7. Phase 3 — Securisation de la plateforme

### Objectif

Elever le niveau de securite au standard institutionnel.

### Travaux Keycloak

1. Sortir du mode `start-dev`.
2. Base dediee Keycloak.
3. Comptes admin separes.
4. Rotation des secrets.
5. Politique MFA pour comptes privilegies.
6. Parametrer durees de session, refresh, logout.

### Travaux applicatifs

1. Revue des controles RBAC.
2. Validation stricte du perimetre de donnees.
3. Revue des telechargements securises.
4. Suppression de tout acces direct non controle aux fichiers.

### Travaux systeme et reseau

1. Durcissement OS :
   - mises a jour ;
   - services minimaux ;
   - SSH restreint ;
   - auditd si applicable.
2. Durcissement Docker :
   - permissions ;
   - comptes de service ;
   - registry privee ;
   - scan images.
3. Cloisonnement admin :
   - pgAdmin non expose aux utilisateurs ;
   - MinIO console admin restreinte ;
   - Keycloak admin restreint.

### Travaux chiffrement

1. Mise en place TLS ;
2. certificats institutionnels ;
3. chiffrement sauvegardes ;
4. chiffrement stockage si disponible.

### Livrables

- matrice des acces ;
- dossier de durcissement ;
- politique de secrets ;
- check-list de securite.

### Critere de sortie

- aucun secret par defaut ;
- acces admin cloisonnes ;
- TLS en place ;
- mode production actif sur les composants critiques.

## 8. Phase 4 — Sauvegarde, restauration, PRA/PCA

### Objectif

Garantir qu'une panne n'entraine ni perte non maitrisee ni indisponibilite non comprise.

### Travaux PostgreSQL

1. Mettre en place `pgBackRest` ou equivalent.
2. Sauvegardes completes + incrementales.
3. Archivage WAL si necessaire.
4. Test de restauration sur serveur vierge.

### Travaux MinIO

1. Versioning bucket.
2. Sauvegarde reguliere des buckets.
3. Test de restauration :
   - fichier unique ;
   - bucket complet.

### Travaux Keycloak

1. Sauvegarde base dediee ;
2. export realm ;
3. test de recreation complete.

### PRA/PCA

1. Ecrire les procedures :
   - perte d'un noeud app ;
   - perte PostgreSQL ;
   - perte Keycloak ;
   - perte MinIO ;
   - corruption donnees.
2. Associer :
   - delais ;
   - responsable ;
   - prerequis ;
   - ordre des actions ;
   - tests annuels.

### Livrables

- procedure de sauvegarde ;
- procedure de restauration ;
- procedure PRA ;
- objectifs RTO/RPO finalises.

### Critere de sortie

- restauration PostgreSQL testee ;
- restauration MinIO testee ;
- PRA redige et relu.

## 9. Phase 5 — Observabilite et exploitation

### Objectif

Permettre la supervision proactive et l'analyse d'incidents.

### Travaux monitoring

1. Installer :
   - Prometheus ;
   - Grafana ;
   - Alertmanager ;
   - exporters systeme et PostgreSQL.
2. Exposer des metriques applicatives :
   - temps de reponse ;
   - erreurs ;
   - usage routes critiques ;
   - operations documentaires.

### Travaux logs

1. Centraliser :
   - Nginx ;
   - web ;
   - API ;
   - PostgreSQL ;
   - Keycloak ;
   - MinIO.
2. Choix recommande :
   - Loki pour simplicite ;
   - OpenSearch si besoin de recherche plus large.

### Travaux dashboards

1. Dashboard sante plateforme ;
2. dashboard base de donnees ;
3. dashboard flux documentaires ;
4. dashboard erreurs fichiers/session.

### Travaux alerting

1. Alertes indisponibilite ;
2. alertes saturation disque ;
3. alertes erreurs 5xx ;
4. alertes echec sauvegarde ;
5. alertes replication PostgreSQL.

### Livrables

- stack observabilite operationnelle ;
- tableaux de bord Grafana ;
- matrice d'alertes ;
- procedure de traitement incident.

### Critere de sortie

- supervision active ;
- alertes testees ;
- logs exploitables en central.

## 10. Phase 6 — Performance et tests de charge

### Objectif

Valider la capacite de SIGEDA a tenir la charge attendue.

### Travaux base de donnees

1. Analyse plans d'execution ;
2. ajout indexes manquants ;
3. tuning PostgreSQL ;
4. evaluation PgBouncer.

### Travaux backend

1. Profiling routes critiques ;
2. limitation des includes Prisma ;
3. optimisation des recherches ;
4. preparation des traitements lourds asynchrones.

### Travaux frontend

1. verification SSR/CSR ;
2. optimisation chargement listes ;
3. verification des parcours volumineux.

### Travaux tests

1. Scenarios de charge :
   - connexions simultanees ;
   - creations documentaires ;
   - classements ;
   - annotations ;
   - telechargements ;
   - recherches.
2. Mesures :
   - p50, p95, p99 ;
   - CPU ;
   - memoire ;
   - I/O ;
   - latence SQL ;
   - debit MinIO.

### Livrables

- rapport de charge ;
- tuning plan ;
- capacite nominale ;
- seuils d'alerte.

### Critere de sortie

- objectifs de latence validables ;
- goulets d'etranglement connus ;
- plan de tuning approuve.

## 11. Phase 7 — Preproduction complete

### Objectif

Avoir un clone le plus proche possible de la production.

### Travaux

1. Deploiement complet sur infra cible.
2. Chargement des donnees de reference.
3. Recette fonctionnelle metier.
4. Recette securite.
5. Recette restauration.
6. Recette supervision.
7. Recette deploiement/rollback.

### Livrables

- PV de recette technique ;
- PV de recette metier ;
- PV de restauration ;
- rapport Go / No-Go preproduction.

### Critere de sortie

- preproduction jugee conforme ;
- aucun ecart bloquant non traite.

## 12. Phase 8 — Mise en production

### Objectif

Realiser la bascule avec risque maitrise.

### Sequence recommandee

1. Gel des changements ;
2. sauvegarde pre-deploiement ;
3. verification secrets/certificats ;
4. deploiement services infra ;
5. deploiement base et migrations ;
6. deploiement Keycloak ;
7. deploiement API ;
8. deploiement frontend ;
9. verification Nginx/LB ;
10. smoke tests ;
11. validation metier ;
12. ouverture utilisateurs.

### Plan de rollback

1. restauration image precedente ;
2. restauration config precedente ;
3. rollback base uniquement si scenario valide ;
4. communication incident.

### Livrables

- runbook de mise en production ;
- runbook de rollback ;
- check-list d'ouverture ;
- PV Go / No-Go production.

### Critere de sortie

- deploiement reussi ;
- smoke tests OK ;
- utilisateurs valides ;
- supervision nominale.

## 13. Phase 9 — Hypercare et exploitation continue

### Objectif

Stabiliser la production apres la mise en service.

### Travaux

1. Hypercare 2 a 4 semaines.
2. Suivi quotidien :
   - erreurs ;
   - performance ;
   - charge ;
   - tickets utilisateurs.
3. Corrections mineures et hotfix process.
4. Revue de capacite mensuelle.
5. Revue de securite periodique.
6. Exercices PRA annuels.

### Livrables

- tableau de bord exploitation ;
- revue post production ;
- backlog ameliorations d'exploitation.

### Critere de sortie

- systeme stable ;
- exploitation autonomisee ;
- dette de production identifiee et planifiee.

## 14. Chantiers transverses obligatoires

Ces chantiers doivent vivre du debut a la fin :

### 14.1 Documentation

- architecture ;
- procedures de deploiement ;
- procedures de restauration ;
- guide d'exploitation ;
- guide d'administration Keycloak ;
- guide DBA ;
- guide support niveau 1/2.

### 14.2 Gouvernance des secrets

- inventaire des secrets ;
- rotation ;
- coffre-fort ;
- controle d'acces ;
- tracabilite des changements.

### 14.3 Gouvernance des donnees

- retention ;
- purge ;
- archivage long terme ;
- politique fichiers ;
- politique logs.

### 14.4 Securite

- revues regulieres ;
- scan dependances ;
- scan images ;
- correctifs OS ;
- revues RBAC.

## 15. Planning type recommande

### Lot court terme

- Phase 0
- Phase 1
- Phase 2

### Lot moyen terme

- Phase 3
- Phase 4
- Phase 5

### Lot avant go-live

- Phase 6
- Phase 7
- Phase 8

### Lot post go-live

- Phase 9

## 16. Priorites executives

Si l'on doit prioriser strictement, l'ordre recommande est :

1. stabilisation fonctionnelle ;
2. sauvegarde et restauration ;
3. securisation Keycloak et secrets ;
4. supervision ;
5. preproduction fidele ;
6. tests de charge ;
7. production.

## 17. Prochaine transformation recommandee

Le prochain niveau utile de detail consiste a transformer ce plan en :

- lot technique serveur par serveur ;
- check-list composant par composant ;
- backlog d'implementation infra ;
- matrice de risques par phase ;
- runbooks d'exploitation.
