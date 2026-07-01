"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AuthenticatedUser,
  ClassificationFolderOption,
  DepartementListItem,
  DocumentClassificationProposal
} from "@sigeda/shared/types";

import { getDisplayableErrorMessage } from "@/lib/client-http";
import { formatStructureLabel } from "@/lib/format";

export function DocumentClassifyButton({
  bureaux,
  currentUser,
  documentId,
  reference,
  services
}: {
  bureaux: DepartementListItem[];
  currentUser: AuthenticatedUser | null;
  documentId: string;
  reference: string;
  services: DepartementListItem[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProposal, setIsLoadingProposal] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [proposal, setProposal] = useState<DocumentClassificationProposal | null>(null);
  const currentRole = String(currentUser?.role ?? "");
  const currentDirectionId = currentUser?.directionId ?? "";
  const serviceSelectionLocked = currentRole === "AGENT";

  const accessibleServices = useMemo(() => {
    if (!currentDirectionId) {
      return [];
    }

    const directionServices = services.filter(
      (service) =>
        service.type === "Service" &&
        service.directionId === currentDirectionId &&
        (currentRole === "AGENT" ? service.id === currentUser?.serviceId : true)
    );

    return directionServices;
  }, [currentDirectionId, currentRole, currentUser?.serviceId, services]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBureauId, setSelectedBureauId] = useState(currentUser?.bureauId ?? "");

  useEffect(() => {
    if (!accessibleServices.length) {
      setSelectedServiceId("");
      return;
    }

    const preferredServiceId =
      currentUser?.serviceId && accessibleServices.some((service) => service.id === currentUser.serviceId)
        ? currentUser.serviceId
        : accessibleServices[0]!.id;

    if (!selectedServiceId || !accessibleServices.some((service) => service.id === selectedServiceId)) {
      setSelectedServiceId(preferredServiceId);
    }
  }, [accessibleServices, currentUser?.serviceId, selectedServiceId]);

  const accessibleBureaux = useMemo(() => {
    if (!currentDirectionId) {
      return [];
    }

    return bureaux.filter((bureau) => {
      if (bureau.type !== "Bureau" || bureau.directionId !== currentDirectionId) {
        return false;
      }

      if (currentRole === "AGENT") {
        return bureau.id === currentUser?.bureauId;
      }

      if (currentRole === "MANAGER" || currentRole === "CHEF_SERVICE") {
        return Boolean(selectedServiceId && bureau.serviceId === selectedServiceId);
      }

      return Boolean(selectedServiceId && bureau.serviceId === selectedServiceId);
    });
  }, [
    bureaux,
    currentUser?.bureauId,
    currentUser?.directionId,
    currentRole,
    currentUser?.serviceId,
    selectedServiceId
  ]);

  const effectiveBureauId =
    selectedBureauId ||
    (currentUser?.bureauId && accessibleBureaux.some((bureau) => bureau.id === currentUser.bureauId) ? currentUser.bureauId : "");

  useEffect(() => {
    if (!accessibleBureaux.length) {
      setSelectedBureauId("");
      return;
    }

    if (!selectedBureauId || !accessibleBureaux.some((bureau) => bureau.id === selectedBureauId)) {
      setSelectedBureauId(currentUser?.bureauId && accessibleBureaux.some((bureau) => bureau.id === currentUser.bureauId)
        ? currentUser.bureauId
        : accessibleBureaux[0]!.id);
    }
  }, [accessibleBureaux, currentUser?.bureauId, selectedBureauId]);

  useEffect(() => {
    let cancelled = false;

    async function loadProposal() {
      if (!effectiveBureauId) {
        setProposal(null);
        return;
      }

      setIsLoadingProposal(true);

      try {
        const response = await fetch(`/api/documents/${documentId}/classification-proposal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ bureauId: effectiveBureauId }),
          cache: "no-store",
          credentials: "same-origin"
        });

        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(readActionMessage(responseText) || "Impossible de determiner le classeur recommande.");
        }

        if (!cancelled) {
          setFeedback(null);
          setProposal(JSON.parse(responseText) as DocumentClassificationProposal);
        }
      } catch (error) {
        if (!cancelled) {
          setProposal(null);
          setFeedback({
            tone: "error",
            text: getDisplayableErrorMessage(error)
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProposal(false);
        }
      }
    }

    void loadProposal();

    return () => {
      cancelled = true;
    };
  }, [documentId, effectiveBureauId]);

  const [selectedFolderId, setSelectedFolderId] = useState("");

  useEffect(() => {
    if (!proposal) {
      setSelectedFolderId("");
      return;
    }

    setSelectedFolderId((current) => {
      const availableIds = new Set(proposal.availableFolders.map((folder) => folder.id));

      if (current && availableIds.has(current)) {
        return current;
      }

      return proposal.recommendedFolder?.id ?? proposal.availableFolders[0]?.id ?? "";
    });
  }, [proposal]);

  const selectedFolder = useMemo(() => {
    if (!proposal?.availableFolders?.length) {
      return null;
    }

    return proposal.availableFolders.find((folder) => folder.id === selectedFolderId) ?? null;
  }, [proposal?.availableFolders, selectedFolderId]);

  function formatFolderOption(folder: ClassificationFolderOption) {
    if (folder.folderType === "CORRESPONDANCE") {
      return folder.displayLabel;
    }

    return folder.label ?? folder.description ?? folder.displayLabel;
  }

  function readActionMessage(responseText: string) {
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

  async function classifyDocument() {
    const selectedBureau = accessibleBureaux.find((bureau) => bureau.id === effectiveBureauId);
    const bureauLabel = selectedBureau
      ? formatStructureLabel(selectedBureau.code, selectedBureau.designation)
      : "votre bureau par defaut";
    const folderLabel = selectedFolder
      ? formatFolderOption(selectedFolder)
      : proposal?.recommendedFolder
        ? formatFolderOption(proposal.recommendedFolder)
        : "le classeur approprie";
    const confirmed = window.confirm(
      `Confirmer le classement\n\nCe document sera classe dans le bureau ${bureauLabel}.\nClasseur cible : ${folderLabel}.`
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...(effectiveBureauId ? { bureauId: effectiveBureauId } : {}),
          ...(selectedFolderId ? { folderId: selectedFolderId } : {})
        }),
        cache: "no-store",
        credentials: "same-origin"
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(readActionMessage(responseText) || "Classement impossible.");
      }

      setFeedback({
        tone: "success",
        text: `Le document ${reference} a ete classe avec succes.`
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getDisplayableErrorMessage(error)
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isSubmitting || isLoadingProposal || !effectiveBureauId}
        onClick={async () => {
          if (isSubmitting) {
            return;
          }

          setIsSubmitting(true);

          try {
            await classifyDocument();
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="inline-flex h-10 items-center rounded-xl bg-brand-navy px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Classement..." : isLoadingProposal ? "Preparation..." : "Classer le document"}
      </button>
      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Service de classement</span>
          <select
            value={selectedServiceId}
            onChange={(event) => {
              const nextServiceId = event.target.value;
              setSelectedServiceId(nextServiceId);
              const nextBureaux = bureaux.filter(
                (bureau) =>
                  bureau.type === "Bureau" &&
                  bureau.directionId === currentUser?.directionId &&
                  bureau.serviceId === nextServiceId
              );
              const defaultBureauId =
                currentUser?.bureauId && nextBureaux.some((bureau) => bureau.id === currentUser.bureauId)
                  ? currentUser.bureauId
                  : nextBureaux[0]?.id ?? "";
              setSelectedBureauId(defaultBureauId);
            }}
            disabled={serviceSelectionLocked || accessibleServices.length === 0}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            {accessibleServices.map((service) => (
              <option key={service.id} value={service.id}>
                {formatStructureLabel(service.code, service.designation)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bureau de classement</span>
          <select
            value={selectedBureauId}
            onChange={(event) => setSelectedBureauId(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
            disabled={accessibleBureaux.length === 0}
          >
            {accessibleBureaux.length === 0 ? <option value="">Aucun bureau disponible</option> : null}
            {accessibleBureaux.map((bureau) => (
              <option key={bureau.id} value={bureau.id}>
                {formatStructureLabel(bureau.code, bureau.designation)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Classeur cible</span>
          {proposal?.canOverride ? (
            <select
              value={selectedFolderId}
              onChange={(event) => setSelectedFolderId(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700"
              disabled={isLoadingProposal || proposal.availableFolders.length === 0}
            >
              {proposal.availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {formatFolderOption(folder)}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              {proposal?.recommendedFolder
                ? formatFolderOption(proposal.recommendedFolder)
                : "Classement automatique multi-partenaires ou aucun classeur recommande disponible."}
            </div>
          )}
        </label>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recommendation</p>
          <p className="mt-2 font-medium text-slate-900">
            {proposal?.recommendedFolder
              ? formatFolderOption(proposal.recommendedFolder)
              : isLoadingProposal
                ? "Analyse en cours..."
                : "Aucun classeur recommande automatiquement."}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {proposal?.recommendedReason ??
              "Le systeme appliquera la regle de classement documentaire correspondant a votre bureau et au document."}
          </p>
        </div>
      </div>
      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          }
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
