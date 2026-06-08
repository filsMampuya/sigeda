# SIGEDA - PROJECT CONTEXT

## Projet

SIGEDA (Système Intégré de Gestion Électronique des Documents et Archives)

---

# CONTEXTE INSTITUTIONNEL

Ce projet est développé pour l'Hôtel des Monnaies de la Banque Centrale du Congo (BCC).

L'Hôtel des Monnaies est une structure stratégique de la Banque Centrale chargée notamment de la gestion des activités liées à la production fiduciaire, à l'administration documentaire, à la gestion technique et au fonctionnement institutionnel de la structure.

L'environnement est fortement réglementé et exige :

* confidentialité ;
* traçabilité ;
* sécurité ;
* contrôle des accès ;
* conservation documentaire ;
* auditabilité.

Le système développé doit donc être conçu selon des standards proches de ceux utilisés dans les institutions financières et les banques centrales.

---

# PROBLÈME MÉTIER

Actuellement, une grande partie des archives est conservée sous forme physique.

Les documents sont répartis dans :

* les Directions ;
* les Services ;
* les Bureaux.

Cette organisation historique rend parfois difficile :

* la recherche rapide d'un document ;
* le suivi documentaire ;
* la traçabilité ;
* la conservation ;
* le partage sécurisé de l'information.

L'objectif principal du projet est de digitaliser la gestion documentaire tout en respectant les pratiques d'archivage existantes de l'Hôtel des Monnaies.

---

# OBJECTIF DU SYSTÈME

SIGEDA doit permettre :

* la gestion électronique des documents ;
* la gestion des archives physiques ;
* la numérisation des documents ;
* l'archivage institutionnel ;
* la recherche documentaire ;
* la traçabilité complète ;
* le contrôle d'accès ;
* la production de tableaux de bord ;
* l'exploitation future de l'intelligence artificielle documentaire.

---

# MODÈLE ORGANISATIONNEL

L'organisation officielle est :

Direction
↓
Service
↓
Bureau
↓
Agent

Cependant, pour simplifier l'architecture technique, le système utilise une seule collection :

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

* Une Direction possède plusieurs Services.
* Un Service appartient à une seule Direction.
* Un Service possède plusieurs Bureaux.
* Un Bureau appartient à un seul Service.
* Un Bureau possède plusieurs Agents.

---

# GESTION DES RESPONSABILITÉS

## Directeur Général

* appartient à la Direction Générale ;
* possède une vision globale ;
* peut consulter toutes les directions ;
* peut consulter tous les documents ;
* peut consulter toutes les archives.

---

## Directeur

* responsable d'une seule direction ;
* supervise tous les services et bureaux de sa direction.

Contrainte :

Une direction ne possède qu'un seul directeur actif.

---

## Manager

* responsable d'un service ;
* supervise tous les bureaux du service.

Contrainte :

Un service ne possède qu'un seul manager actif.

---

## Agent

* affecté à un bureau ;
* travaille uniquement dans son périmètre documentaire.

---

# ARCHITECTURE DOCUMENTAIRE

Chaque document possède :

```ts
emitterDirectionId
receiverDirectionIds[]
copyDirectionIds[]
```

---

# DIRECTION ÉMETTRICE

Un document possède obligatoirement :

```txt
1 seule direction émettrice
```

Par défaut :

```txt
La direction de l'utilisateur connecté.
```

---

# DIRECTIONS DESTINATAIRES

Un document peut être envoyé à :

```txt
1 à N directions
```

---

# DIRECTIONS EN COPIE

Un document peut également être envoyé en copie à :

```txt
0 à N directions
```

---

# MOUVEMENTS DOCUMENTAIRES

Le système ne demande jamais à l'utilisateur de saisir :

```txt
ENTRÉE
ou
SORTIE
```

Cette valeur est calculée automatiquement.

---

# RÈGLE MÉTIER

Pour la direction émettrice :

```txt
Mouvement = SORTIE
```

Pour les directions destinataires :

```txt
Mouvement = ENTRÉE
```

Pour les directions en copie :

