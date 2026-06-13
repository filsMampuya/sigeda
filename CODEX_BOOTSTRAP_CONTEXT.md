# SIGEDA - CODEX BOOTSTRAP CONTEXT

## IMPORTANT

Avant toute analyse, considère que tu reprends un projet existant déjà avancé.

Tu n'es pas chargé de concevoir un nouveau produit.

Tu es chargé de reprendre, comprendre, maintenir et faire évoluer un système déjà conçu.

Ne fais aucune hypothèse qui contredirait les règles métier décrites ci-dessous.

Avant toute proposition :

1. Lire PROJECT_CONTEXT.md.
2. Lire CURRENT_STATE.md.
3. Analyser le code source existant.
4. Considérer les fichiers de contexte comme la source officielle de vérité.
5. Identifier les écarts éventuels entre le code et les règles métier.
6. Préserver les données et la compatibilité fonctionnelle.

---

# CONTEXTE INSTITUTIONNEL

Le projet est développé pour l'Hôtel des Monnaies de la Banque Centrale du Congo.

L'Hôtel des Monnaies est une structure stratégique de la Banque Centrale.

Le système gère des documents institutionnels sensibles.

Les exigences principales sont :

* confidentialité ;
* traçabilité ;
* auditabilité ;
* contrôle d'accès ;
* conservation documentaire ;
* archivage physique et numérique ;
* souveraineté des données.

Ce projet doit être pensé comme une application utilisée dans une Banque Centrale et non comme une GED générique.

---

# NOM DU PROJET

SIGEDA

Système Intégré de Gestion Électronique des Documents et Archives

---

# OBJECTIF DU PROJET

Digitaliser :

* les documents ;
* les archives ;
* les workflows documentaires ;
* les recherches documentaires ;
* la traçabilité ;
* les archives physiques.

Tout en respectant l'organisation réelle de l'Hôtel des Monnaies.

---

# ORGANISATION MÉTIER

Hiérarchie officielle :

Direction
↓
Service
↓
Bureau
↓
Utilisateur

Pour simplifier le modèle technique :

Une seule entité est utilisée :

```ts
Department
```

avec :

```ts
type:
"DIRECTION"
"SERVICE"
"BUREAU"
```

Relations :

Une Direction possède plusieurs Services.

Un Service appartient à une seule Direction.

Un Service possède plusieurs Bureaux.

Un Bureau appartient à un seul Service.

---

# PROFILS UTILISATEURS

DIRECTEUR_GENERAL

DIRECTEUR

MANAGER

AGENT

AUDITEUR

---

# RÈGLES D'ACCÈS

DIRECTEUR_GENERAL

* accès global ;
* appartient exclusivement à la Direction Générale.

DIRECTEUR

* accès à sa direction.

MANAGER

* accès à son service.

AGENT

* accès à son bureau.

AUDITEUR

* accès lecture contrôlée ;
* accès aux journaux d'audit.

Toutes les autorisations doivent être appliquées côté backend.

---

# MODÈLE DOCUMENTAIRE

Chaque document possède :

```ts
emitterDirectionId
receiverDirectionIds[]
copyDirectionIds[]
```

Règles :

* une seule direction émettrice ;
* plusieurs directions destinataires ;
* plusieurs directions en copie possibles.

---

# MOUVEMENT DOCUMENTAIRE

Le mouvement n'est jamais saisi.

Le système le calcule automatiquement.

Si :

```ts
currentDirection === emitterDirectionId
```

Alors :

```ts
movementType = "SORTIE"
```

Si :

```ts
currentDirection ∈ receiverDirectionIds
```

ou

```ts
currentDirection ∈ copyDirectionIds
```

Alors :

```ts
movementType = "ENTREE"
```

---

# ARCHIVAGE PHYSIQUE

Le système reproduit les archives physiques réelles.

Chaque Bureau possède plusieurs classeurs.

Chaque classeur :

* est annuel ;
* appartient à un bureau ;
* représente une direction partenaire ;
* possède une section ENTRÉE ;
* possède une section SORTIE.

---

# LOGIQUE DES CLASSEURS

Un classeur ne représente pas le bureau.

Un classeur représente une direction partenaire.

Exemple :

Bureau Courrier

* Classeur Direction Financière
* Classeur Direction Technique
* Classeur Direction Administrative

Chaque classeur sert à organiser les échanges documentaires avec cette direction.

---

# CLASSEMENT DOCUMENTAIRE

Lorsqu'un document est créé :

Le système doit déterminer automatiquement les classeurs concernés.

Cas SORTIE :

La direction émettrice archive le document dans les classeurs représentant les directions destinataires et les directions en copie.

Cas ENTREE :

La direction destinataire archive le document dans le classeur représentant la direction émettrice.

---

# ARCHIVAGE ANNUEL

Les archives sont annuelles.

Chaque année :

* nouveaux classeurs ;
* nouvelle numérotation documentaire.

La référence documentaire n'est jamais unique globalement.

---

# RÈGLE DE RÉFÉRENCE

La séquence est propre à chaque direction.

Exemple :

Direction Financière :

2026

001
002
003

Direction Technique :

2026

001
002
003

Clé logique :

```txt
emitterDirectionId
+
year
+
referenceNumber
```

---

# INTELLIGENCE ARTIFICIELLE

Une fonctionnalité IA est prévue.

Objectifs :

Analyser automatiquement :

* PDF ;
* image ;
* scan.

Extraire :

* référence ;
* objet ;
* date ;
* signataire ;
* directions ;
* résumé ;
* mots-clés.

Pré-remplir automatiquement les formulaires documentaires.

Technologies envisagées :

* LangChain
* LangGraph

---

# MIGRATION EN COURS

ATTENTION :

Le projet est actuellement en transition vers une architecture on-premise.

Cette migration est une décision stratégique validée.

---

# ANCIENNE ARCHITECTURE

Frontend :

* Next.js

Backend :

* Firebase Functions

Base :

* Firestore

Auth :

* Firebase Auth

Stockage :

* Firebase Storage

---

# NOUVELLE ARCHITECTURE CIBLE

Frontend :

* Next.js
* React
* TypeScript

Backend :

* NestJS

Base :

* PostgreSQL

ORM :

* Prisma

Stockage :

* MinIO

Authentification :

* Keycloak
* LDAP / Active Directory

Recherche :

* OpenSearch

Déploiement :

* Docker Compose
* Kubernetes (future évolution)

---

# OBJECTIF DE LA MIGRATION

Obtenir :

* souveraineté des données ;
* hébergement interne ;
* stockage interne ;
* contrôle total de la sécurité ;
* auditabilité complète.

---

# PRIORITÉ ACTUELLE

Lorsque tu analyses le projet :

1. Identifier les dépendances Firebase.
2. Identifier les modèles Firestore.
3. Préparer la migration vers PostgreSQL.
4. Préparer la migration vers MinIO.
5. Préparer la migration vers Keycloak.
6. Préparer la migration vers OpenSearch.
7. Préserver la compatibilité métier.

---

# CONSIGNE FINALE

Avant toute modification :

* comprendre le métier ;
* comprendre le code ;
* comprendre les contraintes de la Banque Centrale ;
* comprendre la migration en cours.

Ne jamais proposer une solution qui remettrait en cause :

* les règles documentaires ;
* les règles d'archivage ;
* les règles de sécurité ;
* la stratégie on-premise.

Ton rôle est celui d'un Architecte Logiciel Senior chargé de faire évoluer SIGEDA vers une plateforme documentaire souveraine, sécurisée et conforme aux exigences de l'Hôtel des Monnaies de la Banque Centrale du Congo.
