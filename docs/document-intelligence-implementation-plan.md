# Plan d'implementation technique — Document Intelligence SIGEDA

Mise a jour : `2026-06-22`
References :

- [document-intelligence-architecture.md](./document-intelligence-architecture.md)
- [architecture-production-cible.md](./architecture-production-cible.md)

## 1. Objectif

Transformer la doctrine `vision / ocr / auto` en sequence d'implementation technique exploitable.

Ce plan couvre :

- Prisma ;
- NestJS ;
- frontend Next.js ;
- variables d'environnement ;
- choix d'implementation MVP ;
- strategie de test ;
- ordre de livraison.

## 2. Decisions d'implementation retenues pour le MVP

### Perimetre MVP

- mode par defaut : `DOCUMENT_AI_MODE=auto`
- provider vision local : `Ollama`
- modele vision local : `Qwen2.5-VL`
- provider OCR fallback : `tesseract-cli`
- orchestration : `LangChain JS`
- execution : `asynchrone avec jobId`
- stockage temporaire : `MinIO`
- persistance : table `document_intelligence_jobs`

### Hors perimetre MVP

- LangGraph JS
- PaddleOCR
- fusion semantique avancee de plusieurs extractions
- auto-classement ou auto-enregistrement du document
- support multi-tenant

## 3. Sequence globale

```txt
Lot 1  Modele de donnees + contrats partages
Lot 2  Module backend de base
Lot 3  Pipeline Vision
Lot 4  Pipeline OCR fallback
Lot 5  Strategie auto + score de confiance
Lot 6  Integration frontend
Lot 7  Securite, retention, audit
Lot 8  Tests, recette, instrumentation
```

## 4. Lot 1 — Modele de donnees + contrats partages

### 4.1 Prisma

Ajouter dans `packages/database/prisma/schema.prisma` :

- enum `DocumentIntelligenceJobStatus`
- model `DocumentIntelligenceJob`

### 4.2 Enum recommande

```txt
PENDING
UPLOADED
VISION_RUNNING
OCR_RUNNING
LLM_RUNNING
COMPLETED
LOW_CONFIDENCE
FAILED
```

### 4.3 Modele recommande

Champs minimum :

- `id`
- `userId`
- `originalFileName`
- `bucket`
- `objectKey`
- `mimeType`
- `sizeBytes`
- `requestedMode`
- `effectiveMode`
- `status`
- `ocrProvider`
- `llmProvider`
- `modelName`
- `extractedJson`
- `rawExtractedText`
- `confidenceScore`
- `errorCode`
- `errorMessage`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

### 4.4 Index recommends

- `@@index([userId, createdAt])`
- `@@index([status, createdAt])`
- `@@index([createdAt])`

### 4.5 Shared contracts

Ajouter dans `packages/shared/src/types/index.ts` :

- `DocumentIntelligenceRequestedMode`
- `DocumentIntelligenceEffectiveMode`
- `DocumentIntelligenceJobStatus`
- `DocumentIntelligenceJobListItem`
- `DocumentIntelligenceResult`

Ajouter dans `packages/shared/src/schemas/index.ts` :

- schema Zod de resultat d'extraction
- schema Zod de job

### 4.6 Livrable

- migration Prisma
- types partages
- schemas Zod partages

## 5. Lot 2 — Module backend de base

### 5.1 Dossier cible

```txt
apps/api-nest/src/modules/document-intelligence/
```

### 5.2 Fichiers a creer

```txt
document-intelligence.module.ts
document-intelligence.controller.ts
document-intelligence.service.ts
document-intelligence.repository.ts

dto/
  analyze-document.dto.ts

schemas/
  extracted-document.schema.ts

providers/
  local-llm-provider.interface.ts
  ollama.provider.ts
  openai-compatible-local.provider.ts

ocr/
  ocr-provider.interface.ts
  tesseract-cli.provider.ts

chains/
  extract-from-vision.chain.ts
  extract-from-ocr-text.chain.ts
  choose-best-extraction.chain.ts

prompts/
  extract-document-from-vision.prompt.ts
  extract-document-from-text.prompt.ts

utils/
  temp-object-key.ts
  file-preprocessing.ts
  confidence.ts
  mode-selector.ts
  referential-matcher.ts
```

### 5.3 Integration module

Ajouter `DocumentIntelligenceModule` dans :

- [app.module.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/app.module.ts)

Importer :

- `AttachmentsModule` si reusage des utilitaires MinIO est opportun
- `PrismaService`
- eventuellement `DocumentsModule` seulement si une dependance metier stricte apparait

### 5.4 Controller — endpoints MVP

