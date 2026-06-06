"use server";

import { revalidatePath } from "next/cache";
import { createDocumentSchema } from "@sigeda/shared/schemas";

import { createDocument } from "@/lib/api";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createDocumentAction(formData: FormData) {
  const keywords = getString(formData, "keywords")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const payload = createDocumentSchema.parse({
    numeroReference: getString(formData, "numeroReference"),
    title: getString(formData, "title"),
    description: getString(formData, "description") || undefined,
    type: getString(formData, "type"),
    directionId: getString(formData, "directionId"),
    serviceId: getString(formData, "serviceId"),
    bureauId: getString(formData, "bureauId"),
    authorId: "usr-admin",
    confidentialityLevel: getString(formData, "confidentialityLevel"),
    status: getString(formData, "status"),
    keywords,
    version: Number(getString(formData, "version") || "1")
  });

  await createDocument(payload);

  revalidatePath("/dashboard");
  revalidatePath("/documents");
  revalidatePath("/documents/new");
}
