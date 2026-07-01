-- CreateEnum
CREATE TYPE "DocumentIntelligenceJobStatus" AS ENUM (
  'PENDING',
  'UPLOADED',
  'VISION_RUNNING',
  'OCR_RUNNING',
  'LLM_RUNNING',
  'COMPLETED',
  'LOW_CONFIDENCE',
  'FAILED'
);

-- CreateTable
CREATE TABLE "document_intelligence_jobs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "original_file_name" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "requested_mode" TEXT NOT NULL,
  "effective_mode" TEXT,
  "status" "DocumentIntelligenceJobStatus" NOT NULL,
  "ocr_provider" TEXT,
  "llm_provider" TEXT,
  "model_name" TEXT,
  "extracted_json" JSONB,
  "raw_extracted_text" TEXT,
  "confidence_score" DECIMAL(5,4),
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_intelligence_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_intelligence_jobs_user_id_created_at_idx" ON "document_intelligence_jobs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "document_intelligence_jobs_status_created_at_idx" ON "document_intelligence_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "document_intelligence_jobs_created_at_idx" ON "document_intelligence_jobs"("created_at");

-- AddForeignKey
ALTER TABLE "document_intelligence_jobs"
ADD CONSTRAINT "document_intelligence_jobs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
