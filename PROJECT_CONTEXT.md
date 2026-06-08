# PROJECT CONTEXT - SIGEDA

## Projet

SIGEDA (Système Intégré de Gestion Électronique des Documents et Archives)

---

# CONTEXTE INSTITUTIONNEL

Le projet est développé pour l'Hôtel des Monnaies de la Banque Centrale du Congo.

L'Hôtel des Monnaies possède une organisation hiérarchique structurée comme suit :

Direction Générale
→ Directions
→ Services
→ Bureaux

Chaque Bureau produit ou reçoit des documents dans le cadre de ses missions.

Les documents sont actuellement conservés principalement sous forme physique dans des classeurs répartis dans les différents bureaux, services et directions.

Cette organisation rend parfois difficile :

* la recherche rapide d'un document ;
* la traçabilité des consultations ;
* la conservation à long terme ;
* le partage sécurisé des informations ;
* le suivi documentaire global.

Le projet SIGEDA vise à digitaliser et moderniser la gestion documentaire tout en conservant la logique organisationnelle existante.

---

# PROBLÈME INITIAL

L'archivage actuel repose principalement sur :

* des dossiers physiques ;
* des classeurs manuels ;
* une connaissance humaine des emplacements.

Conséquences :

* temps élevé de recherche ;
* risque de perte ;
* duplication documentaire ;
* faible traçabilité ;
* difficulté de partage inter-services ;
* absence de tableau de bord global.

Le système à développer doit résoudre ces problèmes.

---

# OBJECTIFS DU PROJET

Créer une plateforme institutionnelle permettant :

* la gestion électronique des documents ;
* la gestion des archives physiques ;
* l'upload des fichiers ;
* la gestion des versions ;
* la recherche documentaire avancée ;
* le contrôle des accès ;
* la traçabilité complète ;
* le reporting documentaire ;
* le suivi hiérarchique des documents.

---

# NOM DU PRODUIT

SIGEDA

Système Intégré de Gestion Électronique des Documents et Archives

---

# ARCHITECTURE TECHNIQUE VALIDÉE

Frontend :

* Next.js
* React
* TypeScript
* Tailwind CSS
* ShadCN UI

Backend :

* Node.js
* Express.js
* TypeScript

Base de données :

* Firestore

Stockage :

* Firebase Storage

Authentification :

* Firebase Auth

Logs :

* Audit Trail complet

Déploiement :

* Firebase Hosting
* Cloud Functions

---

# ARCHITECTURE ORGANISATIONNELLE

Direction Générale
→ Directions
→ Services
→ Bureaux
→ Documents

Chaque document appartient obligatoirement à :

* une Direction ;
* un Service ;
* un Bureau.

---

# MODÈLE DE SÉCURITÉ

Rôles :

ADMIN
DIRECTION_GENERALE
DIRECTEUR
CHEF_SERVICE
CHEF_BUREAU
AGENT
ARCHIVISTE
AUDITEUR

Règles :

* un agent ne voit que les documents autorisés ;
* un chef de bureau voit les documents de son bureau ;
* un chef de service voit les documents de son service ;
* un directeur voit les documents de sa direction ;
* la Direction Générale voit l'ensemble ;
* l'auditeur consulte uniquement les traces.

---

# MODULES FONCTIONNELS

## Module Auth

Connexion
Déconnexion
Gestion des rôles

---

## Module Organisation

Directions
Services
Bureaux

---

## Module Documents

CRUD complet

Champs :

* référence
* titre
* description
* auteur
* type
* direction
* service
* bureau
* confidentialité
* statut
* mots-clés
* version

---

## Module Archives Physiques

# LOGIQUE DES CLASSEURS ET DU CLASSEMENT DOCUMENTAIRE

Le système doit reproduire fidèlement l'organisation physique des archives au sein de l'Hôtel des Monnaies.

Chaque classeur est créé dans un bureau spécifique.

Un classeur représente une direction partenaire avec laquelle le bureau échange des documents.

Exemple :

