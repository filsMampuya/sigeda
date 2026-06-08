# CURRENT_STATE.md

## Projet

SIGEDA - Système Intégré de Gestion Électronique des Documents et Archives

---

# ÉTAT ACTUEL DU PROJET

Ce projet est déjà en phase avancée de développement.

L'objectif actuel n'est pas de redéfinir l'architecture mais de poursuivre et améliorer l'existant.

---

# STACK TECHNIQUE

Frontend :

* Next.js
* React
* TypeScript
* TailwindCSS
* ShadCN UI

Backend :

* Node.js
* Express.js
* TypeScript

Services :

* Firebase Auth
* Firestore
* Firebase Storage

---

# DÉCISIONS MÉTIER VALIDÉES

## Architecture organisationnelle

Utilisation d'une collection unique :

```ts
Department
```

Types :

```ts
DIRECTION
SERVICE
BUREAU
```

Relations :

Direction
→ Services

Service
→ Bureaux

Bureau
→ Utilisateurs

---

## Gestion documentaire

Le document possède :

* direction émettrice ;
* directions destinataires ;
* directions en copie.

Le type de mouvement :

```txt
ENTREE / SORTIE
```

est calculé automatiquement.

---

## Archivage

Un document :

* possède une seule sortie ;
* peut avoir plusieurs entrées.

Collection :

```ts
DocumentArchive
```

---

## Archivage annuel

Validé.

Chaque année :

* nouveaux classeurs ;
* nouvelle séquence documentaire.

La référence seule n'est jamais unique.

Clé logique :

```ts
emitterDirectionId
+
year
+
referenceNumber
```

---

# MODULES DÉJÀ DÉVELOPPÉS

À adapter selon l'état réel du dépôt.

## Authentification

Status :

✅ Fonctionnel

Fonctionnalités :

* Login
* Logout
* Gestion des sessions

---

## Gestion utilisateurs

Status :

✅ Fonctionnel

Fonctionnalités :

* Création
* Modification
* Affectation des rôles

---

## Gestion Departments

Status :

✅ Fonctionnel

Fonctionnalités :

* Directions
* Services
* Bureaux

CRUD disponible.

---

## Documents

Status :

🟡 Partiellement terminé

Disponible :

* Création
* Consultation
* Liste

À améliorer :

* UX
* Pagination
* Filtres métier
* Permissions

---

## Archives documentaires

Status :

🟡 En cours

À finaliser :

* Pagination
* Filtrage par rôle
* Optimisation Firestore

---

## Archives physiques

Status :

🟡 En cours

À améliorer :

* Simplification écran
* Liaison bureaux
* Gestion annuelle

---

## Dashboard

Status :

🟡 En cours

À améliorer :

* Documents récents
* Activités récentes
* Navigation

---

# DETTES TECHNIQUES IDENTIFIÉES

## UX

Problème principal :

Interfaces trop verbeuses.

Objectifs :

* moins de texte ;
* plus d'actions ;
* plus de lisibilité ;
* style institutionnel Banque Centrale.

---

## Performance

À vérifier :

* requêtes Firestore ;
* pagination serveur ;
* index Firestore.

---

## Sécurité

À renforcer :

* règles Firestore ;
* contrôle des rôles ;
* audit complet.

---

# TRAVAUX PRIORITAIRES

Priorité 1

* Refonte UX Dashboard
* Documents récents
* Pagination serveur

---

Priorité 2

* Filtrage selon profil utilisateur

DIRECTEUR_GENERAL

DIRECTEUR

MANAGER

AGENT

---

Priorité 3

* Refonte écran Nouveau Document

---

Priorité 4

* Numérisation des documents

Scanners :

* USB
* Réseau

Workflow :

Scan
→ PDF
→ IA
→ Pré-remplissage

---

Priorité 5

* IA documentaire

LangChain
ou
LangGraph

Extraction :

* référence ;
* objet ;
* date ;
* signataire ;
* directions ;
* mots-clés.

---

# DÉCISIONS MÉTIER VALIDÉES
## Gestion des classeurs

Décision validée.

Les classeurs ne sont pas globaux.

Chaque classeur est créé dans un bureau donné.

Un classeur représente une direction partenaire.

Exemple :

Bureau Courrier

* Classeur Direction Financière
* Classeur Direction Technique
* Classeur Direction Administrative

---

Chaque classeur possède :

* une année ;
* une section ENTRÉE ;
* une section SORTIE.

---

## Logique de classement

Le classement dépend :

* de la direction émettrice ;
* des directions destinataires ;
* des directions en copie.

Le système doit déterminer automatiquement le ou les classeurs concernés.

---

### Cas SORTIE

Si le bureau appartient à la direction émettrice :

Le document est classé dans les classeurs correspondant aux directions destinataires et aux directions en copie.

---

### Cas ENTRÉE

Si le bureau appartient à une direction destinataire ou en copie :

Le document est classé dans le classeur correspondant à la direction émettrice.

---

## Impact sur le modèle de données

Le modèle Folder doit être basé sur :

* year
* bureauId
* ownerDirectionId
* partnerDirectionId

Le modèle DocumentArchive doit référencer :

* documentId
* bureauId
* folderId
* movementType

Cette architecture est considérée comme validée et constitue désormais la référence pour toute évolution future du module d'archivage.


# RÈGLE IMPORTANTE POUR TOUTE MODIFICATION

Avant toute modification :

1. Lire PROJECT_CONTEXT.md.
2. Lire CURRENT_STATE.md.
3. Analyser le code existant.
4. Ne jamais casser les règles métier validées.
5. Préserver la compatibilité des données existantes.
6. Préférer l'amélioration de l'existant à une réécriture complète.
