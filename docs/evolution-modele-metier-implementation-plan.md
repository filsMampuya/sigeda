# Plan d'execution - Evolution du modele metier SIGEDA

Mise a jour : `2026-06-29`
Branche de travail : `amelioration`

References :

- [CURRENT_STATE.md](../CURRENT_STATE.md)
- [docs/comprehension/regles-de-gestion.md](./comprehension/regles-de-gestion.md)
- [packages/database/prisma/schema.prisma](/F:/projet/bcc/archivage/packages/database/prisma/schema.prisma)
- [apps/api-nest/src/modules/folders/folders.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/folders/folders.service.ts)
- [apps/api-nest/src/modules/document-archives/document-archives.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/document-archives/document-archives.service.ts)
- [apps/api-nest/src/modules/users/users.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/users/users.service.ts)

## 1. Objectif

Faire evoluer SIGEDA pour gerer simultanement :

- les classeurs de correspondance ;
- les classeurs documentaires ;
- les copies vers plusieurs niveaux organisationnels ;
- l'enrichissement progressif du referentiel des agents ;
- la retrocompatibilite avec les flux deja valides.

Ce plan prepare l'implementation sans casser :

- la creation de document ;
- le classement automatique deja en place ;
- la consultation des classeurs annuels ;
- la gestion des utilisateurs Keycloak + PostgreSQL.

## 1.1 Etat d'avancement au 2026-06-29

Lots effectivement integres et verifies :

- Lot 1 - socle classeurs :
  - `folderType` ajoute ;
  - support `CORRESPONDANCE` / `DOCUMENTAIRE` actif ;
  - `partnerDirectionId` rendu optionnel pour les classeurs documentaires.
- Lot 2 - referentiel des types documentaires :
  - `DocumentType` et `FolderDocumentType` integres ;
  - `documentTypeId` ajoute sur `Document` ;
  - endpoint `GET /document-types` disponible ;
  - creation de classeur documentaire avec `documentTypeIds` disponible ;
  - selection du type documentaire disponible sur le formulaire `Nouveau document`.
- Lot 3 - regle de selection automatique mixte :
  - fallback documentaire ajoute quand aucun partenaire n'est present ;
  - les flux de correspondance existants restent prioritaires.
- Lot 4 - utilisateurs provisoires :
  - statuts de repertoire integres ;
  - completion d'un agent provisoire sans doublon deja disponible.

Lots finalises dans cette passe complementaire :

- Lot 5 - copies multi-niveaux :
  - `DocumentRecipient` supporte maintenant `DIRECTION_GENERALE`, `DIRECTION`, `SERVICE`, `BUREAU`, `USER` ;
  - le controle d'acces documentaire utilise le perimetre reel du destinataire et non plus uniquement la direction ;
  - `copyTargets` est expose dans l'API, les snapshots de version et la recherche ;
  - si `copyTargets` est fourni, il prime sur `copyDirectionIds` legacy sans creer de doublons directionnels parasites.
- Lot 6 - enrichissement IA du referentiel agents :
  - la fin du pipeline Document Intelligence cree ou met a jour des utilisateurs `PENDING_COMPLETION` ;
  - ces utilisateurs sont inactifs, sans compte Keycloak, avec provenance `DOCUMENT_INTELLIGENCE` ;
  - le rattachement structurel utilise la direction emettrice detectee quand elle est rapprochable.

## 2. Doctrine retenue

### 2.1 Doctrine sur `User`

Decision retenue :

- `User` reste l'entite de reference pour les utilisateurs applicatifs et pour les agents detectes par l'IA.

Implication :

- on n'introduit pas une nouvelle table `AgentDirectoryEntry` dans ce lot ;
- les agents detectes automatiquement seront stockes dans `User` avec un statut de completion / activation adapte ;
- un `User` provisoire ne sera pas authentifiable tant qu'il n'aura pas ete complete.

### 2.2 Regle de completion d'un agent provisoire

Lors de la creation manuelle d'un utilisateur :

1. rechercher si un agent provisoire correspondant existe deja ;
2. si oui, ne pas creer un doublon ;
3. mettre a jour cet enregistrement avec les donnees definitives ;
4. le retirer de la liste "agents a completer" ;
5. provisionner Keycloak uniquement a ce moment-la.

### 2.3 Ecran de creation utilisateur

Le parcours de creation utilisateur devra permettre :

- la creation d'un utilisateur complet classique ;
- la selection d'un "agent a completer" existant ;
- la completion de ses informations ;
- sa conversion en utilisateur actif.

