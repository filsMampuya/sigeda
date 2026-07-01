-- CreateEnum
CREATE TYPE "FolderType" AS ENUM (
  'CORRESPONDANCE',
  'DOCUMENTAIRE'
);

-- AlterTable
ALTER TABLE "folders"
ADD COLUMN "folder_type" "FolderType" NOT NULL DEFAULT 'CORRESPONDANCE',
ADD COLUMN "label" TEXT;

-- AlterTable
ALTER TABLE "folders"
ALTER COLUMN "partner_direction_id" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "folders_year_bureau_id_owner_direction_id_partner_direction_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "folders_year_bureau_id_owner_direction_id_partner_direction_id_folder_type_key"
ON "folders"("year", "bureau_id", "owner_direction_id", "partner_direction_id", "folder_type");

-- Backfill
UPDATE "folders"
SET "folder_type" = 'CORRESPONDANCE'
WHERE "folder_type" IS NULL;
