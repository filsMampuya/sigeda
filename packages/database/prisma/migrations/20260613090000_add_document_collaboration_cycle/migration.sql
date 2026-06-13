CREATE TYPE "AnnotationStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

ALTER TABLE "document_versions"
  ADD COLUMN "change_summary" TEXT,
  ADD COLUMN "source_annotation_ids" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "document_versions"
  RENAME COLUMN "created_by" TO "created_by_old";

ALTER TABLE "document_versions"
  ADD COLUMN "created_by" UUID;

UPDATE "document_versions"
SET "created_by" = "created_by_old"::uuid
WHERE "created_by_old" IS NOT NULL;

ALTER TABLE "document_versions"
  ALTER COLUMN "created_by" SET NOT NULL;

ALTER TABLE "document_versions"
  DROP COLUMN "created_by_old";

CREATE TABLE "document_annotations" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "document_version_id" UUID NOT NULL,
  "source_direction_id" UUID NOT NULL,
  "recorded_by_direction_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "status" "AnnotationStatus" NOT NULL DEFAULT 'PENDING',
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_annotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_transmissions" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "document_version_id" UUID NOT NULL,
  "target_direction_id" UUID NOT NULL,
  "kind" "RecipientKind" NOT NULL,
  "sent_by_user_id" UUID NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),
  CONSTRAINT "document_transmissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_annotations_document_id_created_at_idx" ON "document_annotations"("document_id", "created_at");
CREATE INDEX "document_annotations_document_version_id_source_direction_id_idx" ON "document_annotations"("document_version_id", "source_direction_id");
CREATE INDEX "document_transmissions_document_id_sent_at_idx" ON "document_transmissions"("document_id", "sent_at");
CREATE INDEX "document_transmissions_document_version_id_target_direction_id_idx" ON "document_transmissions"("document_version_id", "target_direction_id");

ALTER TABLE "document_versions"
  ADD CONSTRAINT "document_versions_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_annotations"
  ADD CONSTRAINT "document_annotations_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_annotations"
  ADD CONSTRAINT "document_annotations_document_version_id_fkey"
  FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_annotations"
  ADD CONSTRAINT "document_annotations_source_direction_id_fkey"
  FOREIGN KEY ("source_direction_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_annotations"
  ADD CONSTRAINT "document_annotations_recorded_by_direction_id_fkey"
  FOREIGN KEY ("recorded_by_direction_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_annotations"
  ADD CONSTRAINT "document_annotations_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_transmissions"
  ADD CONSTRAINT "document_transmissions_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_transmissions"
  ADD CONSTRAINT "document_transmissions_document_version_id_fkey"
  FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_transmissions"
  ADD CONSTRAINT "document_transmissions_target_direction_id_fkey"
  FOREIGN KEY ("target_direction_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_transmissions"
  ADD CONSTRAINT "document_transmissions_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