```txt
Mouvement = ENTRÉE
```

---

# ARCHIVAGE DOCUMENTAIRE

Un document peut être archivé dans plusieurs directions.

Chaque direction concernée possède sa propre trace d'archivage.

Pour cela nous utilisons une collection :

```ts
DocumentArchive
```

---

# RÈGLE FONDAMENTALE

Un document :

* possède une seule direction émettrice ;
* peut posséder plusieurs directions destinataires ;
* peut posséder plusieurs directions en copie.

Conséquence :

```txt
1 SORTIE
N ENTRÉES
```

---

# ARCHIVAGE PHYSIQUE

Le système reproduit également l'archivage physique.

Un Bureau possède :

```txt
plusieurs classeurs
```

Chaque classeur :

* est annuel ;
* est associé à une direction partenaire ;
* possède une section ENTRÉE ;
* possède une section SORTIE.

---

# ARCHIVAGE ANNUEL

Important :

L'archivage est organisé par année.

Chaque année :

* de nouveaux classeurs sont créés ;
* les séquences documentaires sont réinitialisées.

Exemple :

DFA-125 (2024)

DFA-125 (2025)

Les deux documents peuvent exister.

---

# NUMÉROTATION DOCUMENTAIRE

La numérotation est propre à chaque direction.

Exemple :

Direction Financière

2025 :
001
002
003

Direction Technique

2025 :
001
002
003

Chaque direction gère sa propre séquence.

---

# RÉFÉRENCE DOCUMENTAIRE

La référence seule n'est jamais unique.

Ne jamais utiliser :

```txt
reference
```

comme identifiant unique.

Toujours utiliser :

```txt
emitterDirectionId
+
year
+
referenceNumber
```

ou équivalent.

---

# FILTRAGE DES DONNÉES SELON LE PROFIL

## Directeur Général

Accès :

* toutes les directions ;
* tous les documents ;
* toutes les archives.

---

## Directeur

Accès :

* documents de sa direction ;
* archives de sa direction.

---

## Manager

Accès :

* documents des services qu'il supervise ;
* archives des services qu'il supervise.

---

## Agent

Accès :

* documents de son bureau ;
* archives de son bureau.

---

# INTELLIGENCE ARTIFICIELLE DOCUMENTAIRE

Une fonctionnalité IA est prévue.

Technologies envisagées :

* LangChain ;
* LangGraph.

Objectif :

Analyser automatiquement :

* PDF ;
* scan ;
* image ;
* courrier.

Extraire :

* référence ;
* objet ;
* date ;
* signataire ;
* direction émettrice ;
* directions destinataires ;
* directions en copie ;
* mots-clés ;
* résumé ;
* niveau de confidentialité.

Puis pré-remplir automatiquement le formulaire documentaire.

---

# EXIGENCES UX

L'application doit respecter les standards d'une Banque Centrale.

Principes :

* interface sobre ;
* peu de texte inutile ;
* forte lisibilité ;
* ergonomie professionnelle ;
* navigation rapide ;
* tableaux paginés ;
* indicateurs visuels ;
* badges ;
* tableaux de bord orientés décision.

Éviter les interfaces trop verbeuses ou surchargées.

L'application doit ressembler à un produit institutionnel mature et non à une démonstration technique.

---

# STACK TECHNIQUE

Frontend :

* Next.js
* React
* TypeScript
* Tailwind CSS
* ShadCN UI

Backend :

* Node.js
* Express
* TypeScript

Base de données :

* Firestore

Stockage :

* Firebase Storage

Authentification :

* Firebase Auth

---

# CONSIGNE POUR COPILOT

Avant toute proposition :

1. Comprendre les règles métier de l'Hôtel des Monnaies.
2. Respecter la hiérarchie Direction → Service → Bureau.
3. Respecter les règles d'archivage bancaire.
4. Respecter les contraintes de sécurité.
5. Ne pas casser les règles métier existantes.
6. Favoriser les solutions évolutives et maintenables.
7. Considérer que le projet est déjà avancé et que les nouvelles modifications doivent s'intégrer à l'architecture existante.