## 3. Constat sur l'etat actuel

### 3.1 Classeur

Etat actuel :

- `Folder` ne gere qu'un classeur de correspondance ;
- `partnerDirectionId` est obligatoire ;
- aucune categorie documentaire n'est rattachee au classeur.

Impact :

- impossible de creer un classeur documentaire.

### 3.2 Document

Etat actuel :

- `Document.type` est une simple chaine ;
- aucune table `DocumentType` n'existe ;
- aucune relation `Folder -> DocumentType` n'existe.

Impact :

- le classement documentaire automatique ne peut pas etre fiable.

### 3.3 Copies

Etat actuel :

- `DocumentRecipient` ne pointe que vers `Department` ;
- le systeme ne gere donc que les copies vers directions / services / bureaux si on les force tous dans le meme champ ;
- aucune copie agent n'est possible.

Impact :

- le besoin metier "direction, service, bureau ou agent" n'est pas proprement modele.

### 3.4 User

Etat actuel :

- `User.keycloakId`, `matricule` et `email` sont obligatoires ;
- `User.isActive` existe, mais ne suffit pas a distinguer un utilisateur complet d'un agent provisoire ;
- la creation utilisateur dans [users.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/users/users.service.ts) cree directement Keycloak puis PostgreSQL.

Impact :

- impossible de stocker proprement un agent detecte automatiquement mais non encore complete.

## 4. Decisions de conception

## 4.1 Classeur

Ajouter un champ obligatoire :

```txt
folderType = CORRESPONDANCE | DOCUMENTAIRE
```

Regle de migration :

- tous les classeurs existants deviennent `CORRESPONDANCE`.

## 4.2 Types documentaires

Introduire :

- table `DocumentType`;
- table de liaison `FolderDocumentType`.

Objectif :

- permettre a un classeur documentaire d'accepter plusieurs categories documentaires ;
- permettre a un type documentaire d'etre rattache a plusieurs classeurs documentaires.

## 4.3 Regle de priorite de classement

Regle intangible :

- si le document a au moins une direction partenaire, le classement doit cibler un classeur `CORRESPONDANCE` ;
- le classeur `DOCUMENTAIRE` n'est utilise que si aucune direction partenaire n'existe.

## 4.4 Copies

Le modele cible doit distinguer :

- copie vers direction ;
- copie vers service ;
- copie vers bureau ;
- copie vers agent.

Recommendation :

- ne pas tordre `DocumentRecipient` en continuant a faire croire que tout est une direction ;
- introduire une abstraction explicite cote donnees.

## 4.5 User provisoire

Ajouter au modele `User` :

- un statut metier de completion ;
- un marqueur de provenance ;
- des champs obligatoires assouplis pour les fiches provisoires.

Statuts recommandes :

```txt
ACTIVE
PENDING_COMPLETION
INACTIVE
```

Provenances recommandees :

```txt
MANUAL
DOCUMENT_INTELLIGENCE
KEYCLOAK_PROVISIONED
```

## 5. Modele de donnees cible

## 5.1 Evolutions Prisma

### A. `Folder`

Ajouter :

- `folderType`
- `title` ou `label` optionnel pour les classeurs documentaires

Rendre optionnel :

- `partnerDirectionId`

Conserver :

- `year`
- `bureauId`
- `ownerDirectionId`
- `status`

### B. `DocumentType`

Creer :

- `id`
- `code`
- `label`
- `description?`
- `isActive`
- `createdAt`
- `updatedAt`

### C. `FolderDocumentType`

Creer la relation plusieurs-a-plusieurs :

- `folderId`
- `documentTypeId`

### D. `Document`

Ajouter une cle de rattachement structuree :

- `documentTypeId`

Conserver temporairement :

- `type` comme valeur legacy pendant la migration

### E. `DocumentRecipient`

Deux options techniques sont possibles.

Option retenue pour la suite logique :

- remplacer l'hypothese "tout recipient est une direction" par une structure polymorphe explicite.

Modele cible recommande :

- `targetKind = DIRECTION | SERVICE | BUREAU | USER`
- `targetDepartmentId?`
- `targetUserId?`

### F. `User`

Assouplir :

- `keycloakId` nullable pour les agents provisoires
- `email` nullable pour les agents provisoires
- `matricule` nullable pour les agents provisoires

Ajouter :

- `directoryStatus`
- `directorySource`
- `functionTitle?`
- `detectedFromDocumentId?`

