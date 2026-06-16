ALTER TABLE "document_annotations"
ADD COLUMN "object_key" TEXT,
ADD COLUMN "bucket" TEXT,
ADD COLUMN "file_name" TEXT,
ADD COLUMN "mime_type" TEXT,
ADD COLUMN "size_bytes" BIGINT,
ADD COLUMN "checksum_sha256" TEXT,
ADD COLUMN "storage_provider" "AttachmentStorageProvider";
