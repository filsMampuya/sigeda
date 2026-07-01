# Integration IA documentaire locale dans SIGEDA

Mise a jour : `2026-06-22`
Branche : `amelioration`

## 1. Objectif

Ajouter a SIGEDA une brique d'analyse documentaire locale, en `TypeScript`, capable de :

- recevoir un PDF, une image ou un scan ;
- choisir intelligemment entre extraction vision directe et OCR local ;
- appeler un modele IA local ;
- produire un JSON structure ;
- pre-remplir le formulaire `Nouveau document` ;
- laisser la validation finale a l'utilisateur.

Le systeme ne doit jamais enregistrer automatiquement un document a partir du resultat IA.

## 2. Revision de doctrine

La version precedente partait d'un schema `OCR d'abord`, puis LLM.

Cette doctrine est revisee.

### Nouvelle regle

L'OCR ne doit pas etre systematique.

SIGEDA doit supporter trois modes :

- `vision`
- `ocr`
- `auto`

Le mode recommande par defaut est `auto`.

## 3. Impact sur l'architecture actuelle

### Backend actuel

Le backend actif est `apps/api-nest`, pas `apps/api`.

Points d'ancrage existants :

- upload documentaire via [documents.controller.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/documents/documents.controller.ts:61) ;
- creation document avec fichier via [documents.service.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/documents/documents.service.ts:192) ;
- stockage MinIO via [attachments.service.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/attachments/attachments.service.ts:61) ;
- module documents charge deja `AttachmentsModule` via [documents.module.ts](/f:/projet/bcc/archivage/apps/api-nest/src/modules/documents/documents.module.ts:1).

Impact principal :

- ajout d'un module NestJS autonome ;
- ajout d'un flux de stockage temporaire MinIO ;
- ajout d'une orchestration `vision / ocr / auto` cote API ;
- ajout d'une historisation des analyses ;
- ajout d'un parcours frontend distinct de la creation definitive.

### Frontend actuel

Le formulaire `Nouveau document` supporte deja :

- emetteur modifiable ;
- destinataires/copies ;
- signataires ;
- upload de fichier ;
- creation par validation utilisateur.

Point d'ancrage principal :

- [document-create-form.tsx](/f:/projet/bcc/archivage/apps/web/components/documents/document-create-form.tsx:1)

Impact principal :

- ajout d'un bouton `Analyser un document` ;
- ajout d'un upload dedie a l'analyse ;
- affichage d'un etat de traitement ;
- mapping du resultat JSON vers les champs existants ;
- mise en evidence des champs detectes automatiquement ;
- affichage d'un score de confiance et du mode d'extraction utilise.

### Infrastructure

La pile actuelle comporte deja :

- PostgreSQL ;
- MinIO ;
- Keycloak ;
- Nginx ;
- API NestJS ;
- frontend Next.js ;
- OpenSearch optionnel.

Impact principal :

- ajout d'un moteur LLM local vision ou multimodal ;
- ajout eventuelle d'un moteur OCR local ;
- nouvelles variables d'environnement ;
- hausse CPU/RAM potentielle sur le noeud IA selon le mode choisi.

## 4. Comparaison des approches

### Vision directe

Pipeline :

```txt
Document
  ↓
Conversion eventuelle en image
  ↓
Modele vision local
  ↓
Extraction JSON
```

Avantages :

- moins d'etapes ;
- meilleure lecture du layout ;
- meilleur potentiel sur cachets, entetes, blocs visuels ;
- bonne UX sur scans simples ou documents photo.

Limites :

- cout machine plus eleve ;
- qualite variable selon modele ;
- moins robuste sur PDF longs tres textuels ;
- besoin de fallback en cas de faible confiance.

### OCR + IA

Pipeline :

```txt
Document
  ↓
OCR local
  ↓
Texte brut
  ↓
LLM local
  ↓
Extraction JSON
```

Avantages :

- plus stable sur documents tres textuels ;
- meilleur controle sur le texte intermediaire ;
- bon fallback pour PDF longs ;
- plus simple a auditer.

Limites :

- perte de structure visuelle ;
- erreurs OCR possibles ;
- etape supplementaire parfois inutile.

### Conclusion

La meilleure architecture pour SIGEDA n'est ni `vision seul`, ni `ocr seul`, mais :

- `vision` comme chemin prioritaire ;
- `ocr` comme chemin de robustesse ;
- `auto` comme comportement cible.

## 5. Architecture recommandee

Pipeline recommande :

```txt
Fichier upload analyse
  ↓
Backend NestJS
  ↓
Stockage temporaire MinIO
  ↓
Detection type / taille / pages / qualite
  ↓
