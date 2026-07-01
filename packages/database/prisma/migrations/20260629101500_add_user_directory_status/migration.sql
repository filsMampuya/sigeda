-- CreateEnum
CREATE TYPE "UserDirectoryStatus" AS ENUM (
  'ACTIVE',
  'PENDING_COMPLETION',
  'INACTIVE'
);

-- CreateEnum
CREATE TYPE "UserDirectorySource" AS ENUM (
  'MANUAL',
  'DOCUMENT_INTELLIGENCE',
  'KEYCLOAK_PROVISIONED'
);

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "function_title" TEXT,
ADD COLUMN "directory_status" "UserDirectoryStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "directory_source" "UserDirectorySource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "keycloak_id" DROP NOT NULL,
ALTER COLUMN "matricule" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- Backfill
UPDATE "users"
SET
  "directory_status" = 'ACTIVE',
  "directory_source" = 'KEYCLOAK_PROVISIONED'
WHERE "keycloak_id" IS NOT NULL;
