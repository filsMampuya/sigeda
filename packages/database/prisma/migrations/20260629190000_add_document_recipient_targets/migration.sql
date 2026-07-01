CREATE TYPE "RecipientTargetKind" AS ENUM (
  'DIRECTION_GENERALE',
  'DIRECTION',
  'SERVICE',
  'BUREAU',
  'USER'
);

ALTER TABLE "document_recipients"
ADD COLUMN "target_kind" "RecipientTargetKind" NOT NULL DEFAULT 'DIRECTION',
ADD COLUMN "target_department_id" UUID,
ADD COLUMN "target_user_id" UUID;

UPDATE "document_recipients" AS dr
SET
  "target_department_id" = dr."direction_id",
  "target_kind" = CASE d."type"
    WHEN 'DIRECTION_GENERALE' THEN 'DIRECTION_GENERALE'::"RecipientTargetKind"
    WHEN 'DIRECTION' THEN 'DIRECTION'::"RecipientTargetKind"
    WHEN 'SERVICE' THEN 'SERVICE'::"RecipientTargetKind"
    WHEN 'BUREAU' THEN 'BUREAU'::"RecipientTargetKind"
    ELSE 'DIRECTION'::"RecipientTargetKind"
  END
FROM "departments" AS d
WHERE d."id" = dr."direction_id";

DROP INDEX IF EXISTS "document_recipients_document_id_direction_id_kind_key";

ALTER TABLE "document_recipients"
ADD CONSTRAINT "document_recipients_target_department_id_fkey"
FOREIGN KEY ("target_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_recipients"
ADD CONSTRAINT "document_recipients_target_user_id_fkey"
FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "document_recipients_document_id_kind_idx"
ON "document_recipients"("document_id", "kind");

CREATE INDEX "document_recipients_target_department_id_idx"
ON "document_recipients"("target_department_id");

CREATE INDEX "document_recipients_target_user_id_idx"
ON "document_recipients"("target_user_id");
