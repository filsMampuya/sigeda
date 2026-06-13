CREATE TABLE "document_signers" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "function_title" TEXT,
    "department_id" UUID NOT NULL,
    "department_type" "DepartmentType" NOT NULL,
    "signing_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_signers_document_id_signing_order_idx"
ON "document_signers"("document_id", "signing_order");

ALTER TABLE "document_signers"
ADD CONSTRAINT "document_signers_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "documents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_signers"
ADD CONSTRAINT "document_signers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "document_signers"
ADD CONSTRAINT "document_signers_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "departments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
