# Backlog technique executable — Document Intelligence SIGEDA

Mise a jour : `2026-06-22`
References :

- [document-intelligence-architecture.md](./document-intelligence-architecture.md)
- [document-intelligence-implementation-plan.md](./document-intelligence-implementation-plan.md)
- [document-intelligence-specification.md](./document-intelligence-specification.md)
- [document-intelligence-operational-design.md](./document-intelligence-operational-design.md)

## 1. Objectif

Ce document transforme la conception `Document Intelligence` en backlog d'execution concret :

- lot par lot ;
- fichier par fichier ;
- avec dependances ;
- avec criteres d'acceptation ;
- avec ordre d'execution recommande.

## 2. Strategie d'execution retenue

### Option runtime retenue pour le MVP

Pour le MVP, retenir :

- `Option A` : execution dans `api-nest`

Pourquoi :

- moins de composants ;
- plus rapide a integrer ;
- plus simple a valider fonctionnellement.

### Limite connue

Cette option devra probablement evoluer ensuite vers un worker Node dedie si :

- la charge augmente ;
- les analyses deviennent longues ;
- les ressources CPU/RAM doivent etre mieux isolees.

## 3. Ordre global des lots

```txt
Lot 0  Preparation et garde-fous
Lot 1  Prisma + contrats partages
Lot 2  Squelette backend NestJS
Lot 3  Stockage temporaire MinIO
Lot 4  Provider vision Ollama
Lot 5  Provider OCR Tesseract CLI
Lot 6  Strategie auto + scoring
Lot 7  Endpoints API Next + UI Nouveau document
Lot 8  Securite, audit, retention
Lot 9  Tests et recette
```

## 4. Lot 0 — Preparation et garde-fous

### Tache 0.1

Fichier :

- [infra/docker/docker-compose.yml](/f:/projet/bcc/archivage/infra/docker/docker-compose.yml)

Travail :

- preparer l'ajout futur du service `ollama` ;
- verifier l'espace volume necessaire ;
- preparer les variables d'environnement `DOCUMENT_AI_*`.

Critere :

- la pile peut accepter les nouvelles variables sans regression.

### Tache 0.2

Fichier :

- [apps/api-nest/Dockerfile](/f:/projet/bcc/archivage/apps/api-nest/Dockerfile)

Travail :

- preparer l'installation future de :
  - `tesseract-ocr`
  - `tesseract-ocr-fra`
  - `tesseract-ocr-eng`
  - `poppler-utils`

Critere :

- la strategie de build est identifiee ;
- l'impact image Docker est connu.

## 5. Lot 1 — Prisma + contrats partages

### Tache 1.1

Fichier :

- [packages/database/prisma/schema.prisma](/f:/projet/bcc/archivage/packages/database/prisma/schema.prisma)

Travail :

- ajouter `DocumentIntelligenceJobStatus`
- ajouter `DocumentIntelligenceJob`

Dependance :

- aucune

Critere :

- schema Prisma compile ;
- indexes ajoutes ;
- relation `userId -> User` valide.

### Tache 1.2

Fichiers :

- `packages/shared/src/types/index.ts`
- `packages/shared/src/schemas/index.ts`

Travail :

- ajouter les types :
  - `DocumentIntelligenceRequestedMode`
  - `DocumentIntelligenceEffectiveMode`
  - `DocumentIntelligenceJobStatus`
  - `DocumentIntelligenceResult`
  - `DocumentIntelligenceJob`
- ajouter schemas Zod correspondants

Dependance :

- Tache 1.1

Critere :

- shared build passe ;
- schemas et types sont alignes.

### Tache 1.3

Fichiers :

- migration Prisma a generer

Travail :

- creer la migration SQL

Critere :

- migration rejouable ;
- rollback logique compris.

## 6. Lot 2 — Squelette backend NestJS

### Tache 2.1

Dossier a creer :

- `apps/api-nest/src/modules/document-intelligence/`

Travail :

- creer le module ;
- creer controller ;
- creer service ;
- creer repository ;
- creer dto et schemas locaux.

Critere :

- module compile ;
- non branche encore sur logique vision/OCR.

### Tache 2.2

Fichier :

- [apps/api-nest/src/modules/app.module.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/app.module.ts)

Travail :

- enregistrer `DocumentIntelligenceModule`

Critere :

- application NestJS demarre avec le nouveau module.

### Tache 2.3

Fichier :