Strategie DOCUMENT_AI_MODE
  ↓
Mode vision ou mode OCR
  ↓
Validation JSON
  ↓
Score de confiance
  ↓
Fallback ou fusion si necessaire
  ↓
Pre-remplissage formulaire
  ↓
Validation humaine
```

### Choix de placement

Recommandation :

`apps/api-nest/src/modules/document-intelligence`

et non `apps/api/src/modules/document-intelligence`.

## 6. Strategie DOCUMENT_AI_MODE

Variables recommandees :

```txt
DOCUMENT_AI_MODE=vision | ocr | auto
DOCUMENT_AI_VISION_PROVIDER=ollama | openai-compatible
DOCUMENT_AI_TEXT_PROVIDER=ollama | openai-compatible
DOCUMENT_AI_VISION_MODEL=qwen2.5vl:3b
DOCUMENT_AI_TEXT_MODEL=qwen2.5:3b
DOCUMENT_AI_TIMEOUT_MS=60000
```

### Comportement

`vision`

- force l'extraction directe via modele vision local.

`ocr`

- force OCR local puis extraction par LLM texte.

`auto`

1. tenter `vision` ;
2. valider le JSON ;
3. mesurer la confiance et la completude ;
4. si insuffisant, lancer `ocr` ;
5. comparer ou fusionner les resultats ;
6. retourner la meilleure sortie.

## 7. Choix recommande : LangChain JS ou LangGraph JS

### Recommandation immediate

Utiliser `LangChain JS`.

### Pourquoi

Le besoin initial reste principalement lineaire, meme avec `auto` :

1. choisir une strategie ;
2. lancer extraction ;
3. valider ;
4. fallback si necessaire ;
5. retourner le resultat.

LangGraph JS sera utile plus tard si l'on veut :

- retries conditionnels ;
- fusion multi-resultats plus riche ;
- supervision d'etapes internes ;
- intervention humaine au milieu du flux ;
- workflows plus complexes par type de document.

### Decision

- `Phase 1` : `LangChain JS`
- `Phase 2` : `LangGraph JS` si la logique de fallback devient trop complexe.

## 8. Choix recommande des providers OCR

### Options evaluees

- `tesseract.js`
- `tesseract-cli`
- `paddleocr-cli`
- `http-local`

### Recommandation immediate

`tesseract-cli`

### Pourquoi

- compatible Node.js/TypeScript sans service Python maison ;
- plus robuste que `tesseract.js` sur serveur ;
- simple a exploiter on-premise ;
- bon choix de fallback initial.

### Evolution

Prevoir une abstraction `OcrProvider` avec implementations possibles :

- `TesseractCliOcrProvider`
- `TesseractJsOcrProvider`
- `PaddleOcrCliProvider`
- `HttpLocalOcrProvider`

### Pretraitement OCR

Pour les PDF scannes, prevoir :

- conversion PDF vers images ;
- gestion multipage ;
- assemblage du texte ;
- timeouts et limites de taille.

Outils systeme recommandables :

- `pdftoppm` via Poppler ;
- ou `mutool draw`.

## 9. Choix recommande des providers IA locale

### Options evaluees

- Ollama
- LM Studio server
- vLLM compatible OpenAI
- llama.cpp server

### Recommandation immediate

`Ollama`

### Pourquoi

- simple a installer on-premise ;
- API HTTP locale stable ;
- integration Node/TypeScript directe ;
- approprie pour une premiere integration maitrisee.

### Recommandation de modeles

Pour la premiere phase :

- mode vision : `Qwen2.5-VL` ou equivalent multimodal ;
- mode texte : `Qwen2.5` ou equivalent instruct local.

### Abstraction recommandee

`LocalLlmProvider`

Implementations cible :

- `OllamaProvider`
- `OpenAiCompatibleLocalProvider` pour vLLM / LM Studio / llama.cpp server

## 10. Structure du module recommandee

```txt
apps/api-nest/src/modules/document-intelligence/
  document-intelligence.module.ts
  document-intelligence.controller.ts
  document-intelligence.service.ts
  document-intelligence.repository.ts
  dto/
    analyze-document.dto.ts
    document-intelligence-job-query.dto.ts
  schemas/
    extracted-document.schema.ts
  chains/
    extract-from-vision.chain.ts
    extract-from-ocr-text.chain.ts
    choose-best-extraction.chain.ts
  ocr/
    ocr-provider.interface.ts
    tesseract-cli.provider.ts
    tesseract-js.provider.ts
    paddleocr-cli.provider.ts
    http-local.provider.ts
  providers/
    local-llm-provider.interface.ts
    ollama.provider.ts
    openai-compatible-local.provider.ts
  prompts/
    extract-document-from-vision.prompt.ts
    extract-document-from-text.prompt.ts
    compare-extractions.prompt.ts
  utils/
    file-preprocessing.ts
    confidence.ts
    temp-object-key.ts
    document-intelligence-mapper.ts
    mode-selector.ts
