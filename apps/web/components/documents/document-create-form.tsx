"use client";

import { useMemo, useState, useTransition } from "react";
import { FirebaseError } from "firebase/app";
import type { DepartementListItem } from "@sigeda/shared/types";
import { confidentialityLevels, documentStatuses, documentTypes } from "@sigeda/shared/constants";

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
  services,
  bureaux
}: DocumentCreateFormProps) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const [directionId, setDirectionId] = useState(directions[0]?.id ?? "");
  const filteredServices = useMemo(
    () =>
      services.filter(
        (service) => !directionId || service.parentId === directionId || service.parents.includes(directionId)
      ),
    [directionId, services]
  );
  const [serviceId, setServiceId] = useState(filteredServices[0]?.id ?? "");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredBureaux = useMemo(
    () =>
      bureaux.filter(
        (bureau) =>
          (!directionId || bureau.parents.includes(directionId)) &&
          (!serviceId || bureau.parentId === serviceId || bureau.parents.includes(serviceId))
      ),
    [bureaux, directionId, serviceId]
  );

  async function handleSubmit(formData: FormData) {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;

    if (!currentUser) {
      throw new Error("Votre session a expire. Reconnectez-vous.");
    }

    const idToken = await currentUser.getIdToken();
    const keywords = String(formData.get("keywords") ?? "")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    const payload = {
      numeroReference: String(formData.get("numeroReference") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      type: String(formData.get("type") ?? ""),
      directionId: String(formData.get("directionId") ?? ""),
      serviceId: String(formData.get("serviceId") ?? ""),
      bureauId: String(formData.get("bureauId") ?? ""),
      authorId: "usr-admin",
      confidentialityLevel: String(formData.get("confidentialityLevel") ?? ""),
      status: String(formData.get("status") ?? ""),
      keywords,
      version: Number(String(formData.get("version") ?? "1"))
    };

    const createResponse = await fetch(`${apiBaseUrl}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!createResponse.ok) {
      throw new Error("La creation du document a echoue.");
    }

    const document = await createResponse.json();
    const file = formData.get("file");

    if (file instanceof File && file.size > 0) {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const uploadResponse = await fetch(`${apiBaseUrl}/api/documents/${document.id}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: uploadData
      });

      if (!uploadResponse.ok) {
        throw new Error("Le televersement ou la numerisation du fichier a echoue.");
      }

      const uploadedDocument = await uploadResponse.json();
      setFeedback(
        uploadedDocument.fileKind === "IMAGE"
          ? `Document cree. OCR ${uploadedDocument.ocrStatus === "COMPLETED" ? "termine" : uploadedDocument.ocrStatus?.toLowerCase()}.`
          : "Document cree et PDF televerse avec succes."
      );
      window.location.href = "/documents";
      return;
    }

    setFeedback("Document cree sans fichier source.");
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
            Enregistrement des metadonnees documentaires avec rattachement obligatoire a une direction,
            un service et un bureau.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette version prend en charge les PDF et les images numerisees. Les fichiers images declenchent
          une lecture OCR automatique cote API.
        </div>
        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {feedback}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="numeroReference"
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Reference documentaire"
            required
          />
          <input
            name="title"
            className="rounded-xl border border-slate-200 px-4 py-3 xl:col-span-2"
            placeholder="Titre du document"
            required
          />
          <input
            name="version"
            type="number"
            min="1"
            defaultValue="1"
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Version"
            required
          />
        </div>

        <textarea
          name="description"
          className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3"
          placeholder="Description ou resume du contenu"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <select
            name="directionId"
            value={directionId}
            onChange={(event) => {
              const nextDirectionId = event.target.value;
              setDirectionId(nextDirectionId);
              const nextServices = services.filter(
                (service) => service.parentId === nextDirectionId || service.parents.includes(nextDirectionId)
              );
              setServiceId(nextServices[0]?.id ?? "");
            }}
            className="rounded-xl border border-slate-200 px-4 py-3"
            required
          >
            <option value="" disabled>
              Selectionner une direction
            </option>
            {directions.map((direction) => (
              <option key={direction.id} value={direction.id}>
                {direction.designation}
              </option>
            ))}
          </select>

          <select
            name="serviceId"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3"
            required
          >
            <option value="" disabled>
              Selectionner un service
            </option>
            {filteredServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.designation}
              </option>
            ))}
          </select>

          <select
            name="bureauId"
            className="rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue={filteredBureaux[0]?.id ?? ""}
            key={`${directionId}-${serviceId}`}
          >
            <option value="" disabled>
              Selectionner un bureau
            </option>
            {filteredBureaux.map((bureau) => (
              <option key={bureau.id} value={bureau.id}>
                {bureau.designation}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <select
            name="confidentialityLevel"
            className="rounded-xl border border-slate-200 px-4 py-3"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Niveau de confidentialite
            </option>
            {confidentialityLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <select name="status" className="rounded-xl border border-slate-200 px-4 py-3" required defaultValue="BROUILLON">
            {documentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            name="keywords"
            className="rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Mots-cles separes par des virgules"
          />
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
