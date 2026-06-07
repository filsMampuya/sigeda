"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createDepartementSchema } from "@sigeda/shared/schemas";

import { ApiError } from "@/lib/api";
import { createDepartement } from "@/lib/api";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getParent(formData: FormData) {
  const value = getString(formData, "parent");

  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).code === "string" &&
      typeof (parsed as Record<string, unknown>).designation === "string"
    ) {
      return {
        code: (parsed as Record<string, string>).code,
        designation: (parsed as Record<string, string>).designation
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export type OrganizationActionState = {
  message: string | null;
  status: "idle" | "success" | "error";
};

function getActionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Authentification requise. Reconnectez-vous puis reessayez.";
    }

    return error.message;
  }

  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Les donnees saisies sont invalides.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Operation impossible. Verifiez la configuration API et reessayez.";
}

export async function createDirectionAction(
  _previousState: OrganizationActionState,
  formData: FormData
): Promise<OrganizationActionState> {
  try {
    const type = getString(formData, "type") as "Direction Generale" | "Direction";
    const payload = createDepartementSchema.parse({
      type: getString(formData, "type"),
      code: getString(formData, "code"),
      designation: getString(formData, "designation"),
      parent: type === "Direction" ? getParent(formData) : undefined
    });
    await createDepartement(payload);

    revalidatePath("/directions");
    revalidatePath("/services");
    revalidatePath("/bureaux");

    return {
      message: "Direction creee avec succes.",
      status: "success"
    };
  } catch (error) {
    return {
      message: getActionErrorMessage(error),
      status: "error"
    };
  }
}

export async function createServiceAction(formData: FormData) {
  const payload = createDepartementSchema.parse({
    type: "Service",
    code: getString(formData, "code"),
    designation: getString(formData, "designation"),
    parent: getParent(formData)
  });
  await createDepartement(payload);

  revalidatePath("/services");
  revalidatePath("/bureaux");
}

export async function createBureauAction(formData: FormData) {
  const payload = createDepartementSchema.parse({
    type: "Bureau",
    code: getString(formData, "code"),
    designation: getString(formData, "designation"),
    parent: getParent(formData)
  });
  await createDepartement(payload);

  revalidatePath("/bureaux");
}
