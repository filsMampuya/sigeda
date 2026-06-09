"use client";

import { useMemo, useState, useTransition } from "react";
import type { DocumentArchiveListItem, PhysicalArchiveListItem } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { getClientAuthToken } from "@/lib/client-auth-token";
import { getPublicApiBaseUrl } from "@/lib/env";
import { formatStructureLabel } from "@/lib/format";

type PhysicalArchiveFormProps = {
  documentArchives: DocumentArchiveListItem[];
  physicalArchives: PhysicalArchiveListItem[];
};

export function PhysicalArchiveForm({
  documentArchives,
  physicalArchives
}: PhysicalArchiveFormProps) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedDocumentArchiveId, setSelectedDocumentArchiveId] = useState("");
  const [selectedPartnerDirectionId, setSelectedPartnerDirectionId] = useState("");

  const selectedDocumentArchive =
    documentArchives.find((archive) => archive.id === selectedDocumentArchiveId) ?? null;
  const partnerOptions = useMemo(
    () => buildPartnerOptions(selectedDocumentArchive),
    [selectedDocumentArchive]
  );
  const groupedFolders = useMemo(() => groupPhysicalArchives(physicalArchives), [physicalArchives]);

  async function handleSubmit(formData: FormData) {
    const accessToken = await getClientAuthToken();
    const documentArchiveId = String(formData.get("documentArchiveId") ?? "");
    const selectedDocumentArchive = documentArchives.find((archive) => archive.id === documentArchiveId);

    if (!selectedDocumentArchive) {
      throw new Error("Selectionnez une archive documentaire.");
    }

    const payload = {
      documentArchiveId,
      documentId: selectedDocumentArchive.documentId,
      partnerDirectionId: String(formData.get("partnerDirectionId") ?? ""),
      site: String(formData.get("site") ?? ""),
      batiment: String(formData.get("batiment") ?? ""),
      salle: String(formData.get("salle") ?? ""),
      rayon: String(formData.get("rayon") ?? ""),
      etagere: String(formData.get("etagere") ?? ""),
      classeur: String(formData.get("classeur") ?? ""),
      dossier: String(formData.get("dossier") ?? ""),
      boiteArchive: String(formData.get("boiteArchive") ?? "")
    };

    const response = await fetch(`${apiBaseUrl}/api/physical-archives`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Creation du classement physique impossible.");
    }

    setFeedback("Classement physique enregistre avec succes.");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Archivage physique</p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-navy">Classeurs physiques</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {groupedFolders.length} classeur(s)
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {physicalArchives.length} document(s)
          </span>
        </div>
      </Card>

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
        className="space-y-6"
      >
        <Card className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
              <span className="font-medium text-slate-900">Archive documentaire source</span>
              <select
                name="documentArchiveId"
                value={selectedDocumentArchiveId}
                onChange={(event) => {
                  setSelectedDocumentArchiveId(event.target.value);
                  setSelectedPartnerDirectionId("");
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
                required
              >
                <option value="" disabled>
                  Selectionner une archive documentaire
                </option>
                {documentArchives.map((archive) => (
                  <option key={archive.id} value={archive.id}>
                    {archive.year} | {archive.movementType} | {archive.documentReference} |{" "}
                    {formatDirection(archive.currentDirectionCode, archive.currentDirectionName, archive.directionId)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Direction partenaire</span>
              <select
                name="partnerDirectionId"
                value={selectedPartnerDirectionId}
                onChange={(event) => setSelectedPartnerDirectionId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
                required={partnerOptions.length > 1}
                disabled={partnerOptions.length === 0}
              >
                <option value="" disabled>
                  {partnerOptions.length > 0 ? "Selectionner la direction partenaire" : "Choisir d'abord l'archive"}
                </option>
                {partnerOptions.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {formatDirection(partner.code, partner.name, partner.id)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Contexte annuel</p>
              <p className="mt-2">Annee: {selectedDocumentArchive?.year ?? "-"}</p>
              <p>Section: {selectedDocumentArchive?.movementType ?? "-"}</p>
              <p>Numero de classement sortie: {selectedDocumentArchive?.referenceNumber ?? "-"}</p>
              <p>Statut du classeur: {selectedDocumentArchive?.folderStatus ?? "-"}</p>
            </div>

            <input name="site" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Site" required />
            <input name="batiment" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Batiment" required />
            <input name="salle" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Salle" required />
            <input name="rayon" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Rayon" required />
            <input name="etagere" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Etagere" required />
            <input
              name="classeur"
              className="rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Classeur annuel"
              required
            />
            <input name="dossier" className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Dossier" required />
            <input
              name="boiteArchive"
              className="rounded-xl border border-slate-200 px-4 py-3"
              placeholder="Boite archive"
              required
            />
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {feedback}
            </div>
          ) : null}
          {selectedDocumentArchive?.folderStatus === "ARCHIVED" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Ce classeur annuel est clos. Aucun nouveau classement physique ne peut y etre ajoute.
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || selectedDocumentArchive?.folderStatus === "ARCHIVED"}
              className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Traitement..." : "Enregistrer l'emplacement"}
            </button>
          </div>
        </Card>
      </form>

      <Card className="overflow-hidden p-0">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Nom</th>
              <th className="px-6 py-4 font-medium">Annee</th>
              <th className="px-6 py-4 font-medium">Partenaire</th>
              <th className="px-6 py-4 font-medium">Bureau</th>
              <th className="px-6 py-4 font-medium">Documents</th>
              <th className="px-6 py-4 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {groupedFolders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Aucun classement physique enregistre.
                </td>
              </tr>
            ) : null}
            {groupedFolders.map((folder) => (
              <tr key={folder.key}>
                <td className="px-6 py-4 font-medium text-brand-navy">{folder.name}</td>
                <td className="px-6 py-4">{folder.year}</td>
                <td className="px-6 py-4">
                  {formatDirection(folder.partnerDirectionCode, folder.partnerDirectionName, folder.partnerDirectionId)}
                </td>
                <td className="px-6 py-4">
                  {formatStructureLabel(folder.bureauCode, folder.bureauName, folder.bureauId)}
                </td>
                <td className="px-6 py-4">{folder.documentCount}</td>
                <td className="px-6 py-4">
                  <span
                    className={
                      folder.status === "ARCHIVED"
                        ? "rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                        : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                    }
                  >
                    {folder.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function buildPartnerOptions(archive: DocumentArchiveListItem | null) {
  if (!archive) {
    return [];
  }

  return archive.partnerDirectionIds.map((id, index) => ({
    id,
    code: archive.partnerDirectionCodes[index],
    name: archive.partnerDirectionNames[index] ?? id
  }));
}

function formatDirection(code?: string, designation?: string, fallback?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}

function groupPhysicalArchives(archives: PhysicalArchiveListItem[]) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      year: number | string;
      partnerDirectionId?: string;
      partnerDirectionCode?: string;
      partnerDirectionName?: string;
      bureauId?: string;
      bureauCode?: string;
      bureauName?: string;
      documentCount: number;
      status: string;
    }
  >();

  for (const archive of archives) {
    const key = `${archive.folderId ?? archive.classeur}__${archive.partnerDirectionId ?? ""}__${archive.bureauId ?? ""}`;
    const current = groups.get(key);

    if (current) {
      current.documentCount += 1;
      continue;
    }

    groups.set(key, {
      key,
      name: archive.classeur,
      year: archive.year ?? "-",
      partnerDirectionId: archive.partnerDirectionId,
      partnerDirectionCode: archive.partnerDirectionCode,
      partnerDirectionName: archive.partnerDirectionName,
      bureauId: archive.bureauId,
      bureauCode: archive.bureauCode,
      bureauName: archive.bureauName,
      documentCount: 1,
      status: archive.folderStatus ?? "ACTIVE"
    });
  }

  return Array.from(groups.values()).sort((left, right) => String(right.year).localeCompare(String(left.year)));
}
