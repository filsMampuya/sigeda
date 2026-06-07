"use client";

import { useMemo, useState, useTransition } from "react";
import { FirebaseError } from "firebase/app";
import type { DepartementListItem } from "@sigeda/shared/types";
import { documentTypes } from "@sigeda/shared/constants";

import { DocumentUploadStatus } from "@/components/documents/document-upload-status";
import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase-client";

type DocumentCreateFormProps = {
  directions: DepartementListItem[];
  services: DepartementListItem[];
  bureaux: DepartementListItem[];
};

export function DocumentCreateForm({
  directions,
  services: _services,
  bureaux: _bureaux
}: DocumentCreateFormProps) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const [directionId, setDirectionId] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectableDirections = useMemo(
    () => directions.filter((direction) => direction.type === "Direction" || direction.type === "Direction Generale"),
    [directions]
  );

  async function handleSubmit(formData: FormData) {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    if (!currentUser) {
      throw new Error("Votre session a expire. Reconnectez-vous.");
    }

    const idToken = await currentUser.getIdToken();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Le fichier est obligatoire.");
    }

    const payload = new FormData();
    payload.append("file", file);
    payload.append("numeroReference", String(formData.get("numeroReference") ?? ""));
    payload.append("type", String(formData.get("type") ?? ""));
    payload.append("directionId", String(formData.get("directionId") ?? ""));

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
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Creation documentaire</p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-navy">Nouveau document</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            Importez un fichier, saisissez la reference, puis selectionnez le type et la direction.
            Les metadonnees utilisateur et le stockage sont automatises.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La reference est actuellement renseignee manuellement pour garder le controle metier.
        </div>
        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {feedback}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="numeroReference"
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Numero de reference"
            required
          />
          <select
            name="directionId"
            value={directionId}
            onChange={(event) => setDirectionId(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
            required
          >
            <option value="" disabled>
              Selectionner une direction
            </option>
            {selectableDirections.map((direction) => (
              <option key={direction.id} value={direction.id}>
                {direction.designation}
              </option>
            ))}
          </select>
          <select name="type" className="rounded-xl border border-slate-200 px-4 py-3" required defaultValue="">
            <option value="" disabled>
              Type de document
            </option>
            {documentTypes.map((documentType) => (
              <option key={documentType} value={documentType}>
                {documentType}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-medium text-slate-900">Fichier source</p>
            <p className="mt-2 text-sm text-slate-600">
              PDF pour archivage natif, ou image numerisee pour extraction OCR. Formats recommandes:
              PDF, PNG, JPG, WEBP, TIFF.
            </p>
            <input
              name="file"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,image/tiff"
              onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
              className="mt-4 block w-full rounded-xl border border-slate-200 bg-white p-4 text-sm"
            />
            {selectedFileName ? <p className="mt-3 text-sm text-slate-700">{selectedFileName}</p> : null}
          </div>
          <DocumentUploadStatus
            hasFile={Boolean(selectedFileName)}
            uploadMessage="Le backend stocke le fichier dans Firebase Storage, puis enrichit le document avec les metadonnees de numerisation et l'OCR."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Traitement..." : "Enregistrer le document"}
          </button>
        </div>
      </Card>
    </form>
  );
}
