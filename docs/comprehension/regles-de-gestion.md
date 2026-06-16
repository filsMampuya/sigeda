# Regles de gestion SIGEDA

Mise a jour : `2026-06-16`

## 1. Regles d'organisation

- Une `Direction Generale` est le niveau hierarchique le plus haut.
- Une `Direction` peut posseder plusieurs `Services`.
- Un `Service` appartient a une seule `Direction`.
- Un `Service` peut posseder plusieurs `Bureaux`.
- Certains `Bureaux` peuvent etre rattaches directement a une `Direction`.
- Un utilisateur appartient a un seul perimetre organisationnel principal.

## 2. Regles documentaires

- Un document possede une seule direction emettrice.
- Un document peut avoir plusieurs directions destinataires.
- Un document peut avoir plusieurs directions en copie.
- Un document peut avoir plusieurs signataires.
- La reference documentaire n'est pas unique globalement.
- L'unicite logique repose sur :

```txt
emitterDirectionId + year + referenceNumber
```

- Les dates techniques sont conservees avec la precision native PostgreSQL.
- L'affichage utilisateur des dates est simplifie a la minute.

## 3. Regles de classement

### Principe general

L'utilisateur ne choisit pas manuellement le mouvement documentaire.

Le backend calcule automatiquement :

- le mouvement `SORTIE` ;
- le mouvement `ENTREE` ;
- le ou les classeurs concernes ;
- le bureau porteur du classement.

### Signification des mouvements

- `SORTIE`
  Le document est emis par la direction de l'utilisateur createur ou classeur.
- `ENTREE`
  Le document est recu par une autre direction que la direction emettrice.

### Regle de creation automatique des archives documentaires

Lors de la creation d'un document :

- si l'utilisateur cree depuis la direction emettrice, le systeme cree des archives `SORTIE` dans les classeurs representant les directions destinataires et en copie ;
- si un document est ensuite classe par une direction receptrice, le systeme cree une archive `ENTREE` dans le classeur approprie du bureau utilisateur.

### Regle de selection automatique du classeur

Le classeur est determine par :

```txt
annee du document
+ bureau de l'utilisateur
+ direction partenaire
+ statut actif du classeur
```

Le classeur doit obligatoirement etre `ACTIVE`.

### Interdictions explicites

L'utilisateur ne choisit pas manuellement :

- le mouvement ;
- le bureau cible du classement ;
- le classeur de classement dans le flux standard de classement d'un document recu.

## 4. Regles sur les classeurs annuels

- Un classeur est annuel.
- Un classeur appartient a un bureau.
- Un classeur represente une direction partenaire.
- Un classeur ne porte pas lui-meme `ENTREE` ou `SORTIE`.
- Les mouvements sont portes par `document_archives`.
- Un classeur archive ou ferme ne doit plus recevoir de nouveau classement.

## 5. Regles sur les archives documentaires

- Une archive documentaire n'est pas l'objet a classer ; elle est le resultat du classement d'un document.
- Une archive documentaire sert a :
  - consulter le document classe ;
  - connaitre le bureau et le classeur de rattachement ;
  - voir l'etat d'annotation du document ;
  - acceder a l'historique documentaire utile.
- L'archive documentaire ne porte pas son propre cycle d'annotation.

## 6. Regles sur les annotations

- Une annotation est rattachee au `document`.
- Une annotation peut contenir :
  - un commentaire ;
  - un fichier ;
  - un commentaire et un fichier.
- Une annotation doit distinguer :
  - la direction source de l'observation ;
  - la direction qui a encode l'annotation ;
  - l'utilisateur ayant realise l'action.
- Les archives documentaires reflettent l'etat d'annotation du document, mais ne portent pas l'annotation.
- L'acces aux annotations passe par la fiche document.

## 7. Regles de recherche

Un document doit pouvoir etre retrouve au minimum par :

- reference ;
- objet ;
- direction emettrice ;
- directions destinataires ;
- directions en copie ;
- bureau ;
- classeur ;
- annee ;
- etat d'annotation ;
- direction annotatrice ;
- periode d'annotation.

## 8. Regles de consultation et de tracabilite

- Toute action sensible doit pouvoir etre auditee.
- La consultation de fichiers et le telechargement sont traces.
- Les pieces jointes documentaires et les pieces jointes d'annotation sont delivrees via acces securise.
- La visibilite d'un document depend du role et du perimetre organisationnel de l'utilisateur.

## 9. Cartographie des flux documentaires

### Flux 1 : creation d'un document

```txt
Utilisateur
  -> saisit le document
  -> choisit direction emettrice, destinataires, copies, signataires
  -> televerse le fichier
  -> valide
Backend
  -> enregistre le document
  -> calcule les archives documentaires SORTIE
  -> journalise l'action
```

### Flux 2 : classement d'un document recu

```txt
Utilisateur recepteur
  -> clique "Classer"
Backend
  -> identifie bureau et direction utilisateur
  -> recherche le classeur actif approprie
  -> cree l'archive documentaire ENTREE
  -> journalise l'action
```

### Flux 3 : annotation

```txt
Utilisateur
  -> ouvre la fiche document
  -> consulte les annotations existantes
  -> ajoute un commentaire ou un fichier
Backend
  -> rattache l'annotation au document
  -> associe la version documentaire cible
  -> journalise l'action
```
