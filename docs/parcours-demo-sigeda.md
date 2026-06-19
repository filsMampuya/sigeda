# Parcours de demonstration SIGEDA

Mise a jour : `2026-06-17`

## Objectif

Ce document propose un parcours de demonstration :

- clair ;
- progressif ;
- professionnel ;
- aligne sur les regles de gestion stabilisees sur la branche `annotation`.

Le principe est simple :

1. verifier que l'environnement est propre ;
2. creer un document reel ;
3. observer la creation automatique des archives documentaires ;
4. tester la consultation par les directions concernees ;
5. tester le classement ;
6. tester les annotations ;
7. verifier les perimetres de donnees.

## 1. Preconditions

### Environnement attendu

- Web : `http://localhost:8088`
- API : `http://localhost:4100/api/v1`
- Keycloak : `http://localhost:8080`

### Etat attendu avant demonstration

- organisation chargee ;
- utilisateurs de demonstration charges ;
- classeurs annuels actifs charges ;
- aucun document de demonstration precharge si vous voulez un scenario propre.

### Preparation recommandee

Si vous souhaitez repartir d'un environnement vierge :

```bash
npm run db:reset-demo
docker compose -f infra/docker/docker-compose.yml up -d --force-recreate keycloak api-nest web nginx
```

## 2. Comptes a utiliser pendant la demonstration

### Parcours principal

- Emetteur : `manager.commercial@sigeda.local / SigedaMngCom1!`
- Destinataire principal : `dg.demo@sigeda.local / SigedaDg1!`

### Verification des perimetres

- Directeur finances : `directeur.finance@sigeda.local / SigedaDir1!`
- Manager compta : `manager.compta@sigeda.local / SigedaMng1!`
- Agent bureau cadre : `agent.cadre@sigeda.local / SigedaAgt1!`
- Agent technique hors flux : `agent.technique@sigeda.local / SigedaAgtTech1!`

## 3. Fil conducteur recommande

Le parcours le plus lisible en demonstration est le suivant :

```txt
Manager commercial
  -> cree un document
Direction Generale
  -> consulte le document
  -> annote le document
Manager commercial
  -> consulte l'annotation
Controle des perimetres
  -> verifier qu'un profil hors flux ne voit pas plus que son scope
```

## 4. Scenario de demonstration principal

### Etape 1 - Connexion emetteur

Compte :

- `manager.commercial@sigeda.local`

Verification attendue :

- acces au tableau de bord ;
- acces au menu `Documents` ;
- acces a `Nouveau document`.

### Etape 2 - Creation d'un document

Depuis `Documents -> Nouveau document` :

- verifier que la direction emettrice est pre-remplie ;
- renseigner l'objet ;
- ajouter la `Direction Generale` comme destinataire ;
- ajouter le fichier principal ;
- valider.

Resultat attendu :

- creation reussie ;
- message de confirmation ;
- ouverture ou disponibilite de la fiche document ;
- apparition du document dans la liste `Documents`.

### Etape 3 - Verification de la fiche document

Depuis la fiche document :

- verifier la reference ;
- verifier l'objet ;
- verifier la direction emettrice ;
- verifier les destinataires ;
- verifier la piece jointe ;
- verifier que l'historique initial contient la creation et la transmission.

Resultat attendu :

- fiche compacte et lisible ;
- aucune information incoherente ;
- acces aux pieces jointes.

### Etape 4 - Verification des archives documentaires cote emetteur

Avec le meme compte :

- ouvrir `Archives documentaires` ;
- retrouver le document cree ;
- verifier la presence de l'archive `SORTIE`.

Resultat attendu :

- archive generee automatiquement ;
- mouvement coherent ;
- bureau et classeur coherents avec le perimetre de l'emetteur.

### Etape 5 - Connexion destinataire

Compte :

- `dg.demo@sigeda.local`

Depuis `Documents` ou `Archives documentaires` :

- retrouver le document transmis ;
- ouvrir la fiche document.

Resultat attendu :

