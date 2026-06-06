# SIGEDA

SIGEDA est une application monorepo de gestion electronique des documents et archives pour l'Hotel des Monnaies d'une Banque Centrale.

## Structure

- `apps/web` : interface Next.js
- `apps/api` : API Express TypeScript
- `packages/shared` : types, constantes et schemas partages
- `firebase` : regles et index Firestore / Storage
- `docs` : documentation d'architecture et de modele

## Demarrage

1. Installer les dependances : `npm install`
2. Lancer en developpement : `npm run dev`
3. Construire le monorepo : `npm run build`

## Firebase

- projet lie : `sigeda-c80ea`
- backend App Hosting web : `sigeda-web`
- racine App Hosting : `apps/web`
- variables d'environnement web locales : `apps/web/.env.example`

## Priorites deja preparees

- structure monorepo Turborepo
- modele de domaine partage
- routes API pour organisation, documents, audit et dashboard
- base frontend institutionnelle avec pages principales
- configuration Firebase et documentation initiale
