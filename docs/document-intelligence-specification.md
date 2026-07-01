# Specification technique detaillee — Document Intelligence SIGEDA

Mise a jour : `2026-06-22`
References :

- [document-intelligence-architecture.md](./document-intelligence-architecture.md)
- [document-intelligence-implementation-plan.md](./document-intelligence-implementation-plan.md)

## 1. Objet

Ce document fixe la specification technique detaillee du MVP `Document Intelligence`.

Il couvre :

- le schema de donnees exact ;
- les DTO/backend contracts ;
- les payloads API ;
- les regles de fallback ;
- les regles de matching metier ;
- les etats UI attendus.

## 2. Schema Prisma recommande

### 2.1 Enum

Ajouter dans `packages/database/prisma/schema.prisma` :

```prisma
enum DocumentIntelligenceJobStatus {
  PENDING
  UPLOADED
  VISION_RUNNING
  OCR_RUNNING
  LLM_RUNNING
  COMPLETED
  LOW_CONFIDENCE
  FAILED
}
```

### 2.2 Model

```prisma
model DocumentIntelligenceJob {
  id               String                       @id @default(uuid()) @db.Uuid
  userId           String                       @map("user_id") @db.Uuid
  user             User                         @relation(fields: [userId], references: [id], onDelete: Cascade)
  originalFileName String                       @map("original_file_name")
  bucket           String
  objectKey        String                       @map("object_key")
  mimeType         String                       @map("mime_type")
  sizeBytes        BigInt                       @map("size_bytes")
  requestedMode    String                       @map("requested_mode")
  effectiveMode    String?                      @map("effective_mode")
  status           DocumentIntelligenceJobStatus
  ocrProvider      String?                      @map("ocr_provider")
  llmProvider      String?                      @map("llm_provider")
  modelName        String?                      @map("model_name")
  extractedJson    Json?                        @map("extracted_json")
  rawExtractedText String?                      @map("raw_extracted_text")
  confidenceScore  Decimal?                     @map("confidence_score") @db.Decimal(5, 4)
  errorCode        String?                      @map("error_code")
  errorMessage     String?                      @map("error_message")
  startedAt        DateTime?                    @map("started_at")
  finishedAt       DateTime?                    @map("finished_at")
  createdAt        DateTime                     @default(now()) @map("created_at")
  updatedAt        DateTime                     @updatedAt @map("updated_at")

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([createdAt])
  @@map("document_intelligence_jobs")
}
```

### 2.3 Extensions optionnelles non-MVP

Ne pas ajouter au MVP sauf besoin immediat :

- `pageCount`
- `durationMs`
- `rawVisionOutput`
- `matchingReport`
- `cleanupAt`

## 3. Types partages recommandes

### 3.1 Modes

```ts
export type DocumentIntelligenceRequestedMode = "vision" | "ocr" | "auto";
export type DocumentIntelligenceEffectiveMode = "vision" | "ocr" | "hybrid";
```

### 3.2 Statut

```ts
export type DocumentIntelligenceJobStatus =
  | "PENDING"
  | "UPLOADED"
  | "VISION_RUNNING"
  | "OCR_RUNNING"
  | "LLM_RUNNING"
  | "COMPLETED"
  | "LOW_CONFIDENCE"
  | "FAILED";
```

### 3.3 Resultat structure

```ts
export type DocumentIntelligenceResult = {
  reference: string;
  subject: string;
  documentDate: string;
  emitterDirection: string;
  receiverDirections: string[];
  copyDirections: string[];
  signers: string[];
  documentType: string;
  confidentialityLevel: string;
  summary: string;
  keywords: string[];
  confidenceScore: number;
  fieldConfidence: Record<string, number>;
  extractionMode: "vision" | "ocr" | "hybrid";
  rawExtractedText: string;
  rawVisionNotes?: string;
};
```

## 4. Schemas Zod recommandes

### 4.1 Resultat IA