```

## 11. Endpoints backend necessaires

### Recommandation

Approche asynchrone des la premiere version.

### Endpoints

- `POST /api/v1/document-intelligence/analyze`
- `GET /api/v1/document-intelligence/jobs/:id`
- `GET /api/v1/document-intelligence/results/:id`

### Pourquoi

- le mode vision peut etre lent ;
- l'OCR multipage peut etre lent ;
- le mode `auto` peut executer deux traitements successifs ;
- cela evite des timeouts HTTP/Nginx.

## 12. Modele de donnees recommande

### Recommandation

Ajouter une table `document_intelligence_jobs`.

### Champs recommandes

- `id`
- `userId`
- `originalFileName`
- `bucket`
- `objectKey`
- `mimeType`
- `sizeBytes`
- `status`
- `requestedMode`
- `effectiveMode`
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

### Statuts recommandes

- `PENDING`
- `UPLOADED`
- `VISION_RUNNING`
- `OCR_RUNNING`
- `LLM_RUNNING`
- `COMPLETED`
- `FAILED`
- `LOW_CONFIDENCE`

## 13. Format JSON final recommande

Le JSON cible doit etre valide avec `Zod`.

### Format recommande

```json
{
  "reference": "",
  "subject": "",
  "documentDate": "",
  "emitterDirection": "",
  "receiverDirections": [],
  "copyDirections": [],
  "signers": [],
  "documentType": "",
  "confidentialityLevel": "",
  "summary": "",
  "keywords": [],
  "confidenceScore": 0,
  "fieldConfidence": {
    "reference": 0,
    "subject": 0,
    "documentDate": 0,
    "emitterDirection": 0
  },
  "extractionMode": "vision",
  "rawExtractedText": "",
  "rawVisionNotes": ""
}
```

### Regles

- `extractionMode` vaut `vision`, `ocr` ou `hybrid` ;
- `rawExtractedText` est surtout utile en mode OCR ;
- `rawVisionNotes` sert au debug technique, pas a l'UI standard.

## 14. Validation backend

### Recommandation

- `Zod` pour le schema de sortie IA ;
- mapping backend explicite vers les champs du frontend ;
- rejet controle si le schema n'est pas conforme.

### Regles

- pas d'auto-enregistrement ;
- pas de pre-remplissage silencieux si confiance trop faible ;
- journalisation de tout echec de parsing.

## 15. Fallback recommande

### Strategie `auto`

1. tenter `vision`
2. valider le JSON
3. mesurer completude et confiance
4. si insuffisant, lancer `ocr`
5. relancer extraction texte
6. comparer ou fusionner
7. retourner le meilleur resultat

### Declencheurs de fallback

- reference absente ;
- emetteur non detecte ;
- destinataires absents ;
- score sous seuil ;
- erreur provider vision ;
- PDF long ou lourd ;
- resultat partiel.

## 16. Impacts frontend

### Ecran cible

[document-create-form.tsx](/f:/projet/bcc/archivage/apps/web/components/documents/document-create-form.tsx:1)

### Ajouts UX recommandes

- bouton `Analyser un document` ;
- zone d'upload dediee ;
- message `Analyse en cours...` ;
- affichage du mode utilise : `Vision`, `OCR`, `Hybride` ;
- badge `Detecte automatiquement` ;
- indicateur `Confiance faible / moyenne / elevee` ;
- bouton `Appliquer les valeurs detectees` ;
- possibilite de relancer l'analyse.

### Regle UX critique

Le resultat IA doit etre propose, jamais impose.

## 17. Securite

### Recommandations

- ne jamais appeler de provider externe par defaut ;
- limiter les droits a l'analyse aux profils autorises ;
- stocker les fichiers d'analyse sous prefixe temporaire MinIO ;
- supprimer les objets temporaires apres retention courte ;
- ne pas reexposer le texte OCR brut en lecture large ;
- journaliser utilisateur, moteur OCR, modele, duree, succes/echec.

### Prefixe MinIO recommande

```txt
tmp/document-intelligence/{jobId}/source-file
```

### Retention recommandee

- suppression automatique a `24h` ou `72h` ;
- conservation plus longue seulement pour audit si explicitement demande.

## 18. Risques techniques

### Risques vision

- latence plus elevee ;
- besoin GPU ou CPU important ;
- instabilite sur gros PDF ;
- JSON parfois plus variable.

### Risques OCR

- scans de mauvaise qualite ;
- PDF photo de travers ;
- bruit documentaire ;
- perte de structure.

### Risques metier

- confusion emetteur/destinataire ;
- match incomplet avec referentiels SIGEDA ;
- confiance trompeuse si mal calibree.

### Risques infra

- surcharge du noeud API si OCR ou vision sont executes au meme endroit ;
- espace disque temporaire ;
- timeouts HTTP/Nginx ;
- file d'attente absente.

## 19. Recommandations de mapping metier

Les champs textes extraits ne doivent pas etre convertis directement en IDs SIGEDA sans verification.

### Strategie recommandee

1. extraire valeurs textuelles ;
2. matcher contre les referentiels :
   - directions ;
   - type de document ;
   - niveau de confidentialite ;
3. affecter :
   - `matched`
   - `ambiguous`
   - `unmatched`
4. laisser l'utilisateur confirmer.

## 20. Plan d'implementation progressif

### Phase 1 — Fondations backend

- creer le module `document-intelligence` ;
- ajouter schema Zod ;
- ajouter table `document_intelligence_jobs` ;
- ajouter abstraction OCR ;
- ajouter abstraction LLM ;
- ajouter la strategie `DOCUMENT_AI_MODE` ;
- brancher MinIO temporaire ;
- exposer endpoints.

### Phase 2 — Vision MVP

- integrer provider `Ollama` ;
- integrer modele vision local ;
- creer prompt vision structure ;
- produire JSON valide ;
- mesurer confiance globale.

### Phase 3 — OCR fallback MVP

- implementer `tesseract-cli` ;
- implementer extraction texte image/PDF ;
- creer prompt texte structure ;
- brancher le fallback `auto`.

### Phase 4 — Frontend

- bouton `Analyser un document` ;
- upload et polling job ;
- affichage du mode ;
- pre-remplissage des champs ;
- affichage confiance ;
- correction manuelle.

### Phase 5 — Durcissement

- ACL d'acces ;
- retention fichiers temporaires ;
- logs d'audit ;
- alertes d'echec ;
- timeouts et limites de taille.

### Phase 6 — Evolution

- support `PaddleOCR CLI` si necessaire ;
- support provider OpenAI-compatible local ;
- support `LangGraph JS` si orchestration avancee ;
- comparaison/fusion plus fine des sorties.

## 21. Plan de mise a jour de la doctrine precedente

### Objectif

Faire evoluer la proposition initiale `OCR d'abord` vers la nouvelle architecture sans casser la trajectoire.

