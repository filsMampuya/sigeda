# Doctrine d'annotation SIGEDA

Mise a jour : `2026-06-16`

## Regle de reference

Dans SIGEDA, une annotation est rattachee au `document` et non a l'`archive documentaire`.

## Consequences produit

- La fiche document est l'unique point d'entree pour :
  - consulter les annotations ;
  - ajouter une annotation ;
  - televerser le fichier d'annotation ;
  - suivre l'historique d'annotation.
- L'archive documentaire :
  - sert au classement et a la consultation du document classe ;
  - reflete l'etat d'annotation du document ;
  - renvoie vers la fiche document pour toute action d'annotation.

## Doctrine de navigation

- `Documents` : source de verite pour les annotations.
- `Archives documentaires` : vue de classement, de consultation et de reperage, sans cycle d'annotation propre.

## Doctrine API

- Autorise :
  - `POST /documents/:id/annotations`
  - `GET /documents/:documentId/annotations/:annotationId/access`
- Non autorise pour la doctrine cible :
  - creation d'annotations propres a `document-archives`
  - workflow distinct d'annotation au niveau archive

## Doctrine de recherche

Les besoins suivants doivent etre servis a partir du document :

- documents annotes par direction sur une periode ;
- documents sans annotation pour une direction cible ;
- classement des directions emettrices les plus annotees ;
- classement des directions annotatrices les plus actives.

## Rationalisation technique

La filiere technique d'annotation propre a `document-archives` a ete retiree de la doctrine cible, de l'API active et du schema Prisma de reference. Toute annotation doit desormais transiter par le document.
