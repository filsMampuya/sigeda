"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createUserSchema } from "@sigeda/shared/schemas";

import { ApiError, createUser } from "@/lib/api";

type CreateUserActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  defaultPassword: string | null;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getReference(formData: FormData, key: string) {
  const value = getString(formData, key);

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

export async function createUserAction(
  _previousState: CreateUserActionState,
  formData: FormData
): Promise<CreateUserActionState> {
  try {
    const payload = createUserSchema.parse({
      personne: {
        nom: getString(formData, "nom"),
        prenom: getString(formData, "postnom")
      },
      profile: getReference(formData, "profile"),
      email: getString(formData, "email"),
      matricule: getString(formData, "matricule"),
      bureau: getReference(formData, "bureau")
    });

    const result = await createUser(payload);
    revalidatePath("/admin/users");

    return {
      status: "success",
      message: "Utilisateur cree avec succes.",
      defaultPassword: result?.defaultPassword ?? null
    } satisfies CreateUserActionState;
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        status: "error",
        message: error.status === 401 ? "Authentification requise." : error.message,
        defaultPassword: null
      } satisfies CreateUserActionState;
    }

    if (error instanceof ZodError) {
      return {
        status: "error",
        message: error.issues[0]?.message ?? "Donnees invalides.",
        defaultPassword: null
      } satisfies CreateUserActionState;
    }

    return {
      status: "error",
      message: "Creation impossible pour le moment.",
      defaultPassword: null
    } satisfies CreateUserActionState;
  }
}
