"use client";

import { useTransition } from "react";
import type { ArchiveFolderListItem } from "@sigeda/shared/types";

import { Card } from "@/components/ui/card";
import { getPublicApiBaseUrl } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase-client";

export function ArchiveFolderTable({
  rows,
  canManage
}: {
  rows: ArchiveFolderListItem[];
  canManage: boolean;
}) {
  const apiBaseUrl = getPublicApiBaseUrl();
  const [isPending, startTransition] = useTransition();

  async function updateStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;

    if (!firebaseUser) {
      throw new Error("Votre session a expire. Reconnectez-vous.");
    }

    const idToken = await firebaseUser.getIdToken();
    const response = await fetch(`${apiBaseUrl}/api/archive-folders/${id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? "Mise a jour du statut impossible.");
    }

    window.location.reload();
  }

  return (
    <Card className="overflow-hidden p-0">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-6 py-4 font-medium">Annee</th>
            <th className="px-6 py-4 font-medium">Section</th>
            <th className="px-6 py-4 font-medium">Direction</th>
            <th className="px-6 py-4 font-medium">Partenaire</th>
            <th className="px-6 py-4 font-medium">Bureau</th>
            <th className="px-6 py-4 font-medium">Acces</th>
            <th className="px-6 py-4 font-medium">Archives</th>
            <th className="px-6 py-4 font-medium">Statut</th>
            <th className="px-6 py-4 font-medium">Folder ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                Aucun classeur annuel disponible.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-6 py-4">{row.year}</td>
              <td className="px-6 py-4 font-medium text-brand-navy">{row.section}</td>
              <td className="px-6 py-4">{formatDirection(row.ownerDirectionCode, row.ownerDirectionName, row.ownerDirectionId)}</td>
              <td className="px-6 py-4">{formatDirection(row.partnerDirectionCode, row.partnerDirectionName, row.partnerDirectionId)}</td>
              <td className="px-6 py-4">{formatDirection(row.bureauCode, row.bureauName, row.bureauId)}</td>
              <td className="px-6 py-4 text-slate-600">
                {row.accessibleBureauCodes?.length
                  ? row.accessibleBureauCodes
                      .map((code, index) => formatDirection(code, row.accessibleBureauNames?.[index]))
                      .join(", ")
                  : "-"}
              </td>
              <td className="px-6 py-4">{row.archiveCount}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={
                      row.status === "ARCHIVED"
                        ? "rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700"
                        : "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                    }
                  >
                    {row.status}
                  </span>
                  {canManage ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await updateStatus(row.id, row.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE");
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                    >
                      {row.status === "ACTIVE" ? "Archiver" : "Reouvrir"}
                    </button>
                  ) : null}
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs">{row.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function formatDirection(code?: string, designation?: string, fallback?: string) {
  if (code && designation) {
    return `${code} - ${designation}`;
  }

  return designation ?? code ?? fallback ?? "-";
}