### Etape 1 — Mise a jour documentaire

- remplacer la doctrine OCR systematique ;
- introduire `vision / ocr / auto` ;
- acter `auto` comme mode par defaut.

### Etape 2 — Mise a jour du modele de configuration

- ajouter `DOCUMENT_AI_MODE` ;
- distinguer provider vision et provider texte ;
- distinguer modele vision et modele texte.

### Etape 3 — Mise a jour du design du module

- separer `extract-from-vision` et `extract-from-ocr-text` ;
- ajouter un composant de selection de mode ;
- ajouter un composant de comparaison/fallback.

### Etape 4 — Mise a jour du schema de resultat

- ajouter `extractionMode` ;
- ajouter `fieldConfidence` ;
- garder `rawExtractedText` seulement comme donnee technique.

### Etape 5 — Mise a jour du plan d'implementation

- vision d'abord ;
- OCR en fallback ;
- UI expose le mode effectif.

## 22. Decisions recommandees

### Decision 1

Module cible :

- `apps/api-nest/src/modules/document-intelligence`

### Decision 2

Orchestration IA :

- `LangChain JS` en premiere intention

### Decision 3

Mode par defaut :

- `DOCUMENT_AI_MODE=auto`

### Decision 4

Vision local :

- `Ollama + Qwen2.5-VL`

### Decision 5

OCR fallback :

- `tesseract-cli`

### Decision 6

Execution :

- `asynchrone avec jobId`

### Decision 7

Persistance :

- table `document_intelligence_jobs`

## 23. Conclusion

L'integration la plus adaptee a SIGEDA est une architecture hybride :

- `vision` quand le modele local suffit ;
- `ocr` quand la robustesse textuelle est necessaire ;
- `auto` comme strategie standard.

Cette approche evite une etape OCR inutile tout en conservant un mecanisme de rattrapage pour les documents difficiles. Elle reste coherent avec :

- l'exigence on-premise ;
- le choix TypeScript/NestJS ;
- la confidentialite ;
- la validation humaine finale.
