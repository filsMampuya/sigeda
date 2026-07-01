CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_types_code_key" ON "document_types"("code");

ALTER TABLE "documents"
ADD COLUMN "document_type_id" UUID;

CREATE TABLE "folder_document_types" (
    "folder_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folder_document_types_pkey" PRIMARY KEY ("folder_id","document_type_id")
);

ALTER TABLE "documents"
ADD CONSTRAINT "documents_document_type_id_fkey"
FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "folder_document_types"
ADD CONSTRAINT "folder_document_types_folder_id_fkey"
FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "folder_document_types"
ADD CONSTRAINT "folder_document_types_document_type_id_fkey"
FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "document_types" ("id", "code", "label", "description", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'COURRIER', 'Courrier', 'Courrier administratif standard', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'NOTE', 'Note', 'Note administrative ou de service', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'RAPPORT', 'Rapport', 'Rapport d''activite, d''analyse ou de mission', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'PV_REUNION', 'Proces-verbal de reunion', 'Proces-verbal et compte rendu officiel', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DECISION', 'Decision', 'Decision officielle ou acte signe', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONTRAT', 'Contrat', 'Contrat, convention ou protocole', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOSSIER_TECHNIQUE', 'Dossier technique', 'Documentation technique ou dossier d''exploitation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOCUMENT_ADMINISTRATIF', 'Document administratif', 'Piece administrative generale', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOCUMENT_FINANCIER', 'Document financier', 'Document budgetaire, comptable ou financier', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOCUMENT_PRODUCTION', 'Document de production', 'Document lie a la production ou a l''exploitation', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'DOCUMENT_SECURITE', 'Document de securite', 'Document de surete, controle ou securite', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'AUTRE', 'Autre', 'Type documentaire non encore classe', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "documents" AS d
SET "document_type_id" = dt."id"
FROM "document_types" AS dt
WHERE d."document_type_id" IS NULL
  AND UPPER(TRIM(d."type")) = dt."code";
