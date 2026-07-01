# Analyse de preproduction - Evolution du classement et flexibilisation des classeurs

Mise a jour : `2026-06-30`
Branche : `amelioration`

References principales :

- [packages/database/prisma/schema.prisma](/F:/projet/bcc/archivage/packages/database/prisma/schema.prisma)
- [apps/api-nest/src/modules/folders/folders.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/folders/folders.service.ts)
- [apps/api-nest/src/modules/document-archives/document-archives.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/document-archives/document-archives.service.ts)
- [apps/web/components/archives/archive-folder-create-form.tsx](/F:/projet/bcc/archivage/apps/web/components/archives/archive-folder-create-form.tsx)
- [apps/web/components/documents/document-classify-button.tsx](/F:/projet/bcc/archivage/apps/web/components/documents/document-classify-button.tsx)

## 1. Lecture de l'etat actuel

### 1.1 Modele de donnees

Le modele `Folder` supporte actuellement :

- `folderType = CORRESPONDANCE | DOCUMENTAIRE`
- `label` optionnel
- `partnerDirectionId` optionnel
- `documentTypes` pour les classeurs documentaires

Constat :

- `description` n'existe pas encore ;
- le type `AUTRE` n'existe pas encore ;
- la contrainte unique actuelle est :
  - `@@unique([year, bureauId, ownerDirectionId, partnerDirectionId, folderType])`

Impact direct :

- cette contrainte convient a `CORRESPONDANCE` ;
- elle est trop faible pour distinguer plusieurs classeurs `AUTRE` dans un meme bureau ;
- elle doit etre repensee avant d'introduire un type libre.

### 1.2 Moteur de classement

Le classement de document est encore impose par l'API :

- [document-archives.service.ts](/F:/projet/bcc/archivage/apps/api-nest/src/modules/document-archives/document-archives.service.ts)
- `classifyDocument(...)` calcule :
  - le mouvement `ENTREE` ou `SORTIE`
  - les directions partenaires
  - puis appelle `folders.findActiveForArchiving(...)`
- si aucun classeur correspondant n'existe, l'operation echoue avec `ConflictException`

Constat :

- l'utilisateur choisit aujourd'hui le `service` et le `bureau` de classement ;
- il ne choisit pas le classeur final ;
- l'API ne sait pas encore accepter un `folderId` choisi explicitement.

### 1.3 Parcours web

Le bouton de classement :

- [document-classify-button.tsx](/F:/projet/bcc/archivage/apps/web/components/documents/document-classify-button.tsx)

propose actuellement :

- selection du service ;
- selection du bureau ;
- confirmation simple ;
- aucun affichage de classeur recommande ;
- aucune option de surcharge vers un autre classeur actif.

### 1.4 Creation de classeur

Le formulaire :

- [archive-folder-create-form.tsx](/F:/projet/bcc/archivage/apps/web/components/archives/archive-folder-create-form.tsx)

supporte aujourd'hui :

- `CORRESPONDANCE`
- `DOCUMENTAIRE`

Regles en place :

- `CORRESPONDANCE` :
  - `partnerDirectionId` obligatoire
- `DOCUMENTAIRE` :
  - `label` obligatoire
  - `documentTypeIds` obligatoire

Il n'existe pas encore de branche UX pour `AUTRE`.

## 2. Evolution metier demandee

Le changement demande ne remplace pas le moteur actuel.

Il transforme :

- un moteur prescriptif

en :

- un moteur de recommandation.

La logique cible devient :

1. calculer automatiquement le meilleur classeur ;
2. presenter cette proposition ;
3. autoriser un autre choix dans le perimetre utilisateur ;
4. enregistrer idealement l'ecart entre proposition et choix final.

## 3. Impacts techniques

## 3.1 PostgreSQL / Prisma

### A. Enum `FolderType`

Il faudra faire evoluer :

```txt
CORRESPONDANCE
DOCUMENTAIRE
```

vers :

```txt
CORRESPONDANCE
DOCUMENTAIRE
AUTRE
```

### B. `Folder`

Champs a ajouter ou clarifier :

- `designation` ou reutilisation stricte de `label`
- `description String?`

Recommendation :

- conserver `label` comme nom metier visible du classeur ;
- ajouter `description` en option ;
- eviter de dupliquer `designation` si `label` couvre deja ce besoin.

### C. Contraintes d'unicite

La contrainte actuelle devra etre revue.

Probleme :

- plusieurs classeurs `AUTRE` d'un meme bureau auraient souvent `partnerDirectionId = null`
- la contrainte actuelle risque de bloquer des cas legitimes.

Recommendation :

- conserver une unicite stricte pour `CORRESPONDANCE`
- definir une unicite differente pour `DOCUMENTAIRE`
- definir une unicite par `label` normalise pour `AUTRE`

Exemple cible :

- `CORRESPONDANCE` :
  - `year + bureauId + ownerDirectionId + partnerDirectionId + folderType`
- `DOCUMENTAIRE` :
  - `year + bureauId + ownerDirectionId + folderType + label`
- `AUTRE` :
  - `year + bureauId + ownerDirectionId + folderType + label`

Note :

- Prisma ne gere pas naturellement les index partiels ; si on veut de la precision par type, il faudra probablement une migration SQL explicite.

### D. Trace de recommandation

Pour une preproduction serieuse, il est utile d'ajouter sur `DocumentArchive` ou dans un journal annexe :

- `recommendedFolderId`
- `recommendedMovementType`
- `classificationMode = RECOMMENDED | MANUAL_OVERRIDE`
- `classificationReason?`

Ce n'est pas obligatoire pour faire fonctionner le parcours, mais c'est fortement recommande pour :