- `apps/api-nest/src/modules/document-intelligence/document-intelligence.controller.ts`

Travail :

- exposer :
  - `POST /api/v1/document-intelligence/analyze`
  - `GET /api/v1/document-intelligence/jobs/:id`
  - `GET /api/v1/document-intelligence/results/:id`

Critere :

- routes disponibles ;
- guards et roles en place ;
- reponses stub correctes.

## 7. Lot 3 — Stockage temporaire MinIO

### Tache 3.1

Fichier :

- [apps/api-nest/src/modules/attachments/attachments.service.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/attachments/attachments.service.ts)

Travail :

- decider si on etend ce service ou si on cree un helper dedie `document-intelligence-storage`
- recommander : helper dedie dans le module intelligence, reutilisant la configuration MinIO existante

Critere :

- pas de melange confus entre pieces jointes documentaires definitives et objets temporaires IA.

### Tache 3.2

Fichier :

- `apps/api-nest/src/modules/document-intelligence/document-intelligence.service.ts`

Travail :

- uploader le fichier temporaire dans :
  - `tmp/document-intelligence/{jobId}/source-file`

Critere :

- objet MinIO cree ;
- job mis a jour avec `bucket/objectKey`.

### Tache 3.3

Fichier :

- `apps/api-nest/src/modules/document-intelligence/document-intelligence.repository.ts`

Travail :

- creer le job en base avec statut `PENDING` puis `UPLOADED`

Critere :

- job cree avant toute analyse.

## 8. Lot 4 — Provider vision Ollama

### Tache 4.1

Fichier :

- `infra/docker/docker-compose.yml`

Travail :

- ajouter le service `ollama`
- definir volume modele
- definir port interne

Critere :

- Ollama demarre dans la pile locale.

### Tache 4.2

Fichier :

- `apps/api-nest/src/modules/document-intelligence/providers/local-llm-provider.interface.ts`

Travail :

- definir interface provider

Critere :

- abstraction compatible vision et texte.

### Tache 4.3

Fichier :

- `apps/api-nest/src/modules/document-intelligence/providers/ollama.provider.ts`

Travail :

- appeler Ollama en HTTP ;
- gerer timeout ;
- gerer erreurs provider.

Critere :

- provider repond sur un appel simple.

### Tache 4.4

Fichiers :

- `chains/extract-from-vision.chain.ts`
- `prompts/extract-document-from-vision.prompt.ts`

Travail :

- construire la chaine LangChain JS vision ;
- injecter image + prompt ;
- parser JSON retour.

Critere :

- resultat JSON Zod-compatible sur un document de test.

### Tache 4.5

Fichier :

- `utils/file-preprocessing.ts`

Travail :

- convertir PDF vers image(s) selon le cas ;
- gerer image source directe.

Critere :

- mode vision sait traiter image et PDF court.

## 9. Lot 5 — Provider OCR Tesseract CLI

### Tache 5.1

Fichier :

- [apps/api-nest/Dockerfile](/f:/projet/bcc/archivage/apps/api-nest/Dockerfile)

Travail :

- installer `tesseract-ocr`, packs langue, `poppler-utils`

Critere :

- image API rebuild avec outils OCR presents.

### Tache 5.2

Fichier :

- `ocr/ocr-provider.interface.ts`

Travail :

- definir interface OCR

Critere :

- contrat clair pour plusieurs implementations futures.

### Tache 5.3

Fichier :

- `ocr/tesseract-cli.provider.ts`

Travail :

- execution CLI locale ;
- gestion timeout ;
- gestion multipage.

Critere :

- texte OCR obtenu sur scan test.

### Tache 5.4

Fichiers :

- `chains/extract-from-ocr-text.chain.ts`
- `prompts/extract-document-from-text.prompt.ts`

Travail :

- construire la chaine texte OCR -> JSON

Critere :

- resultat JSON valide sur texte OCR bruité.

## 10. Lot 6 — Strategie auto + scoring

### Tache 6.1

Fichier :

- `utils/mode-selector.ts`

Travail :

- implémenter la logique :
  - `vision`
  - `ocr`
  - `auto`

Critere :

- comportement conforme a `DOCUMENT_AI_MODE`.

### Tache 6.2

Fichier :

- `utils/confidence.ts`

Travail :

- calculer :
  - confiance globale
  - confiance par champ
  - seuil `LOW_CONFIDENCE`

Critere :

- score stable et reproductible sur cas de test.

### Tache 6.3

Fichier :

