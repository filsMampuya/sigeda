# Parcours utilisateurs et permissions

Mise a jour : `2026-06-16`

## 1. Parcours utilisateurs principaux

### Creation d'un document

1. L'utilisateur ouvre `Documents -> Nouveau document`.
2. Le formulaire pre-remplit la direction emettrice avec sa direction par defaut.
3. L'utilisateur peut modifier cette direction si ses droits le permettent.
4. Il renseigne les destinataires, les copies, les signataires, l'objet et les fichiers.
5. Le backend enregistre le document, genere les archives `SORTIE` et retourne une confirmation.

### Classement d'un document recu

1. L'utilisateur consulte la liste des archives documentaires ou des documents recus.
2. Si le document n'est pas encore classe dans son perimetre, l'action `Classer` est disponible.
3. L'utilisateur confirme l'action.
4. Le systeme selectionne automatiquement le classeur approprie et effectue le classement.

### Consultation d'un document

1. L'utilisateur ouvre la fiche document.
2. Il voit en priorite :
   - reference ;
   - objet ;
   - direction emettrice ;
   - directions destinataires ;
   - date ;
   - confidentialite ;
   - pieces jointes ;
   - synthese des annotations.
3. Il peut ensuite consulter les archives, l'historique utile et les annotations.

### Annotation d'un document

1. L'utilisateur ouvre la fiche document.
2. Il se rend dans le rapport des annotations.
3. Il choisit la direction source de l'observation.
4. Il saisit un commentaire, un fichier, ou les deux.
5. L'annotation est rattachee au document et apparait dans l'historique.

### Recherche documentaire

1. L'utilisateur ouvre `Documents` ou `Archives documentaires`.
2. Il applique des filtres sur la structure, la reference, l'objet, l'annee ou les annotations.
3. Le backend retourne uniquement les donnees du perimetre autorise.

## 2. Permissions par profil

### Administrateur

Voit :
- l'ensemble des structures ;
- les utilisateurs ;
- les documents et archives selon les routes administrees.

Peut :
- administrer les structures et les utilisateurs ;
- consulter les parcours documentaires ;
- maintenir le systeme fonctionnel.

Restrictions :
- doit tout de meme passer par les validations backend ;
- certaines actions metier restent bornees par les regles de gestion.

### Directeur General

Voit :
- tous les documents ;
- toutes les directions ;
- tous les services ;
- tous les bureaux ;
- toutes les archives documentaires.

Peut :
- consulter ;
- rechercher ;
- suivre les flux ;
- classer ou annoter si les routes le permettent.

Restrictions :
- les droits les plus larges restent traces par audit.

### Directeur

Voit :
- les donnees de sa direction ;
- les archives documentaires des bureaux de sa direction ;
- les classeurs lies a sa direction.

Peut :
- consulter ;
- rechercher ;
- suivre les documents de sa direction ;
- intervenir sur les documents accessibles.

Restrictions :
- ne voit pas les donnees des autres directions hors flux explicitement accessibles.

### Manager

Voit :
- les donnees des bureaux de son service ;
- les archives documentaires de son service.

Peut :
- consulter ;
- rechercher ;
- classer ou annoter dans son perimetre.

Restrictions :
- ne depasse pas les bureaux de son service.

### Agent

Voit :
- les donnees de son bureau ;
- les documents et archives documentaires classes ou accessibles dans ce bureau.

Peut :
- creer des documents ;
- consulter ;
- classer les documents recus ;
- annoter les documents accessibles.

Restrictions :
- perimetre limite a son bureau et aux droits induits par le document.

### Auditeur

Voit :
- les journaux ;
- les traces utiles au controle ;
- les informations necessaires a la verification.

Peut :
- consulter ;
- auditer ;
- extraire les traces si les routes l'autorisent.

Restrictions :
- pas de role de production documentaire principal.

## 3. Regles de visibilite backend

Les autorisations doivent etre appliquees cote backend.

Principes :

- un role eleve n'annule pas la journalisation ;
- la visibilite d'un fichier est controlee avant emission d'un lien securise ;
- la visibilite des documents depend de la direction, du service, du bureau et des archives associees ;
- la visibilite des annotations depend de l'accessibilite du document.

## 4. Flux de permissions simplifie

```txt
Keycloak
  -> authentifie l'utilisateur
  -> transmet un JWT
NestJS
  -> verifie le token
  -> retrouve l'utilisateur SIGEDA
  -> calcule son scope direction/service/bureau
  -> applique RBAC + perimetre de donnees
Next.js
  -> affiche uniquement les actions autorisees
```
