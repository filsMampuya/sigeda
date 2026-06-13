ALTER TABLE "departments"
ADD COLUMN "direction_id" UUID,
ADD COLUMN "service_id" UUID;

ALTER TABLE "departments"
ADD CONSTRAINT "departments_direction_id_fkey"
FOREIGN KEY ("direction_id") REFERENCES "departments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments"
ADD CONSTRAINT "departments_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "departments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "departments" AS service
SET "direction_id" = service."parent_id"
WHERE service."type" = 'SERVICE'
  AND service."parent_id" IS NOT NULL;

UPDATE "departments" AS bureau
SET
  "service_id" = bureau."parent_id",
  "direction_id" = service."direction_id"
FROM "departments" AS service
WHERE bureau."type" = 'BUREAU'
  AND bureau."parent_id" = service."id"
  AND service."type" = 'SERVICE';
