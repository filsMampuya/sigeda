"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser, Departement, DocumentEntity, DocumentTimelineEvent } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { LongText } from "@/components/ui/long-text";
import { formatShortDate, formatStructureLabel } from "@/lib/format";

type DocumentCollaborationPanelProps = {
  currentUser: AuthenticatedUser | null;
  directions: Departement[];
  document: DocumentEntity;
};

type TimelineFilter = "ALL" | "VERSIONS" | "TRANSMISSIONS" | "ANNOTATIONS" | "VALIDATION";

const timelineFilterOptions: Array<{ value: TimelineFilter; label: string }> = [
  { value: "ALL", label: "Tout" },
  { value: "VERSIONS", label: "Versions" },
  { value: "TRANSMISSIONS", label: "Transmissions" },
  { value: "ANNOTATIONS", label: "Annotations" },
  { value: "VALIDATION", label: "Validation" }
];

export function DocumentCollaborationPanel({
  currentUser,
  directions,
  document
}: DocumentCollaborationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [annotationSourceDirectionId, setAnnotationSourceDirectionId] = useState(
    document.pendingResponseDirectionIds?.[0] ?? document.receiverDirectionIds[0] ?? ""
  );
  const [annotationContent, setAnnotationContent] = useState("");
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [changeSummary, setChangeSummary] = useState("");
  const [nextTitle, setNextTitle] = useState(document.title ?? "");
  const [nextSubject, setNextSubject] = useState(document.subject ?? "");
  const [nextSummary, setNextSummary] = useState(document.summary ?? "");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const directionLookup = useMemo(() => new Map(directions.map((direction) => [direction.id, direction])), [directions]);
  const pendingAnnotations = document.annotations?.filter((annotation) => annotation.status === "PENDING") ?? [];
  const currentVersionId = document.versionsHistory?.[document.versionsHistory.length - 1]?.id;
  const currentVersionNumber = document.versionsHistory?.[document.versionsHistory.length - 1]?.version ?? document.version;
  const canPublishVersion =
    currentUser?.directionId === document.emitterDirectionId || currentUser?.role === "ADMIN" || currentUser?.role === "DIRECTION_GENERALE";
  const canFinalize = canPublishVersion && document.status !== "VALIDE" && document.status !== "ARCHIVE";
  const hasPendingResponses = (document.pendingResponseDirectionIds?.length ?? 0) > 0;

  const filteredTimeline = useMemo(() => {
    const events = document.timeline ?? [];

    if (timelineFilter === "ALL") {
      return events;
    }

    return events.filter((event) => matchesTimelineFilter(event, timelineFilter));
  }, [document.timeline, timelineFilter]);

  async function submitAnnotation() {
    setFeedback(null);
    setErrorMessage(null);

    const response = await fetch(`/api/documents/${document.id}/annotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sourceDirectionId: annotationSourceDirectionId,
        documentVersionId: currentVersionId,
        content: annotationContent
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || "L'annotation n'a pas pu etre enregistree.");
    }

    setAnnotationContent("");
    setFeedback("Annotation enregistree avec succes.");
    router.refresh();
  }

  async function submitVersion() {
    setFeedback(null);
    setErrorMessage(null);

    const response = await fetch(`/api/documents/${document.id}/versions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        changeSummary,
        title: nextTitle || undefined,
        subject: nextSubject || undefined,
        summary: nextSummary || undefined,
        sourceAnnotationIds: selectedAnnotationIds
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || "La nouvelle version n'a pas pu etre publiee.");
    }

    setSelectedAnnotationIds([]);
    setChangeSummary("");
    setFeedback("Nouvelle version publiee avec succes.");
    router.refresh();
  }

  async function finalizeCurrentDocument() {
    setFeedback(null);
    setErrorMessage(null);

    const response = await fetch(`/api/documents/${document.id}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || "La validation finale a echoue.");
    }

    setFeedback("Document valide definitivement.");
    router.refresh();
  }

  function toggleAnnotation(annotationId: string) {
    setSelectedAnnotationIds((current) =>
      current.includes(annotationId) ? current.filter((id) => id !== annotationId) : [...current, annotationId]
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-[color:var(--border)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--border)] pb-3">
          <div>
            <h4 className="text-lg font-semibold text-brand-navy">Cycle documentaire</h4>
            <p className="mt-1 text-sm text-slate-600">Suivi des transmissions, annotations, versions et validation finale.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Statut: {document.status ?? "-"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Version active: V{currentVersionNumber}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatusTile label="Version courante" value={`V${document.version}`} />
          <StatusTile label="Annotations" value={String(document.annotations?.length ?? 0)} />
          <StatusTile label="Directions en attente" value={String(document.pendingResponseDirectionIds?.length ?? 0)} />
          <StatusTile label="Directions repondues" value={String(document.respondedDirectionIds?.length ?? 0)} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <InfoPanel
            title="En attente"
            value={document.pendingResponseDirectionNames?.join(", ") || "Aucune direction en attente"}
            label="Directions en attente"
          />
          <InfoPanel
            title="Reponses recues"
            value={document.respondedDirectionNames?.join(", ") || "Aucune reponse enregistree"}
            label="Directions repondues"
          />
          <div className="flex min-w-[220px] flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Validation finale</p>
              <p className="mt-2 text-sm text-slate-700">
                {document.status === "VALIDE"
                  ? "Document deja valide."
                  : hasPendingResponses
                    ? "Attendre la reponse de toutes les directions sollicitees."
                    : "Le document peut etre cloture."}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending || !canFinalize || hasPendingResponses}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await finalizeCurrentDocument();
                  } catch (error) {
                    setErrorMessage(error instanceof Error ? error.message : "Operation impossible.");
                  }
                })
              }
              className="mt-4 h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Traitement..." : "Valider definitivement"}
            </button>
          </div>
        </div>
      </Card>

      {feedback ? <Banner tone="success">{feedback}</Banner> : null}
      {errorMessage ? <Banner tone="error">{errorMessage}</Banner> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Nouvelle annotation</h4>
          </div>
          <div className="mt-4 space-y-3">
            <label className="space-y-1.5 text-sm text-slate-700">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Observation provenant de</span>
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
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Observation</span>
              <textarea
                value={annotationContent}
                onChange={(event) => setAnnotationContent(event.target.value)}
                className={textareaClassName}
                placeholder="Observation recue ou saisie pour cette version"
              />
            </label>
            <button
              type="button"
              disabled={isPending || !annotationSourceDirectionId || !annotationContent.trim()}
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
        </Card>

        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Publier une nouvelle version</h4>
          </div>
          {canPublishVersion ? (
            <div className="mt-4 space-y-3">
              <label className="space-y-1.5 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Motif de version</span>
                <textarea
                  value={changeSummary}
                  onChange={(event) => setChangeSummary(event.target.value)}
                  className={textareaClassName}
                  placeholder="Resume des corrections et observations prises en compte"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Titre</span>
                  <input value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} className={inputClassName} />
                </label>
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Objet</span>
                  <input value={nextSubject} onChange={(event) => setNextSubject(event.target.value)} className={inputClassName} />
                </label>
              </div>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Resume</span>
                <textarea value={nextSummary} onChange={(event) => setNextSummary(event.target.value)} className={textareaClassName} />
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Annotations a integrer</p>
                <div className="mt-3 space-y-2">
                  {pendingAnnotations.length ? (
                    pendingAnnotations.map((annotation) => (
                      <label
                        key={annotation.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAnnotationIds.includes(annotation.id)}
                          onChange={() => toggleAnnotation(annotation.id)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {annotation.sourceDirectionName ?? annotation.sourceDirectionCode ?? annotation.sourceDirectionId}
                          </p>
                          <LongText value={annotation.content} label="Contenu de l'annotation" className="mt-1 text-sm text-slate-600" />
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Aucune annotation en attente.</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={isPending || !changeSummary.trim()}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await submitVersion();
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : "Operation impossible.");
                    }
                  })
                }
                className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Traitement..." : "Publier la nouvelle version"}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              La publication d&apos;une nouvelle version est reservee a la direction emettrice du document.
            </p>
          )}
        </Card>
      </div>

      <Card className="border-[color:var(--border)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] pb-3">
          <div>
            <h4 className="text-lg font-semibold text-brand-navy">Historique chronologique</h4>
            <p className="mt-1 text-sm text-slate-600">Lecture filtree par type d'evenement pour accelerer la consultation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {timelineFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimelineFilter(option.value)}
                className={
                  option.value === timelineFilter
                    ? "rounded-full bg-brand-navy px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {filteredTimeline.length ? (
            filteredTimeline.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                      <EventBadge type={event.type} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {event.actorName ?? "Systeme"}
                      {event.directionName ? ` | ${event.directionName}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{formatShortDate(event.createdAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Aucun evenement ne correspond au filtre selectionne.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Versions</h4>
          </div>
          <div className="mt-4 space-y-3">
            {(document.versionsHistory ?? []).map((version) => (
              <div key={version.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">V{version.version}</p>
                    <LongText
                      value={version.changeSummary ?? "Version initiale"}
                      label={`Resume de la version ${version.version}`}
                      className="mt-1 text-sm text-slate-600"
                    />
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{version.createdByName ?? "Systeme"}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatShortDate(version.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-[color:var(--border)]">
          <div className="border-b border-[color:var(--border)] pb-3">
            <h4 className="text-lg font-semibold text-brand-navy">Annotations</h4>
          </div>
          <div className="mt-4 space-y-3">
            {(document.annotations ?? []).length ? (
              document.annotations?.map((annotation) => (
                <div key={annotation.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {annotation.sourceDirectionName ?? annotation.sourceDirectionCode ?? annotation.sourceDirectionId}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        Encodee par {annotation.recordedByDirectionName ?? annotation.recordedByDirectionCode ?? annotation.recordedByDirectionId}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {annotation.status}
                    </span>
                  </div>
                  <LongText value={annotation.content} label="Contenu de l'annotation" className="mt-3 text-sm text-slate-700" />
                  <p className="mt-2 text-xs text-slate-500">
                    {annotation.createdByUserName ?? "Utilisateur"} | {formatShortDate(annotation.createdAt)} | V
                    {annotation.documentVersionNumber}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Aucune annotation enregistree.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function matchesTimelineFilter(event: DocumentTimelineEvent, filter: TimelineFilter) {
  if (filter === "VERSIONS") {
    return event.type === "DOCUMENT_CREATED" || event.type === "VERSION_CREATED";
  }

  if (filter === "TRANSMISSIONS") {
    return event.type === "TRANSMISSION_SENT";
  }

  if (filter === "ANNOTATIONS") {
    return event.type === "ANNOTATION_CREATED";
  }

  if (filter === "VALIDATION") {
    return event.type === "DOCUMENT_VALIDATED";
  }

  return true;
}

function EventBadge({ type }: { type: DocumentTimelineEvent["type"] }) {
  const label =
    type === "DOCUMENT_CREATED"
      ? "Creation"
      : type === "VERSION_CREATED"
        ? "Version"
        : type === "TRANSMISSION_SENT"
          ? "Transmission"
          : type === "ANNOTATION_CREATED"
            ? "Annotation"
            : "Validation";

  return <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">{label}</span>;
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-navy">{value}</p>
    </div>
  );
}

function InfoPanel({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <LongText value={value} label={label} className="mt-2 text-sm text-slate-700" />
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