- la tracabilite ;
- l'audit ;
- l'amelioration future des regles.

## 3.2 APIs NestJS

### A. `FoldersService`

Fonctions a faire evoluer :

- `createManual(...)`
- `findActiveForArchiving(...)`
- `findActiveDocumentaryForArchiving(...)`

Il faudra introduire une nouvelle couche :

- `recommendFolderForClassification(...)`

Cette methode devra retourner :

- `recommendedFolderId`
- `recommendedFolderType`
- `movementType`
- `reason`
- `availableFolders[]`

### B. `DocumentArchivesService`

`classifyDocument(...)` devra cesser d'imposer le resultat du moteur.

Evolution cible :

1. endpoint de previsualisation :
   - ex. `POST /documents/:id/classification-proposal`
2. endpoint de confirmation :
   - ex. `POST /documents/:id/classify`
   - avec `folderId` optionnel ou obligatoire si l'utilisateur surcharge la recommandation

### C. Validation backend

Les controles bloquants devront etre reduits a :

- classeur actif ;
- classeur accessible par le profil ;
- bureau / service / direction compatibles avec le perimetre utilisateur ;
- droits de classement.

Les controles suivants ne devront plus etre bloquants en mode manuel :

- non-concordance avec la direction partenaire recommandee ;
- non-concordance avec le type documentaire attendu ;
- non-concordance avec le type de classeur recommande.

## 3.3 Frontend React / Next

### A. Parcours de classement

Le bouton actuel devra etre remplace par un petit parcours en deux temps :

1. appel de proposition ;
2. affichage d'une modale ou d'un panneau :
   - classeur recommande ;
   - type ;
   - section ;
   - justification courte ;
   - select des autres classeurs actifs du perimetre.

### B. Experience utilisateur

Le nouveau parcours doit rester court.

Recommendation UX :

- ne pas ouvrir une page dediee ;
- utiliser une modale compacte ;
- preselectionner automatiquement le classeur recommande ;
- afficher les autres classeurs dans un select unique.

### C. Creation de classeur

Le formulaire devra evoluer vers trois branches :

- `CORRESPONDANCE`
- `DOCUMENTAIRE`
- `AUTRE`

Pour `AUTRE`, afficher :

- `label` obligatoire
- `description` optionnelle

et masquer :

- `partnerDirectionId`
- `documentTypeIds`

## 3.4 Performance

Le cout backend restera raisonnable si :

- les classeurs sont charges par perimetre et non globalement ;
- les recherches sont filtrees par `bureauId`, `ownerDirectionId`, `status`, `folderType`.

Point d'attention :

- si l'API de proposition renvoie tous les classeurs accessibles d'un directeur general, il faudra paginer ou restreindre a un sous-ensemble pertinent.

## 4. Risques

### Risque 1

Perte de lisibilite si l'utilisateur voit trop de classeurs.

Mitigation :

- limiter les alternatives au perimetre reel ;
- trier avec la recommandation en tete ;
- grouper par type de classeur si necessaire.

### Risque 2

Regressions sur le classement automatique existant.

Mitigation :

- ne pas supprimer la logique actuelle ;
- l'encapsuler comme moteur de recommendation reutilisable.

### Risque 3

Conflits d'unicite avec le nouveau type `AUTRE`.

Mitigation :

- traiter les contraintes SQL avant l'ouverture du formulaire.

### Risque 4

Multiplication des classeurs "AUTRE" non maitrises.

Mitigation :

- imposer `label` obligatoire ;
- ajouter `description` ;
- journaliser le createur ;
- conserver `status = ACTIVE|ARCHIVED`.

## 5. Avantages de l'approche cible

- respecte les pratiques reelles des directions ;
- conserve l'intelligence metier existante ;
- reduit le caractere bloquant du systeme ;
- renforce la tracabilite des choix utilisateurs ;
- prepare mieux la preproduction qu'une automatisation rigide.

## 6. Limites

- la coherence documentaire dependra davantage de la discipline utilisateur ;
- il faudra surveiller les usages de `AUTRE` pour eviter les classements anarchiques ;
- la qualite des recommandations devra rester bonne, sinon les utilisateurs ignoreront systematiquement le moteur.

## 7. Sequence de mise en oeuvre recommandee

### Phase 1 - Socle donnees

- ajouter `AUTRE` a `FolderType`
- ajouter `description` sur `Folder`
- revoir les contraintes d'unicite

### Phase 2 - API de recommandation

- extraire la logique actuelle dans un service de recommendation
- renvoyer :
  - classeur recommande
  - section
  - alternatives accessibles
  - justification

### Phase 3 - Confirmation de classement

- faire evoluer `classifyDocument(...)`
- accepter `folderId` choisi par l'utilisateur
- conserver la recommendation en metadata

### Phase 4 - UX classeurs

- faire evoluer le formulaire de creation pour `AUTRE`
- faire evoluer le bouton `Classer le document`
- ajouter une modale de choix final

### Phase 5 - Regression

Tester au minimum :

- classement emetteur standard
- classement destinataire standard
- surcharge manuelle vers un autre classeur actif du meme bureau
- surcharge manuelle vers un autre classeur du perimetre manager
- creation d'un classeur `AUTRE`
- verification des droits agent / manager / directeur / directeur general

## 8. Conclusion

La demande est cohérente avec l'entree en preproduction.

Le systeme actuel est deja proche du besoin, mais il reste encore :

- trop rigide sur le choix final du classeur ;
- limite a deux types de classeurs ;
- structure pour l'automatisation plus que pour l'assistance metier.

La bonne approche n'est pas de remplacer le moteur actuel, mais de le repositionner comme moteur de recommandation, puis d'introduire un choix utilisateur controle dans le perimetre autorise.