```ts
const extractedDocumentSchema = z.object({
  reference: z.string().default(""),
  subject: z.string().default(""),
  documentDate: z.string().default(""),
  emitterDirection: z.string().default(""),
  receiverDirections: z.array(z.string()).default([]),
  copyDirections: z.array(z.string()).default([]),
  signers: z.array(z.string()).default([]),
  documentType: z.string().default(""),
  confidentialityLevel: z.string().default(""),
  summary: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(0),
  fieldConfidence: z.record(z.number().min(0).max(1)).default({}),
  extractionMode: z.enum(["vision", "ocr", "hybrid"]).default("vision"),
  rawExtractedText: z.string().default(""),
  rawVisionNotes: z.string().optional()
});
```

### 4.2 Regle de validation

Le schema valide la forme, pas la veracite metier.

Une seconde validation metier doit verifier :

- champs indispensables non vides ;
- confiance minimale ;
- coherence de certaines valeurs.

## 5. DTO backend recommandes

### 5.1 AnalyzeDocumentDto

```ts
class AnalyzeDocumentDto {
  mode?: "vision" | "ocr" | "auto";
}
```

Le fichier doit etre passe en `multipart/form-data`.

### 5.2 Query job

Pas de payload complexe necessaire au MVP.

## 6. Endpoints et payloads API

## 6.1 POST `/api/v1/document-intelligence/analyze`

### Request

`multipart/form-data`

Champs :

- `file`
- `mode` optionnel

### Response `202 Accepted`

```json
{
  "jobId": "uuid",
  "status": "PENDING"
}
```

### Erreurs attendues

- `400` fichier invalide
- `401` non authentifie
- `403` non autorise
- `413` fichier trop volumineux
- `422` document non exploitable
- `500` erreur interne

## 6.2 GET `/api/v1/document-intelligence/jobs/:id`

### Response

```json
{
  "id": "uuid",
  "status": "VISION_RUNNING",
  "requestedMode": "auto",
  "effectiveMode": null,
  "confidenceScore": null,
  "errorCode": null,
  "errorMessage": null,
  "createdAt": "2026-06-22T10:00:00.000Z",
  "updatedAt": "2026-06-22T10:00:04.000Z"
}
```

### Final state examples

```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "requestedMode": "auto",
  "effectiveMode": "vision",
  "confidenceScore": 0.84,
  "errorCode": null,
  "errorMessage": null
}
```

```json
{
  "id": "uuid",
  "status": "LOW_CONFIDENCE",
  "requestedMode": "auto",
  "effectiveMode": "ocr",
  "confidenceScore": 0.56,
  "errorCode": "LOW_CONFIDENCE",
  "errorMessage": "L'analyse est terminee mais la confiance est insuffisante."
}
```

## 6.3 GET `/api/v1/document-intelligence/results/:id`

### Response

```json
{
  "job": {
    "id": "uuid",
    "status": "COMPLETED",
    "requestedMode": "auto",
    "effectiveMode": "vision",
    "confidenceScore": 0.84
  },
  "result": {
    "reference": "D.605.00/n°0018",
    "subject": "Lutte contre le blanchiment",
    "documentDate": "2026-06-20",
    "emitterDirection": "Direction Commerciale",
    "receiverDirections": ["Direction Technique"],
    "copyDirections": ["Direction Generale"],
    "signers": ["Directeur Commercial"],
    "documentType": "NOTE",
    "confidentialityLevel": "INTERNE",
    "summary": "Resume detecte...",
    "keywords": ["blanchiment", "conformite"],
    "confidenceScore": 0.84,
    "fieldConfidence": {
      "reference": 0.95,
      "subject": 0.91,
      "documentDate": 0.73,
      "emitterDirection": 0.88
    },
    "extractionMode": "vision",
    "rawExtractedText": "",
    "rawVisionNotes": ""
  },
  "matching": {
    "emitterDirection": {
      "status": "matched",
      "label": "Direction Commerciale",
      "matchedDepartmentId": "uuid"
    },
    "receiverDirections": [
      {
        "status": "matched",
        "label": "Direction Technique",
        "matchedDepartmentId": "uuid"
      }
    ],
    "copyDirections": [
      {
        "status": "matched",
        "label": "Direction Generale",
        "matchedDepartmentId": "uuid"
      }
    ]
  }
}
```

