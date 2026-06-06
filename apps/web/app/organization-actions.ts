"use server";

import { revalidatePath } from "next/cache";
import {
  createBureauSchema,
  createDirectionSchema,
  createServiceSchema
} from "@sigeda/shared/schemas";

import { createBureau, createDirection, createService } from "@/lib/api";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createDirectionAction(formData: FormData) {
  const payload = createDirectionSchema.parse({
    type: getString(formData, "type"),
    code: getString(formData, "code"),
    designation: getString(formData, "designation"),
    parentId: getString(formData, "parentId") || undefined
  });
  await createDirection(payload);

  revalidatePath("/directions");
  revalidatePath("/services");
  revalidatePath("/bureaux");
}

export async function createServiceAction(formData: FormData) {
  const payload = createServiceSchema.parse({
    parentId: getString(formData, "parentId"),
    code: getString(formData, "code"),
    designation: getString(formData, "designation")
  });
  await createService(payload);

  revalidatePath("/services");
  revalidatePath("/bureaux");
}

export async function createBureauAction(formData: FormData) {
  const payload = createBureauSchema.parse({
    parentId: getString(formData, "parentId"),
    code: getString(formData, "code"),
    designation: getString(formData, "designation")
  });
  await createBureau(payload);

  revalidatePath("/bureaux");
}