## 5.2 Contraintes a conserver

- un utilisateur complet doit avoir :
  - `keycloakId`
  - `email`
  - `matricule`
  - `departmentId`
- un utilisateur provisoire ne doit pas etre retournable dans les listes d'authentification et d'administration standard sauf si explicitement demande.

## 6. Migration de donnees

## 6.1 Migration 1 - classeurs

Actions :

- ajouter enum `FolderType`
- ajouter colonne `folderType`
- initialiser tous les enregistrements existants a `CORRESPONDANCE`

## 6.2 Migration 2 - types documentaires

Actions :

- creer `DocumentType`
- peupler un referentiel initial a partir des types deja utilises par l'application
- ajouter `documentTypeId` sur `Document`
- mapper progressivement `Document.type -> DocumentType`

## 6.3 Migration 3 - user provisoire

Actions :

- rendre `keycloakId`, `email`, `matricule` nullables
- ajouter `directoryStatus`, `directorySource`
- marquer les utilisateurs existants en `ACTIVE`

## 6.4 Migration 4 - copies polymorphes

Actions :

- faire evoluer `DocumentRecipient`
- prevoir une migration des recipients existants en `targetKind = DIRECTION`

## 7. Sequence d'implementation

## Lot 1 - Socle classeurs

### Backend

- mettre a jour Prisma
- ajouter `folderType`
- faire passer `partnerDirectionId` a nullable
- mettre a jour les DTO et types partages

### Frontend

- faire evoluer [archive-folder-create-form.tsx](/F:/projet/bcc/archivage/apps/web/components/archives/archive-folder-create-form.tsx)
- ajouter le choix :
  - `Correspondance`
  - `Documentaire`

### API

- `POST /folders`
- `GET /folders`
- `GET /folders/:id/documents`

### Resultat attendu

- le systeme sait creer les deux categories de classeurs ;
- les classeurs existants continuent a fonctionner.

## Lot 2 - Referentiel des types documentaires

### Backend

- creer `DocumentType`
- ajouter `FolderDocumentType`
- ajouter services de lecture / creation / activation

### Frontend

- dans la creation de classeur documentaire :
  - multi-selection des types documentaires

### API

- `GET /document-types`
- `POST /document-types`
- `POST /folders` avec liste de `documentTypeIds`

### Resultat attendu

- un classeur documentaire peut accepter plusieurs types.

## Lot 3 - Regle de selection automatique du classeur

### Backend

Faire evoluer [document-archives.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/document-archives/document-archives.service.ts) et [folders.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/folders/folders.service.ts).

### Regle cible

1. si au moins une direction partenaire est presente :
   - filtrer `folderType = CORRESPONDANCE`
   - utiliser `partnerDirectionId`
2. sinon :
   - filtrer `folderType = DOCUMENTAIRE`
   - utiliser `documentTypeId`

### Resultat attendu

- la logique actuelle est preservee ;
- le fallback documentaire apparait sans casser le flux existant.

## Lot 4 - User provisoire

### Backend

Faire evoluer [users.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/users/users.service.ts).

### Nouveaux cas a couvrir

#### Cas A - creation complete

- creer Keycloak
- creer ou mettre a jour PostgreSQL

#### Cas B - completion d'un agent provisoire

- rechercher un `User` en `PENDING_COMPLETION`
- faire la correspondance sur :
  - nom
  - prenom
  - direction
  - fonction
  - email si disponible
- mettre a jour cet enregistrement
- provisionner Keycloak
- basculer en `ACTIVE`

#### Cas C - doublon detecte

- ne pas creer un deuxieme utilisateur
- renvoyer un message metier de resolution

### Frontend

Faire evoluer :

- [users-panel.tsx](/F:/projet/bcc/archivage/apps/web/components/organization/users-panel.tsx)
- [app/admin/users/actions.ts](/F:/projet/bcc/archivage/apps/web/app/admin/users/actions.ts)

Ajouter :

- un select "agent a completer"
- un mode "creation" / "completion"

### API

- `GET /users?includePending=true`
- `POST /users`

### Resultat attendu

- un agent detecte automatiquement peut etre complete sans duplication.

## Lot 5 - Copies multi-niveaux

### Backend

Faire evoluer :

- `DocumentRecipient`
- `documents.service.ts`
- `search.service.ts`
- les regles de visibilite

### Frontend

Faire evoluer le formulaire document pour les copies :

- direction
- service
- bureau
- agent

### Resultat attendu

- les copies ne sont plus limitees aux directions.