- document visible ;
- piece jointe consultable ;
- historique de transmission visible ;
- perimetre conforme au role `DIRECTION_GENERALE`.

### Etape 6 - Annotation du document

Depuis la fiche document :

- ouvrir `Nouvelle annotation` ;
- verifier la direction annotatrice selectionnee ;
- saisir un commentaire ;
- enregistrer.

Resultat attendu :

- message de succes ;
- annotation visible dans le rapport des annotations ;
- entree d'historique associee.
- si le profil n'est pas autorise, l'interface doit afficher un message metier clair et ne pas laisser le bouton actif.

### Etape 7 - Retour cote emetteur

Se reconnecter avec :

- `manager.commercial@sigeda.local`

Puis :

- rouvrir la fiche du meme document ;
- verifier que l'annotation apparait ;
- verifier que l'historique s'est enrichi ;
- verifier que le rapport d'annotations est coherent.

Resultat attendu :

- consultation de l'annotation sans incoherence ;
- visibilite correcte de la direction source ;
- traçabilite lisible.

## 5. Scenario de verification des perimetres

### Cas A - Profil dans le flux

Compte :

- `dg.demo@sigeda.local`

Attendu :

- voit le document ;
- peut l'annoter ;
- voit les annotations.

### Cas B - Profil hors flux

Compte :

- `agent.technique@sigeda.local`

Attendu :

- ne doit pas pouvoir annoter le document s'il n'est pas concerne ;
- ne doit pas voir de donnees hors de son perimetre ;
- l'interface doit refuser ou masquer l'action de maniere claire.

### Cas C - Verification hierarchique

Comptes :

- `directeur.finance@sigeda.local`
- `manager.compta@sigeda.local`
- `agent.cadre@sigeda.local`

Attendu :

- le directeur voit toute sa direction ;
- le manager voit son service ;
- l'agent voit son bureau uniquement.

## 6. Ordre recommande pour une demonstration publique

Pour garder un rythme propre :

1. `Dashboard`
2. `Documents`
3. `Nouveau document`
4. `Fiche document`
5. `Archives documentaires`
6. changement de compte
7. `Consultation destinataire`
8. `Annotation`
9. retour compte emetteur
10. `Verification finale`

## 7. Points de controle pendant la recette

### Fonctionnels

- creation document ;
- transmission ;
- archive documentaire automatique ;
- consultation du document ;
- annotation ;
- consultation des annotations ;
- respect du perimetre utilisateur.

### UX

- pas de bouton bloque apres erreur ;
- messages explicites ;
- tableaux lisibles ;
- pas de scroll global horizontal parasite ;
- actions clairement distinguees.

### Techniques

- session Keycloak encore valide ;
- acces aux fichiers ;
- absence d'erreur `401`, `403`, `500` non geree ;
- coherence des dates et de l'historique.
- routes web critiques verifiees :
  - `/api/documents/[id]/annotations`
  - `/api/documents/[id]/classify`

## 8. Conduite a tenir en cas d'anomalie

### Si la page semble ne pas prendre les derniers correctifs

- faire un rechargement complet du navigateur ;
- se reconnecter ;
- verifier que `http://localhost:8088` repond bien apres rebuild.

### Si une action metier echoue

- noter le compte utilise ;
- noter le document concerne ;
- noter le message exact affiche ;
- verifier si l'echec est :
  - un refus metier legitime ;
  - un probleme de session ;
  - une regression fonctionnelle.

## 9. Niveau de confiance actuel

Au regard de l'audit du `2026-06-17` :

- le coeur metier API est valide sur les cas critiques testes ;
- les tests `smoke` et `functional` passent ;
- la vigilance principale reste le parcours web en session reelle continue.

## 10. Documents lies

- [audit-regression-2026-06-17.md](./audit-regression-2026-06-17.md)
- [identifiants-utilisateur-demo.md](./identifiants-utilisateur-demo.md)
- [parcours-et-permissions.md](./comprehension/parcours-et-permissions.md)
- [doctrine-annotation-document.md](./doctrine-annotation-document.md)
