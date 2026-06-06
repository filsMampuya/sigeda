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
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    description: getString(formData, "description")
  });
  await createDirection(payload);

  revalidatePath("/directions");
  revalidatePath("/services");
  revalidatePath("/bureaux");
}

export async function createServiceAction(formData: FormData) {
  const payload = createServiceSchema.parse({
    directionId: getString(formData, "directionId"),
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    description: getString(formData, "description")
  });
  await createService(payload);

  revalidatePath("/services");
  revalidatePath("/bureaux");
}

export async function createBureauAction(formData: FormData) {
  const payload = createBureauSchema.parse({
    directionId: getString(formData, "directionId"),
    serviceId: getString(formData, "serviceId"),
    code: getString(formData, "code"),
    name: getString(formData, "name"),
    description: getString(formData, "description")
  });
  await createBureau(payload);

  revalidatePath("/bureaux");
}