## 7. Regles de fallback recommandees

## 7.1 Seuils MVP

```txt
LOW_CONFIDENCE_THRESHOLD = 0.70
GOOD_CONFIDENCE_THRESHOLD = 0.85
MAX_PDF_PAGES_FOR_VISION = 5
```

## 7.2 Fallback `vision -> ocr`

Declencher OCR si au moins un des cas suivants est vrai :

- `confidenceScore < 0.70`
- `reference === ""`
- `subject === ""`
- `emitterDirection === ""`
- `receiverDirections.length === 0 && copyDirections.length === 0`
- le provider vision retourne une erreur
- PDF > `MAX_PDF_PAGES_FOR_VISION`

## 7.3 Choix final

### Cas 1

Vision reussie, score >= `0.85`

- garder `vision`

### Cas 2

Vision partielle, OCR meilleur

- garder `ocr`
- `extractionMode = "hybrid"` seulement si le mode auto a tente vision puis OCR

### Cas 3

Vision et OCR tous deux faibles

- garder le meilleur resultat
- marquer `LOW_CONFIDENCE`

## 8. Matching metier recommande

## 8.1 Principe

Les libelles detectes ne deviennent jamais directement des IDs SIGEDA.

Le backend doit produire un rapport de matching :

- `matched`
- `ambiguous`
- `unmatched`

## 8.2 Matching directions

Source :

- table `departments`

Regle MVP :

1. normaliser le texte ;
2. comparer :
   - code
   - designation
3. si une seule correspondance :
   - `matched`
4. si plusieurs :
   - `ambiguous`
5. si aucune :
   - `unmatched`

## 8.3 Matching type documentaire

Source :

- referentiel frontend/shared `documentTypes`

## 8.4 Matching confidentialite

Source :

- referentiel `confidentialityLevels`

## 8.5 Signataires

MVP :

- conserver les signataires comme texte extrait
- ne pas tenter un matching utilisateur fort dans la premiere version

## 9. Specification UI

## 9.1 Etat initial

Afficher dans `Nouveau document` :

- bouton `Analyser un document`

## 9.2 Upload

Apres selection du fichier :

- spinner
- texte `Analyse en cours...`

## 9.3 Etat succes

Afficher :

- mode utilise : `Vision`, `OCR` ou `Hybride`
- confiance globale
- resume des champs detectes
- avertissements si `ambiguous` ou `unmatched`
- bouton `Appliquer les valeurs detectees`
- bouton `Relancer l'analyse`

## 9.4 Etat faible confiance

Afficher :

- message clair
- champs detectes partiellement
- badge `A verifier`
- possibilite de ne rien appliquer

## 9.5 Etat erreur

Afficher un message professionnel selon le cas :

- `Le document n'a pas pu etre analyse.`
- `Le moteur local est indisponible.`
- `Le document est trop difficile a lire automatiquement.`

## 10. Variables d'environnement exactes

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
DOCUMENT_AI_LOW_CONFIDENCE_THRESHOLD=0.70
DOCUMENT_AI_GOOD_CONFIDENCE_THRESHOLD=0.85
DOCUMENT_AI_MAX_PDF_PAGES_FOR_VISION=5
```

## 11. Ordre d'implementation concret

### Etape 1

- migration Prisma
- types shared
- schemas Zod

### Etape 2

- module NestJS
- repository jobs
- endpoints `analyze / jobs / results`

### Etape 3

- provider Ollama
- chaine vision
- resultat JSON valide

### Etape 4

- provider `tesseract-cli`
- extraction OCR
- chaine texte

### Etape 5

- mode selector
- fallback auto
- scoring

### Etape 6

- routes API Next
- UI formulaire
- polling et application des valeurs

### Etape 7

- audit
- retention temporaire
- instrumentation

## 12. Definition of Done

Le lot est termine si :

- un fichier peut etre analyse en mode `vision`
- le fallback `ocr` fonctionne
- le mode `auto` choisit correctement
- les resultats sont historises
- le JSON est valide
- le formulaire peut etre pre-rempli
- aucun document n'est cree automatiquement
- les erreurs et faibles confiances sont correctement exposees
