ALTER TABLE "folders"
ADD COLUMN "accessible_bureau_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "folders"
SET "accessible_bureau_ids" = ARRAY["bureau_id"::text]
WHERE cardinality("accessible_bureau_ids") = 0;