- `POST /api/v1/document-intelligence/analyze`
- `GET /api/v1/document-intelligence/jobs/:id`
- `GET /api/v1/document-intelligence/results/:id`

### 5.5 Permissions

Roles minimum :

- `ADMIN`
- `DIRECTEUR_GENERAL`
- `DIRECTEUR`
- `MANAGER`
- `AGENT`

mais perimetre controle au backend par l'utilisateur connecte.

## 6. Lot 3 — Pipeline Vision

### 6.1 Objectif

Permettre l'analyse directe via modele vision local.

### 6.2 Etapes techniques

1. Recevoir le fichier via endpoint `analyze`
2. Stocker temporairement dans MinIO
3. Si PDF :
   - convertir la premiere page ou plusieurs pages en images
4. Construire l'appel vers le provider vision
5. Executer la chaine LangChain JS
6. Parser la sortie JSON
7. Evaluer la confiance
8. Persister le job

### 6.3 Provider vision local

Implementation recommandee :

- `OllamaProvider`

Capacites minimales :

- appel HTTP local ;
- timeout configurable ;
- passage image + prompt ;
- retour texte JSON.

### 6.4 Prompt vision

Le prompt doit :

- interdire les inventions ;
- exiger le JSON strict ;
- laisser vide tout champ inconnu ;
- distinguer clairement emetteur / destinataires / copies ;
- retourner un score de confiance.

### 6.5 Resultat attendu

- `extractionMode = "vision"`
- `rawVisionNotes` optionnel

## 7. Lot 4 — Pipeline OCR fallback

### 7.1 Objectif

Permettre le fallback robuste via OCR texte.

### 7.2 Etapes techniques

1. Convertir PDF en images si necessaire
2. Appeler `tesseract-cli`
3. Assembler le texte multipage
4. Normaliser le texte
5. Passer le texte a la chaine LangChain JS
6. Parser le JSON
7. Evaluer la confiance
8. Persister le texte brut OCR

### 7.3 OcrProvider

Interface cible :

- `supports(inputMimeType: string): boolean`
- `extractText(input: OcrInput): Promise<OcrOutput>`

### 7.4 OcrOutput recommande

- `text`
- `pageCount`
- `durationMs`
- `warnings`

### 7.5 Resultat attendu

- `extractionMode = "ocr"`
- `rawExtractedText` renseigne

## 8. Lot 5 — Strategie auto + confiance

### 8.1 Objectif

Choisir automatiquement le meilleur chemin.

### 8.2 Mode selector

Creer `mode-selector.ts` avec la logique :

- si `DOCUMENT_AI_MODE=vision` : force vision
- si `DOCUMENT_AI_MODE=ocr` : force OCR
- si `DOCUMENT_AI_MODE=auto` :
  - tenter vision
  - valider
  - fallback OCR si necessaire

### 8.3 Regles de fallback MVP

Fallback OCR si :

- `confidenceScore < 0.7`
- `reference` vide
- `subject` vide
- `emitterDirection` vide
- aucune direction detectee
- erreur provider vision
- PDF de plus de `N` pages

### 8.4 Fusion MVP

Pour le MVP, ne pas faire de fusion semantique complexe.

Strategie simple :

- si vision est bonne : garder vision
- sinon garder OCR
- marquer `hybrid` seulement si vision a ete tente puis OCR retenu

### 8.5 Confidence service

Creer `confidence.ts` :

- score global ;
- score par champ ;
- statut `LOW_CONFIDENCE` si seuil non atteint

## 9. Lot 6 — Integration frontend

### 9.1 Ecran cible

[document-create-form.tsx](/f:/projet/bcc/archivage/apps/web/components/documents/document-create-form.tsx:1)

### 9.2 Ajouts UI

- bouton `Analyser un document`
- composant d'upload dedie a l'analyse
- etat `Analyse en cours...`
- resume du resultat
- indication du mode :
  - `Vision`
  - `OCR`
  - `Hybride`
- indicateur de confiance
- bouton `Appliquer les valeurs detectees`
- bouton `Relancer l'analyse`

### 9.3 API routes Next a ajouter

Dans `apps/web/app/api/document-intelligence/` :

- `analyze/route.ts`
- `jobs/[id]/route.ts`
- `results/[id]/route.ts`

### 9.4 Workflow frontend

1. upload fichier analyse
2. appel `POST /api/document-intelligence/analyze`
3. recuperation `jobId`
4. polling `jobs/:id`
5. quand termine :
   - recuperer `results/:id`
   - afficher preview
6. sur confirmation utilisateur :
   - injecter les valeurs dans le formulaire existant

### 9.5 Mapping vers le formulaire

Mapper :