- `chains/choose-best-extraction.chain.ts`

Travail :

- MVP : arbitrage code-first
- fichier peut rester simple helper, sans prompt obligatoire

Critere :

- vision retenue si bonne ;
- OCR retenu si meilleure ;
- `hybrid` marque si fallback a eu lieu.

## 11. Lot 7 — Integration frontend

### Tache 7.1

Dossier :

- `apps/web/app/api/document-intelligence/`

Travail :

- creer routes proxy Next :
  - `analyze/route.ts`
  - `jobs/[id]/route.ts`
  - `results/[id]/route.ts`

Critere :

- appels frontend passent par le BFF Next.

### Tache 7.2

Fichier :

- [apps/web/components/documents/document-create-form.tsx](/f:/projet/bcc/archivage/apps/web/components/documents/document-create-form.tsx)

Travail :

- ajouter bloc `Analyse intelligente`
- bouton `Analyser un document`
- upload dedie
- etat d'analyse

Critere :

- UI n'interfere pas avec la creation manuelle normale.

### Tache 7.3

Fichiers nouveaux recommandes :

- `apps/web/components/documents/document-intelligence-panel.tsx`
- `apps/web/components/documents/document-intelligence-result.tsx`

Travail :

- isoler la logique UI plutot que d'alourdir excessivement `document-create-form.tsx`

Critere :

- integration lisible et maintenable.

### Tache 7.4

Travail frontend

- polling job ;
- affichage mode `Vision / OCR / Hybride` ;
- affichage confiance ;
- bouton `Appliquer les valeurs detectees`

Critere :

- l'utilisateur peut pre-remplir le formulaire sans creation automatique du document.

### Tache 7.5

Travail frontend/backend

- resoudre matching referentiels :
  - directions
  - type
  - confidentialite

Critere :

- etats `matched / ambiguous / unmatched` visibles.

## 12. Lot 8 — Securite, audit, retention

### Tache 8.1

Fichier :

- `document-intelligence.service.ts`

Travail :

- journaliser :
  - utilisateur
  - mode demande
  - mode effectif
  - moteur OCR
  - modele
  - score
  - erreurs

Critere :

- audit technique exploitable.

### Tache 8.2

Fichier :

- eventuel script de nettoyage ou tache applicative

Travail :

- purger objets temporaires > 72h
- optionnellement purger jobs anciens selon retention

Critere :

- pas d'accumulation indefinie.

### Tache 8.3

Fichiers :

- controller/service

Travail :

- verifier permissions backend
- interdire acces a un job d'un autre utilisateur si la politique le demande

Critere :

- pas de fuite inter-utilisateur.

## 13. Lot 9 — Tests et recette

### Tache 9.1

Backend

- tests unitaires sur :
  - mode selector
  - confidence
  - parsing JSON
  - matching directions

### Tache 9.2

Backend integration

- test `analyze`
- test `jobs/:id`
- test `results/:id`
- test fallback `vision -> ocr`

### Tache 9.3

Frontend

- test upload ;
- test polling ;
- test application des valeurs.

### Tache 9.4

Recette fonctionnelle

Documents de recette minimum :

- scan image simple ;
- PDF court lisible ;
- PDF multipage textuel ;
- document difficile provoquant fallback ;
- document faible confiance.

## 14. Backlog priorise par sprint

### Sprint 1

- Lot 1 complet
- Lot 2 complet
- Lot 3.1 a 3.3

### Sprint 2

- Lot 4 complet

### Sprint 3

- Lot 5 complet
- Lot 6.1 et 6.2

### Sprint 4

- Lot 6.3
- Lot 7 complet

### Sprint 5

- Lot 8 complet
- Lot 9 complet

## 15. Criteres de Go / No-Go MVP

### Go si

- mode `vision` fonctionne sur cas simples
- fallback OCR fonctionne
- mode `auto` est stable
- UI de pre-remplissage est operationnelle
- aucun document n'est cree automatiquement
- erreurs et faible confiance sont explicites

### No-Go si

- hallucinations frequentes non controlees
- fallback ne s'enclenche pas correctement
- resultats non auditables
- forte regression UX sur `Nouveau document`

## 16. Etape suivante apres ce backlog

La prochaine transformation logique est de convertir ce backlog en execution de code, en suivant strictement l'ordre :

1. Prisma
2. shared contracts
3. backend module
4. Ollama vision
5. OCR fallback
6. frontend
7. securite et tests
