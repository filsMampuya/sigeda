# Specification UX - Valeurs Tronquees Dans Les Tableaux

## Objectif

Preserver la lisibilite des tableaux SIGEDA tout en donnant un acces rapide, coherent et non intrusif a la valeur complete.

## Regles

1. `< 40` caracteres
- affichage normal
- pas d'interaction supplementaire

2. `40 a 320` caracteres
- affichage tronque dans la cellule
- `title` natif pour consultation rapide au survol
- clic sur la cellule pour ouvrir un focus local ancre a la cellule
- fermeture par clic exterieur ou `Esc`

3. `> 320` caracteres
- affichage tronque dans la cellule
- `title` natif pour consultation rapide au survol
- clic sur la cellule pour ouvrir directement un panneau lateral

4. Contenu entre `180` et `320` caracteres
- focus local par defaut
- action `Ouvrir` disponible pour passer au panneau lateral si besoin

5. Contenu multi-ligne
- plus de 4 lignes detectees: ouverture directe en panneau lateral

## Principes UX

- Le tableau reste l'interface principale.
- Le focus local est prioritaire sur le `drawer`.
- Le `drawer` reste reserve aux contenus exceptionnellement volumineux.
- Le mecanisme doit etre uniforme pour tous les tableaux:
  - Documents
  - Directions
  - Services
  - Bureaux
  - Classeurs annuels
  - Archives documentaires

## Contraintes techniques

- Le focus local est rendu dans `document.body` via `portal` pour eviter les problemes d'overflow des tableaux.
- Le composant partage `LongText` centralise tous les seuils et comportements.
- Le panneau local doit:
  - etre ancre a la cellule
  - rester dans le viewport
  - accepter le texte multi-ligne
  - etre copiable

