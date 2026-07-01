ALTER TABLE "folders"
ADD COLUMN IF NOT EXISTS "description" TEXT;

DROP INDEX IF EXISTS "folders_year_bureau_id_owner_direction_id_partner_direction_id_folder_type_key";

CREATE UNIQUE INDEX IF NOT EXISTS "folders_correspondance_unique_idx"
ON "folders"("year", "bureau_id", "owner_direction_id", "partner_direction_id")
WHERE "folder_type" = 'CORRESPONDANCE';

CREATE UNIQUE INDEX IF NOT EXISTS "folders_documentaire_unique_idx"
ON "folders"("year", "bureau_id", "owner_direction_id", lower(coalesce("label", '')))
WHERE "folder_type" = 'DOCUMENTAIRE';

CREATE UNIQUE INDEX IF NOT EXISTS "folders_autre_unique_idx"
ON "folders"("year", "bureau_id", "owner_direction_id", lower(coalesce("label", '')))
WHERE "folder_type" = 'AUTRE';