Bureau Courrier - Direction Technique

* Classeur Direction Financière
* Classeur Direction Administrative
* Classeur Direction Production

Chaque classeur est annuel.

Chaque classeur possède deux sections :

* ENTRÉE
* SORTIE

Le rôle d'un classeur est d'organiser les documents échangés entre la direction du bureau et une direction partenaire.

---

## Classement des documents

Lorsqu'un document est créé :

* une direction émettrice est définie ;
* une ou plusieurs directions destinataires sont définies ;
* éventuellement des directions en copie sont définies.

Le système doit utiliser ces informations pour déterminer automatiquement dans quel(s) classeur(s) chaque copie du document doit être archivée.

---

## Classement à la sortie

Si le bureau appartient à la direction émettrice :

Le document est classé dans les classeurs représentant les directions destinataires et les directions en copie.

Exemple :

Direction émettrice :
Direction Financière

Directions destinataires :

* Direction Technique
* Direction Administrative

Direction en copie :

* Direction Audit

Dans les bureaux de la Direction Financière :

* Classeur Direction Technique → SORTIE
* Classeur Direction Administrative → SORTIE
* Classeur Direction Audit → SORTIE

---

## Classement à l'entrée

Si le bureau appartient à une direction destinataire ou en copie :

Le document est classé dans le classeur représentant la direction émettrice.

Exemple :

Direction émettrice :
Direction Financière

Direction destinataire :
Direction Technique

Dans les bureaux de la Direction Technique :

* Classeur Direction Financière → ENTRÉE

---

## Modèle métier du classeur

Chaque classeur est associé à :

* une année ;
* un bureau ;
* une direction propriétaire ;
* une direction partenaire.

Un bureau peut posséder plusieurs classeurs.

Chaque classeur représente une relation documentaire avec une direction partenaire.

Cette règle constitue un élément central du système d'archivage physique.


## Module Recherche

Recherche multicritère.

---

## Module Audit

Journal complet :

* création ;
* modification ;
* suppression ;
* consultation ;
* téléchargement ;
* validation.

---

## Module Dashboard

Statistiques globales :

* documents ;
* archives ;
* validations ;
* activités ;
* indicateurs.

---

# STRUCTURE FIRESTORE

Collections :

users
directions
services
bureaux
documents
physicalArchives
auditLogs
notifications
documentVersions

---

# DÉCISIONS TECHNIQUES IMPORTANTES

1. Utiliser TypeScript partout.

2. Respecter une architecture modulaire.

3. Séparer :

* controllers
* services
* repositories

4. Aucun accès Firestore direct dans les composants React.

5. Toute logique métier doit passer par les services.

6. Toute autorisation doit être centralisée.

7. Toutes les opérations sensibles doivent être tracées.

8. Le code doit être compatible avec un environnement bancaire sensible.

---

# ÉTAT ACTUEL DU PROJET

[À COMPLÉTER PAR LE DÉVELOPPEUR]

Exemple :

✓ Monorepo créé

✓ Frontend Next.js configuré

✓ Backend Express configuré

✓ Firebase configuré

✓ Authentification Firebase opérationnelle

✓ CRUD Directions terminé

✓ CRUD Services terminé

✓ CRUD Bureaux terminé

✓ Upload documents terminé

✓ Gestion des rôles terminée

✓ Dashboard en cours

✓ Audit logs en cours

---

# INSTRUCTIONS POUR CETTE NOUVELLE SESSION

Tu dois considérer que toutes les décisions ci-dessus sont validées.

Avant toute modification :

1. Analyser l'architecture existante.
2. Respecter les conventions déjà mises en place.
3. Éviter toute régression.
4. Réutiliser les composants existants.
5. Respecter les normes de sécurité bancaire.
6. Maintenir la cohérence frontend/backend.

Lorsque je te fournirai du code ou une capture d'écran, considère que cela représente l'état actuel du projet.

Ta mission est de poursuivre le développement sans remettre en cause les choix d'architecture déjà validés sauf si un problème critique est identifié.
