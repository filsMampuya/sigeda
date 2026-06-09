# Instruction de resume d'iteration

Apres chaque iteration significative, produire un fichier Markdown dans `docs/iterations` avec le nom :

```txt
YYYY-MM-DD--titre-court.md
```

Le resume doit etre concis, factuel et utile pour une reprise future.

## Structure obligatoire

```md
# Iteration - Titre

Date : YYYY-MM-DD
Branche : nom-de-branche

## Objectif

Decrire en 2 ou 3 phrases ce que cette iteration devait accomplir.

## Ce qui a ete fait

- Lister les changements principaux.
- Mentionner les nouveaux dossiers, modules ou fichiers structurants.
- Mentionner les decisions prises.

## Verification

- Lister les commandes executees.
- Indiquer ce qui passe.
- Indiquer ce qui n'a pas ete teste.

## Etat actuel

- Decrire le niveau d'avancement reel.
- Signaler les limites connues.
- Signaler les fichiers ou zones sensibles.

## Prochaines actions recommandees

- Lister les prochaines etapes dans l'ordre logique.
- Distinguer les actions techniques, metier, securite et infrastructure si utile.
```

## Regles

- Ne jamais inclure de secrets, cles privees, tokens, mots de passe reels ou fichiers `.env` sensibles.
- Ne pas masquer les limites ou les tests non effectues.
- Preferer les faits verifies aux intentions.
- Mentionner explicitement les changements de branche, de schema, d'authentification et de stockage.
- Si un artefact genere est modifie, le signaler comme tel.

