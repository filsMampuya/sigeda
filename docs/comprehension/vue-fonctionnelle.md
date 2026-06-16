# Vue fonctionnelle SIGEDA

Mise a jour : `2026-06-16`

## 1. Presentation generale du projet

### Contexte

SIGEDA signifie `Systeme Integre de Gestion Electronique des Documents et Archives`.

Le projet est developpe pour l'Hotel des Monnaies de la Banque Centrale du Congo. Il s'agit d'un environnement institutionnel sensible, ou les exigences de confidentialite, de tracabilite, d'auditabilite et de souverainete des donnees sont fortes.

### Problematique initiale

Avant SIGEDA, la gestion documentaire reposait principalement sur :

- des documents papier ;
- des classeurs physiques manipules manuellement ;
- des connaissances informelles sur les emplacements ;
- une recherche documentaire lente et peu fiable ;
- une faible capacite de suivi inter-directions ;
- une visibilite reduite sur l'historique et les consultations.

Les risques operationnels associes etaient notamment :

- perte ou egarement de documents ;
- doublons documentaires ;
- difficulte de reconstitution d'un circuit documentaire ;
- dependance excessive a la memoire humaine ;
- faible capacite d'audit.

### Objectif de SIGEDA

SIGEDA vise a :

- centraliser les documents institutionnels ;
- numeriser leur consultation et leur classement ;
- conserver un lien fort avec l'organisation reelle de l'Hotel des Monnaies ;
- automatiser le classement documentaire ;
- faciliter la recherche et la consultation ;
- tracer les actions sensibles ;
- soutenir les echanges entre directions.

## 2. Contexte organisationnel

### Structure hierarchique

```txt
Direction Generale
    ->
Direction
    ->
Service
    ->
Bureau
    ->
Agent
```

### Role de chaque niveau

- `Direction Generale`
  Porte une vision transverse et globale. Elle peut consulter l'ensemble des perimetres autorises par le role le plus eleve.
- `Direction`
  Porte la responsabilite d'un grand domaine metier. Elle emet, recoit et suit des documents a l'echelle de sa direction.
- `Service`
  Structure intermediaire de coordination au sein d'une direction. Il regroupe plusieurs bureaux.
- `Bureau`
  Unite operationnelle de travail. C'est le niveau physique de classement retenu par SIGEDA.
- `Agent`
  Utilisateur operationnel qui cree, consulte, classe et annote les documents selon son perimetre.

## 3. Concepts metier

### Document

Objet central de SIGEDA. Un document possede une direction emettrice, une ou plusieurs directions destinataires, d'eventuelles directions en copie, des signataires, des fichiers associes et un cycle de vie documentaire.

### Archive documentaire

Representation du classement d'un document dans un bureau et un classeur donnes. Elle materialise un mouvement `ENTREE` ou `SORTIE`.

### Classeur annuel

Classeur lie a un bureau, a une annee et a une direction partenaire. Il represente tous les echanges documentaires entre le bureau proprietaire et cette direction partenaire pour une annee donnee.

### Annotation

Observation, commentaire ou fichier annote rattache au document. L'annotation n'est pas rattachee a l'archive documentaire.

### Direction emettrice

Direction a l'origine du document.

### Direction destinataire

Direction qui recoit le document comme cible principale.

### Direction en copie

Direction informee du document sans etre la cible principale.

### Signataire

Utilisateur ou personne referencee qui signe le document. Un document peut avoir plusieurs signataires.

### Utilisateur

Compte applicatif authentifie via Keycloak, rattache a un role et a une structure organisationnelle.

### Profil

Role applicatif qui determine le perimetre de consultation et les actions autorisees.

## 4. Architecture fonctionnelle

### Gestion des directions

Role :
- structurer l'organisation de niveau direction ;
- servir de base aux droits et aux flux documentaires.

Fonctionnalites :
- creation ;
- consultation ;
- modification ;
- rattachement hierarchique.

Interactions :
- utilisateurs ;
- services ;
- documents ;
- classeurs ;
- archives.

### Gestion des services

Role :
- organiser les equipes sous une direction ;
- servir de niveau de filtrage pour les managers.

