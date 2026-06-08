"use client";

import { useMemo, useState, useTransition } from "react";
import { FirebaseError } from "firebase/app";
import type { AuthenticatedUser, DepartementListItem } from "@sigeda/shared/types";
import { confidentialityLevels, documentTypes } from "@sigeda/shared/constants";

import { DocumentUploadStatus } from "@/components/documents/document-upload-status";
import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { formatStructureLabel } from "@/lib/format";

type DocumentCreateFormProps = {
  directions: DepartementListItem[];
  services: DepartementListItem[];
  bureaux: DepartementListItem[];
  currentUser: AuthenticatedUser | null;
};

export function DocumentCreateForm({
  directions,
  services: _services,
  bureaux: _bureaux,
  currentUser
}: DocumentCreateFormProps) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const currentYear = new Date().getFullYear();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fallbackEmitterDirectionId, setFallbackEmitterDirectionId] = useState(currentUser?.directionId ?? "");
  const selectableDirections = useMemo(
    () => directions.filter((direction) => direction.type === "Direction" || direction.type === "Direction Generale"),
    [directions]
  );
  const currentDirection = selectableDirections.find((direction) => direction.id === currentUser?.directionId) ?? null;

  function getSelectedValues(formData: FormData, field: string) {
    return formData
      .getAll(field)
      .map((value) => String(value))
      .filter(Boolean);
  }

  async function handleSubmit(formData: FormData) {
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;

    if (!firebaseUser) {
      throw new Error("Votre session a expire. Reconnectez-vous.");
    }

    const idToken = await firebaseUser.getIdToken();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Le fichier est obligatoire.");
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("numeroReference", String(formData.get("numeroReference") ?? ""));
    payload.append("year", String(formData.get("year") ?? currentYear));
    payload.append("title", String(formData.get("title") ?? ""));
    payload.append("subject", String(formData.get("subject") ?? ""));
    payload.append("description", String(formData.get("description") ?? ""));
    payload.append("summary", String(formData.get("summary") ?? ""));
    payload.append("type", String(formData.get("type") ?? ""));
    payload.append("signerName", String(formData.get("signerName") ?? ""));
    payload.append("confidentialityLevel", String(formData.get("confidentialityLevel") ?? "INTERNE"));

    const emitterDirectionId = currentUser?.directionId || String(formData.get("emitterDirectionId") ?? "");
    if (emitterDirectionId) {
      payload.append("emitterDirectionId", emitterDirectionId);
    }

    payload.append(
      "receiverDirectionIds",
      JSON.stringify(getSelectedValues(formData, "receiverDirectionIds"))
    );
    payload.append("copyDirectionIds", JSON.stringify(getSelectedValues(formData, "copyDirectionIds")));
    payload.append(
      "keywords",
      JSON.stringify(
        String(formData.get("keywords") ?? "")
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      )
    );

    const createResponse = await fetch(`${apiBaseUrl}/api/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`
      },
      body: payload
    });

    if (!createResponse.ok) {
      let message = "La creation du document a echoue.";

      try {
        const errorBody = await createResponse.json();
        if (typeof errorBody.message === "string") {
          message = errorBody.message;
        }
      } catch {
        // noop
      }

      throw new Error(message);
    }

    const document = await createResponse.json();
    setFeedback(`Document cree avec la reference ${document.numeroReference}.`);
    window.location.href = "/documents";
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await handleSubmit(formData);
          } catch (error) {
            const fallbackMessage = error instanceof FirebaseError ? error.message : "Operation echouee.";
            setFeedback(error instanceof Error ? error.message : fallbackMessage);
          }
        })
      }
      className="space-y-6"
    >
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Nouveau document</h1>
          <p className="mt-1 text-xs text-slate-500">Année {currentYear}</p>
        </div>
        {feedback ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${
            isPending ? 'border border-blue-200 bg-blue-50 text-blue-900' : 'border border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}>
            {feedback}
          </div>
        ) : null}
      </Card>

      {/* Informations essentielles */}
      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-brand-navy">1. Identification</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="numeroReference"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Référence *"
            required
          />
          <input
            name="year"
            type="number"
            defaultValue={currentYear}
            min={2000}
            max={3000}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Année"
            required
          />
          <select name="type" className="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2" required defaultValue="">
            <option value="" disabled>
              Type de document *
            </option>
            {documentTypes.map((documentType) => (
              <option key={documentType} value={documentType}>
                {documentType}
              </option>
            ))}
          </select>
          <input
            name="title"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
            placeholder="Titre"
          />
          <input
            name="subject"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
            placeholder="Objet"
          />
        </div>
      </Card>

      {/* Circulation */}
      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-brand-navy">2. Circulation</h2>
        
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-900">Direction émettrice</p>
          {currentDirection ? (
            <p className="mt-2 text-sm text-slate-600">
              {formatStructureLabel(currentDirection.code, currentDirection.designation)}
            </p>
          ) : (
            <select
              name="emitterDirectionId"
              value={fallbackEmitterDirectionId}
              onChange={(event) => setFallbackEmitterDirectionId(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              required
            >
              <option value="" disabled>
                Sélectionner direction
              </option>
              {selectableDirections.map((direction) => (
                <option key={direction.id} value={direction.id}>
                  {formatStructureLabel(direction.code, direction.designation)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Destinataires</span>
            <select
              name="receiverDirectionIds"
              multiple
              className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {selectableDirections
                .filter((direction) => direction.id !== (currentUser?.directionId ?? fallbackEmitterDirectionId))
                .map((direction) => (
                  <option key={direction.id} value={direction.id}>
                    {formatStructureLabel(direction.code, direction.designation)}
                  </option>
                ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Copies</span>
            <select
              name="copyDirectionIds"
              multiple
              className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              {selectableDirections
                .filter((direction) => direction.id !== (currentUser?.directionId ?? fallbackEmitterDirectionId))
                .map((direction) => (
                  <option key={direction.id} value={direction.id}>
                    {formatStructureLabel(direction.code, direction.designation)}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Contenu et détails */}
      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-brand-navy">3. Contenu</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="signerName"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Signataire"
          />
          <select
            name="confidentialityLevel"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            defaultValue="INTERNE"
          >
            {confidentialityLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
            placeholder="Description"
          />
          <textarea
            name="summary"
            className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
            placeholder="Résumé"
          />
          <input
            name="keywords"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm md:col-span-2"
            placeholder="Mots-clés (séparés par des virgules)"
          />
        </div>
      </Card>

      {/* Upload */}
      <Card className="space-y-5">
        <h2 className="text-lg font-semibold text-brand-navy">4. Numérisation</h2>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-900">Fichier source</p>
            <input
              name="file"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
              onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
              className="mt-4 block w-full rounded-xl border border-slate-200 bg-white p-4 text-sm"
            />
            {selectedFileName ? <p className="mt-3 text-xs text-slate-700">{selectedFileName}</p> : null}
          </div>
          <DocumentUploadStatus
            hasFile={Boolean(selectedFileName)}
            uploadMessage="OCR et métadonnées extraites automatiquement"
          />
        </div>
      </Card>

      <Card className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Traitement..." : "Créer"}
        </button>
      </Card>
    </form>
  );
}
