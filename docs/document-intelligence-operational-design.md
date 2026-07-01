# Design operationnel — Document Intelligence SIGEDA

Mise a jour : `2026-06-22`
References :

- [document-intelligence-architecture.md](./document-intelligence-architecture.md)
- [document-intelligence-implementation-plan.md](./document-intelligence-implementation-plan.md)
- [document-intelligence-specification.md](./document-intelligence-specification.md)

## 1. Objet

Ce document descend au niveau operationnel pour cadrer :

- les prompts ;
- l'experience UI ;
- l'integration locale `Ollama + Tesseract + Docker` ;
- le comportement runtime du module.

## 2. Design des prompts

## 2.1 Principes generaux

Tous les prompts doivent :

- interdire l'invention d'informations ;
- retourner exclusivement un JSON valide ;
- laisser vide tout champ non detecte ;
- distinguer clairement :
  - direction emettrice ;
  - directions destinataires ;
  - directions en copie ;
- exposer un score de confiance global ;
- exposer si possible un score de confiance par champ.

## 2.2 Prompt vision

Usage :

- image simple ;
- scan ;
- PDF converti en image ;
- mode `vision` ou premiere tentative du mode `auto`.

### Structure recommandee

```txt
Tu analyses un document administratif institutionnel.

Objectif :
extraire uniquement les informations visibles dans le document.

Contraintes :
- ne rien inventer ;
- si une information est absente ou incertaine, retourner une chaine vide ou un tableau vide ;
- distinguer emetteur, destinataires et copies ;
- retourner exclusivement un JSON valide ;
- ne pas entourer le JSON par du texte.

Champs attendus :
- reference
- subject
- documentDate
- emitterDirection
- receiverDirections
- copyDirections
- signers
- documentType
- confidentialityLevel
- summary
- keywords
- confidenceScore
- fieldConfidence
- extractionMode
- rawExtractedText
- rawVisionNotes

Regles :
- extractionMode doit etre "vision"
- rawExtractedText doit rester vide si aucun OCR n'a ete utilise
- rawVisionNotes peut contenir des notes techniques tres courtes
```

### Comportement attendu

- le modele doit lire directement le document ;
- il ne doit pas reconstituer des champs non visibles ;
- le `summary` doit etre sobre et derive du document.

## 2.3 Prompt OCR texte

Usage :

- mode `ocr`
- fallback du mode `auto`

### Structure recommandee

```txt
Tu analyses le texte OCR brut d'un document administratif institutionnel.

Objectif :
extraire les informations structurees a partir du texte fourni.

Contraintes :
- le texte OCR peut contenir du bruit ;
- ne rien inventer ;
- si une information est absente ou douteuse, retourner une chaine vide ou un tableau vide ;
- retourner exclusivement un JSON valide ;
- ne pas entourer le JSON par du texte.

Le texte OCR est fourni ci-dessous.

Tu dois produire les champs suivants :
- reference
- subject
- documentDate
- emitterDirection
- receiverDirections
- copyDirections
- signers
- documentType
- confidentialityLevel
- summary
- keywords
- confidenceScore
- fieldConfidence
- extractionMode
- rawExtractedText

Regles :
- extractionMode doit etre "ocr"
- rawExtractedText doit reprendre le texte OCR utile
```

## 2.4 Prompt de selection / arbitrage

Usage :

- uniquement si le mode `auto` a produit deux resultats comparables ;
- optionnel au MVP.

### Role

- comparer resultat `vision` et resultat `ocr` ;
- choisir le plus fiable ;
- ou construire un resultat `hybrid`.

### Regle MVP

Pour le MVP, ne pas rendre ce prompt obligatoire.

Decision technique recommandee :

- arbitrage code-first ;
- prompt de comparaison seulement en evolution.

## 3. Strategie runtime

## 3.1 Sequence mode `vision`

```txt
Upload
↓
job status = UPLOADED
↓
VISION_RUNNING
↓
LLM_RUNNING
↓
Validation Zod
↓
COMPLETED ou LOW_CONFIDENCE ou FAILED
```

## 3.2 Sequence mode `ocr`

```txt
Upload
↓
job status = UPLOADED
↓
OCR_RUNNING
↓
LLM_RUNNING
↓
Validation Zod
↓
COMPLETED ou LOW_CONFIDENCE ou FAILED
```

