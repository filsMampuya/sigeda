CREATE TABLE "document_archive_annotations" (
    "id" UUID NOT NULL,
    "document_archive_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "author_direction_id" UUID NOT NULL,
    "comment" TEXT,
    "object_key" TEXT,
    "bucket" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "checksum_sha256" TEXT,
    "storage_provider" "AttachmentStorageProvider",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_archive_annotations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_archive_annotations_document_archive_id_created_at_idx"
ON "document_archive_annotations"("document_archive_id", "created_at");

CREATE INDEX "document_archive_annotations_author_direction_id_created_at_idx"
ON "document_archive_annotations"("author_direction_id", "created_at");

ALTER TABLE "document_archive_annotations"
ADD CONSTRAINT "document_archive_annotations_document_archive_id_fkey"
FOREIGN KEY ("document_archive_id") REFERENCES "document_archives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_archive_annotations"
ADD CONSTRAINT "document_archive_annotations_author_user_id_fkey"
FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "document_archive_annotations"
ADD CONSTRAINT "document_archive_annotations_author_direction_id_fkey"
FOREIGN KEY ("author_direction_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