## Lot 6 - Enrichissement IA du referentiel agents

### Backend

Faire evoluer le module document intelligence pour :

- detecter les signataires inconnus ;
- produire une proposition de fiche provisoire ;
- creer un `User` en `PENDING_COMPLETION`.

### Regles

- jamais de provisionnement Keycloak automatique ;
- jamais d'activation automatique ;
- pas d'inclusion de ces agents dans les listes d'auth standard.

### Resultat attendu

- l'analyse documentaire enrichit le referentiel sans casser l'IAM.

## 8. Ecrans impactes

## 8.1 Classeurs annuels

Pages / composants :

- [app/classeurs-annuels/page.tsx](/F:/projet/bcc/archivage/apps/web/app/classeurs-annuels/page.tsx)
- [archive-folder-create-form.tsx](/F:/projet/bcc/archivage/apps/web/components/archives/archive-folder-create-form.tsx)
- [archive-folder-table.tsx](/F:/projet/bcc/archivage/apps/web/components/archives/archive-folder-table.tsx)

Evolutions :

- type de classeur ;
- direction partenaire seulement si `CORRESPONDANCE` ;
- types documentaires si `DOCUMENTAIRE`.

## 8.2 Nouveau document

Page / composant :

- [document-create-form.tsx](/F:/projet/bcc/archivage/apps/web/components/documents/document-create-form.tsx)

Evolutions :

- `documentTypeId`
- copies multi-niveaux
- exploitation des agents provisoires detectes

## 8.3 Administration utilisateurs

Pages / composants :

- [users-panel.tsx](/F:/projet/bcc/archivage/apps/web/components/organization/users-panel.tsx)
- [actions.ts](/F:/projet/bcc/archivage/apps/web/app/admin/users/actions.ts)

Evolutions :

- liste "agents a completer"
- completion d'un agent
- creation d'un compte final sans duplication

## 9. Endpoints a faire evoluer

### Existant a modifier

- `POST /users`
- `GET /users`
- `POST /folders`
- `GET /folders`
- `POST /documents`
- `POST /documents/:id/classify`
- `GET /search/documents`

### Nouveaux endpoints probables

- `GET /document-types`
- `POST /document-types`
- `GET /users/pending-directory`

## 10. Strategie de test

### Cas 1

Document avec direction partenaire.

Attendu :

- classeur `CORRESPONDANCE`

### Cas 2

Document de type metier avec direction partenaire.

Attendu :

- classeur `CORRESPONDANCE`

### Cas 3

Document de type metier sans direction partenaire.

Attendu :

- classeur `DOCUMENTAIRE`

### Cas 4

Creation d'un classeur documentaire.

Attendu :

- multi-selection de types documentaires

### Cas 5

Signataire inconnu detecte par l'IA.

Attendu :

- creation d'un `User` provisoire

### Cas 6

Creation manuelle d'un utilisateur a partir d'un agent provisoire.

Attendu :

- aucun doublon
- utilisateur final `ACTIVE`
- compte Keycloak cree

### Cas 7

Copies vers service, bureau et agent.

Attendu :

- persistance correcte
- visibilite correcte
- recherche correcte

## 11. Risques

### Risque fort 1

Surcharger `User` peut impacter les parcours d'authentification si les filtres ne sont pas stricts.

Parade :

- filtrer partout les `PENDING_COMPLETION`
- ne jamais tenter de login sans `keycloakId`

### Risque fort 2

Le passage des copies vers un modele polymorphe peut casser recherche et permissions.

Parade :

- livrer ce lot apres la stabilisation `FolderType`

### Risque fort 3

`Document.type` et `documentTypeId` peuvent diverger pendant la migration.

Parade :

- garder une phase de coexistence controlee
- ajouter scripts de backfill

## 12. Ordre recommande

1. `FolderType` + migration classeurs existants
2. `DocumentType` + `FolderDocumentType`
3. selection automatique mixte correspondance/documentaire
4. `User` provisoire + completion utilisateur
5. copies multi-niveaux
6. enrichissement IA du referentiel agents

## 13. Definition of Done

Le chantier sera considere stabilise si :

- les classeurs existants continuent a fonctionner sans regression ;
- un classeur documentaire peut etre cree et consulte ;
- le systeme choisit automatiquement le bon type de classeur ;
- un agent provisoire peut etre complete sans duplication ;
- les copies multi-niveaux sont persistantes et filtrables ;
- la recherche documentaire reste coherente avec les perimetres de donnees.