## 3.3 Sequence mode `auto`

```txt
Upload
↓
UPLOADED
↓
VISION_RUNNING
↓
Validation + confiance
↓
si bon : COMPLETED (vision)
sinon :
  OCR_RUNNING
  ↓
  LLM_RUNNING
  ↓
  Validation
  ↓
  COMPLETED / LOW_CONFIDENCE / FAILED
```

## 4. Experience utilisateur detaillee

## 4.1 Positionnement dans le formulaire

Dans `Nouveau document`, ajouter un bloc au-dessus du formulaire principal :

```txt
Analyse intelligente
[Analyser un document]
```

Ce bloc ne doit pas perturber la saisie manuelle normale.

## 4.2 Etats UI

### Etat 1 — Repos

Afficher :

- bouton `Analyser un document`
- texte court :
  `Televersez un scan, une image ou un PDF pour proposer un pre-remplissage.`

### Etat 2 — Upload en cours

Afficher :

- spinner
- texte `Envoi du document...`

### Etat 3 — Analyse en cours

Afficher :

- spinner
- texte `Analyse en cours...`
- sous-texte optionnel :
  - `Lecture par modele vision`
  - `Fallback OCR en cours`

### Etat 4 — Analyse terminee

Afficher un resume :

- mode utilise ;
- score de confiance ;
- nombre de champs detectes ;
- avertissements eventuels.

Actions :

- `Appliquer les valeurs detectees`
- `Relancer l'analyse`
- `Ignorer`

### Etat 5 — Faible confiance

Afficher :

- badge `A verifier`
- message :
  `L'analyse est terminee, mais certaines valeurs restent incertaines.`

Actions :

- `Appliquer quand meme`
- `Corriger manuellement`
- `Relancer l'analyse`

### Etat 6 — Erreur

Afficher :

- message explicite ;
- bouton `Reessayer`.

## 4.3 Champs pre-remplis

Les champs pre-remplis doivent etre visuellement distingues :

- contour ou badge discret ;
- texte `Detecte automatiquement`.

Un champ modifie manuellement par l'utilisateur ne doit plus etre considere comme "brutement detecte".

## 4.4 Matching referentiel en UI

Pour les directions :

- `matched` : affichage normal
- `ambiguous` : afficher une liste de choix
- `unmatched` : laisser vide et avertir l'utilisateur

Pour les signataires :

- dans le MVP, afficher le texte extrait ;
- ne pas bloquer la suite si le matching utilisateur n'est pas resolu.

## 5. Integration locale avec Docker

## 5.1 Principe

L'orchestration reste en TypeScript et dans l'ecosysteme Node/NestJS.

Deux options runtime sont possibles.

### Option A — OCR et IA dans l'API NestJS

Avantages :

- plus simple au debut ;
- moins de composants ;
- plus rapide a prototyper.

Limites :

- surcharge du conteneur API ;
- risque sur les temps de reponse ;
- diagnostics plus denses.

### Option B — Service Node dedie Document Intelligence

Avantages :

- meilleure isolation ;
- meilleur controle CPU/RAM ;
- plus propre pour la production.

Limites :

- un service en plus ;
- integration un peu plus longue.

### Recommandation

- MVP : Option A acceptable
- cible robuste : Option B recommandee ensuite

Important :

Cette option B reste 100% `Node.js / TypeScript`, pas Python.

## 5.2 Services Docker recommandes a terme

### MVP

Ajouter :

- `ollama`

Conserver :

- `api-nest`
- `web`
- `postgres`
- `minio`
- `keycloak`
- `nginx`

Installer dans l'image `api-nest` si Option A :

- `tesseract-ocr`
- `poppler-utils`

### Cible plus propre

Ajouter :

- `document-intelligence-worker`
- `ollama`

L'API cree le job, le worker execute l'analyse, puis la base est mise a jour.

## 5.3 Variables Docker / infra

### Ollama

Variables recommandees :

```txt
OLLAMA_HOST=0.0.0.0
```

Variables SIGEDA :

```txt
DOCUMENT_AI_VISION_PROVIDER=ollama
DOCUMENT_AI_VISION_BASE_URL=http://ollama:11434
DOCUMENT_AI_TEXT_PROVIDER=ollama
DOCUMENT_AI_TEXT_BASE_URL=http://ollama:11434
```

