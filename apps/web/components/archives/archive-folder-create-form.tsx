"use client";

import { useState, useTransition } from "react";
import type { Departement } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { getClientAuthToken } from "@/lib/client-auth-token";
import { getPublicApiBaseUrl } from "@/lib/env";
import { formatStructureLabel } from "@/lib/format";

type ArchiveFolderCreateFormProps = {
  bureaux: Departement[];
  partnerDirections: Departement[];
};

export function ArchiveFolderCreateForm({
  bureaux,
  partnerDirections
}: ArchiveFolderCreateFormProps) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  async function handleSubmit(formData: FormData) {
    const accessToken = await getClientAuthToken();
    const payload = {
      year: Number.parseInt(String(formData.get("year") ?? currentYear), 10),
      bureauId: String(formData.get("bureauId") ?? ""),
      partnerDirectionId: String(formData.get("partnerDirectionId") ?? ""),
      accessibleBureauIds: formData
        .getAll("accessibleBureauIds")
        .map((value) => String(value))
        .filter(Boolean)
    };

    const response = await fetch(`${apiBaseUrl}/api/archive-folders`, {
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
      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Nouveau classeur annuel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Le classeur est cree dans un bureau et peut etre ouvert a plusieurs bureaux autorises.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="year"
            type="number"
            defaultValue={currentYear}
            min={2000}
            max={3000}
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Annee"
            required
          />
          <select
            name="partnerDirectionId"
            className="rounded-xl border border-slate-200 px-4 py-3"
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
          <select
            name="bureauId"
            className="rounded-xl border border-slate-200 px-4 py-3"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Selectionner le bureau createur
            </option>
            {bureaux.map((bureau) => (
              <option key={bureau.id} value={bureau.id}>
                {formatStructureLabel(bureau.code, bureau.designation)}
              </option>
            ))}
          </select>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Bureaux autorises</span>
            <select
              name="accessibleBureauIds"
              multiple
              className="min-h-40 w-full rounded-xl border border-slate-200 px-4 py-3"
            >
              {bureaux.map((bureau) => (
                <option key={bureau.id} value={bureau.id}>
                  {formatStructureLabel(bureau.code, bureau.designation)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {feedback}
          </div>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Traitement..." : "Creer le classeur"}
          </button>
        </div>
      </Card>
    </form>
  );
}
