"use client";

import { useState, useTransition } from "react";
import { FolderPlus } from "lucide-react";
import type { AuthenticatedUser, Departement } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { getClientAuthToken } from "@/lib/client-auth-token";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { formatStructureLabel } from "@/lib/format";

type ArchiveFolderCreateFormProps = {
  currentUser: AuthenticatedUser | null;
  partnerDirections: Departement[];
};

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

export function ArchiveFolderCreateForm({
  currentUser,
  partnerDirections
}: ArchiveFolderCreateFormProps) {
  const apiBaseUrl = getPublicOnPremiseApiBaseUrl();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  async function handleSubmit(formData: FormData) {
    const accessToken = await getClientAuthToken();
    const payload = {
      year: Number.parseInt(String(formData.get("year") ?? currentYear), 10),
      partnerDirectionId: String(formData.get("partnerDirectionId") ?? "")
    };

    const response = await fetch(`${apiBaseUrl}/folders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Creation du classeur impossible.");
    }

    setFeedback("Classeur annuel enregistre avec succes.");
    window.location.reload();
  }

  return (
    <form
      className="min-w-0"
      action={(formData) =>
        startTransition(async () => {
          try {
            await handleSubmit(formData);
          } catch (error) {
            setFeedback(error instanceof Error ? error.message : "Operation echouee.");
          }
        })
      }
    >
      <Card className="min-w-0 space-y-4 p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FolderPlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-brand-navy">Nouveau classeur annuel</h2>
            <p className="text-sm text-slate-600">Le bureau est determine automatiquement a partir du compte connecte.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Annee" required>
            <input
              name="year"
              type="number"
              defaultValue={currentYear}
              min={2000}
              max={3000}
              className={inputClassName}
              placeholder="Annee"
              required
            />
          </FormField>
          <FormField label="Direction partenaire" required>
            <select
              name="partnerDirectionId"
              className={inputClassName}
              defaultValue=""
              required
            >
              <option value="" disabled>
                Selectionner la direction partenaire
              </option>
              {partnerDirections.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {formatStructureLabel(direction.code, direction.designation)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bureau de classement</p>
            <p className="mt-2">
              {currentUser?.bureauId
                ? "Le classeur sera cree automatiquement dans le bureau rattache a votre compte."
                : "Votre compte doit etre rattache a un bureau pour creer un classeur."}
            </p>
          </div>
        </div>

        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            {feedback}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || !currentUser?.bureauId}
            className="h-10 rounded-xl bg-brand-navy px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Traitement..." : "Creer le classeur"}
          </button>
        </div>
      </Card>
    </form>
  );
}