Provisionnement recommande :

- ajouter un service `ollama-pull` dedie ;
- tirer automatiquement les modeles `vision` et `text` au demarrage ;
- exposer un endpoint de disponibilite pour indiquer si le moteur est pret ;
- ne pas bloquer tout `api-nest` si le bootstrap IA local est encore en cours.

### OCR CLI

Installer dans le runtime qui execute l'OCR :

- `tesseract-ocr`
- `tesseract-ocr-fra`
- `tesseract-ocr-eng`
- `poppler-utils`

## 5.4 Volumetrie et ressources

### API si Option A

Prevoir :

- plus de CPU ;
- plus de memoire ;
- timeouts plus larges ;
- limitation de concurrence.

### Ollama

Prevoir :

- RAM adaptee au modele ;
- eventuel GPU si disponible ;
- persistance de modeles dans un volume dedie.
- healthcheck Docker pour ne pas lancer l'API trop tot.

## 6. Observabilite operationnelle

### Endpoint de disponibilite

Ajouter un endpoint dedie :

```txt
GET /api/v1/document-intelligence/readiness
```

Objectif :

- verifier si `vision`, `ocr` et `auto` sont reellement disponibles ;
- remonter une raison claire si un modele Ollama ou `tesseract` manque ;
- permettre au frontend de desactiver l'action `Analyser et pre-remplir` sans casser le reste de SIGEDA.

## 6.1 Logs a produire

Par job :

- `jobId`
- `userId`
- `requestedMode`
- `effectiveMode`
- `ocrProvider`
- `llmProvider`
- `modelName`
- `status`
- `durationMs`
- `confidenceScore`
- `fallbackTriggered`
- `errorCode`

## 6.2 Metriques conseillees

- nombre d'analyses par jour ;
- taux de succes ;
- taux de fallback `vision -> ocr` ;
- duree moyenne vision ;
- duree moyenne OCR ;
- duree moyenne LLM ;
- taux de `LOW_CONFIDENCE` ;
- consommation CPU/RAM Ollama ;
- taille moyenne fichiers analyses.

## 7. Garde-fous runtime

## 7.1 Limites recommandees

- taille max fichier ;
- nombre max pages PDF ;
- timeout vision ;
- timeout OCR ;
- timeout global job ;
- nombre max d'analyses concurrentes par utilisateur.

## 7.2 Regles de protection

- ne jamais passer un document externe a un provider cloud par defaut ;
- purger les temporaires ;
- ne pas exposer directement `rawExtractedText` dans toutes les vues ;
- journaliser les echecs sans journaliser plus de contenu sensible que necessaire.

## 8. Plan de mise a jour des fichiers du projet

### Documentation

- [document-intelligence-architecture.md](/f:/projet/bcc/archivage/docs/document-intelligence-architecture.md)
- [document-intelligence-implementation-plan.md](/f:/projet/bcc/archivage/docs/document-intelligence-implementation-plan.md)
- [document-intelligence-specification.md](/f:/projet/bcc/archivage/docs/document-intelligence-specification.md)

### Infrastructure

Fichiers cibles ensuite :

- `infra/docker/docker-compose.yml`
- `apps/api-nest/Dockerfile`
- eventuellement un Dockerfile worker si Option B

### Backend

Fichiers cibles ensuite :

- `packages/database/prisma/schema.prisma`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/schemas/index.ts`
- `apps/api-nest/src/modules/app.module.ts`
- `apps/api-nest/src/modules/document-intelligence/**`

### Frontend

Fichiers cibles ensuite :

- `apps/web/components/documents/document-create-form.tsx`
- `apps/web/app/api/document-intelligence/**`
- composants UI dedies si necessaire

## 9. Suite logique d'implementation

L'ordre de travail le plus propre devient :

1. mise a jour Prisma + shared contracts
2. module backend + endpoints
3. provider Ollama vision
4. provider Tesseract fallback
5. mode `auto`
6. UI `Analyser un document`
7. logs, retention, instrumentation

## 10. Conclusion

Le design operationnel confirme la direction retenue :

- `vision` d'abord ;
- `ocr` en fallback ;
- `auto` par defaut ;
- TypeScript de bout en bout ;
- validation humaine obligatoire ;
- integration progressive sans rupture de l'architecture SIGEDA.