Fonctionnalites :
- CRUD ;
- rattachement a une direction.

### Gestion des bureaux

Role :
- definir les unites operationnelles ;
- porter le classement physique simplifie dans SIGEDA.

Fonctionnalites :
- CRUD ;
- rattachement a un service ou directement a une direction.

### Gestion des utilisateurs

Role :
- administrer les comptes ;
- rattacher chaque compte a un role et a un perimetre.

Fonctionnalites :
- creation ;
- activation ;
- affectation role/structure ;
- provisionnement avec Keycloak.

### Gestion documentaire

Role :
- creer et consulter les documents ;
- porter les references, destinataires, copies, fichiers, signataires, historique et annotations.

Fonctionnalites :
- creation de document ;
- consultation ;
- edition controlee ;
- televersement de pieces jointes ;
- historique de versions et transmissions.

### Archives documentaires

Role :
- visualiser les documents deja classes ;
- suivre leur classement par bureau, classeur et mouvement.

Fonctionnalites :
- liste par perimetre ;
- consultation detaillee ;
- action de classement d'un document recu ;
- acces rapide aux annotations du document.

### Classeurs annuels

Role :
- representer la relation de classement entre un bureau et une direction partenaire pour une annee.

Fonctionnalites :
- creation de classeur ;
- consultation ;
- archivage/fermeture logique ;
- consultation du contenu.

### Annotations

Role :
- permettre l'echange d'observations sur un document ;
- conserver un commentaire et un fichier annote ;
- tracer l'origine de l'observation.

Fonctionnalites :
- ajout d'annotation ;
- consultation chronologique ;
- telechargement du fichier d'annotation ;
- filtres documentaires sur les annotations.

### Rapports

Role :
- fournir une vue d'ensemble sur les activites documentaires et d'annotation.

Fonctionnalites :
- synthese documents annotes / non annotes ;
- classement des directions les plus annotees ;
- classement des directions annotatrices ;
- tableaux de bord et audit.

## 5. Modele de donnees simplifie

### Tables principales

- `departments`
- `users`
- `roles`
- `documents`
- `document_recipients`
- `document_signers`
- `attachments`
- `document_versions`
- `document_annotations`
- `document_transmissions`
- `folders`
- `document_archives`
- `audit_logs`

### Schema logique simplifie

```txt
Department
    ->
Department (Direction / Service / Bureau)
    ->
User

Document
    -> DocumentRecipient
    -> DocumentSigner
    -> Attachment
    -> DocumentVersion
    -> DocumentAnnotation
    -> DocumentTransmission
    -> DocumentArchive

Folder
    -> DocumentArchive
```

### Justification

- le modele `Department` unifie direction, service et bureau ;
- `document_recipients` porte a la fois les destinataires et les copies via `kind` ;
- `document_archives` porte le classement concret ;
- `document_annotations` est rattache au document pour conserver une doctrine simple et robuste ;
- `folders` materialise les classeurs annuels sans exposer a l'utilisateur des notions physiques plus fines.

## 6. Principes UX/UI

SIGEDA vise une interface :

- institutionnelle ;
- sobre ;
- lisible ;
- stable ;
- professionnelle.

Les principes retenus sont :

- reduction de la verbosite ;
- hierarchisation visuelle nette ;
- concentration sur l'information utile ;
- tableaux lisibles et pagines ;
- faible charge cognitive ;
- actions metier explicites ;
- compatibilite avec une utilisation intensive en environnement bancaire.

## 7. Limites actuelles

- le module `archives physiques` existe encore techniquement dans le depot, mais la logique metier de reference est recentree sur les documents, les archives documentaires et les classeurs annuels ;
- OpenSearch est provisionne dans l'architecture, mais la recherche fonctionnelle actuelle est encore principalement geree par l'API applicative ;
- la charte visuelle institutionnelle BCC reste encore un chantier de convergence progressive ;
- l'historique Firebase / Express reste documente dans certains anciens fichiers de migration, mais la branche `annotation` a pour reference l'architecture on-premise Next.js + NestJS + PostgreSQL + Keycloak + MinIO.
