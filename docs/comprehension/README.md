# Documentation de comprehension SIGEDA

Mise a jour : `2026-06-16`
Branche de reference : `annotation`

## Objectif

Ce dossier permet a un nouveau developpeur, a un responsable metier, a un auditeur ou a un membre de la Direction Generale de comprendre rapidement :

- le contexte institutionnel de SIGEDA ;
- les concepts metier ;
- les regles de gestion ;
- l'architecture technique cible ;
- les parcours utilisateurs ;
- les permissions ;
- les principes UX/UI ;
- les limites actuelles du produit.

## Parcours de lecture recommande

1. [Vue fonctionnelle](./vue-fonctionnelle.md)
2. [Regles de gestion](./regles-de-gestion.md)
3. [Parcours et permissions](./parcours-et-permissions.md)
4. [Vue technique](./vue-technique.md)
5. [Prise en main rapide](./prise-en-main-rapide.md)

## Cartographie des livrables

- Document fonctionnel complet :
  [vue-fonctionnelle.md](./vue-fonctionnelle.md)
- Cartographie des regles de gestion :
  [regles-de-gestion.md](./regles-de-gestion.md)
- Cartographie des parcours, droits et flux :
  [parcours-et-permissions.md](./parcours-et-permissions.md)
- Document technique complet :
  [vue-technique.md](./vue-technique.md)
- Guide de prise en main :
  [prise-en-main-rapide.md](./prise-en-main-rapide.md)

## Doctrine cle a retenir

- Un document est l'objet central du systeme.
- Une archive documentaire est une consequence du classement d'un document.
- Un classeur annuel represente la relation documentaire entre le bureau d'un utilisateur et une direction partenaire.
- Une annotation est rattachee au document et non a l'archive documentaire.
- Les mouvements `ENTREE` et `SORTIE` sont calcules automatiquement par le backend.
