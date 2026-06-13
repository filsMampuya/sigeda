CREATE TABLE "physical_archives" (
    "id" UUID NOT NULL,
    "document_archive_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "direction_id" UUID,
    "partner_direction_id" UUID,
    "year" INTEGER NOT NULL,
    "folder_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "site" TEXT NOT NULL,
    "batiment" TEXT NOT NULL,
    "salle" TEXT NOT NULL,
    "rayon" TEXT NOT NULL,
    "etagere" TEXT NOT NULL,
    "classeur" TEXT NOT NULL,
    "dossier" TEXT NOT NULL,
    "boite_archive" TEXT NOT NULL,
    "classement_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_archives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "physical_archives_document_archive_id_partner_direction_id_ye_key"
ON "physical_archives"("document_archive_id", "partner_direction_id", "year");

CREATE INDEX "physical_archives_folder_id_idx" ON "physical_archives"("folder_id");

ALTER TABLE "physical_archives"
ADD CONSTRAINT "physical_archives_document_archive_id_fkey"
FOREIGN KEY ("document_archive_id") REFERENCES "document_archives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "physical_archives"
ADD CONSTRAINT "physical_archives_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "physical_archives"
ADD CONSTRAINT "physical_archives_direction_id_fkey"
FOREIGN KEY ("direction_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "physical_archives"
ADD CONSTRAINT "physical_archives_partner_direction_id_fkey"
FOREIGN KEY ("partner_direction_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "physical_archives"
ADD CONSTRAINT "physical_archives_folder_id_fkey"
FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
