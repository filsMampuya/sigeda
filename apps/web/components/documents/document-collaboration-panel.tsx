"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser, Departement, DocumentEntity } from "@sigeda/shared/types";

import { DocumentAnnotationFileActions } from "@/components/documents/document-annotation-file-actions";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { getDisplayableErrorMessage } from "@/lib/client-http";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

type DocumentCollaborationPanelProps = {
  currentUser: AuthenticatedUser | null;
  directions: Departement[];
  document: DocumentEntity;
};

type UsefulEvent = {
  id: string;
  label: string;
  description: string;
  actor?: string;
  createdAt: string;
};

function extractActionErrorMessage(responseText: string) {
  if (!responseText.trim()) {
    return null;
  }

  try {
    const payload = JSON.parse(responseText) as { message?: string | string[] };

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.join(" ");
    }

    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    return responseText.trim();
  }

  return responseText.trim();
}

export function DocumentCollaborationPanel({ currentUser, directions, document }: DocumentCollaborationPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [annotationContent, setAnnotationContent] = useState("");
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);
  const [annotationFileInputKey, setAnnotationFileInputKey] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const directionLookup = useMemo(() => new Map(directions.map((direction) => [direction.id, direction])), [directions]);
  const annotationDirectionIds = useMemo(
    () =>
      Array.from(
        new Set(
          [document.emitterDirectionId, ...document.receiverDirectionIds, ...document.copyDirectionIds].filter(
            (directionId): directionId is string => Boolean(directionId)
          )
        )
      ),
    [document.copyDirectionIds, document.emitterDirectionId, document.receiverDirectionIds]
  );
  const hasGlobalAnnotationScope = ["ADMIN", "DIRECTEUR_GENERAL", "AUDITEUR"].includes(currentUser?.role ?? "");
  const isEmitterRecorder = Boolean(currentUser?.directionId && currentUser.directionId === document.emitterDirectionId);
  const canAnnotate =
    hasGlobalAnnotationScope ||
    (currentUser?.directionId ? annotationDirectionIds.includes(currentUser.directionId) : false);
  const canChooseSourceDirection = Boolean(hasGlobalAnnotationScope || isEmitterRecorder);
  const recipientAnnotationDirectionIds = useMemo(
    () =>
      Array.from(new Set([...document.receiverDirectionIds, ...document.copyDirectionIds].filter(Boolean))),
    [document.copyDirectionIds, document.receiverDirectionIds]
  );
  const selectableAnnotationDirectionIds = useMemo(() => {
    if (!currentUser?.directionId) {
      return [];
    }

    if (!canChooseSourceDirection) {
      return annotationDirectionIds.includes(currentUser.directionId) ? [currentUser.directionId] : [];
    }

    const candidateIds = isEmitterRecorder ? recipientAnnotationDirectionIds : annotationDirectionIds;
    return candidateIds.filter((directionId) => directionId !== document.emitterDirectionId);
  }, [
    annotationDirectionIds,
    canChooseSourceDirection,
    currentUser?.directionId,
    document.emitterDirectionId,
    isEmitterRecorder,
    recipientAnnotationDirectionIds
  ]);
  const defaultAnnotationSourceDirectionId = useMemo(() => {
    if (!selectableAnnotationDirectionIds.length) {
      return "";
    }

    if (!canChooseSourceDirection && currentUser?.directionId && selectableAnnotationDirectionIds.includes(currentUser.directionId)) {
      return currentUser.directionId;
    }

    return (
      document.pendingResponseDirectionIds?.find((directionId) => selectableAnnotationDirectionIds.includes(directionId)) ??
      document.receiverDirectionIds.find((directionId) => selectableAnnotationDirectionIds.includes(directionId)) ??
      selectableAnnotationDirectionIds[0] ??
      ""
    );
  }, [
    canChooseSourceDirection,
    currentUser?.directionId,
    document.pendingResponseDirectionIds,
    document.receiverDirectionIds,
    selectableAnnotationDirectionIds
  ]);
  const [annotationSourceDirectionId, setAnnotationSourceDirectionId] = useState(defaultAnnotationSourceDirectionId);

  useEffect(() => {
    if (!currentUser?.directionId) {
      return;
    }

    if (!canChooseSourceDirection && selectableAnnotationDirectionIds.includes(currentUser.directionId)) {
      setAnnotationSourceDirectionId(currentUser.directionId);
      return;
    }

    if (!selectableAnnotationDirectionIds.includes(annotationSourceDirectionId) && defaultAnnotationSourceDirectionId) {
      setAnnotationSourceDirectionId(defaultAnnotationSourceDirectionId);
    }
  }, [
    annotationSourceDirectionId,
    canChooseSourceDirection,
    currentUser?.directionId,
    defaultAnnotationSourceDirectionId,
    selectableAnnotationDirectionIds
  ]);

  const usefulHistory = useMemo<UsefulEvent[]>(() => {
    const events: UsefulEvent[] = [
      {
        id: `document-created-${document.id}`,
        label: "Creation du document",
        description: document.numeroReference,
        actor: document.authorName,
        createdAt: document.createdAt
      }
    ];

    for (const archive of document.archiveFolders ?? []) {
      events.push({
        id: `classified-${archive.id}`,
        label: `Classement ${archive.ownerDirectionName ?? archive.ownerDirectionCode ?? archive.ownerDirectionId ?? ""}`.trim(),
        description: `Mouvement ${archive.movementType}`,
        createdAt: archive.archivedAt
      });
    }

    for (const annotation of document.annotations ?? []) {
      events.push({
        id: `annotation-${annotation.id}`,
        label: `Annotation ${annotation.sourceDirectionName ?? annotation.sourceDirectionCode ?? annotation.sourceDirectionId}`,
        description: annotation.content,
        actor: annotation.createdByUserName,
        createdAt: annotation.createdAt
      });
    }

    return events.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }, [document]);

  const sortedAnnotations = useMemo(
    () => [...(document.annotations ?? [])].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [document.annotations]
  );

  const latestAnnotation = sortedAnnotations[0];

  async function submitAnnotation() {
    setFeedback(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("sourceDirectionId", annotationSourceDirectionId);

    if (annotationContent.trim()) {
      formData.set("content", annotationContent.trim());
    }

    if (annotationFile) {
      formData.set("file", annotationFile);
    }

    const response = await fetch(`/api/documents/${document.id}/annotations`, {
      method: "POST",
      body: formData,
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      const responseText = await response.text();
      const errorMessage = extractActionErrorMessage(responseText);

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      throw new Error("L'annotation n'a pas pu etre enregistree.");
    }

    const uploadedFileName = annotationFile?.name;

    setAnnotationContent("");
    setAnnotationFile(null);
    setAnnotationFileInputKey((current) => current + 1);
    setFeedback(
      uploadedFileName
        ? `Annotation enregistree avec succes. Piece jointe: ${uploadedFileName}.`
        : "Annotation enregistree avec succes."
    );
    router.refresh();
  }

  async function handleAnnotationSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitAnnotation();
    } catch (error) {
      setErrorMessage(getDisplayableErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6" id="document-annotations">
      {feedback ? <Banner tone="success">{feedback}</Banner> : null}
      {errorMessage ? <Banner tone="error">{errorMessage}</Banner> : null}

      <details className="group rounded-2xl border border-[color:var(--border)] bg-white" open={sortedAnnotations.length > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-brand-navy">Rapport des annotations</p>
            <p className="mt-1 text-sm text-slate-500">
              {sortedAnnotations.length
                ? `${sortedAnnotations.length} annotation(s) | derniere mise a jour ${formatShortDate(latestAnnotation?.updatedAt ?? latestAnnotation?.createdAt)}`
                : "Aucune annotation enregistree pour ce document."}
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:hidden">Ouvrir</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:block">Fermer</span>
        </summary>
        <div className="border-t border-[color:var(--border)] px-6 py-5">
          <div className="space-y-3">
            {sortedAnnotations.length ? (
              sortedAnnotations.map((annotation) => (
                <div key={annotation.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {annotation.sourceDirectionName ?? annotation.sourceDirectionCode ?? annotation.sourceDirectionId}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        {annotation.createdByUserName ?? "Utilisateur"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{formatShortDate(annotation.createdAt)}</p>
                      <p>Mise a jour : {formatShortDate(annotation.updatedAt)}</p>
                    </div>
                  </div>
                  <LongText value={annotation.content} label="Commentaire d'annotation" className="mt-3 text-sm text-slate-700" />
                  {annotation.attachment ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Piece jointe disponible
                      </p>
                      <DocumentAnnotationFileActions
                        documentId={annotation.documentId}
                        annotationId={annotation.id}
                        fileName={annotation.attachment.name}
                      />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Aucune annotation enregistree pour ce document.</p>
            )}
          </div>
        </div>
      </details>

      <details className="group rounded-2xl border border-[color:var(--border)] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-brand-navy">Nouvelle annotation</p>
            <p className="mt-1 text-sm text-slate-500">Ajout d'une observation ou recommandation documentaire.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:hidden">Ouvrir</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:block">Fermer</span>
        </summary>
        <div className="border-t border-[color:var(--border)] px-6 py-5">
          <div className="space-y-3">
            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {canChooseSourceDirection ? "Direction source de l'observation" : "Direction annotatrice"}
              </span>
              <select
                value={annotationSourceDirectionId}
                onChange={(event) => setAnnotationSourceDirectionId(event.target.value)}
                className={inputClassName}
                disabled={!canChooseSourceDirection || selectableAnnotationDirectionIds.length <= 1}
              >
                <option value="" disabled>
                  Selectionner une direction
                </option>
                {selectableAnnotationDirectionIds.map((directionId) => {
                  const direction = directionLookup.get(directionId);
                  return (
                    <option key={directionId} value={directionId}>
                      {direction ? formatStructureLabel(direction.code, direction.designation) : directionId}
                    </option>
                  );
                })}
              </select>
            </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Direction encodant l&apos;annotation:</span>{" "}
                  {currentUser?.directionId
                    ? (directionLookup.get(currentUser.directionId)
                        ? formatStructureLabel(
                            directionLookup.get(currentUser.directionId)?.code ?? "",
                            directionLookup.get(currentUser.directionId)?.designation ?? ""
                          )
                        : currentUser.directionId)
                    : "Non determinee"}
                </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Direction source de l&apos;observation:</span>{" "}
                {directionLookup.get(annotationSourceDirectionId)
                  ? formatStructureLabel(
                      directionLookup.get(annotationSourceDirectionId)?.code ?? "",
                      directionLookup.get(annotationSourceDirectionId)?.designation ?? ""
                    )
                  : annotationSourceDirectionId || "A selectionner"}
              </p>
              {!canChooseSourceDirection ? (
                <p className="mt-1 text-slate-500">
                  Dans ce contexte, la direction annotatrice est verrouillee sur votre propre direction.
                </p>
              ) : isEmitterRecorder ? (
                <p className="mt-1 text-slate-500">
                  Seules les directions destinataires ou en copie liees a ce document peuvent etre selectionnees.
                </p>
              ) : null}
            </div>
            {!canAnnotate ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Votre direction n'est pas autorisee a annoter ce document.
              </p>
            ) : null}
            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Commentaire</span>
              <textarea
                value={annotationContent}
                onChange={(event) => setAnnotationContent(event.target.value)}
                className={textareaClassName}
                placeholder="Observation ou recommandation sur le document"
              />
            </label>
            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Piece jointe</span>
              <input
                key={annotationFileInputKey}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => setAnnotationFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <p className="text-xs text-slate-500">
                Formats autorises : PDF, PNG, JPG, JPEG, DOC, DOCX.
              </p>
              <p className="text-xs text-slate-600">
                {annotationFile ? `Fichier selectionne : ${annotationFile.name}` : "Aucun fichier selectionne."}
              </p>
            </label>
            <button
              type="button"
              disabled={isSubmitting || !canAnnotate || !annotationSourceDirectionId || (!annotationContent.trim() && !annotationFile)}
              onClick={() => void handleAnnotationSubmit()}
              className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Traitement..." : "Enregistrer l'annotation"}
            </button>
          </div>
        </div>
      </details>

      <details className="group rounded-2xl border border-[color:var(--border)] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-base font-semibold text-brand-navy">Historique utile</p>
            <p className="mt-1 text-sm text-slate-500">Creation, classement et annotations uniquement.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:hidden">Ouvrir</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 group-open:block">Fermer</span>
        </summary>
        <div className="border-t border-[color:var(--border)] px-6 py-5">
          <div className="space-y-3">
            {usefulHistory.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                    <LongText value={event.description} label={event.label} className="mt-1 text-sm text-slate-600" />
                    {event.actor ? <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{event.actor}</p> : null}
                  </div>
                  <span className="text-xs text-slate-500">{formatShortDate(event.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function Banner({ children, tone }: { children: string; tone: "success" | "error" }) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
      }
    >
      {children}
    </div>
  );
}

const inputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";

const textareaClassName =
  "min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500";
