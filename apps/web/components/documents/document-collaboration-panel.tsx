"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Departement, DocumentEntity } from "@sigeda/shared/types";

import { DocumentAnnotationFileActions } from "@/components/documents/document-annotation-file-actions";
import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

type DocumentCollaborationPanelProps = {
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

export function DocumentCollaborationPanel({ directions, document }: DocumentCollaborationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [annotationSourceDirectionId, setAnnotationSourceDirectionId] = useState(
    document.pendingResponseDirectionIds?.[0] ?? document.receiverDirectionIds[0] ?? ""
  );
  const [annotationContent, setAnnotationContent] = useState("");
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);
  const [annotationFileInputKey, setAnnotationFileInputKey] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const directionLookup = useMemo(() => new Map(directions.map((direction) => [direction.id, direction])), [directions]);

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
      body: formData
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || "L'annotation n'a pas pu etre enregistree.");
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
                Direction annotatrice
              </span>
              <select
                value={annotationSourceDirectionId}
                onChange={(event) => setAnnotationSourceDirectionId(event.target.value)}
                className={inputClassName}
              >
                <option value="" disabled>
                  Selectionner une direction
                </option>
                {Array.from(new Set([...document.receiverDirectionIds, ...document.copyDirectionIds])).map((directionId) => {
                  const direction = directionLookup.get(directionId);
                  return (
                    <option key={directionId} value={directionId}>
                      {direction ? formatStructureLabel(direction.code, direction.designation) : directionId}
                    </option>
                  );
                })}
              </select>
            </label>
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
              disabled={isPending || !annotationSourceDirectionId || (!annotationContent.trim() && !annotationFile)}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await submitAnnotation();
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Operation impossible.");
                  }
                })
              }
              className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Traitement..." : "Enregistrer l'annotation"}
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