- `reference`
- `subject`
- `documentDate`
- `documentType`
- `confidentialityLevel`
- `summary`
- `keywords`

Pour les referentiels :

- `emitterDirection`
- `receiverDirections`
- `copyDirections`
- `signers`

il faut passer par une resolution backend/frontend avec etats :

- `matched`
- `ambiguous`
- `unmatched`

## 10. Lot 7 — Securite, retention, audit

### 10.1 Stockage temporaire

Prefixe recommande :

```txt
tmp/document-intelligence/{jobId}/source-file
```

### 10.2 Retention

MVP :

- retention logique en base
- nettoyage journalier des objets temporaires > 72h

### 10.3 Audit

Journaliser :

- utilisateur ;
- date ;
- fichier ;
- mode demande ;
- mode effectif ;
- moteur OCR ;
- modele IA ;
- score final ;
- succes/echec.

### 10.4 Messages d'erreur utilisateur

Cas couverts :

- fichier illisible
- PDF protege
- modele local indisponible
- OCR vide
- resultat faible
- timeout
- erreur de validation JSON

## 11. Lot 8 — Tests, recette, instrumentation

### 11.1 Tests backend

Tester :

- creation job
- stockage temporaire
- mode `vision`
- mode `ocr`
- mode `auto`
- fallback OCR
- validation Zod
- permissions

### 11.2 Tests frontend

Tester :

- upload analyse
- affichage etat en cours
- polling
- injection des champs
- gestion erreur et faible confiance

### 11.3 Tests fonctionnels

Cas minimum :

1. scan simple lisible
2. PDF textuel multipage
3. document de mauvaise qualite
4. document avec destinataires multiples
5. document avec score faible

### 11.4 Instrumentation

Ajouter :

- duree analyse vision
- duree OCR
- duree LLM
- taux echec par mode
- taux fallback `vision -> ocr`

## 12. Variables d'environnement a ajouter

### Backend

```txt
DOCUMENT_AI_MODE=auto
DOCUMENT_AI_TIMEOUT_MS=60000

DOCUMENT_AI_VISION_PROVIDER=ollama
DOCUMENT_AI_VISION_BASE_URL=http://ollama:11434
DOCUMENT_AI_VISION_MODEL=qwen2.5vl:3b

DOCUMENT_AI_TEXT_PROVIDER=ollama
DOCUMENT_AI_TEXT_BASE_URL=http://ollama:11434
DOCUMENT_AI_TEXT_MODEL=qwen2.5:3b

OCR_PROVIDER=tesseract-cli
OCR_LANGUAGE=fra+eng
OCR_TIMEOUT_MS=60000
OCR_TEMP_DIR=/tmp/sigeda-ocr

DOCUMENT_AI_TEMP_BUCKET_PREFIX=tmp/document-intelligence
DOCUMENT_AI_LOW_CONFIDENCE_THRESHOLD=0.7
DOCUMENT_AI_MAX_PDF_PAGES_FOR_VISION=5
```

## 13. Ordre d'implementation recommande

### Sprint 1

- Prisma + shared contracts
- module backend
- jobs API
- stockage temporaire MinIO

### Sprint 2

- provider Ollama
- chaine vision
- JSON validation
- persistance resultat

### Sprint 3

- provider `tesseract-cli`
- chaine OCR texte
- fallback auto
- seuils de confiance

### Sprint 4

- UI `Analyser un document`
- polling
- pre-remplissage formulaire
- resolution referentiels

### Sprint 5

- audit
- retention
- instrumentation
- recette complete

## 14. Risques d'implementation

### Risques forts

- faux positifs sur directions ;
- performance insuffisante du modele vision ;
- PDF multipage mal geres ;
- temps de reponse trop longs ;
- faible qualite OCR sur scans flous.

### Parades MVP

- mode asynchrone obligatoire ;
- confiance minimale ;
- validation humaine ;
- fallback OCR ;
- scopes de fichiers temporaires ;
- journaux d'analyse complets.

## 15. Definition of Done du MVP

Le MVP est considere termine si :

- un utilisateur peut lancer une analyse depuis `Nouveau document` ;
- le backend cree un job ;
- le mode `vision` fonctionne ;
- le fallback `ocr` fonctionne ;
- le resultat JSON est valide par Zod ;
- les champs peuvent etre appliques au formulaire sans creation automatique ;
- les erreurs sont gerees proprement ;
- les analyses sont historisees ;
- les fichiers temporaires sont geres.

## 16. Suite logique apres MVP

- support `PaddleOCR`
- support providers OpenAI-compatibles locaux
- calibration avancee du score de confiance
- fusion semantique `vision + ocr`
- LangGraph JS pour pilotage multi-etapes
- dashboards d'usage et de performance
