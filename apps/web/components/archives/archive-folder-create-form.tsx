"use client";

import { useState, useTransition } from "react";
import { FolderPlus } from "lucide-react";
import type { AuthenticatedUser, Departement, DocumentTypeOption } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { authorizedRequest, getDisplayableErrorMessage } from "@/lib/client-http";
import { getPublicOnPremiseApiBaseUrl } from "@/lib/env";
import { formatStructureLabel } from "@/lib/format";

type ArchiveFolderCreateFormProps = {
  currentUser: AuthenticatedUser | null;
  partnerDirections: Departement[];
  documentTypes: DocumentTypeOption[];
};

const inputClassName =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

export function ArchiveFolderCreateForm({
  currentUser,
  partnerDirections,
  documentTypes
}: ArchiveFolderCreateFormProps) {
  const apiBaseUrl = getPublicOnPremiseApiBaseUrl();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [folderType, setFolderType] = useState<"CORRESPONDANCE" | "DOCUMENTAIRE" | "AUTRE">("CORRESPONDANCE");
  const [isPending, startTransition] = useTransition();
  const currentYear = new Date().getFullYear();

  async function handleSubmit(formData: FormData) {
    const payload = {
      year: Number.parseInt(String(formData.get("year") ?? currentYear), 10),
      folderType: String(formData.get("folderType") ?? "CORRESPONDANCE"),
      label: String(formData.get("label") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      partnerDirectionId: String(formData.get("partnerDirectionId") ?? "").trim() || undefined,
      documentTypeIds: formData
        .getAll("documentTypeIds")
        .map((value) => String(value).trim())
        .filter(Boolean)
    };

    await authorizedRequest(`${apiBaseUrl}/folders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

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
            setFeedback(getDisplayableErrorMessage(error));
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
          <FormField label="Type de classeur" required>
            <select
              name="folderType"
              className={inputClassName}
              value={folderType}
              onChange={(event) => setFolderType(event.target.value as "CORRESPONDANCE" | "DOCUMENTAIRE" | "AUTRE")}
              required
            >
              <option value="CORRESPONDANCE">Correspondance</option>
              <option value="DOCUMENTAIRE">Documentaire</option>
              <option value="AUTRE">Autre</option>
            </select>
          </FormField>
          {folderType === "CORRESPONDANCE" ? (
            <FormField label="Direction partenaire" required>
              <select name="partnerDirectionId" className={inputClassName} defaultValue="" required>
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
          ) : (
            <>
              <FormField
                label={folderType === "DOCUMENTAIRE" ? "Libelle documentaire" : "Designation du classeur"}
                required
                className="md:col-span-2"
              >
                <input
                  name="label"
                  className={inputClassName}
                  placeholder={folderType === "DOCUMENTAIRE" ? "Ex. Dossiers techniques" : "Ex. Registre interne"}
                  required
                />
              </FormField>
              <FormField
                label="Description"
                className="md:col-span-2"
                description="Optionnelle. Permet de contextualiser le contenu ou l'usage du classeur."
              >
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Description fonctionnelle du classeur"
                />
              </FormField>
              {folderType === "DOCUMENTAIRE" ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Types documentaires autorises
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {documentTypes.map((documentType) => (
                      <label
                        key={documentType.id}
                        className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          name="documentTypeIds"
                          value={documentType.id}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">{documentType.label}</span>
                          <span className="block text-xs text-slate-500">{documentType.code}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bureau de classement</p>
            <p className="mt-2">
              {currentUser?.bureauId
                ? folderType === "CORRESPONDANCE"
                  ? "Le classeur de correspondance sera cree automatiquement dans le bureau rattache a votre compte."
                  : folderType === "DOCUMENTAIRE"
                    ? "Le classeur documentaire sera cree automatiquement dans le bureau rattache a votre compte."
                    : "Le classeur personnalise sera cree automatiquement dans le bureau rattache a votre compte."
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
